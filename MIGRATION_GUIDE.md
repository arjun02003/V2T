# Database Migration - Complete Setup Guide

## Status: 🔴 Tables Still Missing

**Error:** `PGRST205: Could not find the table 'public.galleries'`

---

## Quick Solution (3 Steps, 2 Minutes)

### STEP 1: Go to Supabase Dashboard SQL Editor
```
https://supabase.com/dashboard/project/yqkuafohmzoyupvnebse/sql
```

### STEP 2: Click "New Query"

### STEP 3: Copy and paste this SQL (exactly as shown):

```sql
-- Create pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table 1: admins (for admin authentication)
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table 2: galleries (for gallery items)
CREATE TABLE IF NOT EXISTS galleries (
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
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_galleries_category_active_order 
  ON galleries (category, active, "order");
```

### STEP 4: Click "Run" or press Ctrl+Enter

**Expected result:** "Success. No rows returned."

### STEP 5: Verify it worked

```bash
npm run debug-db
```

Should show: ✅ All checks pass

### STEP 6: Restart backend

```bash
npm start
```

---

## What Gets Created

### Table 1: `admins`
Used for admin user authentication

| Column | Type | Properties |
|--------|------|-----------|
| `id` | uuid | PRIMARY KEY, auto-generated |
| `email` | text | NOT NULL, UNIQUE |
| `password_hash` | text | NOT NULL (bcrypt hash) |
| `created_at` | timestamptz | NOT NULL, auto-set |
| `updated_at` | timestamptz | NOT NULL, auto-set |

### Table 2: `galleries`
Used for gallery items (art, event, interior photos)

| Column | Type | Properties |
|--------|------|-----------|
| `id` | uuid | PRIMARY KEY, auto-generated |
| `title` | text | NOT NULL (item title) |
| `description` | text | NOT NULL (item description) |
| `category` | text | NOT NULL, CHECK IN ('art', 'event', 'interior') |
| `price` | text | NOT NULL (display price) |
| `image_url` | text | NOT NULL (public/signed URL) |
| `storage_path` | text | NOT NULL (path in storage bucket) |
| `order` | integer | NOT NULL, DEFAULT 0 (sort order) |
| `active` | boolean | NOT NULL, DEFAULT true (visibility) |
| `created_at` | timestamptz | NOT NULL, auto-set |
| `updated_at` | timestamptz | NOT NULL, auto-set |

---

## Alternative: Auto-Migration (Advanced)

If you have the PostgreSQL password, you can auto-run migrations:

### Option A: Interactive Setup
```bash
npm run setup
```
This will prompt you for the database password and run migrations automatically.

### Option B: Manual Password Setup

1. Get your database password from Supabase:
   - Go to Settings → Database
   - Copy the password (not the connection string)

2. Update `.env`:
   ```
   DATABASE_PASSWORD=your_password_here
   ```

3. Run migrations:
   ```bash
   npm run migrate-direct
   ```

4. Verify:
   ```bash
   npm run debug-db
   ```

---

## Available Commands

| Command | Purpose |
|---------|---------|
| `npm run setup` | Interactive setup guide |
| `npm run migrate-direct` | Auto-migrate with PostgreSQL (requires DATABASE_PASSWORD) |
| `npm run debug-db` | Verify database setup |
| `npm start` | Start backend server |

---

## After Tables Are Created

### Step 1: Verify
```bash
npm run debug-db
```

Expected output:
```
✅ Supabase connection successful
✅ Galleries table exists
✅ INSERT successful!
🎉 Diagnostics Complete!
```

### Step 2: Restart backend
```bash
npm start
```

### Step 3: Test upload
1. Open admin dashboard in browser
2. Upload an image
3. Fill in gallery details
4. Click "Save"

**Expected:** ✅ Image saves successfully!

---

## Troubleshooting

### "Still getting PGRST205 error"
→ Tables weren't created. Go back to Step 1 and run the SQL again.

### "SQL query is grayed out or won't run"
→ Make sure you:
  1. Clicked "New Query" (not Edit on existing query)
  2. Copied the exact SQL (no typos)
  3. Your Supabase project is active (not paused)

### "Tables created but still getting upload error"
→ Run `npm run debug-db` and check the full error output

### "Connection timeout when running npm run migrate-direct"
→ Your database password is incorrect. Check Supabase dashboard again.

---

## Exact Error Path (What We Found)

1. ✅ Backend connects to Supabase successfully
2. ✅ Storage bucket (`v2t-images`) exists
3. ✅ Service Role Key is valid
4. ❌ **The `galleries` table doesn't exist** ← FIX THIS
5. ❌ **The `admins` table doesn't exist** ← FIX THIS
6. When upload tries to insert: Error `PGRST205`

**Solution:** Run the SQL above to create the tables.

---

## Files That Will Help

- `DATABASE_DEBUG_REPORT.md` - Full technical analysis
- `QUICK_FIX.md` - Quick reference
- `backend/debug-database.js` - Database diagnostics tool
- `backend/run-migrations.js` - Auto-migration runner
- `backend/migrate-direct.js` - PostgreSQL direct migration

---

## Next Steps

**Immediate:** 
1. Copy the SQL above
2. Paste into Supabase SQL Editor
3. Click "Run"

**Then:**
1. Run `npm run debug-db`
2. Run `npm start`
3. Test upload via admin dashboard

That's it! 🚀

---

## Support

If you get stuck:
1. Check the SQL syntax (it's already correct, just copy-paste)
2. Verify Supabase project is active
3. Make sure you're logged into Supabase
4. Check browser console for any frontend errors
5. Check backend console for full error messages

Questions? Check `DATABASE_DEBUG_REPORT.md` for detailed technical info.
