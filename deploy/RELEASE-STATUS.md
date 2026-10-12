# SmartFuel ANPR Commercial Pilot v2 — Release Verification (2026-10-10)

## Verified locally

- FastAPI application starts with valid local environment and responds `200 {"ok":true}` at `/api/health`.
- Four Python integration test groups PASS: admin sign-in, session/CSRF/RBAC, demo vehicle CRUD, inspection status classifications, reports/certificates, sample OCR and snapshots, station and user creation, account disable/password change, errors.
- Seven prepared synthetic plate images were OCR'd locally: 7 of 7 expected values. These results DO NOT measure accuracy on real moving vehicles or 2MP station cameras.
- `node --check` passes on frontend and login JS.
- Frontend static inspection: 76 IDs referenced by JS; 0 missing from index.html.
- PDF inspection report generated; sample warning and cylinder-wise details confirmed in extracted text and rendered page.
- SQLAlchemy SQLite developer mode passed. KVM2 PostgreSQL path is configured but NOT runtime-tested in this environment.

## Not verified yet (deployment acceptance required)

- Docker image build/Compose startup, PostgreSQL container, Caddy HTTPS certificate and live DNS: **NOT run on actual VPS**.
- USB webcam capture on a real Windows machine over hosted HTTPS: **not hardware-tested**.
- Live browser end-to-end automation: browser navigation blocked by execution environment; frontend source validation performed instead.
- Field ANPR accuracy with 2MP+ station camera, multiple moving vehicles, night rain glare: **not tested**.
- True government RC endorsement, installed cylinder count or issued hydrotest documents: **no official API is connected**.
- Production audit, penetration testing, load testing, backup restoration and SLA: **not completed**.

## Delivery classification

**Functionally tested source-code commercial pilot** for synthetic records, delivered as a VPS-ready ZIP. It is NOT a production-compliant governmental verification application and has NOT been deployed to a public host. Domain credentials, live environment and station equipment require client/operator action.
