import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import FormData from "form-data";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const loginRes = await fetch("http://localhost:3001/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password })
});
const loginJson = await loginRes.json();
console.log('login status', loginRes.status, JSON.stringify(loginJson));
if (!loginJson.token) process.exit(1);
const token = loginJson.token;
const form = new FormData();
form.append('file', Buffer.from('upload test ' + new Date().toISOString()), 'test-upload.txt');
form.append('category', 'art');
const uploadRes = await fetch('http://localhost:3001/api/upload', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: form
});
const uploadJson = await uploadRes.json();
console.log('upload status', uploadRes.status, JSON.stringify(uploadJson,null,2));
