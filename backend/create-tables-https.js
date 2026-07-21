#!/usr/bin/env node
/**
 * Create Tables using HTTPS - Last Automated Attempt
 * Uses pure Node.js HTTPS to attempt SQL execution
 */

const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectId = SUPABASE_URL.split('//')[1].split('.')[0];

const { createClient } = require('@supabase/supabase-js');

async function executeViaSqlEditor() {
  console.log('🚀 V2T Create Tables - HTTPS Attempt');
  console.log('='.repeat(70));
  console.log('');

  console.log('Attempting to execute SQL via HTTPS...');
  console.log('');

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

  let anySucceeded = false;

  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i];
    console.log(`[${i+1}/${sqlStatements.length}] ${sql.substring(0, 50)}...`);

    try {
      const result = await new Promise((resolve) => {
        const options = {
          hostname: `${projectId}.supabase.co`,
          port: 443,
          path: '/rest/v1/rpc/exec_sql',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Length': Buffer.byteLength(JSON.stringify({ sql })),
          },
          timeout: 5000,
        };

        const req = https.request(options, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            resolve({
              status: res.statusCode,
              data: data,
              headers: res.headers,
            });
          });
        });

        req.on('error', (err) => {
          resolve({ error: err.message });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve({ error: 'timeout' });
        });

        req.write(JSON.stringify({ sql }));
        req.end();
      });

      if (result.error) {
        console.log(`   ⚠️  ${result.error}`);
      } else if (result.status === 200 || result.status === 201) {
        console.log('   ✅');
        anySucceeded = true;
      } else if (result.status === 404) {
        console.log('   ℹ️  (exec_sql function not found)');
      } else {
        console.log(`   ℹ️  (Status ${result.status})`);
      }
    } catch (err) {
      console.log(`   ❌ ${err.message}`);
    }
  }

  console.log('');

  if (!anySucceeded) {
    console.log('⚠️  Automated SQL execution not available');
    console.log('');
    console.log('💡 NEXT STEPS:');
    console.log('');
    console.log('1. Go to Supabase Dashboard:');
    console.log(`   https://supabase.com/dashboard/project/${projectId}/sql`);
    console.log('');
    console.log('2. Run: node final-setup.js');
    console.log('   (This will show you the exact SQL to copy-paste)');
    console.log('');
    process.exit(1);
  }

  // Verify
  console.log('Verifying tables...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase
    .from('galleries')
    .select('*', { count: 'exact' })
    .limit(1);

  if (error && error.message.includes('Could not find the table')) {
    console.log('❌ Tables still not found after SQL execution');
    console.log('');
    console.log('Please run the SQL manually via Supabase Dashboard');
    process.exit(1);
  } else {
    console.log('✅ Tables created successfully!');
    process.exit(0);
  }
}

executeViaSqlEditor().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
