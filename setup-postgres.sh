#!/bin/sh
set -e
PGDATA=/mnt/host/wsl/pgdata
mkdir -p "$PGDATA" /run/postgresql
chown -R postgres:postgres "$PGDATA" /run/postgresql
chmod 777 /run/postgresql

su - postgres -c "pg_ctl -D $PGDATA -l /tmp/pg_logfile start" || su - postgres -c "pg_ctl -D $PGDATA -l /tmp/pg_logfile restart"
sleep 2
su - postgres -c "psql -c \"CREATE USER jeevasetu WITH SUPERUSER PASSWORD 'jeevasetu_dev_secret';\"" || true
su - postgres -c "psql -c \"CREATE DATABASE jeevasetu_db OWNER jeevasetu;\"" || true
echo "POSTGRES_READY"
