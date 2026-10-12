## Pull Request Summary
<!-- Provide a concise description of what this PR introduces or fixes. -->

### Changes Overview
- 

---

### Mandatory Zero Data Loss & SRE Checklist
- [ ] **Zero Data Loss Verified:** This PR contains NO database table drops, column deletions without safe fallback, volume wipes, or data-clearing scripts.
- [ ] **Non-Destructive Migrations:** Any schema modifications use additive patterns (e.g. `ALTER TABLE ... ADD COLUMN ... DEFAULT ...`) without altering existing rows.
- [ ] **Persistent Volume Safety:** No flags modifying `postgres_data` or `private_files` volume bindings in `compose.yaml`.
- [ ] **Security Scans Passed:** Executed `ruff check app/` and `bandit -r app/ -ll` with zero high/critical issues.
- [ ] **Tests Executed Locally:** All unit, integration, and E2E tests in `tests/` pass.
- [ ] **Environment Secrets Safe:** No hardcoded API keys, private certificates, or `.env` credential files committed.

---

### Verification Evidence
```bash
# Paste test run or lint output here
```

### Risk Assessment & Rollback Strategy
- **Deployment Risk Level:** [Low / Medium / High]
- **Rollback Procedure:** [Describe how to revert if an issue arises]
