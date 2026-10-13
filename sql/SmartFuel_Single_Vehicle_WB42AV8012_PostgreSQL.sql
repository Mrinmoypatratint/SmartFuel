-- SmartFuel Single Vehicle Demo Seed for PostgreSQL
-- Target Plate: WB42AV8012 (Single Authorized Demonstration Record)

BEGIN;

-- 1. Insert Station if not exists
INSERT INTO stations (name, city, camera_name)
SELECT 'Demo IGL CNG Station', 'Durgapur', 'USB / Ingress Camera'
WHERE NOT EXISTS (SELECT 1 FROM stations WHERE name = 'Demo IGL CNG Station');

-- 2. Clear any other vehicle and cylinder records to ensure WB42AV8012 is the only entry
DELETE FROM cylinders WHERE plate != 'WB42AV8012';
DELETE FROM vehicles WHERE plate != 'WB42AV8012';

-- 3. Upsert Vehicle 'WB42AV8012'
INSERT INTO vehicles (plate, model, owner_name, cng_endorsed, notes, station_id)
VALUES (
    'WB42AV8012',
    'Maruti Suzuki WagonR LXi CNG',
    'Rohit Sharma',
    'yes',
    'RTO: WB-42 (Durgapur RTO, West Bengal) — Authorized CNG Fuel Endorsement',
    (SELECT id FROM stations WHERE name = 'Demo IGL CNG Station' LIMIT 1)
)
ON CONFLICT (plate) DO UPDATE SET
    model = EXCLUDED.model,
    owner_name = EXCLUDED.owner_name,
    cng_endorsed = EXCLUDED.cng_endorsed,
    notes = EXCLUDED.notes,
    station_id = EXCLUDED.station_id;

-- 4. Upsert Cylinder for 'WB42AV8012'
DELETE FROM cylinders WHERE plate = 'WB42AV8012';
INSERT INTO cylinders (plate, serial, last_test, expiry, certificate_ref, certificate_file)
VALUES (
    'WB42AV8012',
    'CYL-WB42-8012-A1',
    '2024-04-10',
    '2027-04-09',
    'PESO/WB/CYL/2024/8012',
    ''
);

COMMIT;
