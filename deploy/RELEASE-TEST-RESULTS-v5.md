# SmartFuel ANPR Commercial Pilot v5 — Release verification

Tests run on 10 October 2026 in local container environment:

- `pytest -q tests/test_end_to_end.py tests/test_seed_data.py tests/test_v5_features.py`: **6 passed**.
- Real OCR tested with uploaded synthetic number plate: recognises plate; uncertain OCR remains unverified until manually confirmed. Real station accuracy unmeasured.
- Tested: admin login, CSRF role protection, central vehicle lookup, 100-record demo data, PDF reports, SQL database persistence in local SQLite, station assignment, login session invalidation after password change, protected camera registration, edge image upload, duplicate suppression, token revocation, station and date analytics, PDF demo certificate, CSV export, inspection history.
- `node --check static/app.js && node --check static/alert-wall.js`: passed.
- HTML IDs referenced by JavaScript: all matched (static ID check).
- Browser static UI test via `page.set_content` and **simulated JSON responses**: overview stats, inspection form/result, analytics, administration visible, no JavaScript page errors. The screenshots in `docs/` are MOCK-DATA UI previews, not live screenshots.
- Automated real Chromium navigation to localhost was blocked by the test environment's administrator policy; full live browser E2E was **not** performed.

Not tested here: Docker image build, PostgreSQL on VPS, Hostinger domain/HTTPS, production backups/restores, USB/RTSP camera hardware, continuous camera reliability, performance testing or official government integration.

Security/privacy: all bundled vehicles and cylinders are synthetic; never use for legal CNG clearance.
