const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
console.log('dotenv .env path:', path.resolve(__dirname, '.env'));
console.log('SUPABASE_URL=', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_KEY=', !!process.env.SUPABASE_SERVICE_KEY, process.env.SUPABASE_SERVICE_KEY ? process.env.SUPABASE_SERVICE_KEY.slice(0, 10)+'...' : null);
console.log('SUPABASE_SERVICE_ROLE_KEY=', !!process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 10)+'...' : null);
console.log('SUPABASE_BUCKET=', process.env.SUPABASE_BUCKET);
console.log('SUPABASE_STORAGE_BUCKET=', process.env.SUPABASE_STORAGE_BUCKET);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || 'gallery';
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase URL or key');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
(async () => {
  try {
    const listRes = await supabase.storage.listBuckets();
    console.log('listBuckets', JSON.stringify(listRes, null, 2));
  } catch (err) {
    console.error('listBuckets error', err);
  }
  try {
    const bucketRes = await supabase.storage.getBucket(BUCKET);
    console.log('getBucket', JSON.stringify(bucketRes, null, 2));
  } catch (err) {
    console.error('getBucket error', err);
  }
  try {
    const pathName = 'debug/test.txt';
    const content = 'debug ' + new Date().toISOString();
    const { data, error } = await supabase.storage.from(BUCKET).upload(pathName, Buffer.from(content), { contentType: 'text/plain' });
    console.log('uploadRes', JSON.stringify({ data, error }, null, 2));
    if (error) {
      console.error('upload error code', error.code, 'message', error.message, 'details', error.details);
    } else {
      const publicRes = await supabase.storage.from(BUCKET).getPublicUrl(pathName);
      console.log('publicUrl', JSON.stringify(publicRes, null, 2));
    }
  } catch (err) {
    console.error('upload exception', err);
  }
})();
