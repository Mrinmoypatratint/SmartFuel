"""Relational persistence for commercial demonstrator; PostgreSQL on VPS, SQLite in tests."""
import os
from pathlib import Path
from urllib.parse import quote_plus
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, Date
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from sqlalchemy.sql import func
ROOT = Path(__file__).resolve().parent.parent
DB_URL = os.getenv('DATABASE_URL')
if not DB_URL and os.getenv('POSTGRES_HOST'):
    pg_user = quote_plus(os.environ['POSTGRES_USER'])
    pg_pass = quote_plus(os.environ['POSTGRES_PASSWORD'])
    pg_db = quote_plus(os.environ['POSTGRES_DB'])
    DB_URL=f"postgresql+psycopg2://{pg_user}:{pg_pass}@{os.getenv('POSTGRES_HOST')}:{os.getenv('POSTGRES_PORT','5432')}/{pg_db}"
if not DB_URL:
    DB_URL=f'sqlite:///{ROOT}/storage/smartfuel_v2.sqlite3'
if DB_URL.startswith('postgres://'):
    DB_URL = DB_URL.replace('postgres://', 'postgresql://', 1)
if DB_URL.startswith('sqlite:///') and not DB_URL.startswith('sqlite:///:memory:'):
    sqlite_file = Path(DB_URL.replace('sqlite:///', ''))
    sqlite_file.parent.mkdir(parents=True, exist_ok=True)
engine = create_engine(DB_URL, pool_pre_ping=True, connect_args={'check_same_thread':False, 'timeout':20} if DB_URL.startswith('sqlite:') else {})
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
Base = declarative_base()
class Station(Base):
    __tablename__='stations'
    id=Column(Integer,primary_key=True)
    name=Column(String(140),nullable=False)
    city=Column(String(140),default='')
    camera_name=Column(String(100),default='USB / Webcam')
    created_at=Column(DateTime(timezone=True),server_default=func.now())
class User(Base):
    __tablename__='users'
    id=Column(Integer,primary_key=True)
    email=Column(String(255),unique=True,index=True,nullable=False)
    password_hash=Column(Text,nullable=False)
    name=Column(String(100),default='')
    role=Column(String(25),default='viewer',nullable=False)
    station_id=Column(Integer,ForeignKey('stations.id'),nullable=True)
    active=Column(Boolean,default=True)
    created_at=Column(DateTime(timezone=True),server_default=func.now())
class Vehicle(Base):
    __tablename__='vehicles'
    plate=Column(String(16),primary_key=True)
    model=Column(String(120),default='')
    owner_name=Column(String(120),default='')
    cng_endorsed=Column(String(8),default='unknown')
    notes=Column(String(500),default='')
    station_id=Column(Integer,ForeignKey('stations.id'),nullable=True)
    cylinders=relationship('Cylinder',back_populates='vehicle',cascade='all, delete-orphan',order_by='Cylinder.id')
    created_at=Column(DateTime(timezone=True),server_default=func.now())
class Cylinder(Base):
    __tablename__='cylinders'
    id=Column(Integer,primary_key=True)
    plate=Column(String(16),ForeignKey('vehicles.plate',ondelete='CASCADE'),index=True,nullable=False)
    serial=Column(String(75),nullable=False)
    last_test=Column(String(10),default='')
    expiry=Column(String(10),default='')
    certificate_ref=Column(String(100),default='')
    certificate_file=Column(String(80),default='')
    vehicle=relationship('Vehicle',back_populates='cylinders')
class Inspection(Base):
    __tablename__='inspections'
    id=Column(Integer,primary_key=True)
    scanned_at=Column(DateTime(timezone=True),server_default=func.now(),index=True)
    recognized_plate=Column(String(16),default='')
    checked_plate=Column(String(16),default='')
    confidence=Column(Float,default=0)
    method=Column(String(50),default='')
    status=Column(String(20),default='unverified')
    details_json=Column(Text,default='{}')
    image_file=Column(String(80),default='')
    station_id=Column(Integer,ForeignKey('stations.id'),nullable=True)
    operator_id=Column(Integer,ForeignKey('users.id'),nullable=True)
class Audit(Base):
    __tablename__='audit_events'
    id=Column(Integer,primary_key=True)
    happened_at=Column(DateTime(timezone=True),server_default=func.now())
    actor_id=Column(Integer,ForeignKey('users.id'),nullable=True)
    action=Column(String(80),nullable=False)
    subject=Column(String(160),default='')
    details=Column(String(350),default='')

def seed_demo(db):
    """Seed the database with demonstration station, standard demo records, and WB42AV8012."""
    import csv
    station = db.query(Station).filter_by(name='Demo IGL CNG Station').order_by(Station.id).first()
    if station is None:
        station = Station(name='Demo IGL CNG Station', city='Durgapur', camera_name='USB / Ingress Camera')
        db.add(station)
        db.flush()

    target_plate = 'WB42AV8012'

    if os.getenv('DEMO_SINGLE_VEHICLE', '0') == '1':
        db.query(Vehicle).filter(Vehicle.plate != target_plate).delete(synchronize_session=False)
        db.query(Cylinder).filter(Cylinder.plate != target_plate).delete(synchronize_session=False)
    else:
        folder = ROOT / 'seed_data'
        vehicles_path = folder / 'vehicles_100.csv'
        cylinders_path = folder / 'cylinders_100.csv'
        if vehicles_path.is_file() and cylinders_path.is_file():
            with vehicles_path.open(newline='', encoding='utf-8') as f:
                vehicle_rows = list(csv.DictReader(f))
            with cylinders_path.open(newline='', encoding='utf-8') as f:
                cylinder_rows = list(csv.DictReader(f))
            present = {x[0] for x in db.query(Vehicle.plate).all()}
            created = set()
            for row in vehicle_rows:
                if row['plate'] not in present:
                    db.add(Vehicle(plate=row['plate'], model=row['model'], cng_endorsed=row['cng_endorsed'],
                                   notes=row['notes'], station_id=station.id))
                    created.add(row['plate'])
            db.flush()
            for row in cylinder_rows:
                if row['plate'] in created:
                    db.add(Cylinder(plate=row['plate'], serial=row['serial'], last_test=row['last_test'],
                                    expiry=row['expiry'], certificate_ref=row['certificate_ref']))
            db.flush()

    existing = db.get(Vehicle, target_plate)
    if existing is None:
        v = Vehicle(
            plate=target_plate,
            model='Maruti Suzuki WagonR LXi CNG',
            owner_name='Rohit Sharma',
            cng_endorsed='yes',
            notes='RTO: WB-42 (Durgapur RTO, West Bengal) — Authorized CNG Fuel Endorsement',
            station_id=station.id
        )
        db.add(v)
        db.flush()
        cyl = Cylinder(
            plate=target_plate,
            serial='CYL-WB42-8012-A1',
            last_test='2024-04-10',
            expiry='2027-04-09',
            certificate_ref='PESO/WB/CYL/2024/8012',
            certificate_file=''
        )
        db.add(cyl)
    else:
        existing.model = 'Maruti Suzuki WagonR LXi CNG'
        existing.owner_name = 'Rohit Sharma'
        existing.cng_endorsed = 'yes'
        existing.notes = 'RTO: WB-42 (Durgapur RTO, West Bengal) — Authorized CNG Fuel Endorsement'
        existing.station_id = station.id
        if not existing.cylinders:
            cyl = Cylinder(
                plate=target_plate,
                serial='CYL-WB42-8012-A1',
                last_test='2024-04-10',
                expiry='2027-04-09',
                certificate_ref='PESO/WB/CYL/2024/8012',
                certificate_file=''
            )
            db.add(cyl)
    db.commit()


class CameraDevice(Base):
    """On-site edge camera credentials; raw API tokens are never stored."""
    __tablename__='camera_devices'
    id=Column(Integer,primary_key=True)
    station_id=Column(Integer,ForeignKey('stations.id'),nullable=False,index=True)
    name=Column(String(140),nullable=False)
    token_hash=Column(String(64),nullable=False)
    enabled=Column(Boolean,default=True,nullable=False)
    last_seen=Column(DateTime(timezone=True),nullable=True)
    created_at=Column(DateTime(timezone=True),server_default=func.now())

class LoginFailure(Base):
    """Shared, persistent authentication throttle (no raw IP or email stored)."""
    __tablename__='login_failures'
    id=Column(Integer,primary_key=True)
    identity_hash=Column(String(64),nullable=False,index=True)
    happened_at=Column(DateTime(timezone=True),nullable=False,index=True)


class VehicleEvent(Base):
    """Immutable vehicle observation ledger, separate from mutable demo registry.

    Automatic webcam/edge detections are entry observations. Uploaded photos and
    manual lookups are inspections, not claims that a car physically entered.
    """
    __tablename__='vehicle_events'
    id=Column(Integer,primary_key=True)
    observed_at=Column(DateTime(timezone=True),nullable=False,index=True)
    plate=Column(String(16),nullable=False,index=True,default='')
    station_id=Column(Integer,ForeignKey('stations.id'),nullable=False,index=True)
    inspection_id=Column(Integer,ForeignKey('inspections.id'),nullable=False,index=True)
    event_type=Column(String(20),nullable=False,default='inspection')
    source=Column(String(60),nullable=False,default='')
    status=Column(String(20),nullable=False,default='unverified')
    confidence=Column(Float,nullable=False,default=0)
    needs_review=Column(Boolean,nullable=False,default=False)
    camera_session=Column(String(64),default='')
    created_at=Column(DateTime(timezone=True),server_default=func.now())


def migrate_owner_column():
    """Add optional sample owner field without dropping existing PostgreSQL/SQLite data."""
    from sqlalchemy import inspect, text
    if 'owner_name' not in {c['name'] for c in inspect(engine).get_columns('vehicles')}:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE vehicles ADD COLUMN owner_name VARCHAR(120) DEFAULT ''"))


class RevokedSession(Base):
    """Logout invalidates even copied signed cookies until their natural expiry."""
    __tablename__='revoked_sessions'
    token_sha256=Column(String(64),primary_key=True)
    expires_at=Column(DateTime(timezone=True),nullable=False,index=True)
