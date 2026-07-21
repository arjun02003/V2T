#!/usr/bin/env node
/**
 * Verify Upload Ready - Check if system is ready for image uploads
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function verify() {
  console.log('');
  console.log('='.repeat(80));
  console.log('              V2T UPLOAD READY VERIFICATION');
  console.log('='.repeat(80));
  console.log('');

  let allReady = true;

  // Check 1: galleries table
  console.log('✓ Checking galleries table...');
  const { data: galleriesData, error: galleriesError } = await supabase
    .from('galleries')
    .select('*', { count: 'exact' })
    .limit(1);

  if (galleriesError && galleriesError.message.includes('Could not find the table')) {
    console.log('  ❌ galleries table NOT FOUND');
    console.log('     Run: npm run final-setup');
    console.log('     Then create tables via Supabase Dashboard');
    allReady = false;
  } else {
    console.log('  ✅ galleries table exists');
  }

  // Check 2: admins table
  console.log('✓ Checking admins table...');
  const { data: adminsData, error: adminsError } = await supabase
    .from('admins')
    .select('*', { count: 'exact' })
    .limit(1);

  if (adminsError && adminsError.message.includes('Could not find the table')) {
    console.log('  ❌ admins table NOT FOUND');
    allReady = false;
  } else {
    console.log('  ✅ admins table exists');
  }

  // Check 3: Test INSERT
  console.log('✓ Testing INSERT...');
  const { data: insertData, error: insertError } = await supabase
    .from('galleries')
    .insert([{
      title: '[VERIFY] ' + new Date().toISOString(),
      description: 'Verification test',
      category: 'art',
      price: '0',
      image_url: 'https://example.com/verify.jpg',
      storage_path: 'verify/test.jpg',
    }])
    .select('*')
    .single();

  if (insertError) {
    console.log(`  ❌ INSERT failed: ${insertError.message}`);
    allReady = false;
  } else {
    console.log('  ✅ INSERT works');
    await supabase.from('galleries').delete().eq('id', insertData.id);
  }

  // Check 4: Backend running
  console.log('✓ Checking backend server...');
  try {
    const response = await fetch('http://localhost:3001/api/health');
    if (response.ok) {
      console.log('  ✅ Backend running on http://localhost:3001');
    } else {
      console.log('  ⚠️  Backend health check failed');
    }
  } catch (err) {
    console.log('  ❌ Backend not running on http://localhost:3001');
    console.log('     Run: npm start');
    allReady = false;
  }

  // Check 5: Frontend running
  console.log('✓ Checking frontend server...');
  try {
    const response = await fetch('http://localhost:8000');
    if (response.ok) {
      console.log('  ✅ Frontend running on http://localhost:8000');
    } else {
      console.log('  ⚠️  Frontend health check failed');
    }
  } catch (err) {
    console.log('  ❌ Frontend not running on http://localhost:8000');
    console.log('     Run: cd frontend && python -m http.server 8000');
    allReady = false;
  }

  console.log('');
  console.log('='.repeat(80));

  if (allReady) {
    console.log('✅ ✅ ✅ ALL SYSTEMS GO - UPLOAD IS READY! ✅ ✅ ✅');
    console.log('');
    console.log('Open: http://localhost:8000/admin-new.html');
    console.log('and try uploading an image!');
    process.exit(0);
  } else {
    console.log('⚠️  System is NOT ready for uploads');
    console.log('');
    console.log('Please fix the issues above and try again');
    process.exit(1);
  }
}

verify().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
