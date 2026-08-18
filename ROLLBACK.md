# JeevaSetu Karnataka — Production Rollback Playbook

This document details rapid rollback procedures for JeevaSetu Karnataka (v2 with GapSense).

---

## 1. Database Schema & Migration Rollback

### Scenario A: Rollback Newly Applied Schema Migration
If a new migration introduced an issue on the database:
1. Identify the last healthy migration state.
2. In production PostgreSQL, apply the down-migration SQL script generated for that release:
   ```bash
   # From packages/api
   psql "$DATABASE_URL" -f prisma/migrations/<migration_timestamp>/down.sql
   ```
3. Update `_prisma_migrations` table record if necessary:
   ```sql
   DELETE FROM "_prisma_migrations" WHERE migration_name = '<failed_migration_name>';
   ```
4. For automated recovery in non-production / staging:
   ```bash
   npm run db:migrate:deploy
   ```

---

## 2. Container & Image Tag Rollback

### Scenario B: API or Frontend Container Regression
If a new release build (`v2.1.0`) fails in production:
1. Re-point docker-compose or Kubernetes Deployment to previous stable tag (`v2.0.0`):
   ```bash
   # Docker Compose
   IMAGE_TAG=v2.0.0 docker compose -f docker-compose.yml up -d --no-deps api
   ```
2. Verify liveness and database reachability:
   ```bash
   curl -i http://localhost:4000/health
   curl -i http://localhost:4000/ready
   ```

---

## 3. Background Escalation Worker Kill Switch

### Scenario C: Worker Runaway or Scanner Throttling
To immediately pause the GapSense escalation background scanner without taking down the API:

1. **Standalone Worker Container**:
   ```bash
   docker stop jeevasetu-worker
   ```
2. **In-Process API Worker**:
   Set `WORKER_ENABLED=false` in the API environment and restart the API container:
   ```bash
   WORKER_ENABLED=false docker compose restart api
   ```
3. To adjust scan frequency if DB pressure is detected:
   Set `WORKER_INTERVAL_MS=300000` (5 minutes) and restart worker.

---

## 4. Disaster Recovery Database Restoration

### Scenario D: Data Corruption or Full Restore from Dump
To restore PostgreSQL from an automated backup dump:

1. Terminate active backend connections:
   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'jeevasetu_db' AND pid <> pg_backend_pid();
   ```
2. Drop and recreate database:
   ```bash
   dropdb -U "$POSTGRES_USER" -h "$POSTGRES_HOST" jeevasetu_db
   createdb -U "$POSTGRES_USER" -h "$POSTGRES_HOST" -O "$POSTGRES_USER" jeevasetu_db
   ```
3. Restore from backup dump:
   ```bash
   pg_restore -U "$POSTGRES_USER" -h "$POSTGRES_HOST" -d jeevasetu_db --clean --if-exists /backups/jeevasetu_latest.dump
   ```
4. Verify migration state:
   ```bash
   npm run db:migrate:deploy --workspace=packages/api
   ```
