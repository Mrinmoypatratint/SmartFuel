# SmartFuel ANPR — 100 synthetic SQL records

- `SmartFuel_100_Demo_Vehicles_PostgreSQL.sql` inserts **100 demo vehicles total**, including six from the previous version, plus matching cylinder rows. It is **PostgreSQL**, not MySQL/phpMyAdmin SQL.
- The v3 app **loads all 100 automatically** when `SEED_DEMO=1` (default in example `.env`), including when upgrading an existing installation containing the original six records. You do NOT need to run the SQL manually with the updated app.
- If you wish to import the SQL manually, first start the app once (or otherwise create the tables via the app's SQLAlchemy schema), then run from the VPS project root:

```bash
# Back up database before manual import
# SQL import: importable repeatedly without overwriting existing vehicle rows
# This command uses the credentials already configured in the database container.
docker compose exec -T database sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < sql/SmartFuel_100_Demo_Vehicles_PostgreSQL.sql
```

- To check the records:

```bash
docker compose exec database sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) FROM vehicles;"'
```

- After a clean install you should see `100`. If your database already has additional manually entered vehicles, the total may exceed 100 because **existing data are preserved**.
- All plates, vehicle models, CNG entries, test dates and certificate references are **fictional** and must not be used as evidence of regulatory compliance. The `RJ00DE0007` test photo intentionally remains **Not Registered**.
