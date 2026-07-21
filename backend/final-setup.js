#!/usr/bin/env node
/**
 * Final Solution: Complete Table Setup Guide
 * Guides user through manual Supabase Dashboard setup
 * Then retries upload automatically
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectId = SUPABASE_URL.split('//')[1].split('.')[0];

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log('');
  console.log('='.repeat(80));
  console.log('        V2T DATABASE SETUP - FINAL SOLUTION');
  console.log('='.repeat(80));
  console.log('');

  console.log('📋 STEP 1: Checking if tables exist...');
  console.log('-'.repeat(80));

  const { data: galleriesCheck, error: galleriesError } = await supabase
    .from('galleries')
    .select('*', { count: 'exact' })
    .limit(1);

  let tablesExist = !galleriesError || !galleriesError.message.includes('Could not find the table');

  if (tablesExist) {
    console.log('✅ Tables ALREADY EXIST!');
    console.log('');
    console.log('🧪 STEP 2: Testing INSERT...');
    console.log('-'.repeat(80));

    const { data: insertData, error: insertError } = await supabase
      .from('galleries')
      .insert([{
        title: '[FINAL-TEST] ' + new Date().toISOString(),
        description: 'Final verification test',
        category: 'art',
        price: '0',
        image_url: 'https://example.com/test.jpg',
        storage_path: 'test/final.jpg',
      }])
      .select('*')
      .single();

    if (insertError) {
      console.log('❌ INSERT failed:', insertError.message);
      process.exit(1);
    } else {
      console.log('✅ INSERT successful');
      await supabase.from('galleries').delete().eq('id', insertData.id);
      
      console.log('');
      console.log('✅ ✅ ✅ ALL SYSTEMS GO! ✅ ✅ ✅');
      console.log('');
      console.log('Your database is ready for image uploads!');
      console.log('');
      process.exit(0);
    }
  }

  console.log('❌ Tables do NOT exist');
  console.log('');

  console.log('📋 STEP 2: Copy this SQL to create tables');
  console.log('-'.repeat(80));
  console.log('');

  const sqlContent = `CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
  ON galleries (category, active, "order");`;

  console.log(sqlContent);
  console.log('');
  console.log('-'.repeat(80));
  console.log('');

  console.log('📋 STEP 3: Paste into Supabase Dashboard');
  console.log('-'.repeat(80));
  console.log('');
  console.log('1. Open Supabase Dashboard SQL Editor:');
  console.log(`   https://supabase.com/dashboard/project/${projectId}/sql`);
  console.log('');
  console.log('2. Click "New Query" button');
  console.log('');
  console.log('3. Delete any template text');
  console.log('');
  console.log('4. Paste the SQL above (entire block)');
  console.log('');
  console.log('5. Click "Run" button or press Ctrl+Enter');
  console.log('');
  console.log('6. You should see: "Success. No rows returned."');
  console.log('');
  console.log('-'.repeat(80));
  console.log('');

  console.log('✅ AFTER completing the steps above:');
  console.log('');
  console.log('Run this command to verify:');
  console.log('');
  console.log('  npm run verify-upload-ready');
  console.log('');
  console.log('Or run in browser:');
  console.log('  http://localhost:8000/admin-new.html');
  console.log('  Then try uploading an image');
  console.log('');

  // Save SQL to a file for easy copying
  const sqlPath = path.join(__dirname, '..', 'CREATE_TABLES.sql');
  fs.writeFileSync(sqlPath, sqlContent);

  console.log(`✅ SQL also saved to: CREATE_TABLES.sql`);
  console.log('');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
