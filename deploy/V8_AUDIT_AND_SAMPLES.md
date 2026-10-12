# SmartFuel ANPR v8 — audit and demo sample gallery

**Purpose:** Controlled client demonstration using fictional vehicle and cylinder data. **Not** a government-verified approval for filling CNG.

## Changes from uploaded v7

- Fixed the missing `COPY samples/ ./samples/` statement in `Dockerfile`. The synthetic plate images are now included in the KVM2 Docker image.
- Added an authenticated **Demo image library** in **AI Inspection → Upload image**. Selecting a photo loads the existing uploader; press **Analyze Image** to run the real OCR and database/report workflow.
- Added **58 new synthetic images**: 38 registered plate close-ups, 16 registered car fronts, 2 unregistered plate close-ups, and 2 unregistered car fronts. The existing 7 PNG examples are retained, for **65 total PNG files**.
- Added `samples/DEMO_SAMPLE_MANIFEST.csv` identifying the expected plate/scenario. Scenario status is based on the demo database as of **2026-10-12** and may evolve as expiry dates pass.
- Hardened hydrotest date checks: missing last-test date, future last-test date, and last-test date after expiry cannot produce a valid demo status.
- Added new automated tests for the gallery route (auth and file serving), fixture/seed matching, impossible-date handling, and real end-to-end OCR/PDF lookup.

## How to try the new images

1. Back up your previous deployment's PostgreSQL data and `private_files` Docker volume first.
2. Deploy v8 source with the same valid `.env` secrets. Confirm `COOKIE_SECURE=1` under HTTPS on Hostinger KVM2.
3. Start services: `docker compose up -d --build`.
4. Sign in, open **AI Inspection** → **Upload image**, scroll down to **Demo image library**.
5. Click a sample image and then **Analyze Image & Check Database**.
6. View the separate CNG decision display, vehicle entry logs, inspection details and printable sample report.
7. If a plate's OCR is uncertain, use the manual correction function; the sample record is never proof of a real vehicle's certification.

## Sample scenarios

- `DL00DE0002`: DEMO VALID (unless record modified/expired later)
- `WB00DE0001`: HYDROTEST EXPIRED
- `MH00DE0003`: CERTIFICATE MISSING
- `KA00DE0004`: CNG NOT ENDORSED ON SAMPLE RC
- `TN00DE0005`: RC UNVERIFIED
- `RJ00DE9876`, `GJ00DE9877`: NOT REGISTERED (intentionally absent from database)

## Verified on 2026-10-12

- **19/19 local pytest tests passed**.
- Frontend JavaScript passed `node --check`.
- **8/8 selected new synthetic images** produced the correct text through Tesseract OCR; 3 were illustrated car-front examples. This is a sample test, not proof of 100% OCR accuracy.
- Local `/api/health` responded successfully.
- Headless browser navigation to localhost was blocked by this environment, so full live browser testing could not be completed here.
- Docker and production PostgreSQL were not available to run in this test environment; no assertion of live Hostinger success is made.

## Outstanding deployment/production tasks

| Priority | Pending item | Note |
|---|---|---|
| P0 | KVM2 deployment acceptance | Real PostgreSQL, reverse proxy, HTTPS, DNS, sessions, images, reports, backup/restore |
| P0 | USB camera field tests | Actual connected camera, distance, lighting, blurred/angled plates, multi-car throughput |
| P0 | Real compliance data | Authorised RC and hydrotest databases are not integrated; using fictional demo data only |
| P1 | True entry/exit detection | Current camera events are timestamped observations; gate crossings need sensors/tracking |
| P1 | Duplicate event concurrency | Cooldown is time-based; high-load/multiple worker race hardening and cross-camera event dedupe pending |
| P1 | Long-run operation | Background browser throttling, device reconnection, high CPU, storage and live alerts should be field-tested |
| P1 | Data integrity / retention | Formal schema migration tooling, retention policy, offsite backups, security review and restoration tests pending |
| P1 | Official decision policy | Demo results must not be represented as legal authorization to fill/refuse fuel |

## Source directories

`app/` Python API and OCR; `static/` frontend; `samples/` images and manifest; `seed_data/` 100 fictional vehicles and 181 cylinders; `sql/` PostgreSQL seed import; `edge/` optional station-camera agent; `deploy/` KVM2 instructions.
