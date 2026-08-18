import { PGlite } from '@electric-sql/pglite';
import * as fs from 'fs';
import * as path from 'path';

export async function initDemoDatabase() {
  const dbPath = path.resolve(__dirname, '../../../../pgdata-demo');
  const db = new PGlite(dbPath);
  console.log('🚀 PGlite embedded PostgreSQL engine ready at', dbPath);

  const migrationPath = path.resolve(__dirname, '../../prisma/migrations/20260818000000_init/migration.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  try {
    await db.exec(migrationSql);
    console.log('✅ Applied full PostgreSQL 16 schema migration (DDL)');
  } catch (err: any) {
    if (err.message?.includes('already exists')) {
      console.log('ℹ️ Schema already initialized');
    } else {
      console.warn('Migration execution notice:', err.message);
    }
  }

  return db;
}

if (require.main === module) {
  initDemoDatabase().catch(console.error);
}
