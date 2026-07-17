/**
 * V2T GROUPS - Firebase Authentication Service Module
 * Handles admin authentication and authorization
 */

class AuthService {
  constructor() {
    this.auth = null;
    this.initialized = false;
    this.currentUser = null;
    this.authStateListeners = [];
  }

  /**
   * Initialize Auth connection
   */
  async init() {
    return new Promise((resolve, reject) => {
      if (this.initialized && this.auth) {
        resolve();
        return;
      }

      // Check if Firebase is available
      if (!window.firebase) {
        reject(new Error('[Auth] Firebase SDK not loaded'));
        return;
      }

      // Check if credentials are configured
      if (!window.FIREBASE_CONFIG?.apiKey || window.FIREBASE_CONFIG.apiKey.includes('your_')) {
        console.error('[Auth] ❌ Firebase credentials not configured in js/env.js');
        console.error('[Auth] See SETUP_GUIDE.md for instructions');
        reject(new Error('[Auth] Firebase credentials missing. Check js/env.js'));
        return;
      }

      if (!window.firebaseAuth) {
        console.error('[Auth] ❌ Firebase Auth not available');
        console.error('[Auth] Check that firebase-firestore-compat.js was loaded');
        reject(new Error('[Auth] Firebase Auth not available'));
        return;
      }

      this.auth = window.firebaseAuth;
      this.initialized = true;

      // Listen for auth state changes
      this.auth.onAuthStateChanged(
        user => {
          this.currentUser = user;
          console.log('[Auth] State changed:', user?.uid || 'logged out');
          this.notifyListeners(user);
        },
        error => {
          console.error('[Auth] State listener error:', error);
        }
      );

      console.log('%c[Auth] Service initialized ✅', 'color: #00f0ff; font-weight: bold;');
      resolve();
    });
  }

  /**
   * Sign up new admin user
   */
  async signUp(email, password) {
    if (!this.auth) throw new Error('Auth not initialized');

    if (!email || !password) {
      throw new Error('Email and password required');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    try {
      const result = await this.auth.createUserWithEmailAndPassword(email, password);
      console.log(`%c[Auth] User signed up: ${email}`, 'color: #00ff88;');
      
      // Add admin role in Firestore
      await window.firestoreService.init();
      await window.firebaseDb.collection('admins').doc(result.user.uid).set({
        email,
        role: 'admin',
        createdAt: new Date()
      });

      return result.user;
    } catch (error) {
      console.error('[Auth] Sign up error:', error);
      throw new Error(`Sign up failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Sign in admin user
   */
  async signIn(email, password) {
    if (!this.auth) throw new Error('Auth not initialized');

    if (!email || !password) {
      throw new Error('Email and password required');
    }

    try {
      const result = await this.auth.signInWithEmailAndPassword(email, password);
      
      // Verify admin role
      const isAdmin = await window.firestoreService.isAdmin(result.user.uid);
      if (!isAdmin) {
        await this.auth.signOut();
        throw new Error('Access denied: Admin role required');
      }

      console.log(`%c[Auth] User signed in: ${email}`, 'color: #00ff88;');
      return result.user;
    } catch (error) {
      console.error('[Auth] Sign in error:', error);
      throw new Error(`Sign in failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Sign out current user
   */
  async signOut() {
    if (!this.auth) throw new Error('Auth not initialized');

    try {
      await this.auth.signOut();
      console.log('%c[Auth] User signed out', 'color: #ff007f;');
      return true;
    } catch (error) {
      console.error('[Auth] Sign out error:', error);
      throw error;
    }
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return !!this.currentUser;
  }

  /**
   * Check if user is admin
   */
  async isAdmin() {
    if (!this.currentUser) {
      return false;
    }

    try {
      return await window.firestoreService.isAdmin(this.currentUser.uid);
    } catch (error) {
      console.error('[Auth] Admin check error:', error);
      return false;
    }
  }

  /**
   * Get auth token
   */
  async getToken() {
    if (!this.currentUser) {
      throw new Error('Not logged in');
    }

    try {
      return await this.currentUser.getIdToken();
    } catch (error) {
      console.error('[Auth] Get token error:', error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email) {
    if (!this.auth) throw new Error('Auth not initialized');

    try {
      await this.auth.sendPasswordResetEmail(email);
      console.log(`%c[Auth] Password reset email sent: ${email}`, 'color: #00ff88;');
      return true;
    } catch (error) {
      console.error('[Auth] Password reset error:', error);
      throw new Error(`Password reset failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword) {
    if (!this.currentUser) throw new Error('Not logged in');

    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    try {
      await this.currentUser.updatePassword(newPassword);
      console.log('%c[Auth] Password updated', 'color: #00ff88;');
      return true;
    } catch (error) {
      console.error('[Auth] Update password error:', error);
      throw new Error(`Password update failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Update user email
   */
  async updateEmail(newEmail) {
    if (!this.currentUser) throw new Error('Not logged in');

    if (!newEmail) {
      throw new Error('Email required');
    }

    try {
      await this.currentUser.updateEmail(newEmail);
      console.log(`%c[Auth] Email updated: ${newEmail}`, 'color: #00ff88;');
      return true;
    } catch (error) {
      console.error('[Auth] Update email error:', error);
      throw new Error(`Email update failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChanged(callback) {
    this.authStateListeners.push(callback);
    // Call immediately with current state
    callback(this.currentUser);
    // Return unsubscribe function
    return () => {
      this.authStateListeners = this.authStateListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners of auth state change
   */
  notifyListeners(user) {
    this.authStateListeners.forEach(callback => {
      try {
        callback(user);
      } catch (error) {
        console.error('[Auth] Listener error:', error);
      }
    });
  }

  /**
   * Convert Firebase error codes to user-friendly messages
   */
  getErrorMessage(error) {
    const errorCode = error.code || '';
    const messages = {
      'auth/user-not-found': 'User not found',
      'auth/wrong-password': 'Wrong password',
      'auth/invalid-email': 'Invalid email address',
      'auth/email-already-in-use': 'Email already registered',
      'auth/weak-password': 'Password is too weak',
      'auth/user-disabled': 'User account is disabled',
      'auth/too-many-requests': 'Too many login attempts. Please try later.',
      'auth/network-request-failed': 'Network error. Check your connection.',
      'auth/operation-not-allowed': 'Operation not allowed',
      'auth/account-exists-with-different-credential': 'Account exists with different credentials'
    };

    return messages[errorCode] || error.message || 'Unknown error occurred';
  }
}

// Global Auth Service Instance
window.authService = new AuthService();
