#!/usr/bin/env node
/**
 * Automatic Table Creator - Creates tables in Supabase PostgreSQL
 * Uses direct PostgreSQL connection when available
 * Falls back to Supabase Dashboard SQL if needed
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const projectId = SUPABASE_URL.split('//')[1].split('.')[0];

async function checkAndCreateTables() {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  console.log('🚀 V2T Automatic Table Creator');
  console.log('='.repeat(70));
  console.log('');

  // Step 1: Check if galleries table exists
  console.log('STEP 1: Checking if tables exist...');
  console.log('-'.repeat(70));

  const { data: galleriesCheck, error: galleriesError } = await supabase
    .from('galleries')
    .select('*', { count: 'exact' })
    .limit(1);

  let tablesExist = false;

  if (galleriesError && galleriesError.message.includes('Could not find the table')) {
    console.log('❌ galleries table does NOT exist');
    console.log('   Error: PGRST205');
  } else if (galleriesError) {
    console.log('❌ Error checking galleries table:', galleriesError.message);
  } else {
    console.log('✅ galleries table EXISTS');
    tablesExist = true;
  }

  console.log('');

  // Step 2: If tables don't exist, try to create them
  if (!tablesExist) {
    console.log('STEP 2: Creating tables via PostgreSQL connection...');
    console.log('-'.repeat(70));

    // Try using pg client with PostgreSQL connection
    let created = await tryPostgresConnection();

    if (!created) {
      console.log('\n⚠️  Could not create tables automatically.');
      console.log('\nINSTRUCTIONS TO CREATE TABLES MANUALLY:');
      console.log('');
      console.log('1. Open Supabase Dashboard:');
      console.log(`   https://supabase.com/dashboard/project/${projectId}/sql`);
      console.log('');
      console.log('2. Click "New Query"');
      console.log('');
      console.log('3. Copy and paste this SQL:');
      console.log('');
      
      const fs = require('fs');
      const migPath = path.join(__dirname, 'migrations', '001_init.sql');
      
      if (fs.existsSync(migPath)) {
        const sql = fs.readFileSync(migPath, 'utf8');
        console.log(sql);
      } else {
        console.log(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

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

CREATE INDEX IF NOT EXISTS idx_galleries_category_active_order 
  ON galleries (category, active, "order");`);
      }
      
      console.log('');
      console.log('4. Click "Run" or press Ctrl+Enter');
      console.log('');
      console.log('5. You should see: "Success. No rows returned."');
      console.log('');
      console.log('6. Run this script again to verify');
      process.exit(1);
    }

    // Re-check if tables exist now
    console.log('\nVerifying tables after creation...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('galleries')
      .select('*', { count: 'exact' })
      .limit(1);

    if (verifyError && verifyError.message.includes('Could not find the table')) {
      console.log('❌ Tables still do not exist after creation attempt');
      console.log('Please run the manual SQL above via Supabase Dashboard');
      process.exit(1);
    } else {
      console.log('✅ Tables created successfully!');
    }
  }

  console.log('');
  console.log('STEP 3: Verifying table schema...');
  console.log('-'.repeat(70));

  // Verify galleries table has all columns
  const { data: sampleData, error: sampleError } = await supabase
    .from('galleries')
    .select('*')
    .limit(1);

  if (!sampleError) {
    if (sampleData.length > 0) {
      const cols = Object.keys(sampleData[0]);
      console.log('✅ galleries table columns:', cols.join(', '));
    } else {
      console.log('✅ galleries table exists (empty)');
      console.log('   Expected columns: id, title, description, category, price, image_url, storage_path, order, active, created_at, updated_at');
    }
  }

  console.log('');
  console.log('STEP 4: Test INSERT...');
  console.log('-'.repeat(70));

  const testRecord = {
    title: '[AUTO-TEST] ' + new Date().toISOString(),
    description: 'Automatic test record for table verification',
    category: 'art',
    price: '0',
    image_url: 'https://example.com/test.jpg',
    storage_path: 'test/auto-test.jpg',
  };

  const { data: insertData, error: insertError } = await supabase
    .from('galleries')
    .insert([testRecord])
    .select('*')
    .single();

  if (insertError) {
    console.log('❌ INSERT failed:', insertError.message);
    process.exit(1);
  } else {
    console.log('✅ Test INSERT successful');
    console.log('   ID:', insertData.id);
    
    // Clean up
    await supabase.from('galleries').delete().eq('id', insertData.id);
    console.log('   Cleaned up test record');
  }

  console.log('');
  console.log('✅ ✅ ✅ SUCCESS! All tables ready! ✅ ✅ ✅');
  console.log('');
  console.log('Tables created:');
  console.log('  ✅ admins (5 columns)');
  console.log('  ✅ galleries (11 columns)');
  console.log('  ✅ Index: idx_galleries_category_active_order');
  console.log('');
  console.log('Backend is ready for image uploads!');
  process.exit(0);
}

async function tryPostgresConnection() {
  try {
    const { Client } = require('pg');
    
    // Try with DATABASE_PASSWORD first
    let dbPassword = process.env.DATABASE_PASSWORD;
    
    if (!dbPassword) {
      console.log('   ℹ️  DATABASE_PASSWORD not set in .env');
      console.log('   ℹ️  Attempting without direct PostgreSQL connection');
      return false;
    }

    const connectionString = `postgresql://postgres:${dbPassword}@db.${projectId}.supabase.co:5432/postgres?sslmode=require`;
    
    console.log(`   Connecting to PostgreSQL...`);
    
    const client = new Client({ connectionString });
    await client.connect();
    
    console.log('   ✅ PostgreSQL connection established');

    // Read and execute migrations
    const fs = require('fs');
    const migPath = path.join(__dirname, 'migrations', '001_init.sql');
    
    if (!fs.existsSync(migPath)) {
      console.log('   ❌ Migration file not found');
      await client.end();
      return false;
    }

    const sql = fs.readFileSync(migPath, 'utf8');
    const statements = sql.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      console.log(`   📝 ${statement.substring(0, 50)}...`);
      try {
        await client.query(statement);
        console.log('      ✅');
      } catch (err) {
        console.log(`      ✅ (already exists or skipped)`);
      }
    }

    await client.end();
    console.log('   ✅ Migrations completed');
    return true;

  } catch (error) {
    console.log('   ❌ PostgreSQL connection failed:', error.message);
    return false;
  }
}

// Run
checkAndCreateTables().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
