# SmartFuel ANPR v5 — Field-pilot feature register

## Implemented in this software ZIP
- OCR uploads and browser USB/webcam capture, low-confidence manual review.
- 100 fictional demo records; CNG/cylinder lookup, date-based demo outcomes and sample certificate reports.
- Distinguish sample reference-only from actual sample-file attachment. `REQUIRE_SAMPLE_ATTACHMENT=1` will treat references without real sample attachments as missing, which changes the 100-record demo distribution.
- Station selection per scan (no automatic station 1 assignment when multiple stations exist); station-scoped inspection/analytics access, with a shared central demo vehicle registry.
- Analytics page with date and station filters; protected `/api/analytics`.
- Dedicated auto-refresh alert display `/alerts/wall` for signed-in accounts.
- Protected admin camera-device enrollment, revocable per-device tokens, and `/api/edge/scan` ingestion with per-station duplicate suppression (90 seconds).
- Optional local edge agent `edge/edge_agent.py` sampling authorized USB/RTSP source. Not a certified continuous industrial ANPR appliance.
- All old user sessions invalidated when password changes; DB-persisted per-IP+email login failures.
- Backup/monitoring scripts and Linux VPS instructions.

## What still requires external integration / field work
- A real Hostinger KVM2 deployment, domain/TLS/DNS, physical camera setup and on-site image-quality testing are **not performed** in this container.
- OCR field accuracy depends on camera distance, lighting, vehicle motion, plate types and tuning. Per-camera latency and throughput must be benchmarked.
- No government/VAHAN/Hydrotesting API. No official safety clearance or certificate authentication: all outputs are demonstration values.
- No physical CNG-station safety implementation, certified ANPR camera installation, ISP provision, hardware maintenance or actual 24x7 service desk.
- This prototype uses `metadata.create_all` plus additive tables (no complex migration); **adopt versioned Alembic migrations** before a mature production service.
- Use encrypted offsite backups, retention policy, penetration testing, approved procurement and documented SLA prior to deployment to real inspection sites.

## Edge camera example (station PC, NOT VPS)
1. On the hosted dashboard: Administration → register an edge camera and select the station.
2. Store the returned one-time token privately on that station's PC.
3. Install Python 3.11 and `opencv-python`, then set:
   - `EDGE_SERVER_URL=https://anpr.your-domain.example`
   - `EDGE_DEVICE_TOKEN=<one-time-secret>`
   - `EDGE_CAMERA_SOURCE=0` for USB or your **authorized** camera RTSP address.
4. Run `python edge/edge_agent.py`. The edge agent samples stills, submits via HTTPS, and ignores the same plate for 90 seconds on the backend.
5. Open `/alerts/wall` while logged in to view alerts; keep a station-specific viewer/operator account for wall access.
6. Disable compromised edge credentials immediately in Administration.

## KVM2 operational scripts
- `bash ops/backup.sh /secure/private-backups` creates database and private image/certificate backups. Copy to encrypted offsite media.
- `bash ops/health-watch.sh` provides cron-friendly health status, but alert delivery must be configured in your own monitoring platform.
- Schedule maintenance windows, test restore, and do not run Docker `down -v` on real data.
