# SmartFuel ANPR v7 — Code-level release report

- **15/15** automated tests pass using local Python/FastAPI TestClient and SQLite demonstration database.
- v7 test scenarios: RC not endorsed, expired cylinder, missing certificate, unknown RC, demo-valid, absent vehicle, low-confidence OCR, authenticated station isolation, optional fictional owner name, old-database additive migration, and logout session replay denial.
- Existing v6 tests also pass, including local OCR sample readings, database operations, entry logs and role restrictions.
- Frontend JavaScript files pass `node --check` syntax validation.
- The generated v7 CNG display HTML is linked from inspection and alerts pages.
- An automated Chromium visit to localhost was blocked by this test environment (`ERR_BLOCKED_BY_ADMINISTRATOR`), so it was **not** counted as a passed browser rendering check.
- Live Hostinger KVM2, PostgreSQL under Docker, connected second monitor, and physical USB/RTSP cameras **not tested**.
- Records are fictional and results are **not government-verified CNG dispensing authorisations**.
- All releases must pass station on-site acceptance and software security review before real operational use.
