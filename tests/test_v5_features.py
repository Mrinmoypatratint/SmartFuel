"""New v5 features: station scope, analytics, camera ingestion, session revocation."""
import base64
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, User, Station
from app.security import hash_password

EMAIL='v5audit@example.test'
PASS='V5AuditStrongPassword!123'

def auth(c, password=PASS):
    r=c.post('/api/login',json={'email':EMAIL,'password':password})
    assert r.status_code==200,r.text
    return {'X-CSRF-Token':r.json()['csrf']}

def create_account():
    with SessionLocal() as db:
        if not db.query(User).filter_by(email=EMAIL).first():
            db.add(User(email=EMAIL,password_hash=hash_password(PASS),name='v5 Admin',role='admin',active=True));db.commit()

def test_v5_full_workflow():
  with TestClient(app) as admin:
    create_account();h=auth(admin)
    sites=admin.get('/api/stations').json()
    assert sites
    second=admin.post('/api/stations',json={'name':'v5 integration station'},headers=h)
    assert second.status_code==200
    s2=second.json()['id']
    assert admin.post('/api/lookup',json={'plate':'DL00DE0002'},headers=h).status_code==400
    good=admin.post('/api/lookup',json={'plate':'DL00DE0002','station_id':s2},headers=h)
    assert good.status_code==200 and good.json()['result']['status']=='valid'
    rows=admin.get('/api/scans').json()
    assert rows[0]['station_id']==s2
    analysis=admin.get('/api/analytics?station_id='+str(s2)+'&days=30')
    assert analysis.status_code==200
    assert analysis.json()['total']>=1
    assert admin.get('/alerts/wall').status_code==200
    assert admin.get('/static/alert-wall.js').status_code==200
    dev=admin.post('/api/cameras',headers=h,json={'station_id':s2,'name':'Mock station USB camera'})
    assert dev.status_code==200,dev.text
    token=dev.json()['device_token']
    assert token not in str(admin.get('/api/cameras').json())
    photo=(Path(__file__).resolve().parents[1]/'samples'/'03_MISSING_MH00DE0003.png').read_bytes()
    frame={'image_base64':'data:image/png;base64,'+base64.b64encode(photo).decode()}
    from app.ocr_engine import configure_tesseract
    if configure_tesseract():
        bad=admin.post('/api/edge/scan',json=frame,headers={'X-Device-Token':'invalid'})
        assert bad.status_code==401
        one=admin.post('/api/edge/scan',json=frame,headers={'X-Device-Token':token})
        assert one.status_code==200,one.text
        assert one.json().get('accepted'),one.text
        assert one.json()['status']=='missing'
        two=admin.post('/api/edge/scan',json=frame,headers={'X-Device-Token':token})
        assert two.json().get('duplicate') is True
    assert admin.post('/api/cameras/'+str(dev.json()['id'])+'/disable',headers=h).status_code==200
    assert admin.post('/api/edge/scan',json=frame,headers={'X-Device-Token':token}).status_code==401
    with TestClient(app) as old_session:
      old_h=auth(old_session)
      assert old_session.get('/api/me').status_code==200
      changed=admin.post('/api/change-password',headers=h,json={'current_password':PASS,'new_password':'V5ReplacementPassword!123'})
      assert changed.status_code==200
      assert old_session.get('/api/me').status_code==401, 'previous session must be revoked'
      assert admin.get('/api/me').status_code==401
      new_h=auth(admin,'V5ReplacementPassword!123')
      assert admin.get('/api/me').status_code==200
      reset=admin.post('/api/change-password',headers=new_h,json={'current_password':'V5ReplacementPassword!123','new_password':PASS})
      assert reset.status_code==200
