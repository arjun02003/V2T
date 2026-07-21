# QUICK FIX - Image Upload Database Error

## 🔴 ROOT CAUSE
The `galleries` table does **NOT EXIST** in your Supabase database.

Error Code: `PGRST205: Could not find the table 'public.galleries'`

---

## ✅ SOLUTION (Choose ONE)

### Option A: Quick Fix via Supabase Dashboard (30 seconds)
1. Go to: https://supabase.com/dashboard/project/yqkuafohmzoyupvnebse/sql
2. Click "New Query"
3. Copy & paste the SQL from **DATABASE_DEBUG_REPORT.md**
4. Click "Run"
5. Done! ✅

### Option B: Via PostgreSQL Connection
1. Update `.env` - Add real PostgreSQL connection string
2. Run: `npm run migrate`
3. Done! ✅

---

## 🧪 VERIFY IT WORKED
```bash
npm run debug-db
```

Should show: ✅ All tests pass

---

## 📊 FILES MODIFIED
1. ✅ `backend/server.js` - Enhanced error logging
2. ✅ `backend/package.json` - Added debug commands
3. ✅ `backend/debug-database.js` - NEW - Database diagnostics
4. ✅ `backend/setup-help.js` - NEW - Setup helper
5. ✅ `DATABASE_DEBUG_REPORT.md` - NEW - Full analysis

---

## 🚀 AFTER FIXING
1. Restart backend: `npm start`
2. Test upload via admin dashboard
3. Watch backend console for detailed logs

Check the DATABASE_DEBUG_REPORT.md for complete details!
