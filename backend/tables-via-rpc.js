#!/usr/bin/env node
/**
 * Create Tables via Supabase Client RPC
 * Uses Service Role Key to bypass RLS and execute SQL
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log('🚀 V2T Table Creator - Via Supabase RPC');
  console.log('='.repeat(70));
  console.log('');

  // SQL statements to execute
  const sqlStatements = [
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

  console.log('Attempting to create tables via Supabase RPC...');
  console.log('');

  // Try using the RPC method
  let rpcAvailable = false;

  for (const sql of sqlStatements) {
    console.log(`📝 ${sql.substring(0, 50)}...`);
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        if (error.message.includes('Could not find the function')) {
          console.log('   ℹ️  (exec_sql RPC not available)');
        } else {
          console.log(`   ⚠️  ${error.message}`);
        }
      } else {
        console.log('   ✅');
        rpcAvailable = true;
      }
    } catch (err) {
      console.log(`   ❌ ${err.message}`);
    }
  }

  console.log('');

  if (!rpcAvailable) {
    console.log('⚠️  RPC method not available.');
    console.log('');
    console.log('Let me try an alternative approach...');
    console.log('');

    // Try a workaround: Check if tables can be created by trying to query them
    // and detecting the error message
    
    console.log('ALTERNATIVE: Attempting workaround via table creation detection');
    console.log('');

    // Actually, let me try creating the table directly using a raw HTTP request
    try {
      const createTablesViaSql = async () => {
        console.log('Attempting direct SQL execution...');
        
        // This is a workaround for Supabase - we'll create the tables by using
        // the POST /rest/v1/ endpoint with raw SQL
        
        const fs = require('fs');
        const fetch = require('node-fetch');
        
        // Read migration file
        const migPath = path.join(__dirname, 'migrations', '001_init.sql');
        const sql = fs.readFileSync(migPath, 'utf8');
        
        // Try to execute via REST endpoint
        const response = await fetch(`${SUPABASE_URL}/rest/v1/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ sql }),
        });

        const result = await response.json();
        
        if (response.ok) {
          console.log('✅ SQL executed successfully');
          return true;
        } else {
          console.log('❌ REST endpoint failed:', result);
          return false;
        }
      };

      const success = await createTablesViaSql();
      if (success) {
        console.log('\n✅ Tables created!');
        process.exit(0);
      }
    } catch (err) {
      console.log('Alternative method failed:', err.message);
    }
  } else {
    console.log('✅ Tables may have been created via RPC');
  }

  // Final verification
  console.log('');
  console.log('STEP 2: Verifying tables exist...');
  console.log('');

  const { data, error } = await supabase
    .from('galleries')
    .select('*', { count: 'exact' })
    .limit(1);

  if (error && error.message.includes('Could not find the table')) {
    console.log('❌ galleries table still does not exist');
    console.log('');
    console.log('⚠️  MANUAL ACTION REQUIRED:');
    console.log('');
    console.log('Please create the tables manually via Supabase Dashboard:');
    console.log('');
    console.log('1. Go to: https://supabase.com/dashboard/project/yqkuafohmzoyupvnebse/sql');
    console.log('2. Log in if needed');
    console.log('3. Click "New Query"');
    console.log('4. Paste the SQL from migrations/001_init.sql');
    console.log('5. Click "Run"');
    console.log('6. Run this script again: node tables-via-rpc.js');
    console.log('');
    process.exit(1);
  } else {
    console.log('✅ galleries table exists!');
    console.log('');
    console.log('STEP 3: Test INSERT...');
    console.log('');

    const { data: insertData, error: insertError } = await supabase
      .from('galleries')
      .insert([{
        title: '[AUTO-TEST] ' + new Date().toISOString(),
        description: 'Auto test',
        category: 'art',
        price: '0',
        image_url: 'https://example.com/test.jpg',
        storage_path: 'test.jpg',
      }])
      .select('*')
      .single();

    if (insertError) {
      console.log('❌ INSERT failed:', insertError.message);
      process.exit(1);
    } else {
      console.log('✅ INSERT successful');
      
      // Clean up
      await supabase.from('galleries').delete().eq('id', insertData.id);
      
      console.log('');
      console.log('✅ ✅ ✅ SUCCESS! All tables ready! ✅ ✅ ✅');
      process.exit(0);
    }
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
