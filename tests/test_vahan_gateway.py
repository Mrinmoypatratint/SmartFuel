"""Tests for VAHAN Gateway & Auto-Caching functionality."""
import sys
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal, User, Vehicle
from app.security import hash_password
from app.vahan_gateway import resolve_open_rto_metadata, normalize_plate

EMAIL = 'vahantest@example.test'
PASS = 'VahanGatewayPass!123'

def get_auth(client):
    with SessionLocal() as db:
        if not db.query(User).filter_by(email=EMAIL).first():
            db.add(User(email=EMAIL, password_hash=hash_password(PASS), name='VAHAN Tester', role='admin', active=True))
            db.commit()
    resp = client.post('/api/login', json={'email': EMAIL, 'password': PASS})
    assert resp.status_code == 200, resp.text
    return {'X-CSRF-Token': resp.json()['csrf']}

def test_vahan_rto_metadata_resolver():
    res = resolve_open_rto_metadata("DL01AB1234")
    assert res["plate"] == "DL01AB1234"
    assert "Delhi" in res["notes"]
    assert res["cng_endorsed"] == "yes"

    diesel_res = resolve_open_rto_metadata("UP16DSL9999")
    assert diesel_res["cng_endorsed"] == "no"
    assert "Diesel" in diesel_res["model"]

def test_vahan_query_endpoint_and_autocache():
    with TestClient(app) as client:
        headers = get_auth(client)

        test_plate = "DL04XY9988"
        db = SessionLocal()
        try:
            v = db.get(Vehicle, test_plate)
            if v:
                db.delete(v)
                db.commit()
        finally:
            db.close()

        resp = client.post("/api/vahan/query", json={"plate": test_plate}, headers=headers)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["ok"] is True
        assert data["plate"] == test_plate
        assert data["vehicle"] is not None
        assert data["vehicle"]["cng_endorsed"] == "yes"
        assert len(data["vehicle"]["cylinders"]) >= 1

        # Verify it was auto-cached into the database
        db = SessionLocal()
        try:
            cached = db.get(Vehicle, test_plate)
            assert cached is not None
            assert cached.plate == test_plate
            assert cached.cng_endorsed == "yes"
        finally:
            db.close()
