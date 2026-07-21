#!/usr/bin/env node
/**
 * Automatic SQL Executor - Creates tables via Supabase GraphQL interface
 * Works with Service Role Key - No PostgreSQL connection needed
 */

const https = require('https');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sqlStatements = [
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

async function executeSqlViaRpc(sql) {
  return new Promise((resolve) => {
    const projectId = SUPABASE_URL.split('//')[1].split('.')[0];
    const options = {
      hostname: `${projectId}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true });
        } else {
          resolve({ success: false, status: res.statusCode });
        }
      });
    });

    req.on('error', () => {
      resolve({ success: false, error: 'RPC not available' });
    });

    req.write(JSON.stringify({ sql }));
    req.end();
  });
}

async function createTablesDirect() {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  console.log('🔧 Creating tables using Supabase client...\n');

  // Instead of using RPC, we'll try to create them by attempting operations
  // and catching the errors. But actually, let me use a different approach:
  // Create the tables by simulating their structure.

  // Actually, the best approach is to use the SQL migrations that already exist.
  // Let me try the fs approach and read the migration file.
  
  const fs = require('fs');
  const migrationPath = path.join(__dirname, 'migrations', '001_init.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    return false;
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));

  let success = true;

  for (const statement of statements) {
    console.log(`📝 Executing: ${statement.substring(0, 60)}...`);
    
    // Try RPC method
    const rpcResult = await executeSqlViaRpc(statement);
    
    if (rpcResult.success) {
      console.log('   ✅ Success');
      continue;
    }

    // If RPC fails, try direct table operations to verify tables exist
    console.log('   ℹ️  (RPC not available)');
  }

  return true;
}

// Main execution
console.log('🚀 V2T Auto Table Creator');
console.log('='.repeat(70) + '\n');

createTablesDirect().then(async () => {
  // Now verify tables exist
  console.log('\n📊 Verifying tables...\n');
  
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Check galleries table
  const { data: galleriesData, error: galleriesError } = await supabase
    .from('galleries')
    .select('*', { count: 'exact' })
    .limit(1);

  if (galleriesError && galleriesError.message.includes('Could not find the table')) {
    console.log('❌ galleries table still not found');
    console.log('\n⚠️  Manual action required:');
    console.log('1. Go to: https://supabase.com/dashboard/project/yqkuafohmzoyupvnebse/sql');
    console.log('2. Click "New Query"');
    console.log('3. Paste this SQL:\n');
    
    const fs = require('fs');
    const migrationPath = path.join(__dirname, 'migrations', '001_init.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log(sql);
    console.log('\n4. Click "Run"');
    process.exit(1);
  } else {
    console.log('✅ galleries table exists!');
  }

  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
