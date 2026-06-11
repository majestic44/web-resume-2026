import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDatabasePool } from '../config/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '..', '..', 'database', 'migrations');
const isDryRun = process.argv.includes('--dry-run');

async function getMigrationFiles() {
  const files = await fs.readdir(migrationsDir);

  return files
    .filter(file => /^\d+_.+\.sql$/.test(file))
    .sort();
}

async function ensureMigrationTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      migration VARCHAR(255) NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY schema_migrations_migration_unique (migration)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function getAppliedMigrations(pool) {
  const [rows] = await pool.query('SELECT migration FROM schema_migrations ORDER BY migration');

  return new Set(rows.map(row => row.migration));
}

async function runMigration(pool, file) {
  const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map(statement => statement.trim())
    .filter(Boolean);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const statement of statements) {
      await connection.query(statement);
    }

    await connection.query('INSERT INTO schema_migrations (migration) VALUES (?)', [file]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function main() {
  const files = await getMigrationFiles();

  if (isDryRun) {
    console.log(`Found ${files.length} migration(s):`);
    files.forEach(file => console.log(`- ${file}`));
    return;
  }

  const pool = getDatabasePool();
  await ensureMigrationTable(pool);

  const applied = await getAppliedMigrations(pool);
  const pending = files.filter(file => !applied.has(file));

  if (pending.length === 0) {
    console.log('No pending migrations.');
    await pool.end();
    return;
  }

  for (const file of pending) {
    console.log(`Applying ${file}`);
    await runMigration(pool, file);
  }

  console.log(`Applied ${pending.length} migration(s).`);
  await pool.end();
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

