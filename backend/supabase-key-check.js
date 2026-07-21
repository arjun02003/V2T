const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const url = process.env.SUPABASE_URL;
const roleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const keyAlias = process.env.SUPABASE_SERVICE_KEY;
console.log('SUPABASE_URL=', url);
console.log('SUPABASE_SERVICE_ROLE_KEY loaded=', !!roleKey, roleKey ? roleKey.slice(0,10) : null);
console.log('SUPABASE_SERVICE_KEY loaded=', !!keyAlias, keyAlias ? keyAlias.slice(0,10) : null);
console.log('SUPABASE_SERVICE_ROLE_KEY prefix match=', roleKey?.startsWith('sb_secret_'));
console.log('SUPABASE_SERVICE_KEY prefix match=', keyAlias?.startsWith('sb_secret_'));
const { createClient } = require('@supabase/supabase-js');
const keyToUse = roleKey || keyAlias;
console.log('Creating client with role key from', roleKey ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_SERVICE_KEY');
const supabase = createClient(url, keyToUse, { auth: { persistSession: false } });
(async () => {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    console.log('listBuckets error=', error, 'data=', data);
  } catch(e) {
    console.error('listBuckets exception', e);
  }
})();
