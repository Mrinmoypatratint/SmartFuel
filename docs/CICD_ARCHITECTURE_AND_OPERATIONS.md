# Enterprise CI/CD Pipeline Architecture & SRE Operational Runbook

**Project Name:** SmartFuel — National Automated CNG Safety & Compliance Verification System  
**System Classification:** Enterprise Production Delivery System  
**Author:** Principal DevOps Engineer, Senior SRE & Cloud Architect  
**Document Reference:** SF-CICD-OPS-2026-V1.0  
**Status:** Validated & Active  

---

## 1. Executive Architecture Overview

The SmartFuel CI/CD delivery system is engineered to provide an automated, auditable, and immutable path to production across staging and production environments, while enforcing an absolute **Zero Data Loss Guarantee**.

```
+----------------------------------------------------------------------------------------------------+
|                                    CI/CD PIPELINE FLOW DIAGRAM                                     |
|                                                                                                    |
|  [Developer Branch]                                                                                |
|          |                                                                                         |
|          v                                                                                         |
|  [Pull Request to main/staging]                                                                    |
|          |                                                                                         |
|          v                                                                                         |
|  [CI Workflow: ci.yml]                                                                             |
|    |-- 1. Mergeability & Git Conflict Detection                                                    |
|    |-- 2. Ruff Lint & Syntax Analysis (app/ + tests/)                                              |
|    |-- 3. Bandit AST Security Scan (Zero High/Med Vulnerabilities)                                  |
|    |-- 4. Pip-Audit Dependency Vulnerability Check                                                 |
|    |-- 5. Pytest Full Suite (Unit, Integration, E2E with Tesseract OCR)                            |
|    +-- 6. Docker Container Buildx & Trivy Vulnerability Scan                                       |
|          |                                                                                         |
|          | (All Checks Green + Peer Review Approved)                                               |
|          v                                                                                         |
|  [Merge to main]                                                                                   |
|          |                                                                                         |
|          v                                                                                         |
|  [CD Staging: deploy-staging.yml]                                                                  |
|    |-- Pre-Flight Zero Data Loss Architectural Check                                               |
|    |-- Automated Pre-Flight Hot Database & File Backup (ops/backup.sh)                             |
|    |-- Record Previous Known-Good Commit SHA (.previous_known_good_commit)                         |
|    |-- Zero-Downtime Safe Container Update (Preserves Volumes)                                     |
|    +-- Staging Health Check (/api/health) & UI Smoke Tests                                         |
|          |                                                                                         |
|          | (Verified on Staging)                                                                   |
|          v                                                                                         |
|  [GitHub Release Tag / Gated Approval]                                                             |
|          |                                                                                         |
|          v                                                                                         |
|  [CD Production: deploy-production.yml]                                                            |
|    |-- Protected Environment Manual Approval Gate (Required Reviewers)                             |
|    |-- Mandatory Operator Confirmation Check                                                       |
|    |-- Mandatory Pre-Flight Production Backup (SQL dump + Storage tar + SHA-256)                   |
|    |-- Rolling Container Deploy (docker compose build && up -d --remove-orphans)                   |
|    |-- Multi-Endpoint Production Health Probe (/api/health, /cng-display)                          |
|    +-- Auto-Alert & Rapid SRE Rollback (rollback.yml) on Any Health Failure                        |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Zero Data Loss Policy & Migration Protocols

### 2.1 The Non-Negotiable Core Principle
Under no circumstances may an automated pipeline or manual operational procedure:
1. Drop, truncate, or wipe PostgreSQL database tables (`vehicles`, `cylinders`, `users`, `inspections`, `audit_events`).
2. Delete, reset, or overwrite files in persistent storage (`/service/storage`, `snapshots/`, `certificates/`).
3. Execute `docker compose down -v` or pass the `--volumes` flag, which purges Docker volumes (`postgres_data`, `private_files`).
4. Execute destructive seed commands (`SEED_DEMO=1` only inserts missing synthetic records; existing user or operational records are never overwritten).

### 2.2 Safe Database Schema Migration Guidelines
All database schema evolutions must be non-destructive and backward-compatible:
- **Additive Only:** New fields must be nullable or possess safe default values (e.g., `ALTER TABLE vehicles ADD COLUMN owner_name VARCHAR(120) DEFAULT ''`).
- **No Column Renames:** Introduce new columns first, migrate data asynchronously, and retain old columns until a subsequent deprecation cycle.
- **Idempotency:** Schema evolution routines (such as `app/database.py:migrate_owner_column()`) must inspect existing table columns before executing `ALTER TABLE` statements.

---

## 3. GitHub Actions Workflows Breakdown

### 3.1 `.github/workflows/ci.yml` (Continuous Integration)
- **Triggers:** Pull requests targeting `main` and `staging`, pushes to `main`, and manual dispatch.
- **Concurrency Control:** Cancels superseded PR runs automatically (`cancel-in-progress: true`), preventing runner waste while preserving sequential branch builds.
- **Job Matrix:**
  1. `pr-validation`: Verifies git mergeability against target branch and flags merge conflicts early.
  2. `code-quality`: Executes `ruff check` across application modules and test files.
  3. `security-scans`: Runs `bandit -r app/ -ll` for AST security vulnerabilities, `pip-audit -r requirements.txt` for known CVEs, and scans for accidental secret leaks.
  4. `test-suite`: Sets up Ubuntu runner, installs native OCR and graphics libraries (`tesseract-ocr`, `tesseract-ocr-eng`, `libgl1`, `libglib2.0-0`), and runs full `pytest -v --tb=short tests/`.
  5. `docker-build-and-scan`: Builds production Docker container, executes Trivy container scan, spins up a local ephemeral instance, and validates the `/api/health` probe.

### 3.2 `.github/workflows/deploy-staging.yml` (Continuous Delivery to Staging)
- **Triggers:** Push to `main` branch or manual `workflow_dispatch`.
- **Environment:** `staging`.
- **Pre-Flight Backup:** Invokes `ops/backup.sh` over SSH to generate timestamped database dumps and file storage archives in `private-backups/` before applying updates.
- **Deployment Strategy:** Rolling update with `docker compose build --pull` and `docker compose up -d --remove-orphans`.
- **Health Verification:** Probes `$STAGING_URL/api/health` and `$STAGING_URL/static/login.html` up to 12 times with exponential backoff.

### 3.3 `.github/workflows/deploy-production.yml` (Production Release)
- **Triggers:** GitHub Releases (`release: published`) or manual `workflow_dispatch` with release tag.
- **Environment:** `production` (Configured as a Protected Environment with Required Approvers).
- **Mandatory Gating:** Requires typed string confirmation (`CONFIRM`) to ensure human intent.
- **Immutable Backup:** Takes pre-flight hot database dump (`smartfuel-db-*.sql.gz`) and storage archive (`smartfuel-files-*.tar.gz`) with SHA-256 checksums. Fails deployment if backup is empty.
- **Health Probing:** Multi-endpoint probe testing `/api/health`, `/static/login.html`, and `/cng-display`.

### 3.4 `.github/workflows/rollback.yml` (SRE Automated Recovery)
- **Triggers:** Manual `workflow_dispatch`.
- **Inputs:** Target environment (`production` / `staging`), optional specific commit SHA (defaults to `.previous_known_good_commit`), optional database restore toggle, and confirmation keyword (`ROLLBACK`).
- **Capability:** Instant recovery to the previous working commit without data loss, with optional full database restore from pre-flight backup archives if catastrophic corruption occurred.

---

## 4. Required GitHub Configuration & Secrets Setup

To activate the deployment workflows, configure the following secrets and variables in your GitHub repository (**Settings > Secrets and variables > Actions**):

### 4.1 Staging Environment (`staging`)
Create an Environment named `staging` in GitHub:

| Secret Name | Type | Description |
| :--- | :--- | :--- |
| `STAGING_HOST` | Secret | IPv4 address or hostname of the Staging server (e.g., `194.163.xxx.xxx`). |
| `STAGING_USER` | Secret | SSH deployment username on staging (e.g., `deployer` or `ubuntu`). |
| `STAGING_SSH_KEY` | Secret | OpenSSH private key for deployment authentication (ED25519 or RSA 4096). |
| `STAGING_URL` | Variable | Public HTTP/HTTPS URL for health checks (e.g., `http://staging.yourdomain.in:8000`). |
| `STAGING_DEPLOY_PATH`| Variable | Directory on host (Default: `/opt/smartfuel-anpr-staging`). |

### 4.2 Production Environment (`production`)
Create an Environment named `production` in GitHub and configure **Protection Rules** (Required Reviewers):

| Secret Name | Type | Description |
| :--- | :--- | :--- |
| `PRODUCTION_HOST` | Secret | IPv4 address or hostname of the Production Hostinger VPS. |
| `PRODUCTION_USER` | Secret | Dedicated SSH operator username with sudo/docker privileges. |
| `PRODUCTION_SSH_KEY` | Secret | Production OpenSSH deployment private key. |
| `PRODUCTION_URL` | Variable | Public production HTTPS URL (e.g., `https://anpr.yourdomain.in`). |
| `PRODUCTION_DEPLOY_PATH`| Variable | Production directory on host (Default: `/opt/smartfuel-anpr`). |

---

## 5. Branch Protection Rules & Governance

Navigate to **Settings > Branches > Add branch protection rule** for `main`:

```
[x] Require a pull request before merging
    [x] Require approvals (Minimum: 1)
    [x] Dismiss stale pull request approvals when new commits are pushed
[x] Require status checks to pass before merging
    [x] Require branches to be up to date before merging
    Status Checks to select:
      - pr-validation
      - code-quality
      - security-scans
      - test-suite
      - docker-build-and-scan
[x] Require conversation resolution before merging
[x] Require signed commits (Recommended)
[x] Do not allow bypassing the above settings
```

---

## 6. SRE Incident Response & Rollback Runbook

### Scenario A: Deployment Failed Health Check
If `deploy-production.yml` reports an unhealthy status after deployment:
1. Navigate to **Actions > SRE - Rollback to Known-Good Release**.
2. Click **Run workflow**:
   - Environment: `production`
   - Rollback to Commit: Leave blank (uses `.previous_known_good_commit`)
   - Restore Database: `false` (Application-only rollback preserves all new database records)
   - Confirm Action: Type `ROLLBACK`
3. Click **Run workflow**. The pipeline checks out the previous commit, rebuilds, and verifies health within 60 seconds.

### Scenario B: Manual SSH Server Emergency Recovery
If GitHub Actions is unreachable, connect directly to the server:
```bash
ssh deployer@<SERVER_IP>
cd /opt/smartfuel-anpr

# 1. View previous working commit
PREV_COMMIT=$(cat .previous_known_good_commit)
echo "Reverting to $PREV_COMMIT..."

# 2. Checkout previous commit
git checkout -f "$PREV_COMMIT"

# 3. Restart containers cleanly
docker compose up -d --build

# 4. Verify health
curl -s http://127.0.0.1:8000/api/health
```

### Scenario C: Database Restoration from Backup
If an accidental corruption occurred and database restoration is explicitly required:
```bash
cd /opt/smartfuel-anpr
LATEST_SQL=$(ls -t private-backups/smartfuel-db-*.sql.gz | head -1)
echo "Restoring database from: $LATEST_SQL"

# Gunzip and pipe directly into postgres container
gunzip -c "$LATEST_SQL" | docker compose exec -T database sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

---

## 7. Monitoring, Health Watching & Alerts

1. **System Health Check Probe:**
   - Endpoint: `/api/health`
   - Returns: `{"ok": true, "service": "SmartFuel ANPR v8 ...", "records_are_demo": true}`
2. **Automated Host Cron Health Watch:**
   Install `ops/health-watch.sh` on the VPS cron to alert on container crashes or disk exhaustion:
   ```cron
   # Add to /etc/crontab or crontab -e:
   */5 * * * * cd /opt/smartfuel-anpr && bash ops/health-watch.sh >> /var/log/smartfuel-health.log 2>&1
   ```
3. **Daily Backup Cron Schedule:**
   ```cron
   # Execute daily hot backup at 02:00 AM UTC:
   0 2 * * * cd /opt/smartfuel-anpr && bash ops/backup.sh /opt/smartfuel-backups >> /var/log/smartfuel-backup.log 2>&1
   ```

---

## 8. Honest Readiness Assessment & Remaining Risks

| Area | Status | Readiness Assessment & Mitigation |
| :--- | :--- | :--- |
| **CI Validation Pipeline** | **Ready** | Fully configured with merge conflict check, Ruff linting, Bandit AST scan, Pip-Audit vulnerability check, Pytest test suite, and Docker build/health check. |
| **Data Preservation** | **Guaranteed** | Static volume check, non-destructive migrations, automated pre-flight hot backup script, zero-wipe compose directives. |
| **Automated Deployment** | **Ready** | Staging and Production deployment workflows configured with SSH agent, container rebuilding, and health checks. |
| **Rollback Capability** | **Ready** | Dedicated rollback workflow with state tracking via `.previous_known_good_commit` and backup restoration options. |
| **External API Gateway** | **Pending Credential Setup** | Production VAHAN 4.0 / PESO production credentials will require populating in `.env` when official agreements with MoRTH/PESO are finalized. |
| **Host Configuration** | **Action Required** | Administrator must set up GitHub Secrets (`STAGING_HOST`, `PRODUCTION_HOST`, etc.) and create protected environments in GitHub repository settings. |
