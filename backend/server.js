const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const STORAGE_BUCKET = process.env.SUPABASE_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || 'gallery';
const PORT = Number(process.env.PORT || 3001);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !JWT_SECRET || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing required environment variables. Please check backend/.env and ensure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, ADMIN_EMAIL, and ADMIN_PASSWORD are set.');
  process.exit(1);
}

if (!SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_secret_')) {
  console.error('Invalid Supabase service role key prefix. SUPABASE_SERVICE_ROLE_KEY must begin with "sb_secret_".');
  process.exit(1);
}

console.log('Loaded SUPABASE_URL:', SUPABASE_URL);
console.log('Loaded SUPABASE_SERVICE_ROLE_KEY prefix:', SUPABASE_SERVICE_ROLE_KEY.slice(0, 10));

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let STORAGE_BUCKET_PUBLIC = false;

async function inspectBucket() {
  try {
    const { data, error } = await supabase.storage.getBucket(STORAGE_BUCKET);
    if (error) {
      console.error('Unable to inspect Supabase bucket:', STORAGE_BUCKET, error);
      return;
    }
    STORAGE_BUCKET_PUBLIC = data?.public === true;
    console.log('Supabase storage bucket:', STORAGE_BUCKET);
    console.log('Bucket public access:', STORAGE_BUCKET_PUBLIC);
    console.log('Using Supabase key from:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_SERVICE_KEY');
  } catch (error) {
    console.error('Error while inspecting Supabase bucket:', STORAGE_BUCKET, error);
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});

function signJwt(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function ensureAdminUser() {
  const { data, error } = await supabase
    .from('admins')
    .select('id,email')
    .eq('email', ADMIN_EMAIL)
    .single();

  if (error) {
    if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
      console.warn('Admins table not found in Supabase. Please run migrations or create the admins table manually.');
      return;
    }

    console.error('Supabase admin lookup failed:', error);
    return;
  }

  if (!data) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const insert = await supabase.from('admins').insert([{ email: ADMIN_EMAIL, password_hash: passwordHash }]);
    if (insert.error) {
      console.error('Failed to create initial admin user:', insert.error);
    } else {
      console.log('Initial admin user created:', ADMIN_EMAIL);
    }
  } else {
    console.log('Existing admin user detected:', ADMIN_EMAIL);
  }
}

function getLoginEmail(body) {
  return body.email || body.username || body.user || body.admin || body.login;
}

app.post('/api/auth/login', async (req, res) => {
  const email = getLoginEmail(req.body);
  const { password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  let adminRecord = null;
  let queryError = null;

  try {
    const { data, error } = await supabase
      .from('admins')
      .select('id,email,password_hash')
      .eq('email', email)
      .single();

    if (error) {
      queryError = error;
    } else {
      adminRecord = data;
    }
  } catch (error) {
    queryError = error;
  }

  if (adminRecord) {
    const validPassword = await bcrypt.compare(password, adminRecord.password_hash);
    if (!validPassword) {
      console.warn('Invalid password for admin:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signJwt({ sub: adminRecord.id, email: adminRecord.email });
    return res.json({ token, user: { id: adminRecord.id, email: adminRecord.email } });
  }

  if (queryError) {
    console.warn('Supabase admin query failed; falling back to env credentials:', queryError.message || queryError);
  }

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const fallbackId = 'env-admin';
    const token = signJwt({ sub: fallbackId, email });
    return res.json({ token, user: { id: fallbackId, email } });
  }

  return res.status(401).json({ error: 'Invalid email or password' });
});

app.get('/api/auth/verify', authMiddleware, async (req, res) => {
  return res.json({ valid: true, user: req.admin });
});

async function fetchGalleryItems(category, activeOnly = true) {
  const validCategories = ['art', 'event', 'interior'];
  if (!validCategories.includes(category)) {
    throw new Error('Invalid gallery category');
  }

  let query = supabase.from('galleries').select('*').eq('category', category);
  if (activeOnly) query = query.eq('active', true);
  query = query.order('order', { ascending: true }).order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data;
}

app.get('/api/gallery', async (req, res) => {
  const category = req.query.category;
  if (!category) {
    return res.status(400).json({ error: 'Category query parameter is required' });
  }

  try {
    const activeOnly = req.query.active !== 'false';
    const data = await fetchGalleryItems(category, activeOnly);
    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Failed to fetch gallery items' });
  }
});

app.get('/api/gallery/:category', async (req, res) => {
  const category = req.params.category;
  try {
    const activeOnly = req.query.active !== 'false';
    const data = await fetchGalleryItems(category, activeOnly);
    return res.json({ data });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Failed to fetch gallery items' });
  }
});

app.post('/api/upload', authMiddleware, upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'File upload required' });
  }

  const requestedCategory = req.body.category || 'general';
  const validCategories = ['art', 'event', 'interior'];
  const category = validCategories.includes(requestedCategory) ? requestedCategory : 'general';

  const timestamp = Date.now();
  const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${timestamp}_${safeName}`;
  const storagePath = `gallery/${category}/${filename}`;

  const uploadResult = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file.buffer, { contentType: file.mimetype, cacheControl: 'public, max-age=31536000' });

  if (uploadResult.error) {
    console.error('Supabase storage upload failed', {
      bucket: STORAGE_BUCKET,
      storagePath,
      error: uploadResult.error
    });
    return res.status(500).json({
      error: 'Supabase storage upload failed',
      details: uploadResult.error,
      bucket: STORAGE_BUCKET,
      storagePath
    });
  }

  let url = null;
  let publicUrlResult = null;
  let signedUrlResult = null;

  if (STORAGE_BUCKET_PUBLIC) {
    publicUrlResult = await supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    if (publicUrlResult.error) {
      console.error('Supabase getPublicUrl failed', {
        bucket: STORAGE_BUCKET,
        storagePath,
        error: publicUrlResult.error
      });
    } else {
      url = publicUrlResult.data?.publicUrl || null;
    }
  } else {
    signedUrlResult = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(storagePath, 60 * 60);
    if (signedUrlResult.error) {
      console.error('Supabase createSignedUrl failed', {
        bucket: STORAGE_BUCKET,
        storagePath,
        error: signedUrlResult.error
      });
    } else {
      url = signedUrlResult.data?.signedUrl || null;
    }
  }

  return res.json({
    file: {
      url,
      path: storagePath,
      bucket: STORAGE_BUCKET,
      category,
      bucketPublic: STORAGE_BUCKET_PUBLIC
    }
  });
});

app.post('/api/gallery', authMiddleware, async (req, res) => {
  const { title, description, category, price, image_url, storage_path, order = 0, active = true } = req.body;
  const validCategories = ['art', 'event', 'interior'];

  // ===== DEBUG: Log incoming request =====
  console.log('[DEBUG] POST /api/gallery - Incoming request');
  console.log('[DEBUG] Body:', {
    title,
    description,
    category,
    price,
    image_url,
    storage_path,
    order,
    active,
  });

  if (!title || !description || !category || !price || !image_url || !storage_path) {
    const missingFields = [];
    if (!title) missingFields.push('title');
    if (!description) missingFields.push('description');
    if (!category) missingFields.push('category');
    if (!price) missingFields.push('price');
    if (!image_url) missingFields.push('image_url');
    if (!storage_path) missingFields.push('storage_path');
    console.error('[ERROR] Missing fields:', missingFields);
    return res.status(400).json({ error: 'Missing required gallery fields', missingFields });
  }

  if (!validCategories.includes(category)) {
    console.error('[ERROR] Invalid category:', category, 'Valid options:', validCategories);
    return res.status(400).json({ error: 'Invalid category', provided: category, valid: validCategories });
  }

  const insertPayload = {
    title,
    description,
    category,
    price,
    image_url,
    storage_path,
    order,
    active,
  };

  // ===== DEBUG: Log SQL query being attempted =====
  console.log('[DEBUG] Attempting INSERT to galleries table');
  console.log('[DEBUG] Payload:', insertPayload);

  const { data, error } = await supabase
    .from('galleries')
    .insert([insertPayload])
    .select('*')
    .single();

  // ===== DEBUG: Log full error details if query failed =====
  if (error) {
    console.error('[ERROR] Supabase INSERT failed');
    console.error('[ERROR] Error Code:', error.code);
    console.error('[ERROR] Error Message:', error.message);
    console.error('[ERROR] Error Details:', error.details);
    console.error('[ERROR] Error Hint:', error.hint);
    console.error('[ERROR] Error Status:', error.status);
    console.error('[ERROR] Error StatusText:', error.statusText);
    console.error('[ERROR] Full Error Object:', JSON.stringify(error, null, 2));

    // IMPORTANT: Return FULL error details, not generic message
    return res.status(500).json({
      success: false,
      error: 'Database INSERT failed - see details below for exact error',
      database_error: {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        status: error.status,
        statusText: error.statusText,
      },
      query: {
        table: 'public.galleries',
        operation: 'INSERT',
        payload: insertPayload,
      },
      full_error: error,
    });
  }

  // ===== DEBUG: Log successful insertion =====
  console.log('[DEBUG] INSERT successful');
  console.log('[DEBUG] Inserted data:', data);

  return res.json({ data });
});

app.put('/api/gallery/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  const updates = {};
  const allowedFields = ['title', 'description', 'price', 'category', 'order', 'active'];

  allowedFields.forEach((field) => {
    if (typeof req.body[field] !== 'undefined') {
      updates[field] = req.body[field];
    }
  });

  if (updates.category && !['art', 'event', 'interior'].includes(updates.category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from('galleries').update(updates).eq('id', id).select('*').single();
  if (error) {
    return res.status(500).json({ error: 'Failed to update gallery item', details: error.message });
  }

  return res.json({ data });
});

app.put('/api/gallery/:id/image', authMiddleware, upload.single('file'), async (req, res) => {
  const id = req.params.id;
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'Replacement file is required' });
  }

  const { data: existingItem, error: fetchError } = await supabase.from('galleries').select('storage_path').eq('id', id).single();
  if (fetchError || !existingItem) {
    return res.status(404).json({ error: 'Gallery item not found' });
  }

  const timestamp = Date.now();
  const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${timestamp}_${safeName}`;
  const storagePath = `gallery/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file.buffer, { contentType: file.mimetype, cacheControl: 'public, max-age=31536000' });

  if (uploadError) {
    return res.status(500).json({ error: 'Storage upload failed', details: uploadError.message });
  }

  const { data: publicUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

  if (existingItem.storage_path) {
    await supabase.storage.from(STORAGE_BUCKET).remove([existingItem.storage_path]);
  }

  const { data, error: updateError } = await supabase.from('galleries').update({
    image_url: publicUrlData.publicUrl,
    storage_path: storagePath,
    updated_at: new Date().toISOString(),
  }).eq('id', id).select('*').single();

  if (updateError) {
    return res.status(500).json({ error: 'Failed to update gallery item image', details: updateError.message });
  }

  return res.json({ data });
});

app.delete('/api/gallery/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  const { data: existingItem, error: fetchError } = await supabase.from('galleries').select('storage_path').eq('id', id).single();
  if (fetchError || !existingItem) {
    return res.status(404).json({ error: 'Gallery item not found' });
  }

  if (existingItem.storage_path) {
    const { error: deleteError } = await supabase.storage.from(STORAGE_BUCKET).remove([existingItem.storage_path]);
    if (deleteError) {
      console.error('Warning: failed to delete storage file:', deleteError);
    }
  }

  const { error } = await supabase.from('galleries').delete().eq('id', id);
  if (error) {
    return res.status(500).json({ error: 'Failed to delete gallery item', details: error.message });
  }

  return res.json({ success: true });
});

// ===== HEALTH CHECK & DEBUG ENDPOINT =====
app.get('/api/health', async (req, res) => {
  console.log('[DEBUG] GET /api/health - Health check requested');

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabase: {},
    database: {},
  };

  // Test 1: Supabase auth
  try {
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      health.supabase.auth = 'FAILED';
      health.supabase.authError = bucketsError.message;
      console.error('[ERROR] Supabase auth check failed:', bucketsError);
    } else {
      health.supabase.auth = 'OK';
      health.supabase.bucketsCount = buckets?.length || 0;
      console.log('[DEBUG] Supabase auth check passed');
    }
  } catch (error) {
    health.supabase.auth = 'EXCEPTION';
    health.supabase.authError = error.message;
    console.error('[ERROR] Supabase auth check exception:', error);
  }

  // Test 2: Database table exists
  try {
    const { data: tableData, error: tableError } = await supabase
      .from('galleries')
      .select('*', { count: 'exact' })
      .limit(1);

    if (tableError) {
      health.database.tableExists = false;
      health.database.tableError = tableError.message;
      health.database.errorCode = tableError.code;
      console.error('[ERROR] Database table check failed:', tableError.code, tableError.message);
    } else {
      health.database.tableExists = true;
      health.database.rowCount = tableData?.length || 0;
      console.log('[DEBUG] Database table check passed, rows:', tableData?.length || 0);
    }
  } catch (error) {
    health.database.tableExists = false;
    health.database.tableError = error.message;
    console.error('[ERROR] Database table check exception:', error);
  }

  // Test 3: Table schema
  try {
    // This query checks the actual column names from the database
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('get_table_columns', { table_name: 'galleries' })
      .catch(() => {
        // If RPC doesn't exist, we'll skip this test
        return { data: null, error: null };
      });

    if (schemaError) {
      console.log('[DEBUG] Schema check skipped (RPC not available)');
      health.database.schema = 'SKIPPED';
    } else if (schemaData) {
      health.database.schema = schemaData;
      console.log('[DEBUG] Schema check passed:', schemaData);
    } else {
      // Try a basic INSERT to verify column names
      const { error: testError } = await supabase
        .from('galleries')
        .insert([{
          title: '__health_check__',
          description: 'health check',
          category: 'art',
          price: '0',
          image_url: 'test',
          storage_path: 'test',
        }])
        .select('*')
        .single();

      if (testError) {
        health.database.schema = 'VALIDATION_ERROR';
        health.database.schemaError = testError.message;
        health.database.errorCode = testError.code;
        console.error('[ERROR] Schema validation failed:', testError.code, testError.message);
      } else {
        health.database.schema = 'OK';
        console.log('[DEBUG] Schema validation passed');
        // Clean up test record
        await supabase.from('galleries').delete().eq('title', '__health_check__');
      }
    }
  } catch (error) {
    health.database.schema = 'EXCEPTION';
    health.database.schemaError = error.message;
    console.error('[ERROR] Schema check exception:', error);
  }

  // Test 4: RLS check
  try {
    console.log('[DEBUG] Service Role Key is being used:', SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_secret_'));
    health.database.usingServiceRole = SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_secret_');
    console.log('[DEBUG] RLS should be bypassed with Service Role Key');
  } catch (error) {
    console.error('[ERROR] RLS check exception:', error);
  }

  const statusCode = health.database.tableExists && health.supabase.auth === 'OK' ? 200 : 500;
  res.status(statusCode).json(health);
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

async function validateSupabaseConnection() {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error('Supabase auth validation failed:', error);
      process.exit(1);
    }
    if (!Array.isArray(data)) {
      console.error('Supabase auth validation failed: unexpected response', data);
      process.exit(1);
    }
    console.log('Supabase auth validation succeeded. Bucket count:', data.length);
  } catch (error) {
    console.error('Supabase auth validation exception:', error);
    process.exit(1);
  }
}

async function startServer() {
  await validateSupabaseConnection();
  await inspectBucket();
  await ensureAdminUser();

  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

startServer();
