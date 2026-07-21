#!/usr/bin/env node
/**
 * Database Setup Helper
 * Provides instructions and options for setting up migrations
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;

if (!SUPABASE_URL) {
  console.error('❌ SUPABASE_URL not found in .env');
  process.exit(1);
}

// Extract project ID from Supabase URL
const projectId = SUPABASE_URL.split('//')[1].split('.')[0];

console.log('📋 V2T Database Setup Helper\n');
console.log('='.repeat(70));

console.log('\n❌ ISSUE: The galleries table does not exist in your database.');
console.log('\nYou have 2 options to fix this:\n');

console.log('OPTION 1: Manual SQL via Supabase Dashboard (Recommended)');
console.log('-'.repeat(70));
console.log('1. Go to your Supabase project dashboard:');
console.log(`   https://supabase.com/dashboard/project/${projectId}/sql`);
console.log('\n2. Click "New Query" or "SQL Editor"');
console.log('\n3. Copy and paste the following SQL:\n');

const migrationFile = path.join(__dirname, 'migrations', '001_init.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');
console.log(sql);

console.log('\n4. Click "Run" or press Ctrl+Enter');
console.log('5. Tables will be created immediately');
console.log('\n');

console.log('OPTION 2: Use PostgreSQL Connection String');
console.log('-'.repeat(70));
console.log('If you want to use npm run migrate, you need the PostgreSQL connection URL.\n');

console.log('To get the PostgreSQL connection string:');
console.log('1. Go to Supabase Dashboard → Settings → Database');
console.log('2. Copy the "Connection string" (URI mode)');
console.log('3. Update .env with:');
console.log(`   DATABASE_URL=postgresql://postgres:PASSWORD@db.${projectId}.supabase.co:5432/postgres?sslmode=require`);
console.log('4. Replace PASSWORD with your database password');
console.log('5. Run: npm run migrate\n');

console.log('='.repeat(70));
console.log('\n💡 AFTER SETUP:');
console.log('1. Run: npm run debug-db');
console.log('2. This verifies tables were created successfully');
console.log('3. Then restart the backend: npm start\n');

process.exit(0);
