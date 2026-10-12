# v3 — 100 Synthetic Vehicles Seed Data Update

- Keeps the original 6 demo records / test number-plate screenshots intact.
- Adds 94 new synthetic vehicle records, producing 100 vehicles total on a fresh installation, and 181 cylinders across the dataset.
- Includes `sql/SmartFuel_100_Demo_Vehicles_PostgreSQL.sql` (safe to rerun) and matching CSVs.
- On application startup with `SEED_DEMO=1`, inserts missing demo vehicles while preserving existing vehicle edits / cylinder records. Databases that already contain user-added vehicle entries can show >100 records, by design.
- Dockerfile now copies seed CSV files into the container.
- Auth, OCR, UI and host configuration from commercial v2 retained.
- Synthetic records only; no external official database validation.

## Validation performed
- Existing integration test suite and new data-idempotency test: 5 passed on local SQLite.
- SQL schema-equivalent SQLite import smoke test: 100 vehicles and 181 cylinders after each of two consecutive imports (note: direct PostgreSQL import not executed in the development environment).
- No live VPS or real webcam deployment tests performed.
