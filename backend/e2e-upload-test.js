const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const BASE_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:8080';
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const bucket = process.env.SUPABASE_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || 'gallery';
const roleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(process.env.SUPABASE_URL, roleKey, { auth: { persistSession: false } });
const login = async () => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Login failed ${res.status}: ${JSON.stringify(json)}`);
  return json.token;
};
const uploadFile = async (token, blob, category) => {
  const form = new FormData();
  form.append('file', blob, 'test.png');
  form.append('category', category);
  const res = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Upload failed ${res.status}: ${JSON.stringify(json)}`);
  return json;
};
const createGalleryItem = async (token, data) => {
  const res = await fetch(`${BASE_URL}/api/gallery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Create gallery failed ${res.status}: ${JSON.stringify(json)}`);
  return json.data;
};
const getGalleryItems = async (category) => {
  const res = await fetch(`${BASE_URL}/api/gallery/${category}?active=true`, { method: 'GET' });
  const json = await res.json();
  if (!res.ok) throw new Error(`Get gallery failed ${res.status}: ${JSON.stringify(json)}`);
  return json.data;
};
const deleteGalleryItem = async (token, id) => {
  const res = await fetch(`${BASE_URL}/api/gallery/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Delete gallery failed ${res.status}: ${JSON.stringify(json)}`);
  return json;
};
const replaceImage = async (token, id, blob, category) => {
  const form = new FormData();
  form.append('file', blob, 'replacement.png');
  const res = await fetch(`${BASE_URL}/api/gallery/${id}/image`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Replace image failed ${res.status}: ${JSON.stringify(json)}`);
  return json.data;
};
const verifyStorageObject = async (pathName) => {
  const { data, error } = await supabase.storage.from(bucket).download(pathName);
  return { data, error };
};
const URL_VALID = async (url) => {
  const res = await fetch(url, { method: 'GET' });
  return { status: res.status, ok: res.ok, url };
};
const makePng = (color) => {
  // 1x1 PNG, red/green/blue based on color string
  const pixels = {
    red: [255,0,0,255],
    green: [0,255,0,255],
    blue: [0,0,255,255]
  }[color] || [255,255,255,255];
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mO0WQ8AATUBqtQj0gAAAABJRU5ErkJggg==';
  return Buffer.from(pngBase64, 'base64');
};
(async () => {
  console.log('Starting E2E upload test');
  const token = await login();
  console.log('Logged in token length', token.length);
  const imageA = makePng('red');
  const imageB = makePng('green');
  const blobA = new Blob([imageA], { type: 'image/png' });
  const blobB = new Blob([imageB], { type: 'image/png' });

  const uploadRes = await uploadFile(token, blobA, 'art');
  console.log('Upload result:', uploadRes);

  const item = await createGalleryItem(token, {
    title: 'E2E Test Image',
    description: 'Automated end-to-end test item',
    category: 'art',
    price: '100',
    image_url: uploadRes.file.url,
    storage_path: uploadRes.file.path,
    order: 0,
    active: true
  });
  console.log('Created gallery item:', item);

  const galleryItems = await getGalleryItems('art');
  const foundItem = galleryItems.find((g) => g.id === item.id);
  console.log('Found item in art gallery:', !!foundItem, foundItem ? foundItem.title : null);

  const storageVerify = await verifyStorageObject(uploadRes.file.path);
  console.log('Storage verify error:', storageVerify.error);
  console.log('Storage verify size:', storageVerify.data ? storageVerify.data.size : null);

  const urlCheck = await URL_VALID(uploadRes.file.url);
  console.log('Image URL check:', urlCheck);

  const adminPage = await fetch(`${FRONTEND_URL}/admin-new.html`);
  console.log('Admin page status:', adminPage.status);
  const artPage = await fetch(`${FRONTEND_URL}/art.html`);
  console.log('Art page status:', artPage.status);

  const replacement = await replaceImage(token, item.id, blobB, 'art');
  console.log('Image replacement result:', replacement);

  const oldStorageVerify = await verifyStorageObject(uploadRes.file.path);
  console.log('Old storage path still exists error:', oldStorageVerify.error, 'data:', oldStorageVerify.data ? oldStorageVerify.data.size : null);
  const newStorageVerify = await verifyStorageObject(replacement.storage_path);
  console.log('New storage verify error:', newStorageVerify.error, 'data size:', newStorageVerify.data ? newStorageVerify.data.size : null);

  const deleteRes = await deleteGalleryItem(token, item.id);
  console.log('Delete gallery response:', deleteRes);

  const galleryItemsAfterDelete = await getGalleryItems('art');
  const stillExists = galleryItemsAfterDelete.some((g) => g.id === item.id);
  console.log('Item still exists after delete:', stillExists);

  const deletedStorageVerify = await verifyStorageObject(replacement.storage_path);
  console.log('Deleted storage verify error:', deletedStorageVerify.error, 'data:', deletedStorageVerify.data ? deletedStorageVerify.data.size : null);

  console.log('E2E upload test complete');
})();
