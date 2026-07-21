#!/usr/bin/env node
/**
 * COMPREHENSIVE DATABASE DIAGNOSTIC
 * Captures EVERY detail of upload failure with full error context
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  db: { schema: 'public' },
});

const separator = '='.repeat(100);
const subsep = '-'.repeat(100);

let reportData = {
  timestamp: new Date().toISOString(),
  tables_found: [],
  table_used: null,
  columns_found: [],
  required_columns: {
    id: false,
    title: false,
    description: false,
    category: false,
    price: false,
    image_url: false,
    storage_path: false,
    order: false,
    active: false,
    created_at: false,
    updated_at: false,
  },
  insert_query: null,
  insert_result: null,
  insert_error: null,
  supabase_response: null,
  backend_ready: null,
  migrations_found: [],
  migrations_executed: [],
  root_cause: null,
};

async function main() {
  console.log('');
  console.log(separator);
  console.log('        FULL DATABASE DIAGNOSTIC - COMPLETE ERROR CAPTURE');
  console.log(separator);
  console.log('');

  // ============================================================================
  // 1. LIST ALL TABLES IN DATABASE
  // ============================================================================
  console.log('📋 STEP 1: LIST ALL TABLES IN DATABASE');
  console.log(subsep);

  try {
    const { data: tablesData, error: tablesError } = await supabase.rpc('get_tables', {}, {
      head: true,
    }).catch(() => null);

    // Try alternate method
    if (!tablesData) {
      const { data: infoSchema, error: infoError } = await supabase
        .from('information_schema.tables')
        .select('table_name', { count: 'exact' })
        .eq('table_schema', 'public')
        .catch(() => ({ data: null, error: 'Not accessible' }));

      if (infoSchema) {
        reportData.tables_found = infoSchema.map(t => t.table_name);
        console.log(`Found ${infoSchema.length} tables:`);
        infoSchema.forEach(t => console.log(`  • ${t.table_name}`));
      }
    }

    // Try querying galleries directly to check if it exists
    console.log('');
    console.log('Testing direct queries to find tables:');

    const { data: galleriesTest, error: galleriesTestErr } = await supabase
      .from('galleries')
      .select('*', { count: 'exact' })
      .limit(0);

    if (galleriesTestErr) {
      console.log(`  ❌ galleries table: ${galleriesTestErr.code}`);
      console.log(`     Message: ${galleriesTestErr.message}`);
      reportData.root_cause = `galleries table missing: ${galleriesTestErr.code}`;
    } else {
      console.log('  ✅ galleries table: EXISTS');
      reportData.tables_found.push('galleries');
    }

    const { data: adminsTest, error: adminsTestErr } = await supabase
      .from('admins')
      .select('*', { count: 'exact' })
      .limit(0);

    if (adminsTestErr) {
      console.log(`  ❌ admins table: ${adminsTestErr.code}`);
    } else {
      console.log('  ✅ admins table: EXISTS');
      reportData.tables_found.push('admins');
    }
  } catch (err) {
    console.log(`Error listing tables: ${err.message}`);
  }

  console.log('');

  // ============================================================================
  // 2. CHECK IF GALLERIES TABLE EXISTS & GET SCHEMA
  // ============================================================================
  console.log('📋 STEP 2: VERIFY GALLERIES TABLE & GET SCHEMA');
  console.log(subsep);

  const { data: schemaData, error: schemaError } = await supabase
    .from('galleries')
    .select('*')
    .limit(1);

  if (schemaError) {
    console.log(`❌ TABLE CHECK FAILED`);
    console.log(`Error Code: ${schemaError.code}`);
    console.log(`Error Message: ${schemaError.message}`);
    console.log(`Full Error Object:`);
    console.log(JSON.stringify(schemaError, null, 2));
    
    reportData.table_used = 'galleries';
    reportData.supabase_response = schemaError;

    if (schemaError.code === 'PGRST205') {
      console.log('');
      console.log('⚠️  TABLE DOES NOT EXIST - Will attempt creation');
      reportData.root_cause = 'PGRST205: Table not found';
    }
  } else {
    console.log('✅ galleries table EXISTS');
    reportData.table_used = 'galleries';

    // Get column info from first row
    if (schemaData && schemaData.length > 0) {
      const columns = Object.keys(schemaData[0]);
      reportData.columns_found = columns;
      console.log(`Found ${columns.length} columns:`);
      columns.forEach(col => {
        console.log(`  • ${col}`);
        if (reportData.required_columns.hasOwnProperty(col)) {
          reportData.required_columns[col] = true;
        }
      });
    }
  }

  console.log('');

  // ============================================================================
  // 3. LIST ALL MIGRATION FILES
  // ============================================================================
  console.log('📋 STEP 3: CHECK FOR MIGRATION FILES');
  console.log(subsep);

  const migrationsDir = path.join(__dirname, 'migrations');
  if (fs.existsSync(migrationsDir)) {
    const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    console.log(`Found ${migrationFiles.length} migration files:`);
    migrationFiles.forEach(f => {
      console.log(`  • ${f}`);
      reportData.migrations_found.push(f);
    });

    // Read migration content
    console.log('');
    console.log('Migration SQL Content:');
    migrationFiles.forEach(f => {
      const content = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
      console.log(`  ${f} (${content.length} bytes):`);
      console.log('  ' + content.substring(0, 100) + '...');
    });
  } else {
    console.log('No migrations directory found');
  }

  console.log('');

  // ============================================================================
  // 4. CHECK FOR TABLE CREATION SCRIPTS
  // ============================================================================
  console.log('📋 STEP 4: CHECK FOR TABLE CREATION SCRIPTS');
  console.log(subsep);

  const createTableSqlPath = path.join(__dirname, '..', 'CREATE_TABLES.sql');
  if (fs.existsSync(createTableSqlPath)) {
    const sqlContent = fs.readFileSync(createTableSqlPath, 'utf8');
    console.log(`✅ CREATE_TABLES.sql found (${sqlContent.length} bytes)`);
    console.log('First 200 characters:');
    console.log(sqlContent.substring(0, 200));
  } else {
    console.log('❌ CREATE_TABLES.sql not found');
  }

  console.log('');

  // ============================================================================
  // 5. ATTEMPT TO CREATE TABLE IF MISSING
  // ============================================================================
  if (schemaError && schemaError.code === 'PGRST205') {
    console.log('📋 STEP 5: ATTEMPTING TO CREATE TABLES');
    console.log(subsep);

    const createSQL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.galleries (
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

CREATE INDEX IF NOT EXISTS idx_galleries_category_active_order 
  ON public.galleries (category, active, "order");
    `.trim();

    console.log('Attempting to execute CREATE TABLE SQL...');
    console.log('');

    try {
      // Try via rpc first
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('exec_sql', { sql: createSQL })
        .catch(e => ({ data: null, error: e }));

      if (rpcError) {
        console.log(`RPC Method Failed: ${rpcError.message || JSON.stringify(rpcError)}`);
        console.log('');
        console.log('⚠️  Cannot auto-create via RPC. Tables must be created manually via:');
        console.log('  https://supabase.com/dashboard/project/yqkuafohmzoyupvnebse/sql');
        console.log('');
        console.log('SQL to paste:');
        console.log(createSQL);
      } else {
        console.log('✅ Table creation executed via RPC');
        reportData.migrations_executed.push('CREATE TABLE via RPC');
      }
    } catch (err) {
      console.log(`Exception: ${err.message}`);
    }
  } else {
    console.log('📋 STEP 5: SKIPPED (Table already exists)');
    console.log(subsep);
  }

  console.log('');

  // ============================================================================
  // 6. VERIFY ALL REQUIRED COLUMNS
  // ============================================================================
  console.log('📋 STEP 6: VERIFY ALL REQUIRED COLUMNS');
  console.log(subsep);

  if (!schemaError) {
    const requiredCols = [
      'id', 'title', 'description', 'category', 'price',
      'image_url', 'storage_path', 'order', 'active', 'created_at', 'updated_at'
    ];

    requiredCols.forEach(col => {
      const exists = reportData.columns_found.includes(col);
      const symbol = exists ? '✅' : '❌';
      console.log(`${symbol} ${col}`);
      if (reportData.required_columns.hasOwnProperty(col)) {
        reportData.required_columns[col] = exists;
      }
    });
  } else {
    console.log('Cannot verify columns - table does not exist');
  }

  console.log('');

  // ============================================================================
  // 7. PREPARE INSERT QUERY
  // ============================================================================
  console.log('📋 STEP 7: PREPARE TEST INSERT QUERY');
  console.log(subsep);

  const testInsertPayload = {
    title: '[DIAGNOSTIC-TEST] ' + new Date().toISOString(),
    description: 'Diagnostic test record from full-diagnostic.js',
    category: 'art',
    price: '9999',
    image_url: 'https://diagnostic.test/image.jpg',
    storage_path: 'diagnostic/test-' + Date.now() + '.jpg',
  };

  console.log('INSERT Query:');
  console.log(`  Table: public.galleries`);
  console.log(`  Payload:`);
  console.log(JSON.stringify(testInsertPayload, null, 4));

  reportData.insert_query = {
    table: 'public.galleries',
    payload: testInsertPayload,
  };

  console.log('');

  // ============================================================================
  // 8. ATTEMPT INSERT
  // ============================================================================
  console.log('📋 STEP 8: EXECUTE TEST INSERT');
  console.log(subsep);

  try {
    const { data: insertData, error: insertError } = await supabase
      .from('galleries')
      .insert([testInsertPayload])
      .select('*')
      .single();

    if (insertError) {
      console.log('❌ INSERT FAILED');
      console.log('');
      console.log('Error Code:', insertError.code);
      console.log('Error Message:', insertError.message);
      console.log('');
      console.log('Full Error Object:');
      console.log(JSON.stringify(insertError, null, 2));
      console.log('');

      // Try to extract more details
      if (insertError.details) {
        console.log('Error Details:', insertError.details);
      }
      if (insertError.hint) {
        console.log('Error Hint:', insertError.hint);
      }

      reportData.insert_error = insertError;
      reportData.insert_result = 'FAILED';
      reportData.root_cause = `${insertError.code}: ${insertError.message}`;
    } else {
      console.log('✅ INSERT SUCCESSFUL');
      console.log('');
      console.log('Inserted Record:');
      console.log(JSON.stringify(insertData, null, 2));
      console.log('');

      reportData.insert_result = 'SUCCESS';
      reportData.insert_data = insertData;

      // Clean up test record
      console.log('Cleaning up test record...');
      await supabase.from('galleries').delete().eq('id', insertData.id);
      console.log('Test record deleted');
    }
  } catch (err) {
    console.log('❌ EXCEPTION DURING INSERT');
    console.log('');
    console.log('Exception Type:', err.constructor.name);
    console.log('Exception Message:', err.message);
    console.log('Exception Stack:');
    console.log(err.stack);
    console.log('');

    reportData.insert_error = {
      exception: err.constructor.name,
      message: err.message,
      stack: err.stack,
    };
    reportData.insert_result = 'EXCEPTION';
    reportData.root_cause = `${err.constructor.name}: ${err.message}`;
  }

  console.log('');

  // ============================================================================
  // 9. CHECK BACKEND SERVER STATUS
  // ============================================================================
  console.log('📋 STEP 9: CHECK BACKEND SERVER');
  console.log(subsep);

  try {
    const response = await fetch('http://localhost:3001/api/health');
    const healthData = await response.json();

    console.log('Backend Health Check:');
    console.log(JSON.stringify(healthData, null, 2));
    reportData.backend_ready = response.ok;
  } catch (err) {
    console.log(`Backend not responding: ${err.message}`);
    reportData.backend_ready = false;
  }

  console.log('');

  // ============================================================================
  // 10. FINAL REPORT
  // ============================================================================
  console.log(separator);
  console.log('                         FINAL DIAGNOSTIC REPORT');
  console.log(separator);
  console.log('');

  console.log('✓ TABLES FOUND:');
  console.log(`  ${reportData.tables_found.length} table(s) in database`);
  reportData.tables_found.forEach(t => console.log(`    • ${t}`));
  console.log('');

  console.log('✓ TABLE USED:');
  console.log(`  ${reportData.table_used || 'NOT FOUND'}`);
  console.log('');

  console.log('✓ COLUMNS FOUND:');
  console.log(`  ${reportData.columns_found.length} column(s) in galleries table`);
  reportData.columns_found.forEach(c => console.log(`    • ${c}`));
  console.log('');

  console.log('✓ REQUIRED COLUMNS STATUS:');
  let allColumnsOk = true;
  Object.entries(reportData.required_columns).forEach(([col, exists]) => {
    const symbol = exists ? '✅' : '❌';
    console.log(`  ${symbol} ${col}`);
    if (!exists) allColumnsOk = false;
  });
  console.log('');

  console.log('✓ MIGRATIONS:');
  console.log(`  Found: ${reportData.migrations_found.length}`);
  reportData.migrations_found.forEach(m => console.log(`    • ${m}`));
  console.log(`  Executed: ${reportData.migrations_executed.length}`);
  reportData.migrations_executed.forEach(m => console.log(`    • ${m}`));
  console.log('');

  console.log('✓ INSERT QUERY:');
  console.log(`  Table: ${reportData.insert_query.table}`);
  console.log(`  Fields: ${Object.keys(reportData.insert_query.payload).join(', ')}`);
  console.log('');

  console.log('✓ INSERT RESULT:');
  console.log(`  Status: ${reportData.insert_result}`);
  if (reportData.insert_error) {
    console.log('  Error:');
    if (typeof reportData.insert_error === 'object') {
      console.log(JSON.stringify(reportData.insert_error, null, 4));
    } else {
      console.log(`    ${reportData.insert_error}`);
    }
  }
  console.log('');

  console.log('✓ ROOT CAUSE:');
  console.log(`  ${reportData.root_cause || 'Unknown'}`);
  console.log('');

  console.log('✓ BACKEND STATUS:');
  console.log(`  ${reportData.backend_ready ? '✅ Ready' : '❌ Not responding'}`);
  console.log('');

  console.log('✓ FILES MODIFIED:');
  console.log('  • full-diagnostic.js (diagnostic script)');
  console.log('');

  // Save detailed report to file
  const reportPath = path.join(__dirname, 'DIAGNOSTIC_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`Full report saved to: ${reportPath}`);
  console.log('');

  console.log(separator);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
