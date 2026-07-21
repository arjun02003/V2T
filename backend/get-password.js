#!/usr/bin/env node
/**
 * Get Supabase Database Password Helper
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(q) {
  return new Promise(resolve => rl.question(q, resolve));
}

async function main() {
  console.log('');
  console.log('🔐 V2T Database Password Setup');
  console.log('='.repeat(70));
  console.log('');
  console.log('To automatically create database tables, we need the PostgreSQL password.');
  console.log('');
  console.log('HOW TO GET THE PASSWORD:');
  console.log('');
  console.log('1. Go to Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard/project/yqkuafohmzoyupvnebse/settings/database');
  console.log('');
  console.log('2. Look for "Database Password" section');
  console.log('');
  console.log('3. Click "Reveal password"');
  console.log('');
  console.log('4. Copy the password (it starts with a letter/number)');
  console.log('');

  const password = await question('Enter database password: ');

  if (!password) {
    console.log('❌ Password cannot be empty');
    rl.close();
    process.exit(1);
  }

  // Update .env
  const envPath = path.resolve(__dirname, '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');

  if (envContent.includes('DATABASE_PASSWORD=')) {
    envContent = envContent.replace(/DATABASE_PASSWORD=.*/g, `DATABASE_PASSWORD=${password}`);
  } else {
    envContent += `\nDATABASE_PASSWORD=${password}\n`;
  }

  fs.writeFileSync(envPath, envContent);

  console.log('');
  console.log('✅ Password saved to .env');
  console.log('');
  console.log('Now creating tables...');
  console.log('');

  rl.close();

  // Run auto-create-tables
  const { spawn } = require('child_process');
  const child = spawn('node', ['auto-create-tables.js'], { 
    cwd: __dirname,
    stdio: 'inherit',
  });

  child.on('close', (code) => {
    process.exit(code);
  });
}

main().catch(err => {
  console.error('❌ Error:', err);
  rl.close();
  process.exit(1);
});
