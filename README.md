# SMARTFUEL ANPR v8 — Synthetic Demo Gallery Update

Read **deploy/V8_AUDIT_AND_SAMPLES.md** for the latest changes, testing, limitations, and KVM2 update procedure.

# SmartFuel ANPR Commercial Pilot v7 — Separate CNG Decision Display

**New v7 station display:** Open `/cng-display` in a separate authenticated browser window/monitor. It updates approximately every 3 seconds after a saved inspection and shows the registration number, optional sample owner name, individual demo RC and hydrotesting checks, exact hold/review reasons, and the linked report. For setup and examples, read [`deploy/V7-CNG-STATION-DISPLAY.md`](deploy/V7-CNG-STATION-DISPLAY.md). v7 also introduces `owner_name` as an optional demo-only vehicle attribute (added via additive SQL migration), checks inverted test/expiry date sequences, and invalidates logged-out cookies. **Not a legal decision system; any real CNG decision is made using official station procedures and authorised data.**

# SmartFuel ANPR Commercial Pilot v6 — Automatic Vehicle Entry Monitoring

**NEW IN V6:** Persistent live browser USB camera with automatic OCR and entry ledger, time-stamped camera observations, per-vehicle reports, duplicate suppression, manual review, and a searchable/exportable Vehicle Entry Logs screen. See `deploy/V6-LIVE-CAMERA-AND-VEHICLE-ENTRIES.md` for precise behavior and limitations.

**Release v5 (source implementation):** See [`deploy/V5-IMPLEMENTED-AND-PENDING.md`](deploy/V5-IMPLEMENTED-AND-PENDING.md) for new analytics, camera agent, alert wall, station scoping, session revocation and backup scripts. VPS/live-camera testing is pending.

# SmartFuel AI-ANPR & CNG Hydrotesting — Commercial Pilot v5

**One web-based software system:** vehicle image upload / local USB webcam → genuine offline OCR performed by server → vehicle number → private database lookup → CNG cylinder-wise mock hydrotest validity → alert wall → downloadable sample PDFs, inspection history and administration.

**This repository is a FUNCTIONAL SOFTWARE PROTOTYPE, not a certified CNG safety system.** All built-in vehicles are fictitious. There is no government/VAHAN or hydrotesting-authority API. The database returns entered sample records only, and “demo valid” means the stored example dates have not expired; it is NOT a compliance or safety clearance.

## Features

- Professional responsive browser dashboard (no Android app required)
- User login; signed HttpOnly session cookies (8h), CSRF protection for mutations
- Roles: Super Admin (vehicle/station/user maintenance), Operator (scan & reports), Viewer (read-only)
- Image upload (JPEG/PNG/WEBP), browser USB camera capture over HTTPS
- Offline Python OpenCV + Tesseract ANPR; OCR candidate list, confidence and manual plate correction
- Editable vehicle registry, station assignment, individual cylinders, hydrotest dates, sample references and optionally attached sample PDF/images
- Exact database matching; separate Valid / Expired / Missing / Not CNG / Unverified / Not Registered states
- Red-alert display for expired/missing/unverified, automatically refreshed every 15 seconds while viewing
- Inspection history with captured time/operator/station, PDF reports, CSV export, sample certificate PDFs
- User creation/disable, user password change, audit log, system status
- PostgreSQL in Docker Compose + persistent volumes, FastAPI, Caddy with HTTPS, OCR worker in the FastAPI process (one worker)
- Seven fictional number-plate examples in `samples/`, 100 matching synthetic database records in the demo seed, and one intentionally unknown test plate

## Architecture

```
USB webcam in browser (user grants permission)    Upload JPG/PNG/WEBP
                     \                              /
                      \____ HTTPS image upload ____/
                                |
                         Caddy reverse proxy
                                |
                         FastAPI (Python)
                    /                            \
          OpenCV / Tesseract                PostgreSQL
            OCR recognition           Users, vehicles, cylinders,
                    |                 inspection snapshots, alerts
                    \____________________________/
                                 |
                   SINGLE WEB DASHBOARD + REPORTS
```

Only captured images cross the network; browser USB hardware is NEVER connected directly to your VPS. To use a permanently installed remote station IP ANPR camera, a separate secured station-edge service/RTSP integration is required. **Continuous RTSP/IP feed integration is not included** in v2.

## Option A: Local first demo (Windows)

1. Install Python 3.11 and the Tesseract OCR Windows application (with English data). Add `tesseract.exe` to PATH or set `TESSERACT_PATH`.
2. Unzip this project. Double-click `START-LOCAL-WINDOWS.bat`. It creates `.venv` and installs dependencies (internet required only for installation).
3. Choose an email and password of 12+ characters. **Use the same credentials on subsequent launches.** You may create more users through Administration.
4. Open `http://127.0.0.1:8765`. Login, then inspect `samples/02_VALID_DL00DE0002.png` and `samples/01_EXPIRED_WB00DE0001.png`.
5. Local mode uses SQLite (developer-mode). **Do not make this loopback server internet-accessible**. Host via Docker and PostgreSQL for VPS.

For Linux developer testing, install Tesseract, create virtualenv, `pip install -r requirements.txt`, then `python run-local.py`.

## Option B: Hostinger KVM2 VPS (Ubuntu 24.04)

Follow `deploy/HOSTINGER-KVM2.md` carefully. Summary:

1. Provision Hostinger **VPS KVM2 (Ubuntu 24.04)** with Docker Engine / Docker Compose; obtain domain with DNS A record pointing to your VPS IP.
2. Set firewall allowing **80/tcp and 443/tcp**, and SSH restricted to your own admin IP. Do not expose PostgreSQL 5432 or FastAPI 8000 publicly.
3. Copy `.env.example` to `.env`, edit all placeholder values, generate strong unrelated passwords/secrets, set your HTTPS domain and **COOKIE_SECURE=1**.
4. Run `docker compose up -d --build` from project directory.
5. Verify `docker compose ps`, `docker compose logs --tail=100 web`, and browse `https://YOUR_DOMAIN/api/health` and `https://YOUR_DOMAIN/login`.
6. Test OCR, webcam permissions, demo certificate, report, role permissions and persistence across restarts. Set automated backups before letting anyone enter new records.

**Deployment has NOT been performed on your Hostinger account.** No live URL is included because no VPS access or DNS settings were provided. Docker container build/production connectivity must be verified on the actual VPS.

## Software dependencies

| Layer | Tech |
|---|---|
| Backend | Python 3.11, FastAPI, Uvicorn |
| AI OCR | OpenCV headless, pytesseract, Tesseract OCR, Pillow |
| Browser | HTML5, CSS, vanilla JavaScript; standard MediaDevices webcam API |
| Database | PostgreSQL 16 in Docker, SQLAlchemy ORM; SQLite for local testing |
| Auth & permissions | Salted PBKDF2 password hashes, signed session cookies, RBAC and CSRF |
| PDF & export | ReportLab and CSV |
| Deployment | Docker Compose, Caddy TLS/HTTPS |

**Why vanilla JavaScript rather than React?** This smaller demonstration uses one prebuilt frontend with no npm build chain. It retains a professional UI while reducing build complexity and VPS memory footprint. React/TypeScript can be introduced later, but is not essential to the actual product behavior.

## Demonstration scenario

| Fictional plate | Expected demo result |
|---|---|
| `DL00DE0002` | Demo valid; one CNG cylinder |
| `WB00DE0001` | Expired; two cylinders, one past expiry |
| `MH00DE0003` | Missing sample hydrotesting certificate |
| `KA00DE0004` | Not CNG in sample records |
| `TN00DE0005` | Unverified endorsement |
| `UP00DE0006` | Demo valid; two cylinders |
| `RJ00DE0007` | Not registered / no matching sample data |

If the OCR reads a wrong letter, edit the plate on the result screen and click **Check number**. The new correction creates its own inspection event to preserve history.

## Privacy & limitations

- Use only fictional / consented images and synthetic records for the client demo. Restrict data access and retention; do not upload actual RC/vehicle records unless appropriate authorisation and a compliant data-handling policy are in place.
- Attached demo files may be copies of user-provided documents. Generated sample certificates show clear **SAMPLE** warnings. Do not represent them as official.
- Tesseract accuracy on generated sample plates is not a measurement of actual-station ANPR accuracy. Lighting, motion, image quality, number-plate design and camera placement require field testing.
- Real cylinder quantity and real hydrotesting certificate validity cannot be inferred from the plate image. Government/issuer database verification is not included.
- Station camera edge inference, automatic display hardware, 24×7 physical service, spare hardware, networking supply, guaranteed uptime, mobile native app and government API integration are **future contractual integrations**, not delivered features.
- Before real public/enterprise rollout: pen test, CSRF/session/rate-limit at reverse proxy, privacy/DPIA, data retention/erasure policy, credential lifecycle, encrypted backups, disaster recovery, load test, audit log immutability, Alembic schema migrations, source code review, approved data providers and vendor support plan.

## Tests

`pytest -q tests/test_end_to_end.py` validates authentication, role checks, demo states, vehicle CRUD, generated PDF, station/user CRUD, real OCR on a generated sample plate, history, snapshot and invalid inputs. These tests use temporary SQLite and a **fake local password**; they do not connect to live Hostinger/PostgreSQL. Source JS parsing can be checked with `node --check static/app.js`.

## Directory layout

```
app/                 Python FastAPI, security, ORM, OCR
static/              Browser frontend (dashboard/login)
samples/             Synthetic images for OCR demonstrations
storage/             Local-only DB and snapshots (excluded by Docker)
tests/               Integration tests
deploy/              Hostinger manual and operations checklist
Dockerfile           API + Tesseract runtime
compose.yaml         FastAPI / PostgreSQL / Caddy
Caddyfile            Domain HTTPS reverse proxy
.env.example         Mandatory secrets/hosting values
run-local.py         Local interactive launcher (loopback only)
```

## v3 update — 100 demonstration vehicle records

The bundled `seed_data/vehicles_100.csv` contains **100 fictional vehicles** (six original plus 94 additional) and `seed_data/cylinders_100.csv` contains corresponding cylinder rows. The application seeds them automatically on startup while preserving existing edits. `sql/SmartFuel_100_Demo_Vehicles_PostgreSQL.sql` is provided for optional direct PostgreSQL import (see `sql/IMPORT-INSTRUCTIONS.md`).

These are fully synthetic, unverified demonstration records. **Do not represent them as government or hydrotesting authority results.**

## v5 start here

The latest changes include analytics, camera-device enrollment, an on-site camera sampler, per-station scans, a separate `/alerts/wall`, shared demo registry, database-persisted login throttling, password session revocation, and optional sample-document evidence enforcement.

- **Hostinger KVM2 installation:** `deploy/HOSTINGER-KVM2.md`
- **What is implemented vs still pending:** `deploy/V5-IMPLEMENTED-AND-PENDING.md`
- **Automated test results:** `deploy/RELEASE-TEST-RESULTS-v5.md`
- **Private backup:** `bash ops/backup.sh /root/smartfuel-private-backups`
- **Monitoring probe:** `bash ops/health-watch.sh`
- **Station edge camera:** `edge/edge_agent.py`, installed on the operator's own authorized station PC, not on VPS.
- **UI preview screenshots:** `docs/` — captured with MOCKED API responses; not proof of VPS deployment.

No official vehicle/CNG hydrotesting API, physical camera installation, VPS account connection, or guaranteed 24x7 support is supplied in this repository.
