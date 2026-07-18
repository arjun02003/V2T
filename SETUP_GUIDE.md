# 🚀 V2T Groups Firebase - Setup Guide

## ✅ What's Working Right Now

Your admin dashboard is loading at `http://localhost:8000/admin-new.html`

However, to actually **login and upload images**, you need to:
1. Create a Firebase project
2. Add your credentials to `js/env.js`
3. Set up Firestore database
4. Set up Firebase Storage
5. Deploy security rules

---

## 📋 Step-by-Step Setup (30 minutes)

### STEP 1: Create Firebase Project (5 min)

1. Go to **[Firebase Console](https://console.firebase.google.com/)**
2. Click **"Create a project"**
3. Project name: `v2tgroups` (or your choice)
4. Continue through the setup (keep defaults)
5. Once created, go to **Project Settings** (gear icon)

### STEP 2: Get Your Firebase Credentials (3 min)

In **Project Settings → General**:

1. Scroll down to **"Your apps"** section
2. Click the **Web icon** (looks like `</>`  )
3. Copy all the values:
   - API Key
   - Auth Domain
   - Database URL (if available)
   - Project ID
   - Storage Bucket
   - Messaging Sender ID
   - App ID

### STEP 3: Configure Environment (2 min)

Open `js/env.js` and replace the demo credentials:

```javascript
window.FIREBASE_API_KEY = "YOUR_API_KEY_HERE";
window.FIREBASE_AUTH_DOMAIN = "your-project.firebaseapp.com";
window.FIREBASE_DATABASE_URL = "https://your-project.firebaseio.com";
window.FIREBASE_PROJECT_ID = "your-project-id";
window.FIREBASE_STORAGE_BUCKET = "your-project.appspot.com";
window.FIREBASE_MESSAGING_SENDER_ID = "123456789012";
window.FIREBASE_APP_ID = "1:123456789012:web:abc...";
```

**Save the file and refresh your browser** (`Ctrl+R`)

### STEP 4: Enable Firestore (3 min)

1. In **Firebase Console → Firestore Database**
2. Click **"Create database"**
3. Choose region (closest to you)
4. Start in **Test mode** for now (development)
5. Click **"Enable"**

### STEP 5: Create Collections (2 min)

In **Firestore**, create two collections:

**Collection 1: "galleries"**
- This stores your images

**Collection 2: "admins"**
- This stores admin users

### STEP 6: Enable Storage (2 min)

1. In **Firebase Console → Storage**
2. Click **"Get started"**
3. Keep default location
4. Start in **Test mode**
5. Click **"Done"**

### STEP 7: Enable Authentication (2 min)

1. In **Firebase Console → Authentication**
2. Click **"Get started"**
3. Enable **"Email/Password"**
4. Create your first admin user:
   - Email: `admin@v2tgroups.com` (or your choice)
   - Password: Strong password (min 6 chars)

### STEP 8: Add Admin Role (2 min)

1. Go to **Firestore → admins collection**
2. Click **"Add document"**
3. Set document ID to the **user ID** from step 7
   - (Copy from Authentication users list)
4. Add fields:
   ```
   email: "admin@v2tgroups.com"
   role: "admin"
   createdAt: (current timestamp)
   ```
5. Click **"Save"**

### STEP 9: Deploy Security Rules (3 min)

#### For Firestore:
1. Go to **Firestore → Rules**
2. Copy the contents of `firebase-rules-firestore.txt`
3. Paste into the Rules editor
4. Click **"Publish"**

#### For Storage:
1. Go to **Storage → Rules**
2. Copy the contents of `firebase-rules-storage.txt`
3. Paste into the Rules editor
4. Click **"Publish"**

### STEP 10: Test Your Setup (2 min)

1. **Refresh the admin dashboard**: `http://localhost:8000/admin-new.html`
2. **Login** with your admin credentials
   - Email: `admin@v2tgroups.com`
   - Password: (your password)
3. **Upload a test image**:
   - Select category (Art/Events/Interior)
   - Add title and description
   - Select an image (JPG, PNG, or WebP)
   - Click **"Upload Image"**
4. **Verify** the image:
   - Should appear in the gallery table
   - Should be stored in Firebase Storage
   - Should be in Firestore database

---

## 🎯 Quick Checklist

```
SETUP CHECKLIST:

Firebase Console
- [ ] Created Firebase project
- [ ] Got Web app credentials
- [ ] Enabled Firestore (Test mode)
- [ ] Enabled Storage (Test mode)  
- [ ] Enabled Authentication
- [ ] Created admin user in Authentication
- [ ] Created admins collection in Firestore
- [ ] Added admin role to admins collection
- [ ] Deployed Firestore security rules
- [ ] Deployed Storage security rules

Configuration
- [ ] Updated js/env.js with credentials
- [ ] Saved js/env.js
- [ ] Refreshed browser

Testing
- [ ] Admin dashboard loads without errors
- [ ] Can login with admin credentials
- [ ] Can upload an image
- [ ] Image appears in gallery table
- [ ] Image visible in Firebase Storage
- [ ] Image document in Firestore galleries
```

---

## 🆘 Troubleshooting

### "Firebase credentials not configured"
**Problem:** Browser console shows error about missing credentials  
**Solution:** 
1. Check `js/env.js` has real credentials (not "your_api_key_here")
2. Refresh the browser (`Ctrl+R`)
3. Check browser console for `[V2T]` logs

### "Auth service failed to initialize"
**Problem:** Can't see admin dashboard  
**Solution:**
1. Verify credentials in `js/env.js` are correct
2. Check Firebase Authentication is enabled
3. Refresh page and check console for errors

### "Access denied: Admin role required"
**Problem:** Login shows this error  
**Solution:**
1. Verify user exists in **Authentication**
2. Verify user is in **Firestore → admins** collection
3. Verify `role: "admin"` field exists in admin document

### "File too large / Invalid file type"
**Problem:** Can't upload image  
**Solution:**
1. Check file is JPG, PNG, or WebP
2. Check file size is under 5MB
3. Try a different image file

### "Permission denied" in Console
**Problem:** Error when uploading or deleting  
**Solution:**
1. Check Storage rules are deployed
2. Check Firestore rules are deployed  
3. Verify you're logged in as admin
4. Check Security Rules in Firebase Console

### "Images not showing in gallery"
**Problem:** Upload works but images don't appear  
**Solution:**
1. Check Firestore → galleries collection has items
2. Check items have `active: true`
3. Check image URL is accessible
4. Check Firestore rules allow public read

---

## 🔐 Important Security Notes

### Development vs Production

**Test Mode** (Development):
- Anyone can read/write
- Use only for testing locally
- ❌ DO NOT use for production

**Production Mode**:
- Use the provided security rules
- Only admin can write
- Public can read active galleries only
- ✅ Safe for production

### Environment Variables

**js/env.js** contains sensitive credentials:
- ❌ DO NOT commit to git
- ❌ DO NOT share publicly
- ✅ Keep in `.gitignore`
- ✅ Create locally for each environment

---

## 📱 Next Steps After Setup

### 1. Test Admin Dashboard
- Upload some test images
- Edit titles and descriptions
- Try deleting images
- Verify everything works

### 2. Update Gallery Pages
Current pages (art.html, event.html, interior.html) show hardcoded images.

To make them dynamic, see:
→ **FIREBASE_IMPLEMENTATION_GUIDE.md** (Section: "Gallery Pages")

### 3. Switch to Production Mode
When ready for production:
1. Go to Firestore → Rules
2. Change from Test mode to:
   ```
   match /galleries/{document=**} {
     allow read: if resource.data.active == true;
     allow write: if request.auth.uid != null;
   }
   ```

### 4. Monitor Usage
- **Firebase Console → Settings → Usage**
- Track read/write operations
- Monitor storage usage
- Set up alerts if needed

---

## 💡 Common Questions

**Q: Can I use this with multiple admin users?**  
A: Yes! Create more users in Authentication and add them to the admins collection.

**Q: How many images can I store?**  
A: Unlimited! Firebase scales automatically.

**Q: What's the cost?**  
A: Free tier covers most hobby projects. Check [Firebase Pricing](https://firebase.google.com/pricing).

**Q: Can I backup my data?**  
A: Yes, Firestore has automatic daily backups. You can also export manually.

**Q: How do I update the website code?**  
A: Edit HTML/CSS/JS files and refresh. No deployment needed (it's static).

---

## 📚 Helpful Resources

- **Firebase Console**: https://console.firebase.google.com/
- **Firebase Documentation**: https://firebase.google.com/docs
- **Firestore Guide**: https://firebase.google.com/docs/firestore
- **Storage Guide**: https://firebase.google.com/docs/storage
- **Security Rules**: https://firebase.google.com/docs/rules

---

## ✅ You're Ready!

Once you complete the 10 steps above, your website will be:

✅ **Dynamic** - Images load from Firebase  
✅ **Secure** - Admin authentication required  
✅ **Scalable** - Handles unlimited images  
✅ **Real-time** - Updates instantly  
✅ **Professional** - Enterprise-grade backend  

**Estimated setup time: 30-40 minutes**

---

**Questions?** Check the console logs for `[V2T]` messages that indicate what's happening.

**All set?** Go to `http://localhost:8000/admin-new.html` and login!
