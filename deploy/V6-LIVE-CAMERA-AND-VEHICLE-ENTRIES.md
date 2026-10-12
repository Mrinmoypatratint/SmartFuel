# SmartFuel ANPR v6 — Live USB Camera + Automatic Vehicle Observation Log

## What is implemented

The hosted dashboard has a persistent **Live USB/Webcam Monitor** inside AI Inspection. After an authorised operator clicks **Start live camera** and grants browser permission, video stays visible in the interface. The `Automatic ANPR + entry logging` option is on by default and may be paused independently of the camera.

The browser captures *individual still frames*, not continuous video recordings, for the backend's single-slot OCR engine (conservative about KVM2 CPU). The program requests a new recognition after the preceding inference finishes and a short delay. It requires **three matching OCR readings** before sending a final snapshot for second-pass server OCR. It then creates an entry observation **only when the final OCR matches**, and records:

- A server-recorded UTC timestamp (shown in the browser's local timezone)
- Recognised registration, source, station and OCR confidence
- A stored JPEG snapshot (only on accepted/explicit captures)
- A linked inspection with a snapshot of the demo database outcome and cylinder details
- The inspection PDF and CSV-exportable activity log
- Whether manual confirmation is required

All results are **synthetic demonstration records**. A database match is not a legal or government-verified certificate check.

## Distinguish camera observations from manual inspections

- `event_type=entry`: automatically accepted webcam or optional station edge camera observation; indicates a camera saw the plate at a station configured for vehicle entry.
- `event_type=inspection`: uploaded image, manual lookup, or manually captured webcam snapshot. These are not claimed to be physical vehicle arrivals.
- Server-generated event timestamps represent the time an observation was accepted and logged, **not a certified gate-crossing time**. No physical barrier sensor or independent vehicle-entry detection has been built. An exit cannot be inferred without a dedicated exit camera or other sensor.
- The client requires an authorised environment and visible camera consent. The browser requests camera permission. No covert or background webcam operation is supported: camera stops upon page navigation.

## Accuracy and duplicate protection

- OCR candidate stability: 3 consistent frames within 18 seconds.
- Server repeats OCR before saving; a changed plate is rejected as uncertain.
- Duplicate suppression: same plate / station / entry observation within 180 seconds is not inserted again. This is a time-based heuristic; a vehicle leaving and returning within that interval may be suppressed, and a parked vehicle longer than the interval may generate a new event. For *definitive unique entry/exit cycles*, install entry/exit cameras or sensors with direction/track detection and matching.
- On OCR confidence under 35%, the camera still logs the suspected plate as `unverified` for inspection, but does **not** claim the certificate is valid. An authorised operator can use **Check number** to confirm/correct OCR **without creating another physical entry**. The original observation timestamp is preserved.
- Preview frames are discarded; photographs are stored for accepted observations/explicit scans only. Configure retention and access policy before using actual vehicle images.

## Operator walkthrough

1. Log into the hosted app over HTTPS (or local `localhost`).
2. Go to **AI Inspection**, select a station and choose **USB/webcam**.
3. Plug in the authorised webcam, choose it in the device menu and click **Start live camera**. Grant browser permission.
4. The live video displays continuously. Position a fictional/demo plate in view. The monitor shows progressive recognition status.
5. After three consistent detections and a matching final server OCR, the result card updates automatically. **Automatically detected entries** shows time, plate, outcome and PDF report.
6. Open **Vehicle Entry Logs** for vehicle, time, station, camera/manual event type, confidence, details and CSV export.
7. To pause, untick **Automatic ANPR + entry logging**; use **Stop camera** to release the USB device.

## Deployment changes compared to v5

- New `vehicle_events` table is created automatically on startup via SQLAlchemy `Base.metadata.create_all()`. Older `inspections` are not backfilled or modified. Existing 100 demo vehicle rows and related certificates are preserved.
- Install/update v6 as for v5 (`docker compose up -d --build`) **after backing up the PostgreSQL database and private photo/certificate volume**.
- Clear your browser's cached JS/CSS if older interface persists, then verify `/api/health` and camera permissions on your HTTPS hostname.
- `GET /api/entries`, `GET /api/entries.csv`, `GET /api/entries/{id}`, `POST /api/entries/{id}/confirm` require authenticated access and enforce station scope.
- `POST /api/camera/preview` and `/api/camera/entry` require admin/operator access and CSRF; the second route never trusts a client-submitted plate without running OCR itself.
- v6 app version: `6.0.0`. Automatic monitoring is intended for a controlled pilot with low camera concurrency; load test KVM2 before using multiple station cameras simultaneously.

## What is NOT verified or delivered by this ZIP

- USB webcam permissions and image quality on your actual Windows/laptop computer
- RTSP/IP camera placement and field accuracy at a real fuel station
- Hostinger KVM2 actual Docker/PostgreSQL/HTTPS deployment or load test
- Any government, statutory, or official hydrotesting database/API integration
- Hardware-based gate-crossing, reliable vehicle direction or exit-time tracking
- Legal production data retention, official compliance certification, or 24x7 physical support
