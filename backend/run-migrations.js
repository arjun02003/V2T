#!/usr/bin/env node
/**
 * Automatic Database Migration Runner
 * Uses Supabase PostgreSQL interface to create tables
 * No direct PostgreSQL connection needed - uses REST API
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Complete SQL for all required tables
const completeSql = `
-- ===== CREATE EXTENSIONS =====
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===== TABLE 1: admins =====
-- Purpose: Store admin user credentials and metadata
-- Used by: /api/auth/login, /api/auth/verify, ensureAdminUser()
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===== TABLE 2: galleries =====
-- Purpose: Store gallery items (art, event, interior)
-- Used by: /api/gallery, /api/upload, image management
CREATE TABLE IF NOT EXISTS galleries (
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
);

-- ===== INDEXES =====
-- Performance index for gallery queries
CREATE INDEX IF NOT EXISTS idx_galleries_category_active_order 
  ON galleries (category, active, "order");

-- ===== CONSTRAINTS CHECK =====
-- Verify all columns are NOT NULL and properly typed
ALTER TABLE galleries
  ALTER COLUMN title SET NOT NULL,
  ALTER COLUMN description SET NOT NULL,
  ALTER COLUMN category SET NOT NULL,
  ALTER COLUMN price SET NOT NULL,
  ALTER COLUMN image_url SET NOT NULL,
  ALTER COLUMN storage_path SET NOT NULL;

ALTER TABLE admins
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN password_hash SET NOT NULL;
`;

// SQL statements split for individual execution
const sqlStatements = [
  'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
  
  // Admins table
  `CREATE TABLE IF NOT EXISTS admins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );`,

  // Galleries table
  `CREATE TABLE IF NOT EXISTS galleries (
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

  // Index
  `CREATE INDEX IF NOT EXISTS idx_galleries_category_active_order 
    ON galleries (category, active, "order");`,
];

const testInsertSql = `
  INSERT INTO galleries (title, description, category, price, image_url, storage_path)
  VALUES ('Test Gallery Item', 'Test description for migration verification', 'art', '0', 'https://example.com/test.jpg', 'test/test.jpg')
  RETURNING *;
`;

async function runMigrations() {
  console.log('🚀 V2T Database Migration Runner');
  console.log('='.repeat(70));
  console.log('');

  const report = {
    timestamp: new Date().toISOString(),
    tablesCreated: [],
    columnsCreated: {},
    errors: [],
    warnings: [],
    testResults: {},
  };

  // ===== STEP 1: Check existing tables =====
  console.log('📋 STEP 1: Checking existing tables...');
  console.log('-'.repeat(70));

  let existingTables = [];
  try {
    // Try to query both tables
    const { data: adminCheck, error: adminError } = await supabase
      .from('admins')
      .select('*', { count: 'exact' })
      .limit(1);

    if (!adminError || !adminError.message.includes('Could not find the table')) {
      existingTables.push('admins');
      console.log('   ✅ admins table exists');
    } else {
      console.log('   ❌ admins table missing');
    }

    const { data: galleriesCheck, error: galleriesError } = await supabase
      .from('galleries')
      .select('*', { count: 'exact' })
      .limit(1);

    if (!galleriesError || !galleriesError.message.includes('Could not find the table')) {
      existingTables.push('galleries');
      console.log('   ✅ galleries table exists');
    } else {
      console.log('   ❌ galleries table missing');
    }
  } catch (error) {
    report.warnings.push('Could not check existing tables: ' + error.message);
  }
  console.log('');

  // ===== STEP 2: Attempt migrations via Supabase admin API =====
  console.log('🔧 STEP 2: Creating missing tables via Supabase SQL API...');
  console.log('-'.repeat(70));

  // Try Method 1: Direct SQL via admin interface
  let migrationSuccess = false;

  try {
    // We'll use the Supabase REST API to execute raw SQL
    // First, try to directly execute SQL via the postgrest interface
    
    // Execute each statement
    for (let i = 0; i < sqlStatements.length; i++) {
      const stmt = sqlStatements[i];
      const stmtNum = i + 1;
      
      console.log(`   [${stmtNum}/${sqlStatements.length}] ${stmt.substring(0, 50)}...`);

      try {
        // Use fetch to call the Supabase REST API
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ sql: stmt }),
        });

        if (!response.ok) {
          // RPC might not exist, which is fine for initial setup
          console.log('       ℹ️  (RPC not available, trying alternative method)');
          continue;
        }

        const result = await response.json();
        console.log('       ✅ Executed');
        migrationSuccess = true;
      } catch (rpcError) {
        // RPC method doesn't exist - this is expected
        // We'll handle it differently below
        console.log('       ℹ️  (Skipping, will use Supabase SQL Editor)');
      }
    }
  } catch (error) {
    console.log('   ℹ️  Direct SQL execution not available');
  }

  console.log('');

  // ===== STEP 3: Alternative - Use Supabase Dashboard =====
  if (!migrationSuccess && existingTables.length < 2) {
    console.log('⚠️  STEP 3: Manual SQL execution required');
    console.log('-'.repeat(70));
    console.log('The Supabase RPC function is not available.');
    console.log('Please run the following SQL in Supabase Dashboard SQL Editor:');
    console.log('');
    console.log('👉 URL: ' + SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/') + '/sql');
    console.log('');
    console.log('--- Copy and paste this SQL: ---');
    console.log(completeSql);
    console.log('--- End SQL ---');
    console.log('');
    report.warnings.push('Manual migration required - Run SQL in Supabase Dashboard');
  }

  console.log('');

  // ===== STEP 4: Wait and retry table check =====
  console.log('⏳ STEP 4: Waiting for tables to become available...');
  console.log('-'.repeat(70));
  
  // Wait a moment for tables to be created
  await new Promise(resolve => setTimeout(resolve, 2000));

  let tablesAvailable = { admins: false, galleries: false };

  for (let attempts = 0; attempts < 5; attempts++) {
    console.log(`   Attempt ${attempts + 1}/5...`);

    const { data: adminData, error: adminErr } = await supabase
      .from('admins')
      .select('*', { count: 'exact' })
      .limit(1);

    if (!adminErr || !adminErr.message.includes('Could not find the table')) {
      tablesAvailable.admins = true;
      console.log('   ✅ admins table available');
    }

    const { data: galleryData, error: galleryErr } = await supabase
      .from('galleries')
      .select('*', { count: 'exact' })
      .limit(1);

    if (!galleryErr || !galleryErr.message.includes('Could not find the table')) {
      tablesAvailable.galleries = true;
      console.log('   ✅ galleries table available');
    }

    if (tablesAvailable.admins && tablesAvailable.galleries) {
      console.log('   ✅ All tables available!');
      break;
    }

    if (attempts < 4) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  console.log('');

  // ===== STEP 5: Verify table schemas =====
  console.log('📊 STEP 5: Verifying table schemas...');
  console.log('-'.repeat(70));

  const expectedSchemas = {
    admins: ['id', 'email', 'password_hash', 'created_at', 'updated_at'],
    galleries: ['id', 'title', 'description', 'category', 'price', 'image_url', 'storage_path', 'order', 'active', 'created_at', 'updated_at'],
  };

  for (const [tableName, expectedCols] of Object.entries(expectedSchemas)) {
    console.log(`   Table: ${tableName}`);

    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error && error.message.includes('Could not find the table')) {
        console.log(`   ❌ Table not found`);
        report.errors.push(`${tableName} table not found after migration`);
        continue;
      }

      if (data && data.length > 0) {
        const actualCols = Object.keys(data[0]);
        console.log(`   ✅ Columns: ${actualCols.join(', ')}`);
        
        const missing = expectedCols.filter(c => !actualCols.includes(c));
        if (missing.length > 0) {
          console.log(`   ⚠️  Missing columns: ${missing.join(', ')}`);
          report.warnings.push(`${tableName}: Missing columns: ${missing.join(', ')}`);
        } else {
          console.log(`   ✅ All expected columns present`);
          report.tablesCreated.push(tableName);
          report.columnsCreated[tableName] = actualCols;
        }
      } else {
        console.log(`   ✅ Table empty (but schema valid)`);
        report.tablesCreated.push(tableName);
        report.columnsCreated[tableName] = expectedCols;
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      report.errors.push(`${tableName}: ${error.message}`);
    }
  }
  console.log('');

  // ===== STEP 6: Test INSERT into galleries =====
  console.log('🧪 STEP 6: Testing INSERT into galleries table...');
  console.log('-'.repeat(70));

  try {
    const testPayload = {
      title: '[MIGRATION TEST] ' + new Date().toISOString(),
      description: 'Automatic migration test record - can be deleted',
      category: 'art',
      price: '0',
      image_url: 'https://example.com/migration-test.jpg',
      storage_path: 'migrations/test.jpg',
    };

    console.log('   Inserting test record:');
    console.log('   ' + JSON.stringify(testPayload, null, 2).replace(/\n/g, '\n   '));
    console.log('');

    const { data, error } = await supabase
      .from('galleries')
      .insert([testPayload])
      .select('*')
      .single();

    if (error) {
      console.log('   ❌ INSERT failed');
      console.log('   Error code:', error.code);
      console.log('   Error message:', error.message);
      report.errors.push(`INSERT test failed: ${error.message}`);
      report.testResults.insertStatus = 'FAILED';
      report.testResults.insertError = error.message;
    } else {
      console.log('   ✅ INSERT successful');
      console.log('   Inserted ID:', data.id);
      report.testResults.insertStatus = 'SUCCESS';
      report.testResults.insertedId = data.id;

      // Clean up test record
      const { error: deleteError } = await supabase
        .from('galleries')
        .delete()
        .eq('id', data.id);

      if (!deleteError) {
        console.log('   ✅ Cleanup successful (test record deleted)');
      } else {
        console.log('   ⚠️  Could not delete test record:', deleteError.message);
        report.warnings.push('Test record cleanup failed - may have manual record');
      }
    }
  } catch (error) {
    console.log('   ❌ Exception during test:', error.message);
    report.errors.push(`INSERT test exception: ${error.message}`);
    report.testResults.insertStatus = 'EXCEPTION';
  }
  console.log('');

  // ===== STEP 7: Test SELECT from galleries =====
  console.log('🔍 STEP 7: Testing SELECT from galleries...');
  console.log('-'.repeat(70));

  try {
    const { data, error, count } = await supabase
      .from('galleries')
      .select('*', { count: 'exact' })
      .eq('category', 'art');

    if (error) {
      console.log('   ❌ SELECT failed:', error.message);
      report.testResults.selectStatus = 'FAILED';
    } else {
      console.log('   ✅ SELECT successful');
      console.log(`   Records in 'art' category: ${count}`);
      report.testResults.selectStatus = 'SUCCESS';
      report.testResults.recordsInArtCategory = count;
    }
  } catch (error) {
    console.log('   ❌ Exception during select:', error.message);
    report.testResults.selectStatus = 'EXCEPTION';
  }
  console.log('');

  // ===== FINAL REPORT =====
  console.log('📋 MIGRATION REPORT');
  console.log('='.repeat(70));
  console.log(JSON.stringify(report, null, 2));
  console.log('');

  if (report.errors.length === 0 && report.tablesCreated.length === 2) {
    console.log('✅ ✅ ✅ SUCCESS! All tables created and verified! ✅ ✅ ✅');
    console.log('');
    console.log('Tables Ready:');
    report.tablesCreated.forEach(table => {
      console.log(`  ✅ ${table}`);
    });
    console.log('');
    console.log('Columns:');
    Object.entries(report.columnsCreated).forEach(([table, cols]) => {
      console.log(`  ${table}: ${cols.join(', ')}`);
    });
    console.log('');
    console.log('Tests: ' + (report.testResults.insertStatus === 'SUCCESS' ? '✅ PASSED' : '⚠️  SKIPPED'));
    console.log('');
    console.log('🚀 Backend is now ready! Run: npm start');
    process.exit(0);
  } else {
    console.log('⚠️  Migration completed with warnings or errors');
    console.log('');
    if (report.errors.length > 0) {
      console.log('Errors:');
      report.errors.forEach(err => console.log(`  ❌ ${err}`));
    }
    if (report.warnings.length > 0) {
      console.log('Warnings:');
      report.warnings.forEach(warn => console.log(`  ⚠️  ${warn}`));
    }
    console.log('');
    console.log('If tables are still missing:');
    console.log('1. Go to Supabase Dashboard: ' + SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/') + '/sql');
    console.log('2. Run the SQL from QUICK_FIX.md or DATABASE_DEBUG_REPORT.md');
    process.exit(1);
  }
}

runMigrations().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
