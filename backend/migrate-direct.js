#!/usr/bin/env node
/**
 * Direct PostgreSQL Migration Script
 * Connects directly to Supabase PostgreSQL database and creates tables
 * Uses pg client library for direct database connection
 */

const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || process.env.POSTGRES_PASSWORD;

if (!SUPABASE_URL) {
  console.error('❌ SUPABASE_URL not found in .env');
  process.exit(1);
}

// Extract project ID from SUPABASE_URL
const projectId = SUPABASE_URL.split('//')[1].split('.')[0];

// Build PostgreSQL connection options
// Default user is 'postgres', you may need to get the actual password from Supabase
const client = new Client({
  host: `db.${projectId}.supabase.co`,
  port: 5432,
  user: 'postgres',
  password: DATABASE_PASSWORD,
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false,
  },
});

// SQL migrations
const migrations = [
  // Create pgcrypto extension
  {
    name: 'Create pgcrypto extension',
    sql: 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
  },
  
  // Create admins table
  {
    name: 'Create admins table',
    sql: `CREATE TABLE IF NOT EXISTS admins (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );`,
  },

  // Create galleries table
  {
    name: 'Create galleries table',
    sql: `CREATE TABLE IF NOT EXISTS galleries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      description text NOT NULL,
      category text NOT NULL CHECK (category IN ('art', 'event', 'interior')),
      price text NOT NULL,
      image_url text NOT NULL,
      storage_path text NOT NULL,
      "order" integer NOT NULL DEFAULT 0,
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );`,
  },

  // Create index
  {
    name: 'Create gallery index',
    sql: `CREATE INDEX IF NOT EXISTS idx_galleries_category_active_order 
      ON galleries (category, active, "order");`,
  },
];

const report = {
  timestamp: new Date().toISOString(),
  projectId,
  migrationsRun: [],
  tablesCreated: [],
  errors: [],
  testResults: {},
};

async function runMigrations() {
  console.log('🚀 V2T Database Migration Runner (Direct PostgreSQL)');
  console.log('='.repeat(70));
  console.log('');

  console.log('🔌 STEP 1: Connecting to PostgreSQL...');
  console.log('-'.repeat(70));
  console.log(`   Project: ${projectId}`);
  console.log(`   Host: db.${projectId}.supabase.co`);
  console.log(`   Port: 5432`);
  console.log('');

  try {
    await client.connect();
    console.log('   ✅ Connected successfully');
  } catch (error) {
    console.error('   ❌ Connection failed');
    console.error('   Error:', error.message);
    console.error('');
    console.error('   Possible causes:');
    console.error('   1. DATABASE_PASSWORD not set in .env');
    console.error('   2. Wrong password');
    console.error('   3. Supabase project not active');
    console.error('   4. Network connectivity issue');
    console.error('');
    console.error('   To get the correct password:');
    console.error('   1. Go to Supabase Dashboard');
    console.error('   2. Settings → Database');
    console.error('   3. Copy the database password');
    console.error('   4. Add to .env: DATABASE_PASSWORD=<password>');
    console.error('');
    report.errors.push(`Connection failed: ${error.message}`);
    process.exit(1);
  }
  console.log('');

  // ===== RUN MIGRATIONS =====
  console.log('🔧 STEP 2: Running migrations...');
  console.log('-'.repeat(70));

  for (let i = 0; i < migrations.length; i++) {
    const migration = migrations[i];
    console.log(`   [${i + 1}/${migrations.length}] ${migration.name}`);

    try {
      await client.query(migration.sql);
      console.log('   ✅ Success');
      report.migrationsRun.push({
        name: migration.name,
        status: 'success',
      });
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      report.errors.push(`${migration.name}: ${error.message}`);
      report.migrationsRun.push({
        name: migration.name,
        status: 'failed',
        error: error.message,
      });
    }
  }
  console.log('');

  // ===== VERIFY TABLES =====
  console.log('📊 STEP 3: Verifying tables...');
  console.log('-'.repeat(70));

  const tablesToVerify = ['admins', 'galleries'];

  for (const tableName of tablesToVerify) {
    console.log(`   Table: ${tableName}`);

    try {
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = '${tableName}'
        ORDER BY ordinal_position;
      `);

      if (result.rows.length === 0) {
        console.log('   ❌ Table not found');
        report.errors.push(`${tableName} table not created`);
      } else {
        console.log(`   ✅ Found with ${result.rows.length} columns:`);
        result.rows.forEach(col => {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          console.log(`      - ${col.column_name} (${col.data_type}) ${nullable}`);
        });
        report.tablesCreated.push(tableName);
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      report.errors.push(`${tableName} verification failed: ${error.message}`);
    }
  }
  console.log('');

  // ===== TEST INSERT =====
  console.log('🧪 STEP 4: Testing INSERT into galleries...');
  console.log('-'.repeat(70));

  try {
    const testRecord = {
      title: '[MIGRATION TEST] ' + new Date().toISOString(),
      description: 'Automatic test record from migration script',
      category: 'art',
      price: '0',
      image_url: 'https://example.com/test.jpg',
      storage_path: 'test/migration.jpg',
    };

    console.log('   Inserting test record...');

    const insertResult = await client.query(
      `INSERT INTO galleries (title, description, category, price, image_url, storage_path)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, created_at;`,
      [testRecord.title, testRecord.description, testRecord.category, testRecord.price, testRecord.image_url, testRecord.storage_path]
    );

    if (insertResult.rows.length > 0) {
      const inserted = insertResult.rows[0];
      console.log('   ✅ INSERT successful');
      console.log(`      ID: ${inserted.id}`);
      console.log(`      Title: ${inserted.title}`);
      console.log(`      Created: ${inserted.created_at}`);

      report.testResults.insertStatus = 'SUCCESS';
      report.testResults.testRecordId = inserted.id;

      // Delete test record
      try {
        await client.query('DELETE FROM galleries WHERE id = $1', [inserted.id]);
        console.log('   ✅ Cleanup: Test record deleted');
      } catch (deleteErr) {
        console.warn('   ⚠️  Warning: Could not delete test record:', deleteErr.message);
        report.errors.push('Could not delete test record: ' + deleteErr.message);
      }
    } else {
      console.error('   ❌ No rows returned');
      report.testResults.insertStatus = 'FAILED';
      report.errors.push('INSERT test returned no rows');
    }
  } catch (error) {
    console.error('   ❌ INSERT test failed:', error.message);
    report.testResults.insertStatus = 'FAILED';
    report.testResults.insertError = error.message;
    report.errors.push(`INSERT test: ${error.message}`);
  }
  console.log('');

  // ===== TEST SELECT =====
  console.log('🔍 STEP 5: Testing SELECT from galleries...');
  console.log('-'.repeat(70));

  try {
    const selectResult = await client.query(`
      SELECT COUNT(*) as count, category
      FROM galleries
      GROUP BY category;
    `);

    console.log('   ✅ SELECT successful');
    console.log(`   Rows by category:`);
    selectResult.rows.forEach(row => {
      console.log(`      ${row.category}: ${row.count}`);
    });

    report.testResults.selectStatus = 'SUCCESS';
    report.testResults.rowsByCategory = selectResult.rows;
  } catch (error) {
    console.error('   ❌ SELECT test failed:', error.message);
    report.testResults.selectStatus = 'FAILED';
    report.errors.push(`SELECT test: ${error.message}`);
  }
  console.log('');

  // ===== CLOSE CONNECTION =====
  await client.end();

  // ===== FINAL REPORT =====
  console.log('📋 MIGRATION REPORT');
  console.log('='.repeat(70));
  console.log(JSON.stringify(report, null, 2));
  console.log('');

  if (report.errors.length === 0 && report.tablesCreated.length === 2) {
    console.log('✅ ✅ ✅ SUCCESS! Database migration complete! ✅ ✅ ✅');
    console.log('');
    console.log('Tables Created:');
    report.tablesCreated.forEach(table => console.log(`  ✅ ${table}`));
    console.log('');
    console.log('Tests: ✅ INSERT and SELECT passed');
    console.log('');
    console.log('🚀 Ready to run backend!');
    console.log('   npm start');
    process.exit(0);
  } else {
    console.log('⚠️  Migration completed with errors');
    console.log('');
    if (report.errors.length > 0) {
      console.log('Errors:');
      report.errors.forEach(err => console.log(`  ❌ ${err}`));
    }
    process.exit(1);
  }
}

// Run migrations
runMigrations().catch(error => {
  console.error('❌ Fatal error:', error);
  if (client) {
    client.end();
  }
  process.exit(1);
});
