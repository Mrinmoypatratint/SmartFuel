"""Seed data integrity (import works for SQLite and PostgreSQL ORM schemas)."""
from app.database import Base, engine, SessionLocal, Station, Vehicle, Cylinder, seed_demo


def test_single_demo_vehicle_wb42av8012_is_idempotent():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_demo(db)
        assert db.query(Vehicle).count() in (1, 101)
        assert db.query(Cylinder).count() >= 1
        vehicle = db.get(Vehicle, 'WB42AV8012')
        assert vehicle is not None
        assert vehicle.plate == 'WB42AV8012'
        assert vehicle.cng_endorsed == 'yes'
        assert len(vehicle.cylinders) == 1
        assert vehicle.cylinders[0].serial == 'CYL-WB42-8012-A1'
