#!/usr/bin/env node
/**
 * SQL Executor via Supabase PostgreSQL Proxy
 * Executes SQL by making HTTP requests to Supabase
 */

const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing credentials');
  process.exit(1);
}

const projectId = SUPABASE_URL.split('//')[1].split('.')[0];

// SQL to execute
const migrations = [
  'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
  
  `CREATE TABLE IF NOT EXISTS admins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );`,

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

  `CREATE INDEX IF NOT EXISTS idx_galleries_category_active_order 
    ON galleries (category, active, "order");`,
];

// Try to create the tables using Supabase client methods
async function executeViaSupa base() {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  console.log('🚀 SQL Executor - Creating tables');
  console.log('='.repeat(70));
  console.log('');

  // First, let's try a workaround: Create tables by inserting dummy records
  // and catching errors, which will tell us if tables exist
  
  console.log('Checking galleries table...');
  
  // Try to insert a test record - this will create the table if it doesn't exist
  // Actually, this won't work because we can't CREATE TABLE via insert...
  
  // Let me try using the Supabase admin API instead
  // The Supabase REST API has a way to execute raw SQL for administrators
  
  try {
    console.log('Attempting to execute migrations via Supabase...');
    
    // Actually, let me try creating the tables by mimicking the structure
    // through multiple failed inserts and observing the errors
    
    // Better idea: Use the Supabase Python CLI or other method
    console.log('');
    console.log('⚠️  Direct SQL execution requires one of:');
    console.log('  1. DATABASE_PASSWORD in .env (for PostgreSQL direct connection)');
    console.log('  2. Admin access to Supabase Dashboard');
    console.log('  3. Or provide credentials');
    console.log('');
    
    return false;
  } catch (err) {
    console.error('Error:', err.message);
    return false;
  }
}

executeViaSupabase().then(success => {
  if (!success) {
    console.log('\n💡 SOLUTION: Provide database password');
    console.log('');
    console.log('Run:');
    console.log('  node get-password.js');
    console.log('');
    console.log('Or manually add to .env:');
    console.log('  DATABASE_PASSWORD=your_password_from_supabase');
    process.exit(1);
  }
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
