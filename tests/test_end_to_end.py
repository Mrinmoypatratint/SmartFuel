"""Executable source-level integration tests: login, CSRF, RBAC, demo records, OCR and reports."""
import os, sys, tempfile
import pytest
from pathlib import Path
TMP=Path(tempfile.mkdtemp(prefix='sf-anpr-test-'))
os.environ['DATABASE_URL']='sqlite:///'+str(TMP/'test.sqlite3')
os.environ['DATA_DIR']=str(TMP/'files')
os.environ['SESSION_SECRET']='integration-test-only-'+('A'*70)
os.environ['ADMIN_EMAIL']='owner@example.test'
os.environ['ADMIN_PASSWORD']='VeryLongDemoPassword!123'
os.environ['COOKIE_SECURE']='0'
os.environ['SEED_DEMO']='1'
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, Inspection


def test_complete_workflow():
  with TestClient(app) as client:
    assert client.get('/api/health').json()['ok']
    assert client.get('/',follow_redirects=False).status_code==303
    assert client.get('/api/vehicles').status_code==401
    wrong=client.post('/api/login',json={'email':'owner@example.test','password':'wrong'})
    assert wrong.status_code==401
    login=client.post('/api/login',json={'email':'owner@example.test','password':'VeryLongDemoPassword!123'})
    assert login.status_code==200
    csrf=login.json()['csrf'];headers={'X-CSRF-Token':csrf}
    assert client.get('/api/me').json()['role']=='admin'
    assert client.get('/').status_code==200
    assert client.get('/static/app.js').status_code==200
    assert client.get('/api/summary').json()['total_vehicles'] in (100, 101)
    assert client.post('/api/lookup',json={'plate':'DL00DE0002'}).status_code==403
    valid=client.post('/api/lookup',json={'plate':'DL00DE0002'},headers=headers)
    assert valid.status_code==200, valid.text
    assert valid.json()['result']['status']=='valid'
    expired=client.post('/api/lookup',json={'plate':'WB00DE0001'},headers=headers)
    assert expired.json()['result']['status']=='expired'
    missing=client.post('/api/lookup',json={'plate':'MH00DE0003'},headers=headers)
    assert missing.json()['result']['status']=='missing'
    unknown=client.post('/api/lookup',json={'plate':'RJ00DE0007'},headers=headers)
    assert unknown.json()['result']['status']=='not_registered'
    report=client.get('/api/reports/'+str(expired.json()['id']))
    assert report.status_code==200 and report.content[:4]==b'%PDF'
    cert=client.get('/api/certificates/'+str(expired.json()['result']['vehicle']['cylinders'][0]['id']))
    assert cert.status_code==200 and cert.content[:4]==b'%PDF'
    record={'plate':'GJ00DE0008','model':'Sample Van','cng_endorsed':'yes','cylinders':[{'serial':'DEMO-NEW-1','last_test':'2025-01-01','expiry':'2030-01-01','certificate_ref':'DEMO-ONLY'}]}
    created=client.post('/api/vehicles',json=record,headers=headers)
    assert created.status_code==200,created.text
    assert created.json()['status']=='valid'
    assert len(client.get('/api/vehicles').json()) in (101, 102)
    assert client.delete('/api/vehicles/GJ00DE0008',headers=headers).json()['deleted']
    assert client.get('/api/vehicles/GJ00DE0008').status_code==404
    assert 'text/csv' in client.get('/api/scans.csv').headers['content-type']
    assert client.get('/api/audit').status_code==200
    station=client.post('/api/stations',headers=headers,json={'name':'Test station 2','city':'Kolkata'})
    assert station.status_code==200
    user=client.post('/api/users',headers=headers,json={'email':'operator@example.test','password':'OperatorSecurePass!123','name':'Test Operator','role':'operator','station_id':1})
    assert user.status_code==200,user.text
    assert client.post('/api/logout',headers=headers).status_code==200
    assert client.get('/api/vehicles').status_code==401
    auth=client.post('/api/login',json={'email':'operator@example.test','password':'OperatorSecurePass!123'})
    assert auth.status_code==200
    assert client.post('/api/vehicles',json=record,headers={'X-CSRF-Token':auth.json()['csrf']}).status_code==403
    assert client.post('/api/lookup',json={'plate':'DL00DE0002'},headers={'X-CSRF-Token':auth.json()['csrf']}).status_code==200
    assert client.get('/api/audit').status_code==403


def test_real_ocr():
  from app.ocr_engine import configure_tesseract
  if not configure_tesseract():
    pytest.skip("Tesseract OCR not installed in system environment")
  import base64
  samples=Path(__file__).resolve().parents[1]/'samples'
  with TestClient(app) as client:
    auth=client.post('/api/login',json={'email':'owner@example.test','password':'VeryLongDemoPassword!123'})
    h={'X-CSRF-Token':auth.json()['csrf']}
    raw=(samples/'02_VALID_DL00DE0002.png').read_bytes()
    body={'image_base64':'data:image/png;base64,'+base64.b64encode(raw).decode(),'method':'Image upload','station_id':1}
    res=client.post('/api/scan',headers=h,json=body)
    assert res.status_code==200,res.text
    assert res.json()['recognition']['plate']=='DL00DE0002',res.json()['recognition']
    assert res.json()['recognition']['needs_review'] in (True, False)
    assert res.json()['result']['status'] in ('valid', 'unverified')
    confirmed=client.post('/api/lookup',json={'plate':'DL00DE0002','recognized_plate':res.json()['recognition']['plate'],'station_id':1},headers=h)
    assert confirmed.json()['result']['status']=='valid'
    assert client.get(res.json()['image_url']).status_code==200


def test_bad_inputs():
  with TestClient(app) as client:
    auth=client.post('/api/login',json={'email':'owner@example.test','password':'VeryLongDemoPassword!123'});h={'X-CSRF-Token':auth.json()['csrf']}
    assert client.post('/api/scan',json={'image_base64':'not-image'},headers=h).status_code==400
    assert client.post('/api/lookup',json={'plate':'#'},headers=h).status_code==400
    assert client.post('/api/vehicles',json={'plate':'AB123456','cng_endorsed':'yes','cylinders':[{'serial':'X','expiry':'NOT-A-DATE'}]},headers=h).status_code==400
    assert client.get('/api/snapshots/../../etc/passwd').status_code in (404, 403)


def test_account_controls_and_alerts():
  with TestClient(app) as c:
    a=c.post('/api/login',json={'email':'owner@example.test','password':'VeryLongDemoPassword!123'})
    h={'X-CSRF-Token':a.json()['csrf']}
    alert=c.get('/api/alerts'); assert alert.status_code==200
    assert isinstance(alert.json(),list)
    station=c.post('/api/stations',json={'name':'Additional Pilot Station'},headers=h)
    assert station.status_code==200
    new_user=c.post('/api/users',headers=h,json={'email':'viewer@example.test','password':'ViewerPassword!12345','role':'viewer','station_id':station.json()['id']})
    assert new_user.status_code==200
    viewer=c.post('/api/login',json={'email':'viewer@example.test','password':'ViewerPassword!12345'})
    assert viewer.status_code==200
    assert c.get('/api/vehicles').status_code==200
    vh={'X-CSRF-Token':viewer.json()['csrf']}
    assert c.post('/api/scan',json={},headers=vh).status_code==403
    assert c.post('/api/lookup',json={'plate':'DL00DE0002'},headers=vh).status_code==403
    assert c.get('/api/audit').status_code==403
    c.post('/api/logout',headers=vh)
    a=c.post('/api/login',json={'email':'owner@example.test','password':'VeryLongDemoPassword!123'})
    h={'X-CSRF-Token':a.json()['csrf']}
    from app.database import User
    with SessionLocal() as db:
      view_id=db.query(User).filter_by(email='viewer@example.test').first().id
    assert c.post('/api/users/%s/status'%view_id,json={'active':False},headers=h).status_code==200
    assert c.post('/api/login',json={'email':'viewer@example.test','password':'ViewerPassword!12345'}).status_code==401
    assert c.post('/api/users/%s/status'%a.json().get('id',0),json={'active':False},headers=h).status_code==404
    bad=c.post('/api/change-password',json={'current_password':'wrong','new_password':'UpdatedPassword123!'},headers=h)
    assert bad.status_code==403
    good=c.post('/api/change-password',json={'current_password':'VeryLongDemoPassword!123','new_password':'UpdatedPassword123!'},headers=h)
    assert good.status_code==200
    assert c.post('/api/login',json={'email':'owner@example.test','password':'UpdatedPassword123!'}).status_code==200
    changed=c.post('/api/change-password',json={'current_password':'UpdatedPassword123!','new_password':'VeryLongDemoPassword!123'},headers=h)
    # after new login, previous client's session cookie changed and old CSRF is intentionally stale.
    assert changed.status_code==403
