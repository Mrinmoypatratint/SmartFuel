"""Tests covering new exact-text synthetic image library and date integrity."""
from pathlib import Path
import csv
from app.main import ROOT, cylinder_state
from app.database import Cylinder, SessionLocal, Vehicle
from fastapi.testclient import TestClient
from app.main import app


def test_reject_impossible_cylinder_dates():
    from datetime import date, timedelta
    tomorrow=(date.today()+timedelta(days=1)).isoformat()
    nextyear=(date.today()+timedelta(days=370)).isoformat()
    assert cylinder_state(Cylinder(certificate_ref='DEMO-CERT',last_test=tomorrow,expiry=nextyear))=='missing'
    assert cylinder_state(Cylinder(certificate_ref='DEMO-CERT',last_test='',expiry=nextyear))=='missing'
    assert cylinder_state(Cylinder(certificate_ref='DEMO-CERT',last_test=nextyear,expiry=tomorrow))=='missing'
    assert cylinder_state(Cylinder(certificate_ref='DEMO-CERT',last_test='not-a-date',expiry=nextyear))=='missing'


def test_new_fixture_manifest_matches_existing_100_vehicles():
    files=ROOT/'samples'/'DEMO_SAMPLE_MANIFEST.csv'
    fixtures=list(csv.DictReader(files.open()))
    assert len(fixtures)>=50
    cars={}
    with (ROOT/'seed_data'/'vehicles_100.csv').open() as f:
        cars={r['plate'] for r in csv.DictReader(f)}
    assert len(cars)==100
    for f in fixtures:
        assert f['plate'] in cars or f['expected_case']=='NOT_REGISTERED', f
        assert (ROOT/'samples'/f['filename']).is_file()
        assert 'DEMO' in f['expected_case'] or f['expected_case'] in ('HYDROTEST_EXPIRED','CERTIFICATE_MISSING','RC_NOT_ENDORSED','REVIEW','NOT_REGISTERED')


def test_gallery_requires_auth_and_serves_matching_image():
    # Existing tests configure strong initial credentials at module import time.
    from app.main import ROOT
    from app.database import User
    from app.security import hash_password
    with TestClient(app) as client:
        assert client.get('/api/demo-samples').status_code==401
        with SessionLocal() as db:
            if not db.query(User).filter_by(email='sample-gallery-v8@example.test').first():
                db.add(User(email='sample-gallery-v8@example.test',name='Demo Reviewer',role='viewer',password_hash=hash_password('V8StrongDemoPassword!123'),active=True))
                db.commit()
        login=client.post('/api/login',json={'email':'sample-gallery-v8@example.test','password':'V8StrongDemoPassword!123'})
        assert login.status_code==200,login.text
        library=client.get('/api/demo-samples')
        assert library.status_code==200
        listing=library.json()
        assert len(listing)>=50
        first=listing[0]
        image=client.get('/api/demo-samples/'+first['filename'])
        assert image.status_code==200 and image.headers['content-type'].startswith('image/png')
        assert len(image.content)>1000
        assert client.get('/api/demo-samples/..%2Fapp%2Fmain.py').status_code in (404,422)


def test_demo_image_through_real_ocr_to_report():
    import base64
    from app.security import hash_password
    from app.database import User, Station
    with TestClient(app) as client:
        with SessionLocal() as db:
            if not db.query(User).filter_by(email='v8-ocr-run@example.test').first():
                db.add(User(email='v8-ocr-run@example.test',name='OCR Demo',role='admin',password_hash=hash_password('StrongDemoOCRPassword!2026'),active=True))
                db.commit()
        login=client.post('/api/login',json={'email':'v8-ocr-run@example.test','password':'StrongDemoOCRPassword!2026'})
        assert login.status_code==200,login.text
        headers={'X-CSRF-Token':login.json()['csrf']}
        station_id=client.get('/api/stations').json()[0]['id']
        library=client.get('/api/demo-samples').json()
        selected=next(r for r in library if r['plate']=='DL00DE0002' and r['image_type']=='plate closeup')
        photo=client.get('/api/demo-samples/'+selected['filename']).content
        response=client.post('/api/scan',headers=headers,json={'image_base64':'data:image/png;base64,'+base64.b64encode(photo).decode('ascii'),'station_id':station_id,'method':'Image upload'})
        assert response.status_code==200,response.text
        data=response.json()
        assert data['recognition']['plate']=='DL00DE0002'
        assert data['result']['status']=='valid'
        assert client.get('/api/reports/'+str(data['id'])).headers['content-type'].startswith('application/pdf')
