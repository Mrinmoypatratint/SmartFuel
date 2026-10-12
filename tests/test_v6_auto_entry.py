"""v6 controlled camera entry workflow: OCR, ledger, privacy, duplicates, station scoping."""
import base64, os, tempfile
import pytest
from pathlib import Path
TEMP=Path(tempfile.mkdtemp(prefix='sf-anpr-v6-tests-'))
os.environ.setdefault('DATABASE_URL','sqlite:///'+str(TEMP/'test.sqlite3'))
os.environ.setdefault('DATA_DIR',str(TEMP/'files'))
os.environ.setdefault('SESSION_SECRET','v6-test-secret-'+('R'*70))
os.environ.setdefault('ADMIN_EMAIL','test-admin-v6@example.test')
os.environ.setdefault('ADMIN_PASSWORD','TestAdminPasswordV6!123')
os.environ.setdefault('SEED_DEMO','1')
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, User, VehicleEvent, Inspection
from app.security import hash_password

SAMPLES=Path(__file__).resolve().parents[1]/'samples'

def login(c,email='v6audit@example.test',password='StrongV6TestPassword!123'):
    with SessionLocal() as db:
        if not db.query(User).filter_by(email=email).first():
            db.add(User(email=email,password_hash=hash_password(password),name='QA Admin',role='admin',active=True))
            db.commit()
    res=c.post('/api/login',json={'email':email,'password':password})
    assert res.status_code==200,res.text
    return {'X-CSRF-Token':res.json()['csrf']}

def image(name):
    return 'data:image/png;base64,'+base64.b64encode((SAMPLES/name).read_bytes()).decode('ascii')

def test_auto_entry_full_pipeline():
    from app.ocr_engine import configure_tesseract
    if not configure_tesseract():
        pytest.skip("Tesseract OCR not installed in system environment")
    with TestClient(app) as c:
        headers=login(c)
        sites=c.get('/api/stations').json(); sid=sites[0]['id']
        photo=image('03_MISSING_MH00DE0003.png')
        denied=c.post('/api/camera/preview',json={'image_base64':photo,'station_id':sid})
        assert denied.status_code==403
        preview=c.post('/api/camera/preview',json={'image_base64':photo,'station_id':sid},headers=headers)
        assert preview.status_code==200,preview.text
        assert preview.json()['plate']=='MH00DE0003'
        assert preview.json()['confidence']>=35
        assert 'inspection_id' not in preview.json()
        before=len(c.get('/api/entries').json())
        body={'image_base64':photo,'station_id':sid,'expected_plate':'MH00DE0003','camera_session':'web-qa-session-001'}
        recorded=c.post('/api/camera/entry',json=body,headers=headers)
        assert recorded.status_code==200,recorded.text
        data=recorded.json()
        assert data['accepted'] and data['result']['status']=='missing'
        assert data['entry_at'].endswith('Z')
        summary=c.get('/api/entries/summary');assert summary.status_code==200 and summary.json()['camera_entries_today']>=1
        after=c.get('/api/entries').json()
        assert len(after)==before+1
        entry=next(x for x in after if x['id']==data['entry_id'])
        assert entry['event_type']=='entry' and entry['station_id']==sid
        assert entry['plate']=='MH00DE0003'
        assert entry['image_url'] and c.get(entry['image_url']).status_code==200
        assert c.get(entry['report_url']).content.startswith(b'%PDF')
        detail=c.get('/api/entries/'+str(entry['id']))
        assert detail.status_code==200 and detail.json()['result']['vehicle']['cylinders']
        dup=c.post('/api/camera/entry',json=body,headers=headers)
        assert dup.status_code==200 and dup.json()['duplicate'] is True
        assert len(c.get('/api/entries').json())==len(after)
        assert 'MH00DE0003' in c.get('/api/entries.csv').text
        bad=c.post('/api/camera/entry',json=dict(body,expected_plate='UP00DE0006'),headers=headers)
        assert bad.json()['accepted'] is False

def test_low_confidence_requires_review_and_confirmation():
    from app.ocr_engine import configure_tesseract
    if not configure_tesseract():
        pytest.skip("Tesseract OCR not installed in system environment")
    with TestClient(app) as c:
        headers=login(c)
        sid=c.get('/api/stations').json()[0]['id']
        photo=image('02_VALID_DL00DE0002.png')
        body={'image_base64':photo,'station_id':sid,'expected_plate':'DL00DE0002','camera_session':'web-lowconf-test-002'}
        response=c.post('/api/camera/entry',json=body,headers=headers)
        assert response.status_code==200,response.text
        item=response.json()
        assert item['accepted'] and item['recognition']['needs_review']
        assert item['result']['status']=='unverified'
        ev=c.get('/api/entries/'+str(item['entry_id'])).json()['event']
        assert ev['needs_review'] and ev['event_type']=='entry'
        confirmed=c.post('/api/entries/'+str(item['entry_id'])+'/confirm',json={'plate':'DL00DE0002'},headers=headers)
        assert confirmed.status_code==200,confirmed.text
        assert confirmed.json()['result']['status']=='valid'
        ev2=c.get('/api/entries/'+str(item['entry_id'])).json()['event']
        assert ev2['needs_review'] is False and ev2['status']=='valid'
        assert ev2['entry_at']==ev['entry_at']
        assert ev2['inspection_id']==ev['inspection_id']

def test_inspection_does_not_become_physical_entry():
    with TestClient(app) as c:
        h=login(c)
        sid=c.get('/api/stations').json()[0]['id']
        manual=c.post('/api/lookup',headers=h,json={'plate':'UP00DE0006','station_id':sid})
        assert manual.status_code==200
        events=c.get('/api/entries?q=UP00DE0006').json()
        assert any(e['inspection_id']==manual.json()['id'] and e['event_type']=='inspection' for e in events)

def test_operators_only_see_own_station_events():
    with TestClient(app) as c:
        h=login(c)
        other=c.post('/api/stations',headers=h,json={'name':'v6 role test station','city':'Test City'}).json()['id']
        c.post('/api/lookup',headers=h,json={'plate':'UP00DE0006','station_id':other})
        created=c.post('/api/users',headers=h,json={'name':'Local Operator','email':'v6operator@example.test','password':'GoodOperatorPassword!123','role':'operator','station_id':other})
        assert created.status_code==200,created.text
    with TestClient(app) as op:
        login_result=op.post('/api/login',json={'email':'v6operator@example.test','password':'GoodOperatorPassword!123'})
        assert login_result.status_code==200
        my_events=op.get('/api/entries').json()
        assert my_events and all(e['station_id']==other for e in my_events)
        assert op.get('/api/entries?station_id=1').status_code==403
        assert op.get('/api/entries.csv?station_id=1').status_code==403
