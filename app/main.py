"""SmartFuel commercial ANPR demonstrator — simulated records, NEVER legal verification."""
import os, io, re, csv, json, uuid, base64, binascii, html, logging, secrets, time, asyncio, hashlib, hmac
from pathlib import Path
from datetime import datetime, date, timezone, timedelta
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, Request, Response, Depends, HTTPException, Cookie, Query
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from PIL import Image
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen.canvas import Canvas
from .database import Base, engine, SessionLocal, User, Vehicle, Cylinder, Inspection, Station, Audit, CameraDevice, LoginFailure, VehicleEvent, RevokedSession, seed_demo, DB_URL, migrate_owner_column
from .security import create_token, read_token, hash_password, check_password
from .ocr_engine import ocr_plate, read_image, configure_tesseract
from .vahan_gateway import resolve_and_cache_vehicle, VAHAN_ENABLED

ROOT=Path(__file__).resolve().parent.parent
STORE=Path(os.getenv('DATA_DIR',str(ROOT/'storage')))
SNAPS=STORE/'snapshots'; CERTS=STORE/'certificates'
COOKIE_SECURE=os.getenv('COOKIE_SECURE','0')=='1'
DEMO=os.getenv('DEMO_MODE','1')=='1'
PLATE_RE=re.compile('^[A-Z0-9]{6,14}$')
FILE_RE=re.compile('^[a-f0-9]{32}\\.(jpg|png|pdf)$')
log=logging.getLogger('smartfuel')
# CPU OCR uses a single inference slot on small 2-vCPU KVM2 hosts.
OCR_LIMIT = asyncio.Semaphore(1)

def fail(code,message):raise HTTPException(status_code=code,detail=message)

def plate_norm(value):return re.sub('[^A-Z0-9]','',str(value or '').upper())

def db_session():
    db=SessionLocal()
    try:yield db
    finally:db.close()

def audit(db,actor,action,subject='',details=''):
    db.add(Audit(actor_id=actor.id if actor else None,action=action,subject=str(subject)[:160],details=str(details)[:350]))

def user_from_session(request:Request,db:Session):
    token=request.cookies.get('sf_session')
    data=read_token(token) if token else None
    if not data:return None,None
    if db.get(RevokedSession,hashlib.sha256(token.encode('utf8')).hexdigest()):return None,None
    user=db.get(User,data.get('uid'))
    if not user or not user.active:return None,None
    # Changing a password invalidates ALL earlier signed sessions.
    version=hashlib.sha256(user.password_hash.encode('utf8')).hexdigest()[:24]
    if not hmac.compare_digest(str(data.get('credential_version','')),version):return None,None
    return user,data

def require_user(request:Request,db:Session=Depends(db_session)):
    user,data=user_from_session(request,db)
    if not user:fail(401,'Session expired. Please sign in again.')
    if request.method in ('POST','PUT','PATCH','DELETE'):
        if not secrets.compare_digest(request.headers.get('X-CSRF-Token',''),data.get('csrf','')):
            fail(403,'CSRF token missing or invalid')
    return user

def permitted(user,roles=('admin','operator','viewer')):
    if user.role not in roles:fail(403,'Insufficient permissions for this operation')

def authorized_vehicle(db,user,plate):
    v=db.get(Vehicle,plate)
    if not v:return None
    # Vehicle/cylinder demo registry is shared network-wide; station access is
    # enforced on inspection records, not by the origin station of a vehicle.
    # This allows a registered sample vehicle to be inspected at a different station.
    return v

def authorized_inspection(db,user,ident):
    s=db.get(Inspection,ident)
    if not s:fail(404,'Inspection not found')
    if user.role!='admin' and user.station_id is not None and s.station_id!=user.station_id:
        fail(403,'Inspection belongs to a different station')
    return s

def certificate_evidence(c):
    # A reference string does not prove an uploaded document exists.
    if c.certificate_file and FILE_RE.fullmatch(c.certificate_file) and (CERTS/c.certificate_file).is_file():
        return 'sample_attachment'
    return 'reference_only' if c.certificate_ref else 'missing'

def cylinder_state(c):
    # Demo-only rules. A future "last test" date or a non-chronological record
    # must never be treated as valid simply because its expiry is in the future.
    if not c.expiry or not c.certificate_ref or not c.last_test:return 'missing'
    if os.getenv('REQUIRE_SAMPLE_ATTACHMENT','0')=='1' and certificate_evidence(c)!='sample_attachment':return 'missing'
    try:
        last_test=date.fromisoformat(c.last_test)
        expiry=date.fromisoformat(c.expiry)
        today=date.today()
        if last_test>today or last_test>expiry:return 'missing'
        return 'expired' if expiry<today else 'valid'
    except (ValueError, TypeError):return 'missing'

def result_for(db,user,plate,auto_resolve=True):
    p=plate_norm(plate)
    v=authorized_vehicle(db,user,p)
    if not v and auto_resolve and VAHAN_ENABLED:
        v=resolve_and_cache_vehicle(db,user,p)
    if not v:return {'plate':p,'vehicle':None,'status':'not_registered','explanation':'Not in demonstration database','disclaimer':'DEMO DATA — NOT GOVERNMENT VERIFIED'}
    cylinders=[{'id':c.id,'serial':c.serial,'last_test':c.last_test or '', 'expiry':c.expiry or '', 'certificate_ref':c.certificate_ref or '', 'certificate_file':c.certificate_file or '', 'evidence':certificate_evidence(c), 'status':cylinder_state(c)} for c in v.cylinders]
    record={'plate':v.plate,'model':v.model,'owner_name':v.owner_name or '','cng_endorsed':v.cng_endorsed,'notes':v.notes,'station_id':v.station_id,'cylinders':cylinders}
    if v.cng_endorsed=='no':status,explanation='not_cng','CNG is not endorsed in this sample RC record'
    elif v.cng_endorsed!='yes':status,explanation='unverified','CNG endorsement is unknown in the demo record'
    elif not cylinders:status,explanation='unverified','No cylinder information is stored'
    elif any(c['status']=='expired' for c in cylinders):status,explanation='expired','One or more demonstration cylinder testing dates have expired'
    elif any(c['status']=='missing' for c in cylinders):status,explanation='missing','One or more cylinders have a missing sample certificate or expiry'
    else:status,explanation='valid','All sample cylinder records are currently in date'
    return {'plate':p,'vehicle':record,'status':status,'explanation':explanation,'disclaimer':'SIMULATED VEHICLE DATA — NOT GOVERNMENT VERIFIED'}

def cng_supply_guidance(result, needs_review=False):
    """Conservative, deterministic demonstrator guidance, not a legal safety ruling.

    Separate the sample RC endorsement from every registered cylinder. Do not
    turn missing evidence into a pass. The station attendant makes the decision.
    """
    result=result or {}
    vehicle=result.get('vehicle') or {}
    plate=plate_norm(result.get('plate')) or 'NOT READ'
    reason_codes=[]
    reasons=[]
    checks=[]
    endorsement=vehicle.get('cng_endorsed','unknown')
    if endorsement=='yes':
        checks.append({'name':'CNG endorsement on sample RC','state':'pass','detail':'Recorded YES in demo database'})
    elif endorsement=='no':
        checks.append({'name':'CNG endorsement on sample RC','state':'fail','detail':'CNG endorsement not recorded'})
        reason_codes.append('RC_CNG_NOT_ENDORSED')
        reasons.append('CNG is not endorsed on the stored sample RC record.')
    else:
        checks.append({'name':'CNG endorsement on sample RC','state':'review','detail':'Not verified in demo database'})
        reason_codes.append('RC_NOT_VERIFIED')
        reasons.append('CNG endorsement on RC cannot be verified from the stored demo record.')
    cylinders=vehicle.get('cylinders') or []
    if not vehicle and result.get('status')=='not_registered':
        reason_codes=['VEHICLE_NOT_REGISTERED']
        reasons=['Vehicle number has no matching record in the demonstration database.']
        checks=[{'name':'Vehicle record','state':'review','detail':'No matching sample vehicle record'}]
    elif endorsement=='yes' and not cylinders:
        checks.append({'name':'Installed cylinders','state':'review','detail':'No sample cylinder records'})
        reason_codes.append('CYLINDERS_NOT_RECORDED')
        reasons.append('Installed CNG cylinder details are missing from the demo database.')
    for index,c in enumerate(cylinders,1):
        label=c.get('serial') or f'Cylinder {index}'
        status=c.get('status','missing')
        if status=='expired':
            checks.append({'name':f'Cylinder {index} hydrotest','state':'fail','detail':f'{label}: expired {c.get("expiry") or "unknown date"}'})
            reason_codes.append('HYDROTEST_EXPIRED')
            reasons.append(f'{label}: hydrotesting validity expired ({c.get("expiry") or "date unavailable"}).')
        elif status!='valid':
            checks.append({'name':f'Cylinder {index} hydrotest','state':'review','detail':f'{label}: certificate or test date missing'})
            reason_codes.append('CERTIFICATE_OR_DATE_MISSING')
            reasons.append(f'{label}: hydrotesting certificate information or expiry date is missing.')
        else:
            checks.append({'name':f'Cylinder {index} hydrotest','state':'pass','detail':f'{label}: in-date sample record'})
    if needs_review or not plate or result.get('status')=='unverified' and not reasons:
        reason_codes.insert(0,'OCR_OR_RECORD_REVIEW')
        reasons.insert(0,'Verify the recognised number plate and sample documents manually before proceeding.')
    if any(item['state']=='fail' for item in checks):
        state='hold'
        headline='CNG FILLING ON HOLD — DEMO'
        instruction='Do not proceed on this demonstration result. Ask the station supervisor to review the RC and hydrotesting records.'
    elif reasons:
        state='review'
        headline='MANUAL REVIEW REQUIRED — DEMO'
        instruction='Sample records are incomplete or uncertain. Ask the supervisor to verify supporting documents.'
    else:
        state='demo_pass'
        headline='DEMO CHECKS PASSED'
        instruction='Both checks passed against stored sample data only. This is NOT official clearance or authorization to dispense CNG.'
    return {'plate':plate,'state':state,'headline':headline,'instruction':instruction,
            'reasons':reasons,'reason_codes':list(dict.fromkeys(reason_codes)),'checks':checks,
            'disclaimer':'DEMONSTRATION DATA ONLY — NOT GOVERNMENT VERIFIED OR FILLING AUTHORIZATION'}

def utc_timestamp(value):
    if value is None:return ''
    if value.tzinfo is not None:
        value=value.astimezone(timezone.utc).replace(tzinfo=None)
    return value.isoformat()+'Z'

def serialize_scan(s):
    return {'id':s.id,'scanned_at':s.scanned_at.isoformat() if s.scanned_at else '', 'recognized_plate':s.recognized_plate,'checked_plate':s.checked_plate,'confidence':s.confidence,'method':s.method,'status':s.status,'image_file':s.image_file,'station_id':s.station_id}

def resolve_station(db,user,station_id=None):
    if user.role!='admin':
        if user.station_id is None:fail(403,'Operator requires assigned station')
        if station_id is not None:
            try:requested=int(station_id)
            except (ValueError,TypeError):fail(400,'Invalid station ID')
            if requested!=user.station_id:fail(403,'You cannot inspect for another station')
        return user.station_id
    if station_id is not None and str(station_id).strip():
        try:sid=int(station_id)
        except (TypeError,ValueError):fail(400,'Invalid station ID')
        if not db.get(Station,sid):fail(400,'Station not found')
        return sid
    stations=db.query(Station.id).limit(2).all()
    if len(stations)==1:return stations[0][0]
    fail(400,'Choose inspection station before scanning')

def record_vehicle_event(db,inspection,event_type='inspection',needs_review=False,camera_session=''):
    """Server timestamps observation. Image upload is not called a physical entry."""
    event=VehicleEvent(
        observed_at=datetime.now(timezone.utc).replace(tzinfo=None),
        plate=inspection.checked_plate or inspection.recognized_plate or '',
        station_id=inspection.station_id,inspection_id=inspection.id,
        event_type=event_type,source=inspection.method,
        status=inspection.status,confidence=inspection.confidence,
        needs_review=bool(needs_review),camera_session=str(camera_session or '')[:64])
    db.add(event);db.flush()
    return event

def create_inspection(db,user,recognized,checked,confidence,method,result,img='',station_id=None,
                      event_type='inspection',needs_review=False,camera_session=''):
    sid=resolve_station(db,user,station_id)
    obj=Inspection(recognized_plate=plate_norm(recognized),checked_plate=plate_norm(checked),confidence=round(float(confidence or 0),2),method=str(method)[:50],status=result['status'],details_json=json.dumps(result),image_file=img,station_id=sid,operator_id=user.id)
    db.add(obj);db.flush()
    event=record_vehicle_event(db,obj,event_type,needs_review,camera_session)
    audit(db,user,'inspection.created',str(obj.id),f'{result["status"]} event={event.id}')
    db.commit();return obj.id

def unpack_data_url(v,max_bytes=8*1024*1024):
    if not isinstance(v,str) or not v.startswith('data:') or ',' not in v:fail(400,'Missing image or invalid data URL')
    header,blob=v.split(',',1)
    if ';base64' not in header or len(blob)>max_bytes*2:fail(413,'File too large or unsupported encoding')
    try:raw=base64.b64decode(blob,validate=True)
    except (ValueError,binascii.Error):fail(400,'Invalid base64')
    if len(raw)>max_bytes:fail(413,'File exceeds allowed size')
    return raw

def save_photo(raw):
    import cv2
    bgr=read_image(raw)
    h,w=bgr.shape[:2]
    if max(h,w)>1600:
        factor=1600/max(h,w)
        bgr=cv2.resize(bgr,(int(w*factor),int(h*factor)))
    SNAPS.mkdir(parents=True,exist_ok=True)
    name=uuid.uuid4().hex+'.jpg'
    if not cv2.imwrite(str(SNAPS/name),bgr,[int(cv2.IMWRITE_JPEG_QUALITY),80]):fail(500,'Cannot store camera snapshot')
    return name

def pdf_response(buffer,filename):
    buffer.seek(0)
    return StreamingResponse(buffer,media_type='application/pdf',headers={'Content-Disposition':f'inline; filename="{filename}"','Cache-Control':'no-store'})

def build_pdf(title,lines,filename):
    buffer=io.BytesIO();cv=Canvas(buffer,pagesize=A4);w,h=A4
    cv.setFillColorRGB(.04,.16,.31);cv.rect(0,h-105,w,105,fill=1,stroke=0)
    cv.setFillColorRGB(1,1,1);cv.setFont('Helvetica-Bold',18);cv.drawString(40,h-48,'SMARTFUEL  |  ANPR INTELLIGENCE')
    cv.setFont('Helvetica',11);cv.drawString(40,h-72,title[:85])
    y=h-142;cv.setFont('Helvetica-Bold',10);cv.setFillColorRGB(.75,.13,.13)
    cv.drawString(40,y,'SAMPLE ONLY — NOT AN OFFICIAL CERTIFICATE OR VEHICLE CLEARANCE')
    y-=44;cv.setFillColorRGB(.1,.17,.26)
    for label,value in lines:
        if y<100:cv.showPage();y=h-75
        cv.setFont('Helvetica-Bold',10);cv.drawString(43,y,str(label)[:30]);cv.setFont('Helvetica',10)
        cv.drawString(192,y,str(value)[:75]);y-=25
    cv.setStrokeColorRGB(.8,.85,.9);cv.line(40,75,w-40,75)
    cv.setFont('Helvetica-Oblique',8);cv.drawString(40,57,'Synthetic database only. No government or testing authority data was accessed.')
    cv.save();return pdf_response(buffer,filename)

@asynccontextmanager
async def lifespan(app):
    # No implicit insecure admin credentials. Startup refuses missing secrets.
    if len(os.getenv('SESSION_SECRET',''))<32:raise RuntimeError('Set SESSION_SECRET (32+ chars) in .env')
    admin_email=os.getenv('ADMIN_EMAIL','').strip().lower()
    admin_password=os.getenv('ADMIN_PASSWORD','')
    if not admin_email or '@' not in admin_email or len(admin_password)<12 or 'REPLACE_' in admin_password or 'REPLACE_' in os.getenv('SESSION_SECRET','') or admin_email=='you@example.com':
        raise RuntimeError('Configure a real ADMIN_EMAIL, strong ADMIN_PASSWORD and SESSION_SECRET in .env before starting')
    STORE.mkdir(exist_ok=True,parents=True);SNAPS.mkdir(exist_ok=True);CERTS.mkdir(exist_ok=True)
    Base.metadata.create_all(bind=engine)
    migrate_owner_column()
    db=SessionLocal()
    try:
        if os.getenv('SEED_DEMO','1')=='1':seed_demo(db)
        if not db.query(User).filter_by(email=admin_email).first():
            db.add(User(email=admin_email,name='Project Administrator',password_hash=hash_password(admin_password),role='admin',active=True));db.commit()
    finally:db.close()
    yield

app=FastAPI(title='SmartFuel ANPR Commercial Pilot',version='8.0.0',openapi_url=None,docs_url=None,redoc_url=None,lifespan=lifespan)
app.mount('/static',StaticFiles(directory=str(ROOT/'static')),name='static')

@app.middleware('http')
async def http_security(req:Request,call_next):
    if req.method in ('POST','PUT','PATCH') and req.headers.get('content-length'):
        try:
            if int(req.headers['content-length'])>14*1024*1024:return JSONResponse({'error':'Request exceeds 14MB'},status_code=413)
        except ValueError:return JSONResponse({'error':'Invalid content length'},status_code=400)
    response=await call_next(req)
    response.headers['X-Content-Type-Options']='nosniff';response.headers['X-Frame-Options']='DENY'
    response.headers['Referrer-Policy']='no-referrer';response.headers['Cache-Control']='no-store'
    response.headers['Content-Security-Policy']="default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'"
    return response

@app.exception_handler(HTTPException)
async def custom_error(request,exc):return JSONResponse({'error':str(exc.detail)},status_code=exc.status_code)


@app.get('/api/demo-samples')
def demo_samples(user:User=Depends(require_user)):
    """Curated fictional images for safe client demonstrations; never government records."""
    import csv as _csv
    folder=ROOT/'samples'
    manifest=folder/'DEMO_SAMPLE_MANIFEST.csv'
    if not manifest.is_file():return []
    with manifest.open(newline='',encoding='utf-8') as f:
        records=list(_csv.DictReader(f))
    return [{'filename':r['filename'],'plate':r['plate'],'expected_case':r['expected_case'],
             'image_type':r['image_type'],'demo_only':True} for r in records
            if re.fullmatch(r'[A-Za-z0-9_-]+\.png',r['filename']) and (folder/r['filename']).is_file()]

@app.get('/api/demo-samples/{filename}')
def demo_sample_file(filename:str,user:User=Depends(require_user)):
    if not re.fullmatch(r'[A-Za-z0-9_-]+\.png',filename):fail(404,'Sample not found')
    file=ROOT/'samples'/filename
    if not file.is_file():fail(404,'Sample not found')
    return FileResponse(file,media_type='image/png',headers={'Cache-Control':'private, max-age=120'})

@app.get('/api/health')
def health(db:Session=Depends(db_session)):
    db.execute(func.now().select());return {'ok':True,'service':'SmartFuel ANPR v8 (100-demo-records + OCR image library)','records_are_demo':DEMO}

@app.get('/')
def home(request:Request,db:Session=Depends(db_session)):
    user,_=user_from_session(request,db)
    return FileResponse(ROOT/'static'/'index.html') if user else RedirectResponse('/login',status_code=303)

@app.get('/login')
def login_page(request:Request,db:Session=Depends(db_session)):
    user,_=user_from_session(request,db)
    return RedirectResponse('/',status_code=303) if user else FileResponse(ROOT/'static'/'login.html')

# Persistent, shared rate limit keyed by hashed request IP + username.
# Avoid trusting spoofable X-Forwarded-For headers from the open internet.
def login_identity(req,email):
    ip=req.client.host if req.client else 'unknown'
    key=os.getenv('SESSION_SECRET','').encode()
    return hmac.new(key,(ip+'|'+email).encode(),hashlib.sha256).hexdigest()

@app.post('/api/login')
async def login(request:Request,db:Session=Depends(db_session)):
    body=await request.json();email=str(body.get('email','')).strip().lower();password=str(body.get('password',''))
    identity=login_identity(request,email);cutoff=datetime.now(timezone.utc).replace(tzinfo=None)-timedelta(minutes=10)
    attempts=db.query(LoginFailure).filter(LoginFailure.identity_hash==identity,LoginFailure.happened_at>=cutoff).count()
    if attempts>=8:fail(429,'Too many attempts. Retry after ten minutes.')
    user=db.query(User).filter_by(email=email,active=True).first()
    if not user or not check_password(password,user.password_hash):
        db.add(LoginFailure(identity_hash=identity,happened_at=datetime.now(timezone.utc).replace(tzinfo=None)))
        db.commit();fail(401,'Invalid login credentials')
    db.query(LoginFailure).filter(LoginFailure.identity_hash==identity).delete(synchronize_session=False)
    # Bound growth from automated failed login attempts.
    db.query(LoginFailure).filter(LoginFailure.happened_at<cutoff).delete(synchronize_session=False)
    db.query(RevokedSession).filter(RevokedSession.expires_at<datetime.now(timezone.utc).replace(tzinfo=None)).delete(synchronize_session=False)
    token,csrf=create_token(user)
    reply=JSONResponse({'ok':True,'name':user.name,'role':user.role,'csrf':csrf})
    reply.set_cookie('sf_session',token,httponly=True,secure=COOKIE_SECURE,samesite='lax',max_age=8*3600,path='/')
    audit(db,user,'auth.login',email);db.commit()
    return reply

@app.post('/api/logout')
def logout(request:Request,user:User=Depends(require_user),db:Session=Depends(db_session)):
    token=request.cookies.get('sf_session','')
    if token:
        digest=hashlib.sha256(token.encode('utf8')).hexdigest()
        if not db.get(RevokedSession,digest):
            db.add(RevokedSession(token_sha256=digest,expires_at=datetime.now(timezone.utc).replace(tzinfo=None)+timedelta(hours=9)))
    audit(db,user,'auth.logout',str(user.id))
    db.commit()
    response=JSONResponse({'ok':True});response.delete_cookie('sf_session',path='/');return response

@app.get('/api/me')
def me(request:Request,db:Session=Depends(db_session)):
    u,data=user_from_session(request,db)
    if not u:fail(401,'Not signed in')
    return {'id':u.id,'email':u.email,'name':u.name,'role':u.role,'station_id':u.station_id,'csrf':data.get('csrf')}

@app.get('/api/status')
def system_status(user:User=Depends(require_user)):
    binary=configure_tesseract()
    return {'ok':True,'mode':'Commercial pilot — synthetic data only','tesseract_ready':bool(binary),'tesseract_path':binary or 'Not found','database':'PostgreSQL' if DB_URL.startswith('postgresql') else 'SQLite (development only)','records_are_demo':True}

@app.get('/api/summary')
def summary(user:User=Depends(require_user),db:Session=Depends(db_session)):
    rows=db.query(Vehicle).all()  # central demo vehicle registry shared across stations
    counts={s:0 for s in ('valid','expired','missing','not_cng','unverified','not_registered')}
    for v in rows:counts[result_for(db,user,v.plate)['status']]+=1
    q=db.query(Inspection)
    if user.role!='admin' and user.station_id is not None:q=q.filter_by(station_id=user.station_id)
    return {'total_vehicles':len(rows),'total_scans':q.count(),'counts':counts,'recent_scans':[serialize_scan(s) for s in q.order_by(Inspection.id.desc()).limit(8)]}

@app.get('/api/vehicles')
def vehicles(q:str='',user:User=Depends(require_user),db:Session=Depends(db_session)):
    qs=db.query(Vehicle)
    rows=qs.order_by(Vehicle.plate).limit(500).all()
    return [result_for(db,user,v.plate) for v in rows if not q or q.upper() in (v.plate+' '+v.model.upper())]

@app.get('/api/vehicles/{plate}')
def vehicle_detail(plate:str,user:User=Depends(require_user),db:Session=Depends(db_session)):
    r=result_for(db,user,plate)
    if r['vehicle'] is None:fail(404,'Vehicle not registered')
    return r

@app.post('/api/vehicles')
async def upsert_vehicle(request:Request,user:User=Depends(require_user),db:Session=Depends(db_session)):
    permitted(user,('admin',))
    body=await request.json();p=plate_norm(body.get('plate'))
    if not PLATE_RE.fullmatch(p):fail(400,'Registration must be 6-14 letters or digits')
    endorsement=body.get('cng_endorsed','unknown')
    if endorsement not in ('yes','no','unknown'):fail(400,'Invalid CNG endorsement')
    cylinders=body.get('cylinders',[])
    if not isinstance(cylinders,list) or len(cylinders)>12:fail(400,'Maximum 12 cylinders per vehicle')
    seen=set();normalized=[]
    for c in cylinders:
        serial=str(c.get('serial','')).strip().upper()[:75]
        if not serial or serial in seen:fail(400,'Cylinder serial numbers must be unique and nonempty')
        seen.add(serial)
        for key in ('last_test','expiry'):
            val=str(c.get(key,'')).strip()
            if val:
                try:date.fromisoformat(val)
                except ValueError:fail(400,'Dates must be YYYY-MM-DD')
        normalized.append({'serial':serial,'last_test':str(c.get('last_test',''))[:10],'expiry':str(c.get('expiry',''))[:10],'certificate_ref':str(c.get('certificate_ref',''))[:100]})
    v=db.get(Vehicle,p)
    if v is None:v=Vehicle(plate=p);db.add(v)
    v.model=str(body.get('model',''))[:120];v.owner_name=str(body.get('owner_name','')).strip()[:120];v.cng_endorsed=endorsement;v.notes=str(body.get('notes',''))[:500]
    v.station_id=resolve_station(db,user,body.get('station_id'))
    old={c.serial:c for c in v.cylinders}
    new=[]
    for c in normalized:
        item=old.get(c['serial']) or Cylinder(serial=c['serial']);item.last_test=c['last_test'];item.expiry=c['expiry'];item.certificate_ref=c['certificate_ref'];new.append(item)
    v.cylinders=new
    db.flush();audit(db,user,'vehicle.upsert',p);db.commit();return result_for(db,user,p)

@app.delete('/api/vehicles/{plate}')
def remove_vehicle(plate:str,user:User=Depends(require_user),db:Session=Depends(db_session)):
    permitted(user,('admin',))
    v=db.get(Vehicle,plate_norm(plate))
    if not v:return {'deleted':False}
    db.delete(v);audit(db,user,'vehicle.delete',v.plate);db.commit();return {'deleted':True}

@app.post('/api/lookup')
async def lookup(request:Request,user:User=Depends(require_user),db:Session=Depends(db_session)):
    permitted(user,('admin','operator'))
    body=await request.json();p=plate_norm(body.get('plate'))
    if not PLATE_RE.fullmatch(p):fail(400,'Please enter a valid demonstration registration')
    r=result_for(db,user,p)
    ident=create_inspection(db,user,body.get('recognized_plate',p),p,body.get('confidence',0),'Manual confirmation',r,station_id=body.get('station_id'))
    return {'id':ident,'recognition':{'plate':p,'manual':True,'confidence':0},'result':r}

@app.post('/api/vahan/query')
async def vahan_query(request:Request,user:User=Depends(require_user),db:Session=Depends(db_session)):
    """Queries VAHAN gateway, auto-caches the vehicle record, and returns statutory safety status."""
    permitted(user,('admin','operator'))
    body=await request.json();p=plate_norm(body.get('plate'))
    if not PLATE_RE.fullmatch(p):fail(400,'Valid vehicle registration plate required')
    r=result_for(db,user,p,auto_resolve=True)
    return {'ok':True,'plate':p,'status':r['status'],'vehicle':r.get('vehicle'),'explanation':r.get('explanation')}

@app.post('/api/scan')
async def scan(request:Request,user:User=Depends(require_user),db:Session=Depends(db_session)):
    permitted(user,('admin','operator'))
    body=await request.json()
    resolve_station(db,user,body.get('station_id'))
    raw=unpack_data_url(body.get('image_base64'))
    try:
        async with OCR_LIMIT:
            rec=await asyncio.to_thread(ocr_plate,raw)
            saved=await asyncio.to_thread(save_photo,raw)
    except (ValueError,RuntimeError) as exc:fail(400,str(exc))
    p=rec['plate'];low_confidence=bool(p and float(rec.get('confidence') or 0)<35)
    r=({'plate':p,'vehicle':None,'status':'unverified','explanation':'Low OCR confidence: manually confirm the plate before checking a record','disclaimer':'DEMO DATA — NOT VERIFIED'} if low_confidence else result_for(db,user,p)) if p else {'plate':'','vehicle':None,'status':'unverified','explanation':'OCR failed to read the plate: verify it manually','disclaimer':'DEMO DATA — NOT VERIFIED'}
    rec['needs_review']=bool(low_confidence or not p)
    ident=create_inspection(db,user,p,p,rec.get('confidence',0),str(body.get('method','Image upload'))[:50],r,saved,station_id=body.get('station_id'),needs_review=rec['needs_review'])
    return {'id':ident,'recognition':rec,'result':r,'image_url':'/api/snapshots/'+saved}

# --- v6: live browser OCR monitoring and immutable entry event ledger ---

@app.post('/api/camera/preview')
async def camera_preview(request:Request,user:User=Depends(require_user),db:Session=Depends(db_session)):
    """Read only: recognize a single preview frame; do not save every frame."""
    permitted(user,('admin','operator'))
    body=await request.json()
    resolve_station(db,user,body.get('station_id'))
    raw=unpack_data_url(body.get('image_base64'),max_bytes=3*1024*1024)
    try:
        async with OCR_LIMIT:
            rec=await asyncio.to_thread(ocr_plate,raw)
    except (ValueError,RuntimeError) as exc:fail(400,str(exc))
    plate=plate_norm(rec.get('plate'))
    if not PLATE_RE.fullmatch(plate or ''):plate=''
    return {'plate':plate,'confidence':round(float(rec.get('confidence') or 0),2),
            'needs_review':bool(plate and float(rec.get('confidence') or 0)<35),
            'message':'Candidate found' if plate else 'Waiting for a readable number plate'}

@app.post('/api/camera/entry')
async def camera_entry(request:Request,user:User=Depends(require_user),db:Session=Depends(db_session)):
    """Create exactly one entry observation per plate/station per cooldown period.

    Reprocesses the submitted image server-side; never trusts the browser's
    claimed registration. A low-confidence result is saved for manual review,
    not represented as a completed certificate verification.
    """
    permitted(user,('admin','operator'))
    body=await request.json()
    sid=resolve_station(db,user,body.get('station_id'))
    raw=unpack_data_url(body.get('image_base64'),max_bytes=3*1024*1024)
    expected=plate_norm(body.get('expected_plate'))
    if not PLATE_RE.fullmatch(expected):fail(400,'Candidate plate is required')
    session=str(body.get('camera_session',''))
    if not re.fullmatch(r'[A-Za-z0-9:_-]{8,64}',session):fail(400,'Invalid camera session')
    try:
        async with OCR_LIMIT:
            rec=await asyncio.to_thread(ocr_plate,raw)
    except (ValueError,RuntimeError) as exc:fail(400,str(exc))
    p=plate_norm(rec.get('plate'))
    if not PLATE_RE.fullmatch(p) or p!=expected:
        return {'accepted':False,'needs_review':True,'plate':p,'message':'OCR changed between frames. Keep monitoring or correct manually.'}
    now=datetime.now(timezone.utc).replace(tzinfo=None)
    # Prevent repeated frames from becoming multiple entry records.
    recent=db.query(VehicleEvent).filter(VehicleEvent.station_id==sid,VehicleEvent.plate==p,
           VehicleEvent.event_type=='entry',VehicleEvent.observed_at>=now-timedelta(seconds=180)).order_by(VehicleEvent.id.desc()).first()
    if recent:
        return {'accepted':False,'duplicate':True,'plate':p,'entry_id':recent.id,
                'inspection_id':recent.inspection_id,'message':'Already recorded recently at this station'}
    confidence=round(float(rec.get('confidence') or 0),2)
    needs_review=confidence<35
    result=(result_for(db,user,p) if not needs_review else
            {'plate':p,'vehicle':None,'status':'unverified',
             'explanation':'OCR confidence is low. Confirm the detected plate before relying on its demo database result.',
             'disclaimer':'DEMO DATA — MANUAL REVIEW REQUIRED'})
    photo=await asyncio.to_thread(save_photo,raw)
    ident=create_inspection(db,user,p,p,confidence,'Automatic USB webcam',result,photo,
                            station_id=sid,event_type='entry',needs_review=needs_review,camera_session=session)
    ev=db.query(VehicleEvent).filter_by(inspection_id=ident).first()
    return {'accepted':True,'entry_id':ev.id,'entry_at':utc_timestamp(ev.observed_at),
            'id':ident,'recognition':dict(rec,needs_review=needs_review),
            'result':result,'image_url':'/api/snapshots/'+photo}

def serialize_vehicle_event(db,event):
    s=db.get(Inspection,event.inspection_id)
    st=db.get(Station,event.station_id)
    return {'id':event.id,'entry_at':utc_timestamp(event.observed_at),
            'plate':event.plate,'station_id':event.station_id,'station_name':st.name if st else '',
            'event_type':event.event_type,'source':event.source,'status':event.status,
            'confidence':event.confidence,'needs_review':event.needs_review,
            'inspection_id':event.inspection_id,
            'image_url':'/api/snapshots/'+s.image_file if s and s.image_file else None,
            'report_url':'/api/reports/'+str(event.inspection_id)}

@app.get('/api/entries/summary')
def entry_summary(station_id:Optional[int]=None,user:User=Depends(require_user),db:Session=Depends(db_session)):
    if user.role!='admin':
        if user.station_id is None:fail(403,'Station scope required')
        if station_id is not None and station_id!=user.station_id:fail(403,'Other station not permitted')
        station_id=user.station_id
    elif station_id is not None and not db.get(Station,station_id):fail(404,'Station not found')
    q=db.query(VehicleEvent)
    if station_id is not None:q=q.filter(VehicleEvent.station_id==station_id)
    today=datetime.now(timezone.utc).date()
    begin=datetime.combine(today,datetime.min.time())
    end=begin+timedelta(days=1)
    day=q.filter(VehicleEvent.observed_at>=begin,VehicleEvent.observed_at<end)
    return {'total_events':q.count(),
            'camera_entries_today':day.filter(VehicleEvent.event_type=='entry').count(),
            'pending_review':q.filter(VehicleEvent.needs_review.is_(True)).count(),
            'attention_today':day.filter(VehicleEvent.status.in_(['expired','missing','unverified','not_registered'])).count(),
            'day_utc':today.isoformat()}

@app.get('/api/entries')
def entries(q:str='',station_id:Optional[int]=None,limit:int=Query(200,ge=1,le=1000),
            user:User=Depends(require_user),db:Session=Depends(db_session)):
    if user.role!='admin':
        if user.station_id is None:fail(403,'Station scope required')
        if station_id and station_id!=user.station_id:fail(403,'Other station not permitted')
        station_id=user.station_id
    elif station_id is not None and not db.get(Station,station_id):fail(404,'Station not found')
    query=db.query(VehicleEvent)
    if station_id is not None:query=query.filter(VehicleEvent.station_id==station_id)
    p=plate_norm(q)
    if p:query=query.filter(VehicleEvent.plate.contains(p))
    return [serialize_vehicle_event(db,item) for item in query.order_by(VehicleEvent.id.desc()).limit(limit)]

@app.get('/api/entries.csv')
def entries_csv(q:str='',station_id:Optional[int]=None,user:User=Depends(require_user),db:Session=Depends(db_session)):
    rows=entries(q,station_id,1000,user,db)
    buf=io.StringIO();writer=csv.writer(buf)
    writer.writerow(['Event ID','Observed at UTC','Plate','Station','Event type','Source','Demo status','OCR confidence','Review required','Inspection ID'])
    for item in rows:
        writer.writerow([item[k] for k in ['id','entry_at','plate','station_name','event_type','source','status','confidence','needs_review','inspection_id']])
    return Response(buf.getvalue(),media_type='text/csv',headers={'Content-Disposition':'attachment; filename="smartfuel-vehicle-events.csv"','Cache-Control':'no-store'})

@app.post('/api/entries/{event_id}/confirm')
async def confirm_entry(event_id:int,request:Request,user:User=Depends(require_user),db:Session=Depends(db_session)):
    permitted(user,('admin','operator'))
    event=db.get(VehicleEvent,event_id)
    if not event:fail(404,'Vehicle event not found')
    if user.role!='admin' and event.station_id!=user.station_id:fail(403,'Other station not permitted')
    body=await request.json();p=plate_norm(body.get('plate'))
    if not PLATE_RE.fullmatch(p):fail(400,'Valid demonstration plate is required')
    s=authorized_inspection(db,user,event.inspection_id)
    r=result_for(db,user,p)
    original=s.checked_plate
    s.checked_plate=p;s.status=r['status'];s.details_json=json.dumps(r)
    event.plate=p;event.status=r['status'];event.needs_review=False
    audit(db,user,'entry.confirmed',str(event.id),f'{original} -> {p}')
    db.commit()
    return {'id':s.id,'entry_id':event.id,'entry_at':utc_timestamp(event.observed_at),
            'recognition':{'plate':s.recognized_plate,'confidence':s.confidence,'manual':True},
            'result':r,'image_url':'/api/snapshots/'+s.image_file if s.image_file else None}

@app.get('/api/entries/{event_id}')
def entry_detail(event_id:int,user:User=Depends(require_user),db:Session=Depends(db_session)):
    item=db.get(VehicleEvent,event_id)
    if not item:fail(404,'Vehicle event not found')
    if user.role!='admin' and item.station_id!=user.station_id:fail(403,'Other station not permitted')
    s=authorized_inspection(db,user,item.inspection_id)
    return {'event':serialize_vehicle_event(db,item),'inspection':serialize_scan(s),
            'result':json.loads(s.details_json or '{}')}

@app.get('/api/scans')
def scans(user:User=Depends(require_user),db:Session=Depends(db_session),limit:int=Query(100,ge=1,le=500)):
    q=db.query(Inspection)
    if user.role!='admin' and user.station_id is not None:q=q.filter_by(station_id=user.station_id)
    return [serialize_scan(s) for s in q.order_by(Inspection.id.desc()).limit(limit)]

@app.get('/api/alerts')
def alerts(user:User=Depends(require_user),db:Session=Depends(db_session)):
    q=db.query(Inspection).filter(Inspection.status.in_(['expired','missing','unverified','not_registered']))
    if user.role!='admin' and user.station_id is not None:q=q.filter_by(station_id=user.station_id)
    return [serialize_scan(s) for s in q.order_by(Inspection.id.desc()).limit(40)]

@app.delete('/api/scans/{ident}')
def remove_scan(ident:int,user:User=Depends(require_user),db:Session=Depends(db_session)):
    permitted(user,('admin',))
    s=authorized_inspection(db,user,ident)
    name=s.image_file
    db.query(VehicleEvent).filter_by(inspection_id=ident).delete(synchronize_session=False);db.delete(s);audit(db,user,'inspection.delete',str(ident));db.commit()
    if name and re.fullmatch(r'[a-f0-9]{32}\.jpg',name):
        try:(SNAPS/name).unlink(missing_ok=True)
        except OSError:log.warning('Failed to delete old snapshot for scan %s',ident)
    return {'deleted':True}

@app.get('/api/scans.csv')
def scans_csv(user:User=Depends(require_user),db:Session=Depends(db_session)):
    rows=scans(user,db,500);buff=io.StringIO();writer=csv.writer(buff)
    writer.writerow(['ID','Time UTC','OCR plate','Checked plate','Confidence','Method','Demo status'])
    for s in rows:writer.writerow([s[k] for k in ['id','scanned_at','recognized_plate','checked_plate','confidence','method','status']])
    return Response(buff.getvalue(),media_type='text/csv',headers={'Content-Disposition':'attachment; filename="smartfuel-inspections.csv"'})

@app.get('/api/reports/{ident}')
def report(ident:int,user:User=Depends(require_user),db:Session=Depends(db_session)):
    s=authorized_inspection(db,user,ident)
    data=json.loads(s.details_json or '{}');v=data.get('vehicle') or {};cyls=v.get('cylinders',[])
    lines=[('Inspection ID',str(s.id)),('Timestamp UTC',str(s.scanned_at)),('Recognised number',s.recognized_plate),('Checked number',s.checked_plate),('Inspection method',s.method),('Station',str(db.get(Station,s.station_id).name if s.station_id and db.get(Station,s.station_id) else s.station_id or 'Unknown')),('Operator ID',str(s.operator_id or 'Station edge device')),('OCR confidence',str(s.confidence)+'%'),('Demonstration result',s.status.upper()),('Vehicle / Model',v.get('model','Not found')),('CNG on sample RC',v.get('cng_endorsed','unknown')),('Stored cylinders',str(len(cyls)))]
    ev=db.query(VehicleEvent).filter_by(inspection_id=s.id).first()
    if ev:lines.extend([('Observation type',ev.event_type),('Observed at UTC',str(ev.observed_at)),('Station event ID',str(ev.id)),('Manual review needed',str(ev.needs_review))])
    for i,c in enumerate(cyls,1):
        lines.extend([(f'Cylinder {i} serial',c['serial']),(f'Cylinder {i} expiry',c['expiry']),(f'Cylinder {i} status',c['status']),(f'Cylinder {i} certificate',c.get('certificate_ref') or 'MISSING'),(f'Cylinder {i} evidence',c.get('evidence','unknown'))])
    return build_pdf('Inspection report #'+str(s.id),lines,f'SmartFuel-Inspection-{s.id}-DEMO.pdf')

@app.get('/api/certificates/{ident}')
def certificate(ident:int,user:User=Depends(require_user),db:Session=Depends(db_session)):
    c=db.get(Cylinder,ident)
    if not c:fail(404,'Cylinder not found')
    authorized_vehicle(db,user,c.plate)
    lines=[('Vehicle (fictional)',c.plate),('Cylinder serial',c.serial),('Last hydrotest',c.last_test or 'Not recorded'),('Sample expiry',c.expiry or 'Not recorded'),('Demo reference',c.certificate_ref or 'MISSING'),('Sample status',cylinder_state(c).upper())]
    return build_pdf('Hydrotesting reference — DEMONSTRATION ONLY',lines,f'SmartFuel-Cylinder-{c.id}-SAMPLE.pdf')

@app.post('/api/certificates/attach')
async def attach_certificate(request:Request,user:User=Depends(require_user),db:Session=Depends(db_session)):
    permitted(user,('admin',))
    body=await request.json();c=db.get(Cylinder,body.get('cylinder_id'))
    if not c:fail(404,'Cylinder not found')
    filename=Path(str(body.get('filename',''))).name
    ext=Path(filename).suffix.lower().replace('.jpeg','.jpg')
    if ext not in ('.png','.jpg','.pdf'):fail(400,'Only PDF, PNG or JPEG accepted')
    raw=unpack_data_url(body.get('file_base64'),5*1024*1024)
    if ext=='.pdf' and not raw.startswith(b'%PDF-'):fail(400,'Invalid PDF header')
    if ext in ('.jpg','.png'):
        try:read_image(raw)
        except ValueError as e:fail(400,str(e))
    stored=uuid.uuid4().hex+ext;(CERTS/stored).write_bytes(raw)
    old_file=c.certificate_file
    c.certificate_file=stored;audit(db,user,'certificate.attach',c.plate,stored);db.commit()
    if old_file and FILE_RE.fullmatch(old_file):
        try:(CERTS/old_file).unlink(missing_ok=True)
        except OSError:log.warning('Old sample attachment deletion failed')
    return {'ok':True,'cylinder_id':c.id}

@app.get('/api/certificate-files/{ident}')
def get_certificate_file(ident:int,user:User=Depends(require_user),db:Session=Depends(db_session)):
    c=db.get(Cylinder,ident)
    if not c:fail(404,'Cylinder not found')
    authorized_vehicle(db,user,c.plate)
    name=c.certificate_file
    if not name or not FILE_RE.fullmatch(name):fail(404,'No valid sample attachment')
    path=CERTS/name
    if not path.is_file():fail(404,'Sample attachment missing')
    return FileResponse(path,media_type={'.pdf':'application/pdf','.png':'image/png','.jpg':'image/jpeg'}[path.suffix],headers={'X-Demo-Only':'true'})

@app.get('/api/snapshots/{name}')
def snapshot(name:str,user:User=Depends(require_user),db:Session=Depends(db_session)):
    if not re.fullmatch(r'[a-f0-9]{32}\.jpg',name):fail(404,'Not found')
    s=db.query(Inspection).filter_by(image_file=name).first()
    if not s:fail(404,'Not found')
    authorized_inspection(db,user,s.id)
    return FileResponse(SNAPS/name,media_type='image/jpeg')

@app.get('/api/stations')
def stations(user:User=Depends(require_user),db:Session=Depends(db_session)):
    q=db.query(Station)
    if user.role!='admin' and user.station_id is not None:q=q.filter_by(id=user.station_id)
    return [{'id':s.id,'name':s.name,'city':s.city,'camera_name':s.camera_name} for s in q.all()]

@app.post('/api/stations')
async def station_create(request:Request,user:User=Depends(require_user),db:Session=Depends(db_session)):
    permitted(user,('admin',))
    data=await request.json();name=str(data.get('name','')).strip()[:140]
    if not name:fail(400,'Station name required')
    obj=Station(name=name,city=str(data.get('city',''))[:140],camera_name=str(data.get('camera_name','USB / Webcam'))[:100]);db.add(obj);db.flush();audit(db,user,'station.create',obj.id,name);db.commit();return {'id':obj.id,'name':obj.name}

@app.get('/api/users')
def users(user:User=Depends(require_user),db:Session=Depends(db_session)):
    permitted(user,('admin',))
    return [{'id':u.id,'name':u.name,'email':u.email,'role':u.role,'station_id':u.station_id,'active':u.active} for u in db.query(User).order_by(User.id).all()]

@app.post('/api/users')
async def user_create(request:Request,user:User=Depends(require_user),db:Session=Depends(db_session)):
    permitted(user,('admin',))
    body=await request.json();email=str(body.get('email','')).strip().lower();role=body.get('role','viewer')
    if not re.fullmatch(r'[^@ ]+@[^@ ]+\.[^@ ]+',email):fail(400,'Valid email required')
    if role not in ('admin','operator','viewer'):fail(400,'Role must be admin, operator or viewer')
    if db.query(User).filter_by(email=email).first():fail(409,'User already exists')
    try:password_hash=hash_password(str(body.get('password','')))
    except ValueError as e:fail(400,str(e))
    sid=body.get('station_id')
    if role!='admin' and not sid:fail(400,'Station assignment is required for station operators/viewers')
    if sid:
        try:sid=int(sid)
        except (ValueError,TypeError):fail(400,'Invalid station ID')
        if not db.get(Station,sid):fail(400,'Station not found')
    record=User(email=email,password_hash=password_hash,name=str(body.get('name',''))[:100],role=role,station_id=int(sid) if sid else None,active=True)
    db.add(record);audit(db,user,'user.create',email,role);db.commit();return {'ok':True,'email':email,'role':role}


@app.post('/api/change-password')
async def change_password(request:Request,user:User=Depends(require_user),db:Session=Depends(db_session)):
    body=await request.json()
    if not check_password(str(body.get('current_password','')),user.password_hash):fail(403,'Current password incorrect')
    try:user.password_hash=hash_password(str(body.get('new_password','')))
    except ValueError as e:fail(400,str(e))
    audit(db,user,'auth.password_changed',user.email);db.commit();return {'ok':True}

@app.post('/api/users/{ident}/status')
async def change_user_status(ident:int,request:Request,user:User=Depends(require_user),db:Session=Depends(db_session)):
    permitted(user,('admin',))
    target=db.get(User,ident)
    if not target:fail(404,'User not found')
    if target.id==user.id:fail(400,'You cannot disable your own account')
    data=await request.json()
    if not isinstance(data.get('active'),bool):fail(400,'Provide a boolean active state')
    target.active=data['active'];audit(db,user,'user.status',target.email,str(target.active));db.commit()
    return {'ok':True,'active':target.active}

@app.get('/api/audit')
def audit_list(user:User=Depends(require_user),db:Session=Depends(db_session)):
    permitted(user,('admin',))
    return [{'id':a.id,'time':str(a.happened_at),'action':a.action,'subject':a.subject,'actor_id':a.actor_id} for a in db.query(Audit).order_by(Audit.id.desc()).limit(150)]


# --- Commercial pilot v5 analytics, monitoring and station cameras ---
@app.get('/api/analytics')
def analytics(station_id:Optional[int]=None,days:int=Query(30,ge=1,le=365),user:User=Depends(require_user),db:Session=Depends(db_session)):
    if user.role!='admin':
        if user.station_id is None:fail(403,'Station scope is required')
        if station_id is not None and station_id!=user.station_id:fail(403,'Cannot access another station')
        station_id=user.station_id
    elif station_id is not None and not db.get(Station,station_id):fail(404,'Station not found')
    since=datetime.now(timezone.utc).replace(tzinfo=None)-timedelta(days=days)
    q=db.query(Inspection).filter(Inspection.scanned_at>=since)
    if station_id is not None:q=q.filter(Inspection.station_id==station_id)
    rows=q.all()
    statuses={k:0 for k in ('valid','expired','missing','unverified','not_registered','not_cng')}
    daily={}
    for item in rows:
        statuses[item.status]=statuses.get(item.status,0)+1
        day=item.scanned_at.strftime('%Y-%m-%d') if item.scanned_at else 'unknown'
        daily[day]=daily.get(day,0)+1
    return {'days':days,'station_id':station_id,'total':len(rows),'statuses':statuses,
            'daily':[{'date':key,'count':daily[key]} for key in sorted(daily)],
            'attention':statuses['expired']+statuses['missing']+statuses['unverified']+statuses['not_registered']}

@app.get('/api/cng-display/latest')
def cng_display_latest(station_id:Optional[int]=None,user:User=Depends(require_user),db:Session=Depends(db_session)):
    # Station kiosks must never access another station's observations.
    if user.role!='admin':
        if user.station_id is None:fail(403,'Assigned station required')
        if station_id is not None and station_id!=user.station_id:fail(403,'Different station is not permitted')
        station_id=user.station_id
    elif station_id is not None and not db.get(Station,station_id):fail(404,'Station not found')
    if station_id is None:
        available=db.query(Station.id).limit(2).all()
        if len(available)==1:station_id=available[0][0]
        else:fail(400,'Choose a station to view the CNG display')
    q=db.query(Inspection).filter(Inspection.station_id==station_id)
    scans=q.order_by(Inspection.id.desc()).limit(7).all()
    summaries=[]
    for scan in scans:
        event=db.query(VehicleEvent).filter_by(inspection_id=scan.id).first()
        saved=json.loads(scan.details_json or '{}')
        decision=cng_supply_guidance(saved,needs_review=bool(event and event.needs_review))
        summaries.append({
            'inspection_id':scan.id,'observed_at':utc_timestamp(event.observed_at if event else scan.scanned_at),
            'source':scan.method,'event_type':event.event_type if event else 'inspection',
            'station_id':scan.station_id,'plate':decision['plate'], 'owner_name':(saved.get('vehicle') or {}).get('owner_name',''),
            'decision':decision,'ocr_confidence':scan.confidence,
            'report_url':f'/api/reports/{scan.id}'})
    station=db.get(Station,station_id)
    return {'station_id':station_id,'station_name':station.name if station else '',
            'latest':summaries[0] if summaries else None,'recent':summaries,
            'disclaimer':'ALL RECORDS ARE DEMONSTRATION DATA. NOT GOVERNMENT VERIFIED.'}

@app.get('/cng-display')
def cng_display(request:Request,db:Session=Depends(db_session)):
    user,_=user_from_session(request,db)
    if not user:return RedirectResponse('/login',status_code=303)
    return FileResponse(ROOT/'static'/'cng-display.html')

@app.get('/alerts/wall')
def station_wall(request:Request,db:Session=Depends(db_session)):
    user,_=user_from_session(request,db)
    if not user:return RedirectResponse('/login',status_code=303)
    return FileResponse(ROOT/'static'/'alert-wall.html')

@app.get('/api/cameras')
def list_cameras(user:User=Depends(require_user),db:Session=Depends(db_session)):
    permitted(user,('admin',))
    rows=db.query(CameraDevice).order_by(CameraDevice.id.desc()).all()
    return [{'id':a.id,'station_id':a.station_id,'name':a.name,'enabled':a.enabled,
             'last_seen':a.last_seen.isoformat() if a.last_seen else None} for a in rows]

def hash_device_token(token):
    return hmac.new(os.environ['SESSION_SECRET'].encode(),token.encode(),hashlib.sha256).hexdigest()

@app.post('/api/cameras')
async def register_camera(request:Request,user:User=Depends(require_user),db:Session=Depends(db_session)):
    permitted(user,('admin',))
    body=await request.json()
    try:sid=int(body.get('station_id'))
    except (ValueError,TypeError):fail(400,'Select a valid station')
    if not db.get(Station,sid):fail(404,'Station does not exist')
    name=str(body.get('name','')).strip()[:140]
    if not name:fail(400,'Camera name required')
    token=secrets.token_urlsafe(40)
    camera=CameraDevice(station_id=sid,name=name,token_hash=hash_device_token(token),enabled=True)
    db.add(camera);db.flush();audit(db,user,'camera.created',str(camera.id),name);db.commit()
    # Raw secret is returned once, and never stored in DB or logs.
    return {'id':camera.id,'station_id':sid,'device_token':f'{camera.id}.{token}',
            'message':'Store this device token privately on your station PC. It will not be shown again.'}

@app.post('/api/cameras/{ident}/disable')
async def disable_camera(ident:int,user:User=Depends(require_user),db:Session=Depends(db_session)):
    permitted(user,('admin',))
    device=db.get(CameraDevice,ident)
    if not device:fail(404,'Camera not found')
    device.enabled=False;audit(db,user,'camera.disabled',str(ident));db.commit()
    return {'ok':True}

@app.post('/api/edge/scan')
async def edge_scan(request:Request,db:Session=Depends(db_session)):
    # Edge agent authenticates with its own revocable, station-scoped credential.
    header=request.headers.get('X-Device-Token','')
    try:ident_text,token=header.split('.',1);ident=int(ident_text)
    except (TypeError,ValueError):fail(401,'Invalid device token')
    if len(token)<40 or len(token)>140:fail(401,'Invalid device token')
    device=db.get(CameraDevice,ident)
    if not device or not device.enabled or not hmac.compare_digest(device.token_hash,hash_device_token(token)):
        fail(401,'Invalid device token')
    body=await request.json();raw=unpack_data_url(body.get('image_base64'))
    try:
        async with OCR_LIMIT:
            rec=await asyncio.to_thread(ocr_plate,raw)
    except (ValueError,RuntimeError) as exc:fail(400,str(exc))
    p=plate_norm(rec.get('plate'))
    if not p or float(rec.get('confidence') or 0)<35:
        device.last_seen=datetime.now(timezone.utc).replace(tzinfo=None);db.commit()
        return {'accepted':False,'needs_review':True,'plate':p,'message':'Plate not reliably recognized'}
    now=datetime.now(timezone.utc).replace(tzinfo=None)
    # Ignore repeated frames of same plate in short interval, per station.
    recent=db.query(Inspection).filter(Inspection.station_id==device.station_id,Inspection.checked_plate==p,
                    Inspection.scanned_at>=now-timedelta(seconds=90)).order_by(Inspection.id.desc()).first()
    if recent:
        device.last_seen=now;db.commit()
        return {'accepted':False,'duplicate':True,'plate':p,'inspection_id':recent.id}
    r=result_for(db,User(role='admin',id=None),p)
    saved=await asyncio.to_thread(save_photo,raw)
    obj=Inspection(recognized_plate=p,checked_plate=p,confidence=round(float(rec.get('confidence',0)),2),
                   method='Station edge camera',status=r['status'],details_json=json.dumps(r),
                   image_file=saved,station_id=device.station_id,operator_id=None)
    db.add(obj);db.flush();record_vehicle_event(db,obj,'entry',camera_session=f'edge:{device.id}');audit(db,None,'camera.inspection',str(obj.id),f'device={device.id}')
    device.last_seen=now;db.commit()
    return {'accepted':True,'plate':p,'inspection_id':obj.id,'status':r['status'],'demo':True}
