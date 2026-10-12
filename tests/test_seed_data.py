"""Seed data integrity (import works for SQLite and PostgreSQL ORM schemas)."""
from app.database import SessionLocal, Station, Vehicle, Cylinder, seed_demo


def test_100_demo_vehicle_records_are_idempotent():
    with SessionLocal() as db:
        seed_demo(db)
        assert db.query(Vehicle).count() == 100
        assert db.query(Cylinder).count() >= 100
        cylinder_count=db.query(Cylinder).count()
        plate=db.get(Vehicle,'DL00DE0002')
        plate.notes = 'DO NOT OVERWRITE CUSTOM VALUE'
        db.commit()
        seed_demo(db)
        assert db.query(Vehicle).count()==100
        assert db.query(Cylinder).count()==cylinder_count
        assert db.get(Vehicle,'DL00DE0002').notes == 'DO NOT OVERWRITE CUSTOM VALUE'
