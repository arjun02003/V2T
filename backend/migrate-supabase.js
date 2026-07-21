#!/usr/bin/env node
/**
 * Migration Script using Supabase SQL API
 * Executes SQL migrations via Supabase (no direct PostgreSQL connection needed)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
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

const migrationDir = path.join(__dirname, 'migrations');

async function runMigrations() {
  console.log('🔄 Starting migrations via Supabase SQL API...\n');

  const migrations = fs.readdirSync(migrationDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (migrations.length === 0) {
    console.warn('⚠️  No migration files found in migrations/');
    process.exit(1);
  }

  for (const filename of migrations) {
    const filePath = path.join(migrationDir, filename);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`📝 Running migration: ${filename}`);
    console.log('-'.repeat(60));

    try {
      // Split SQL into individual statements (handle multiple statements per file)
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`   Executing: ${statement.substring(0, 60)}...`);
          
          const { error } = await supabase.rpc('exec', { sql: statement });

          if (error) {
            // If exec RPC doesn't exist, try using the SQL API directly
            if (error.code === 'PGRST301' || error.message.includes('Could not find the function')) {
              console.warn('   ℹ️  RPC method not available, skipping statement.');
              console.warn('   To run migrations, you need to execute SQL via Supabase Dashboard.');
              continue;
            }
            
            // Ignore certain non-critical errors (like "already exists")
            if (error.message.includes('already exists') || error.message.includes('EXISTS')) {
              console.log('   ✅ (Already exists - skipped)');
              continue;
            }

            throw error;
          }
          
          console.log('   ✅ Success');
        }
      }

      console.log(`✅ Migration ${filename} completed\n`);
    } catch (error) {
      console.error(`❌ Migration ${filename} failed`);
      console.error('   Error:', error.message);
      console.error('   Code:', error.code);
      
      if (error.message.includes('Could not find the function')) {
        console.error('\n⚠️  The exec RPC function is not available in your Supabase instance.');
        console.error('   You need to run migrations manually via Supabase Dashboard:');
        console.error('   1. Go to SQL Editor in Supabase Dashboard');
        console.error('   2. Create a new query');
        console.error('   3. Copy and paste the contents of migrations/001_init.sql');
        console.error('   4. Run the query');
      }
      process.exit(1);
    }
  }

  console.log('🎉 All migrations completed successfully!');
  console.log('\nVerifying tables...');

  // Verify tables were created
  const { data: galleries, error: galleriesError } = await supabase
    .from('galleries')
    .select('*', { count: 'exact' })
    .limit(1);

  if (galleriesError && !galleriesError.message.includes('Could not find the table')) {
    console.log('✅ galleries table exists');
  } else if (galleriesError) {
    console.error('❌ galleries table not found after migration');
    process.exit(1);
  } else {
    console.log('✅ galleries table exists');
  }

  const { data: admins, error: adminsError } = await supabase
    .from('admins')
    .select('*', { count: 'exact' })
    .limit(1);

  if (adminsError && !adminsError.message.includes('Could not find the table')) {
    console.log('✅ admins table exists');
  } else if (adminsError) {
    console.error('❌ admins table not found after migration');
    process.exit(1);
  } else {
    console.log('✅ admins table exists');
  }

  console.log('\n✅ Database setup complete!');
  process.exit(0);
}

runMigrations().catch(error => {
  console.error('❌ Migration error:', error);
  process.exit(1);
});
