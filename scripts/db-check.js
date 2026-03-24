const { Client } = require('pg');

const connectionString = (process.env.DATABASE_URL_RUNTIME || process.env.DATABASE_URL || '').trim();

if (!connectionString) {
  console.error('[db-check] Missing DATABASE_URL_RUNTIME or DATABASE_URL');
  process.exit(1);
}

let host = 'unknown';
try {
  host = new URL(connectionString).hostname || 'unknown';
} catch {
  console.error('[db-check] Invalid PostgreSQL connection string');
  process.exit(1);
}

const client = new Client({
  connectionString,
  connectionTimeoutMillis: 8000,
});

(async () => {
  try {
    await client.connect();

    const ping = await client.query('SELECT current_database() AS db, current_user AS usr, NOW() AS now');
    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('articles','categories','admin_users','adverts','site_settings') ORDER BY table_name"
    );

    console.log(`[db-check] Connected to host=${host}`);
    console.log('[db-check] Session:', ping.rows[0]);
    console.log('[db-check] Required tables found:', tables.rows.map((r) => r.table_name).join(', ') || '(none)');

    const missing = ['articles', 'categories', 'admin_users', 'adverts', 'site_settings'].filter(
      (tableName) => !tables.rows.some((row) => row.table_name === tableName)
    );

    if (missing.length > 0) {
      console.error(`[db-check] Missing tables: ${missing.join(', ')}`);
      process.exit(2);
    }

    console.log('[db-check] OK');
  } catch (error) {
    console.error('[db-check] Connection failed:', error.code || '', error.message || String(error));
    process.exit(1);
  } finally {
    try {
      await client.end();
    } catch {
      // Ignore disconnect errors
    }
  }
})();
