const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const login = async () => {
  const res = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  console.log('login status', res.status, data);
  return data;
};
(async () => {
  const auth = await login();
  if (!auth.token) {
    console.error('Login failed, aborting');
    process.exit(1);
  }
  const form = new FormData();
  form.append('file', Buffer.from('upload test ' + new Date().toISOString()), 'test-upload.txt');
  form.append('category', 'art');
  const res = await fetch('http://localhost:3001/api/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}` },
    body: form
  });
  const data = await res.json();
  console.log('upload status', res.status, data);
})();
