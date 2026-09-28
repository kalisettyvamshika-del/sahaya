// Auto-initializes SAHAYA DB schema.
// Strategy:
//   1) If DATABASE_URL env var is set -> connect with `pg` and run schema.sql
//   2) Otherwise -> print friendly instructions to paste schema.sql manually
//
// Run:  npm run init-db

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, '..', 'schema.sql');

async function runWithPg() {
  const { default: pg } = await import('pg');
  const Pool = pg.Pool || pg.default?.Pool || pg.Pool;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  console.log('🛡️  Running schema against Supabase Postgres...');
  try {
    await pool.query(sql);
    console.log('✅ Schema applied successfully.');
  } catch (e) {
    console.error('❌ Schema execution failed:', e.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

function printManualInstructions() {
  console.log('┌──────────────────────────────────────────────────────────────────┐');
  console.log('│  SAHAYA SCHEMA — manual setup required (one-time, ~30 seconds)  │');
  console.log('└──────────────────────────────────────────────────────────────────┘');
  console.log('');
  console.log('1. Open your Supabase dashboard:');
  console.log('   https://supabase.com/dashboard/project/<your-project-ref>');
  console.log('2. Click "SQL Editor" in the left sidebar.');
  console.log('3. Click "+ New query".');
  console.log('4. Paste the contents of:');
  console.log('   ' + SCHEMA_PATH);
  console.log('5. Click "Run" (or press Ctrl+Enter).');
  console.log('6. You should see "Success. No rows returned."');
  console.log('');
  console.log('Optional: To run automatically next time, set DATABASE_URL in .env:');
  console.log('   postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres');
  console.log('');
}

if (process.env.DATABASE_URL) {
  runWithPg();
} else {
  printManualInstructions();
}
