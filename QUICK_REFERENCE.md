# 🚀 V2T Groups Firebase - Quick Reference Guide

**Status:** Phase 2 Complete ✅ | Ready for Deployment

---

## 📋 What's New (Phase 2)

### Created Files
✅ `js/auth-service.js` - Firebase Authentication  
✅ `js/firestore-service.js` - Firestore Database CRUD  
✅ `js/storage-service.js` - Image Upload/Download  
✅ `admin-new.html` - Secure Admin Dashboard  
✅ `js/admin-dashboard.js` - Admin Dashboard Logic  
✅ `firebase-rules-firestore.txt` - Firestore Security Rules  
✅ `firebase-rules-storage.txt` - Storage Security Rules  
✅ `FIREBASE_IMPLEMENTATION_GUIDE.md` - Complete Reference  
✅ `FIREBASE_MIGRATION_SUMMARY.md` - Project Overview  

### Modified Files
✅ `js/firebase-config.js` - Added Firestore/Storage init  
✅ `index.html` - Updated script references  
✅ `art.html` - Updated script references  
✅ `event.html` - Updated script references  
✅ `interior.html` - Updated script references  
✅ `.env.local.example` - Comprehensive template

---

## ⚡ 5-Minute Setup

### 1. Firebase Console (2 min)
```
1. Create Firestore database
2. Create "galleries" and "admins" collections
3. Get credentials from Project Settings
4. Create first admin user
```

### 2. Environment Setup (1 min)
```bash
# Copy template
cp .env.local.example .env.local

# Edit .env.local with your Firebase credentials
# Do NOT commit .env.local to git!
```

### 3. Deploy Rules (1 min)
```
1. Copy firebase-rules-firestore.txt → Firestore Console Rules
2. Copy firebase-rules-storage.txt → Storage Console Rules
3. Publish both
```

### 4. Test (1 min)
```
1. Go to http://localhost:8000/admin-new.html
2. Login with admin email/password
3. Upload test image
4. Verify in Firestore and Storage
```

---

## 🎯 Key Endpoints

| File | Purpose | Access |
|------|---------|--------|
| `admin-new.html` | Admin dashboard | `/admin-new.html` |
| `art.html` | Art gallery | `/art.html` |
| `event.html` | Events gallery | `/event.html` |
| `interior.html` | Interior gallery | `/interior.html` |
| `index.html` | Home/Dashboard | `/` |

---

## 🔐 Important Security Rules

**Firestore:**
- ✅ Anyone reads active galleries
- 🔐 Only admin creates/updates/deletes
- ✅ Active flag enforced

**Storage:**
- ✅ Anyone reads images from `/gallery/*`
- 🔐 Only admin writes images
- ✅ File validation: jpg/png/webp, max 5MB

---

## 📊 Service Architecture (3-Tier)

```
┌─────────────────────────┐
│   Admin UI              │
│ (admin-new.html)        │
└────────┬────────────────┘
         │
┌────────▼────────────────┐
│   Services Layer        │
│ Auth/Firestore/Storage  │
└────────┬────────────────┘
         │
┌────────▼────────────────┐
│   Firebase Backend      │
│ Authentication/DB/Files │
└────────────────────────┘
```

---

## 🎨 Admin Dashboard Features

| Feature | Status | Notes |
|---------|--------|-------|
| Firebase Auth Login | ✅ | Email/password + admin role check |
| Category Tabs | ✅ | Art, Events, Interior |
| Upload Images | ✅ | With progress tracking |
| View Gallery | ✅ | Real-time Firestore listener |
| Edit Items | ✅ | Title, description, order |
| Delete Items | ✅ | Removes from Storage + Firestore |
| Search | ⏳ | Next phase |
| Bulk Upload | ⏳ | Next phase |

---

## 💡 Common Tasks

### Add Admin User
```
1. Firebase Console → Authentication → Create user
2. Firestore → admins collection → Create document
3. Document ID = user's UID
4. Fields: { email, role: "admin", createdAt }
```

### Upload Test Image
```
1. Go to /admin-new.html
2. Login with admin credentials
3. Select category (Art/Events/Interior)
4. Fill: Title, Description, Order
5. Select image (jpg/png/webp, max 5MB)
6. Click Upload
7. Verify in Firestore and Storage
```

### View Gallery Items
```
// In browser console:
window.firestoreService.onGalleriesByCategory('art', (items) => {
  console.log(items)
})
```

### Debug Services
```javascript
// Check if services are initialized
console.log(window.authService)        // Auth
console.log(window.firestoreService)   // Firestore
console.log(window.storageService)     // Storage

// Current user
window.authService.getCurrentUser()

// Is admin?
window.authService.isAdmin()
```

---

## ❌ Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Auth not initialized" | Wait for page load, refresh |
| "Access denied: Admin role required" | Add user to admins collection with role: "admin" |
| "File too large" | Max 5MB, check file size |
| "Invalid file type" | Only jpg/png/webp allowed |
| "Images not showing" | Check active: true in Firestore |
| "Permission denied" | Check Firestore/Storage rules deployed |
| "Cannot login" | Verify user exists in both Authentication and admins collection |

---

## 📁 File Reference

### Service Modules
- **auth-service.js** (150 lines)  
  Methods: signIn(), signOut(), isAdmin(), onAuthStateChanged()

- **firestore-service.js** (290 lines)  
  Methods: createGallery(), getGalleriesByCategory(), updateGallery(), deleteGallery(), onGalleriesByCategory()

- **storage-service.js** (220 lines)  
  Methods: uploadImage(), deleteImage(), getDownloadUrl(), validateFile()

### Admin Dashboard
- **admin-new.html** (400 lines)  
  Modern admin UI with login, categories, upload, gallery table

- **admin-dashboard.js** (350 lines)  
  Logic for auth, upload, CRUD operations, real-time updates

### Configuration
- **firebase-config.js** (20 lines)  
  Firebase initialization, global instances

- **.env.local.example** (40 lines)  
  Environment variable template

---

## 🧪 Testing Checklist

### Quick Test (5 min)
- [ ] Open admin-new.html
- [ ] Login works
- [ ] Upload image shows
- [ ] Gallery table displays items
- [ ] No console errors

### Full Test (15 min)
- [ ] Login/logout works
- [ ] Upload with progress bar
- [ ] Image in Storage
- [ ] Document in Firestore
- [ ] Edit title/description
- [ ] Delete item (from Storage and Firestore)
- [ ] Switch categories
- [ ] Gallery pages load (with placeholder items)

### Security Test (10 min)
- [ ] Direct URL access redirects to login
- [ ] Regular user cannot access admin
- [ ] Firestore rules prevent unauthorized reads
- [ ] Storage rules prevent unauthorized writes
- [ ] No credentials in console/network tab

---

## 📚 Documentation Index

| Document | Purpose | Read Time |
|----------|---------|-----------|
| **FIREBASE_MIGRATION_SUMMARY.md** | Project overview | 10 min |
| **FIREBASE_IMPLEMENTATION_GUIDE.md** | Complete reference | 20 min |
| **This File (QUICK_REFERENCE.md)** | Quick lookup | 5 min |
| **.env.local.example** | Setup config | 3 min |

---

## 🚀 Next Phases (Not Started)

### Phase 3: Gallery Pages Modernization
- [ ] Update main.js to use Firestore listeners
- [ ] Replace hardcoded items with dynamic rendering
- [ ] Add loading states and error handling
- [ ] Test real-time updates

### Phase 4: Enhanced Features
- [ ] Search functionality
- [ ] Image filtering
- [ ] Bulk operations
- [ ] Analytics
- [ ] Image optimization

---

## 📞 Quick Support

**Problem:** Services not loading  
**Check:** Browser console for [Auth], [Firestore], [Storage] logs  
**Fix:** Ensure firebase-config.js loaded first

**Problem:** Login fails  
**Check:** User exists in Authentication AND admins collection  
**Fix:** Create user in both places with matching email

**Problem:** Upload fails  
**Check:** File size < 5MB, type is jpg/png/webp  
**Fix:** Validate file before selecting

**Problem:** Images not appearing  
**Check:** active: true in Firestore, rules deployed  
**Fix:** Verify Firestore rules and Security Rules in Console

---

## ✅ Pre-Production Checklist

```
BEFORE GOING LIVE:

Infrastructure
- [ ] Firestore collections created
- [ ] Firestore rules deployed
- [ ] Storage rules deployed
- [ ] Admin user created
- [ ] Environment variables set

Testing
- [ ] Admin can login
- [ ] Admin can upload
- [ ] Admin can edit/delete
- [ ] Gallery displays items
- [ ] No console errors

Security
- [ ] API key restricted in Console
- [ ] Credentials not in code
- [ ] .env.local in .gitignore
- [ ] Rules prevent unauthorized access

Documentation
- [ ] README updated with setup
- [ ] Admin password documented securely
- [ ] Team trained on admin dashboard
```

---

## 🎯 Success Criteria

You'll know it's working when:

1. ✅ Admin dashboard loads at `/admin-new.html`
2. ✅ Can login with Firebase Auth
3. ✅ Can upload image with progress bar
4. ✅ Image appears in Firestore galleries collection
5. ✅ Image stored in `/gallery/{category}/` in Storage
6. ✅ Gallery table shows image immediately
7. ✅ Can edit and delete items
8. ✅ No console errors
9. ✅ Unauthenticated users see login screen
10. ✅ Gallery pages ready for dynamic content

---

**Last Updated:** 2024  
**Version:** 2.0  
**Status:** Production Ready (Services Only - Gallery Pages Pending)

For detailed info, see **FIREBASE_IMPLEMENTATION_GUIDE.md**
