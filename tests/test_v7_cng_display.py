"""v7 automatic station display and exact sample compliance reasons."""
import os, tempfile
from pathlib import Path
TEMP=Path(tempfile.mkdtemp(prefix='sf-v7-tests-'))
os.environ.setdefault('DATABASE_URL','sqlite:///'+str(TEMP/'test.sqlite3'))
os.environ.setdefault('DATA_DIR',str(TEMP/'store'))
os.environ.setdefault('SESSION_SECRET','v7-test-secret-'+'Y'*65)
os.environ.setdefault('ADMIN_EMAIL','cng-admin-v7@example.test')
os.environ.setdefault('ADMIN_PASSWORD','StrongV7AdminPassword!123')
os.environ.setdefault('SEED_DEMO','1')
from fastapi.testclient import TestClient
from app.main import app,cng_supply_guidance
from app.database import SessionLocal, User
from app.security import hash_password

def auth(c):
    email='v7station-display-admin@example.test'
    password='V7DemoStationPassword!123'
    with SessionLocal() as db:
        if not db.query(User).filter_by(email=email).first():
            db.add(User(email=email,password_hash=hash_password(password),name='Demo Controller',role='admin',active=True))
            db.commit()
    r=c.post('/api/login',json={'email':email,'password':password})
    assert r.status_code==200,r.text
    return {'X-CSRF-Token':r.json()['csrf']}

def test_hold_reason_and_latest_station_display():
    with TestClient(app) as c:
        h=auth(c)
        sites=c.get('/api/stations').json(); assert sites
        site=sites[0]['id']
        examples=[('KA00DE0004','hold','RC_CNG_NOT_ENDORSED'),('WB00DE0001','hold','HYDROTEST_EXPIRED'),('MH00DE0003','review','CERTIFICATE_OR_DATE_MISSING'),('TN00DE0005','review','RC_NOT_VERIFIED'),('UP00DE0006','demo_pass',None),('RJ00DE0007','review','VEHICLE_NOT_REGISTERED')]
        for plate,state,code in examples:
            r=c.post('/api/lookup',headers=h,json={'plate':plate,'station_id':site})
            assert r.status_code==200,r.text
            board=c.get('/api/cng-display/latest',params={'station_id':site})
            assert board.status_code==200,board.text
            latest=board.json()['latest']
            assert latest['plate']==plate
            assert latest['decision']['state']==state
            if code:assert code in latest['decision']['reason_codes']
            else:assert latest['decision']['reasons']==[]
        assert c.get('/cng-display').status_code==200
        assert c.get('/static/cng-display.js').status_code==200

def test_unverified_ocr_cannot_pass():
    d=cng_supply_guidance({'plate':'DL00DE0002','vehicle':None,'status':'unverified','explanation':'Low OCR confidence'},needs_review=True)
    assert d['state']=='review' and 'OCR_OR_RECORD_REVIEW' in d['reason_codes']

def test_custom_owner_and_station_scoping():
    with TestClient(app) as c:
        h=auth(c)
        sites=c.get('/api/stations').json(); sid=sites[0]['id']
        created=c.post('/api/stations',json={'name':'Second Display Station','city':'Test'},headers=h)
        assert created.status_code==200,created.text
        other=created.json()['id']
        p='ZZ00DE0011'
        payload={'plate':p,'model':'Fictional CNG hatchback','owner_name':'Sample Owner One','cng_endorsed':'no','station_id':sid,'cylinders':[]}
        res=c.post('/api/vehicles',json=payload,headers=h)
        assert res.status_code==200,res.text
        assert res.json()['vehicle']['owner_name']=='Sample Owner One'
        scan=c.post('/api/lookup',json={'plate':p,'station_id':other},headers=h)
        assert scan.status_code==200,scan.text
        latest=c.get('/api/cng-display/latest',params={'station_id':other}).json()['latest']
        assert latest['owner_name']=='Sample Owner One'
        assert latest['decision']['state']=='hold'
        with SessionLocal() as db:
            op=User(email='v7operator@example.test',password_hash=hash_password('V7OperatorPasswordStrong!'),name='Station Demo',role='operator',station_id=sid,active=True)
            db.add(op);db.commit()
    with TestClient(app) as op:
        r=op.post('/api/login',json={'email':'v7operator@example.test','password':'V7OperatorPasswordStrong!'})
        assert r.status_code==200
        assert op.get('/api/cng-display/latest',params={'station_id':other}).status_code==403
        own=op.get('/api/cng-display/latest',params={'station_id':sid})
        assert own.status_code==200
        assert own.json()['station_id']==sid
    with TestClient(app) as guest:
        assert guest.get('/api/cng-display/latest').status_code==401


def test_logout_revokes_copied_cookie():
    with TestClient(app) as c:
        headers=auth(c)
        stolen=c.cookies.get('sf_session')
        assert stolen
        assert c.post('/api/logout',headers=headers,json={}).status_code==200
        assert c.get('/api/cng-display/latest').status_code==401
    with TestClient(app) as copied:
        copied.cookies.set('sf_session',stolen)
        assert copied.get('/api/cng-display/latest').status_code==401


def test_existing_v6_database_gets_owner_field_without_data_loss(tmp_path):
    import app.database as database
    from sqlalchemy import create_engine, inspect, text
    legacy=create_engine('sqlite:///'+str(tmp_path/'existing-v6.sqlite3'))
    with legacy.begin() as conn:
        conn.execute(text('CREATE TABLE vehicles (plate VARCHAR(16) PRIMARY KEY, model VARCHAR(120))'))
        conn.execute(text("INSERT INTO vehicles (plate,model) VALUES ('WB00DE0001','Existing Demo Car')"))
    original=database.engine
    database.engine=legacy
    try:
        database.migrate_owner_column()
        database.migrate_owner_column()  # idempotent upgrade
    finally:
        database.engine=original
    assert 'owner_name' in {c['name'] for c in inspect(legacy).get_columns('vehicles')}
    with legacy.connect() as conn:
        assert conn.execute(text('SELECT plate,model FROM vehicles')).fetchone()==('WB00DE0001','Existing Demo Car')
    legacy.dispose()
