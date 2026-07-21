// Firebase Connection Configuration (with Firestore & Storage)
// SECURITY: Load from environment variables, NOT hardcoded values
// See .env.js for setup instructions

// Try to load from .env.js first (for static sites)
window.FIREBASE_CONFIG = {
  apiKey: typeof window.FIREBASE_API_KEY !== 'undefined' ? window.FIREBASE_API_KEY : undefined,
  authDomain: typeof window.FIREBASE_AUTH_DOMAIN !== 'undefined' ? window.FIREBASE_AUTH_DOMAIN : undefined,
  databaseURL: typeof window.FIREBASE_DATABASE_URL !== 'undefined' ? window.FIREBASE_DATABASE_URL : undefined,
  projectId: typeof window.FIREBASE_PROJECT_ID !== 'undefined' ? window.FIREBASE_PROJECT_ID : undefined,
  storageBucket: typeof window.FIREBASE_STORAGE_BUCKET !== 'undefined' ? window.FIREBASE_STORAGE_BUCKET : undefined,
  messagingSenderId: typeof window.FIREBASE_MESSAGING_SENDER_ID !== 'undefined' ? window.FIREBASE_MESSAGING_SENDER_ID : undefined,
  appId: typeof window.FIREBASE_APP_ID !== 'undefined' ? window.FIREBASE_APP_ID : undefined
};

// Warn if config is incomplete
if (!window.FIREBASE_CONFIG.apiKey) {
  console.error("[V2T] ❌ Firebase credentials not configured!");
  console.error("[V2T] Please create js/env.js with your Firebase credentials. See js/env.example.js");
}

// Global Firebase instances (initialized after page load)
window.firebaseApp = null;
window.firebaseAuth = null;
window.firebaseDb = null;
window.firebaseStorage = null;

// Check configuration status
function checkFirebaseConfig() {
  const config = window.FIREBASE_CONFIG;
  
  if (!config) {
    console.error('%c[V2T] ❌ FIREBASE_CONFIG not found!', 'color: #ff0088; font-weight: bold;');
    return false;
  }

  if (!config.apiKey || config.apiKey.includes('your_')) {
    console.error('%c[V2T] ❌ Firebase credentials not configured', 'color: #ff0088; font-weight: bold;');
    console.error('[V2T] Please edit js/env.js with your Firebase credentials');
    console.error('[V2T] See SETUP_GUIDE.md for instructions');
    return false;
  }

  return true;
}

// Initialize Firebase when ready
if (window.firebase && checkFirebaseConfig()) {
  try {
    if (!window.firebase.apps.length) {
      window.firebaseApp = window.firebase.initializeApp(window.FIREBASE_CONFIG);
      window.firebaseAuth = window.firebase.auth();
      window.firebaseDb = window.firebase.firestore();
      window.firebaseStorage = window.firebase.storage();
      
      // Enable offline persistence for Firestore
      window.firebaseDb.enablePersistence()
        .catch(err => console.warn("[V2T] Firestore offline persistence unavailable:", err));
      
      console.log("%c[V2T] Firebase initialized with Firestore & Storage ✅", "color: #00f0ff; font-weight: bold;");
    }
  } catch (e) {
    console.error("[V2T] Firebase initialization failed:", e);
  }
} else {
  console.warn("%c[V2T] ⚠️ Firebase not initialized - check credentials in js/env.js", "color: #ffaa00; font-weight: bold;");
}
