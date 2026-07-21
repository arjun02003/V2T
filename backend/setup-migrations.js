#!/usr/bin/env node
/**
 * Database Setup Guide - Interactive
 * Helps user get PostgreSQL connection details and runs migration
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  console.log('');
  console.log('🔧 V2T Database Setup Guide');
  console.log('='.repeat(70));
  console.log('');

  console.log('This script will help you set up the database tables.');
  console.log('');

  console.log('You have 3 options:');
  console.log('');
  console.log('  1. Run migrations via Supabase Dashboard (Easiest - 2 minutes)');
  console.log('  2. Get PostgreSQL password and auto-migrate (3 minutes)');
  console.log('  3. Skip setup and do manual migration later');
  console.log('');

  const choice = await question('Choose option [1-3]: ');
  console.log('');

  if (choice === '1') {
    showDashboardInstructions();
  } else if (choice === '2') {
    await promptForPassword();
  } else {
    console.log('⏭️  Skipping setup. You can run migrations later with:');
    console.log('   npm run migrate-direct');
    process.exit(0);
  }
}

function showDashboardInstructions() {
  console.log('📚 OPTION 1: Supabase Dashboard SQL Editor');
  console.log('='.repeat(70));
  console.log('');
  console.log('This is the fastest way to create tables.');
  console.log('');
  console.log('STEP 1: Go to Supabase Dashboard');
  console.log('   👉 https://supabase.com/dashboard/project/yqkuafohmzoyupvnebse/sql');
  console.log('');
  console.log('STEP 2: Click "New Query" button');
  console.log('');
  console.log('STEP 3: Copy and paste ALL this SQL:');
  console.log('');
  console.log('--- START SQL ---');
  console.log(`
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
  ON galleries (category, active, "order");
  `);
  console.log('--- END SQL ---');
  console.log('');
  console.log('STEP 4: Click "Run" button or press Ctrl+Enter');
  console.log('');
  console.log('STEP 5: You should see "Success. No rows returned."');
  console.log('');
  console.log('STEP 6: Verify by running:');
  console.log('   npm run debug-db');
  console.log('');
  console.log('Then start the backend:');
  console.log('   npm start');
  console.log('');
  process.exit(0);
}

async function promptForPassword() {
  console.log('🔐 OPTION 2: PostgreSQL Direct Connection');
  console.log('='.repeat(70));
  console.log('');
  console.log('To run migrations automatically, we need the database password.');
  console.log('');
  console.log('How to find it:');
  console.log('  1. Go to Supabase Dashboard');
  console.log('  2. Click Settings → Database');
  console.log('  3. Look for "Database Password" section');
  console.log('  4. Click "Reveal password" and copy it');
  console.log('');

  const hasPassword = await question('Do you have the database password? [y/N]: ');

  if (hasPassword.toLowerCase() !== 'y') {
    console.log('');
    console.log('⏭️  You can get the password later and run:');
    console.log('   npm run migrate-direct');
    process.exit(0);
  }

  const password = await question('Enter database password (will not be visible): ');

  if (!password) {
    console.log('');
    console.log('❌ Password cannot be empty');
    process.exit(1);
  }

  // Update .env file
  const envPath = path.resolve(__dirname, '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Add or update DATABASE_PASSWORD
  if (envContent.includes('DATABASE_PASSWORD=')) {
    envContent = envContent.replace(/DATABASE_PASSWORD=.*/g, `DATABASE_PASSWORD=${password}`);
  } else {
    envContent += `\nDATABASE_PASSWORD=${password}\n`;
  }

  fs.writeFileSync(envPath, envContent);

  console.log('');
  console.log('✅ Password saved to .env');
  console.log('');
  console.log('Running migrations...');
  console.log('');

  rl.close();

  // Run the migration
  const { spawn } = require('child_process');
  const migrate = spawn('npm', ['run', 'migrate-direct'], {
    cwd: __dirname,
    stdio: 'inherit',
  });

  migrate.on('close', (code) => {
    process.exit(code);
  });
}

setup().catch(error => {
  console.error('❌ Error:', error);
  rl.close();
  process.exit(1);
});
