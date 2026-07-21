const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const migrationDir = path.join(__dirname, 'migrations');
const migrations = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql')).sort();

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL is not set in environment.');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    for (const filename of migrations) {
      const filePath = path.join(migrationDir, filename);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`Running migration: ${filename}`);
      await client.query(sql);
    }
    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
