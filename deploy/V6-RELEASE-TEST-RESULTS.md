# SmartFuel ANPR Commercial Pilot v6 — Test Report

Date: 10 October 2026. Testing completed inside the software-authoring container, NOT on Hostinger VPS.

## Automated backend integration tests: PASS

`python -m pytest -q tests/test_end_to_end.py tests/test_seed_data.py tests/test_v5_features.py tests/test_v6_auto_entry.py`

**10 passed**. Covers:
- Login, session/CSRF, roles and station authorization
- Existing 100 seeded fictional vehicles / 181 cylinders
- Real OCR on sample images; upload/lookup and report generation
- Camera frame preview (real OCR), stable plate processing server-side
- Automatic entry event persistence, server UTC time, snapshot, result and report
- Automatic entry duplicate suppression within 180 seconds
- Low-confidence capture marked UNVERIFIED and confirmation with unchanged event time
- Manual / uploaded-image log correctly marked `inspection`, not physical entry
- Per-station filtering and protected CSV
- Entry summary counters and report access

## Frontend source verification: PASS

- `node --check static/app.js` — passed
- HTML referenced element IDs all present — 104/104 matched
- Headless Chromium UI rendering with **mocked APIs**: page loaded, camera tab and auto toggle displayed, entry table displayed, no JavaScript page exceptions
- Simulated webcam test using canvas captureStream + mocked OCR/API: video monitor visible, 4 preview calls, exactly 1 automatic entry API call, report link appeared in the live monitor feed, no JS page errors

## NOT VERIFIED (must be tested by deployment/operator)

- Real USB camera and physical 2MP+ ANPR camera
- Actual OCR accuracy on uncontrolled vehicle arrivals, lighting and angles
- Docker/PostgreSQL on Hostinger KVM2, HTTPS domain and permissions
- Reliable concurrent use or 24/7 live monitoring; KVM2 CPU capacity
- Multi-camera direction, entry/exit matching and true gate-crossing timestamps
- Government, certificate-issuer or authorised official data integration
- Load tests, offsite backup restoration and production security review

## Data and safety limitations

The vehicle database is **fictional**, certificates are **samples**, and output must not be used for statutory CNG safety clearance. In the web dashboard, video stays on the operator's device and snapshot frames are sent to the hosted OCR worker while camera scanning is explicitly enabled. Only accepted/explicitly captured snapshots are stored. Recorded 'entry' means the camera observed the plate, not a gate sensor certified an entry. No hardware exit sensor is supplied. Implement camera notices, authorization, secure retention/deletion and any required legal processes prior to use with real registrations.
