# Hostinger VPS KVM2 — Deployment & Operations

> **Status:** Deployment guide. This source ZIP has not been connected to a real Hostinger VPS; these steps need to be executed and verified by an authorised VPS administrator.

## 1. Prepare KVM2 server

- VPS Ubuntu 24.04, 2 vCPU / 8GB RAM is a reasonable starting point for single-worker image OCR and a small demo team; benchmark real request times. It is not sized for concurrent 24/7 multi-camera streams.
- Point DNS `anpr.yourdomain.in` **A record** at VPS IPv4 and wait until resolution works.
- Secure SSH; create non-root deployment operator with sudo privileges. Enable security updates, UFW/firewall restrictions and server monitoring.
- Install Docker Engine and Docker Compose plugin using Docker's current official Ubuntu install documentation: https://docs.docker.com/engine/install/ubuntu/
- Allow inbound TCP 80/443 for HTTP certificate issuance and HTTPS. Keep DB 5432 and app 8000 unexposed. Restrict SSH to an admin-controlled source.

## 2. Deploy files and configure secrets

```bash
# upload/extract source ZIP in /opt/smartfuel-anpr on VPS
cd /opt/smartfuel-anpr
cp .env.example .env
nano .env
chmod 600 .env
```

Change ALL placeholder values. Set `ANPR_DOMAIN` to an existing DNS hostname, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_HOST=database`, `SESSION_SECRET` 32+ random characters, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12+ strong characters), `COOKIE_SECURE=1`.

Generate long random values with `openssl rand -hex 32` twice (separately for DB password and session key). The repository will REFUSE to start if example account values remain.

The app creates an admin on first launch. **Changing the `.env` admin password later does not automatically reset an existing user's database password.** Use the authenticated Administration interface for future account operations and password change.

## 3. Launch

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 web
docker compose logs --tail=100 proxy
```

Caddy automatically obtains HTTPS certificates if DNS is correct and port 80/443 are reachable. First issuance can take a short time. Do not put another service on ports 80/443.

Verify:

- `https://anpr.yourdomain.in/api/health` -> JSON `ok: true`
- `https://anpr.yourdomain.in/login` -> SmartFuel secure login
- Login with your configured email and password.
- Upload a sample plate and confirm OCR + database lookup + report generation.
- On HTTPS, connect an authorised USB webcam to your **operator laptop** and use Camera / Capture; allow browser permissions.
- Create an Operator or Viewer in Administration and verify restrictions.
- Confirm inspection history and DB records persist after `docker compose restart web`.

### If the site returns 503 / 502 / blank page

```bash
docker compose ps
docker compose logs --tail=150 web
docker compose logs --tail=150 database
docker compose logs --tail=150 proxy
docker compose exec web python -c "import pytesseract; print(pytesseract.get_tesseract_version())"
```

- Web `Exited`: read first Python traceback; check environment, secrets, database connection.
- Database unhealthy: check DB password, volume permissions and available disk space.
- Proxy error: inspect domain, DNS A record, 80/443 firewall and HTTPS certificate logs.
- `401` API: login is required; `403` mutation: CSRF token / role restrictions.
- Camera unavailable: browser must access the site over HTTPS, camera must be connected locally and permission granted.

## 4. Persistence and backups

The database uses named Docker volume `postgres_data`; images and sample certificate files use `private_files` volume. These survive ordinary container upgrades, but NOT intentional volume removal (`docker compose down -v`).

Database backup example:

```bash
mkdir -p private-backups
chmod 700 private-backups
docker compose exec -T database sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "private-backups/db-$(date +%Y%m%d-%H%M%S).sql"
```

Also back up the `private_files` Docker volume with encrypted, access-controlled storage and test restoring it separately. **The script shown backs up database content only**, not uploaded files. Create a scheduled offsite backup mechanism and alert on failures before relying on the system.

Never delete volumes or expose `.env`, backup `.sql`, images or certificates via public file hosting.

## 5. Upgrades

1. Take verified database AND attachment backups.
2. Review changes and migrations before replacing the source.
3. Deploy with `docker compose up -d --build`.
4. Recheck all acceptance steps and rollback if necessary.

For future schema changes, add versioned Alembic migrations before deploying; `Base.metadata.create_all()` in this prototype creates tables but does not migrate existing tables safely.

## 6. Security/operational checklist

- Use only synthetic/consented images and data.
- CNG safety and RC/hydrotesting outcomes are demo classifications, not official validity checks.
- Admin/Operator/Viewer role tests, logout, password change, disable user; HTTPS, secure cookies, CSRF.
- Monitor uptime, disk and CPU/RAM (OCR runs on shared CPU), rotate logs, monitor backup success.
- Host and/or edge security needed for abusive traffic limits and malware scanning of attachments.
- Decide CCTV policy, retention durations and operator permissions with client/legal counsel.
- Physical camera installation, ISP supply, 24×7 helpdesk/hardware SLA are outside software ZIP.

## v5 commercial pilot additions

After KVM2 deployment, open **AI Inspection** and confirm that the selected station is correct before every scan. An Admin must explicitly choose one when multiple stations exist. Station operators have a locked assigned station.

For **Analytics**, inspect the selected date range and station filters. For a TV or wall display, open the separate signed-in URL `/alerts/wall`, which refreshes every ten seconds. Use a station-assigned Viewer account for a station-only alert wall.

For an optional authorised **on-site IP / RTSP camera**, use Administration to register a camera for the correct station. Copy the one-time device token to a private environment variable on the station PC and follow `deploy/V5-IMPLEMENTED-AND-PENDING.md`. Camera processing is sampled and deduplicated; it is not a certified, continuously accurate industrial ANPR product.

To run backups and basic health checks after Docker is healthy:

```bash
chmod +x ops/backup.sh ops/health-watch.sh
bash ops/backup.sh /root/smartfuel-private-backups
bash ops/health-watch.sh
```

Keep backups offline/encrypted and test restore. These scripts do not by themselves provide remote alerts or a 24x7 support organisation.

With `REQUIRE_SAMPLE_ATTACHMENT=0` the seeded fictional certificate **reference** can produce a demo-valid result; it is marked "reference only — no file" in the dashboard. With `REQUIRE_SAMPLE_ATTACHMENT=1`, an actual sample attachment must be present too, changing the apparent distribution of seeded statuses. Neither option establishes genuine certification.

## v7 separate display

Log into the same hosted system on the station-attendant screen and open **`https://YOUR_DOMAIN/cng-display`**. It requires authentication and refreshes every three seconds. For multi-station Admin accounts, choose the correct station. The UI includes an optional *sample owner name* field for fictional testing data; it does not retrieve real registration-owner data. See `deploy/V7-CNG-STATION-DISPLAY.md`.
