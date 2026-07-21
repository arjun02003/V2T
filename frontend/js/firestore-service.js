/**
 * V2T GROUPS - Firestore Service Module
 * Handles all Firestore operations: CRUD, queries, real-time listeners
 * Database Schema:
 * - Collection: "galleries"
 *   - Document: {id, title, description, category, imageUrl, storagePath, createdAt, updatedAt, order, active}
 */

class FirestoreService {
  constructor() {
    this.db = null;
    this.initialized = false;
    this.listeners = []; // Track active listeners for cleanup
  }

  /**
   * Initialize Firestore connection
   */
  async init() {
    return new Promise((resolve, reject) => {
      if (this.initialized && this.db) {
        resolve();
        return;
      }

      if (!window.firebaseDb) {
        reject(new Error('[V2T] Firebase Firestore not available'));
        return;
      }

      this.db = window.firebaseDb;
      this.initialized = true;
      console.log('%c[Firestore] Service initialized ✅', 'color: #00f0ff; font-weight: bold;');
      resolve();
    });
  }

  /**
   * Create new gallery item
   */
  async createGallery(data) {
    if (!this.db) throw new Error('Firestore not initialized');

    const timestamp = new Date();
    const document = {
      title: data.title?.trim() || '',
      description: data.description?.trim() || '',
      category: data.category?.toLowerCase() || '',
      imageUrl: data.imageUrl || '',
      storagePath: data.storagePath || '',
      createdAt: timestamp,
      updatedAt: timestamp,
      order: data.order || 999,
      active: true
    };

    // Validate required fields
    if (!document.title) throw new Error('Title is required');
    if (!document.category) throw new Error('Category is required');
    if (!document.imageUrl) throw new Error('Image URL is required');

    try {
      const docRef = await this.db.collection('galleries').add(document);
      console.log(`%c[Firestore] Gallery created: ${docRef.id}`, 'color: #00ff88;');
      return { id: docRef.id, ...document };
    } catch (error) {
      console.error('[Firestore] Create error:', error);
      throw new Error(`Failed to create gallery: ${error.message}`);
    }
  }

  /**
   * Get gallery item by ID
   */
  async getGallery(id) {
    if (!this.db) throw new Error('Firestore not initialized');

    try {
      const doc = await this.db.collection('galleries').doc(id).get();
      if (!doc.exists) {
        throw new Error('Gallery not found');
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('[Firestore] Get error:', error);
      throw error;
    }
  }

  /**
   * Get all galleries by category
   */
  async getGalleriesByCategory(category) {
    if (!this.db) throw new Error('Firestore not initialized');

    try {
      const snapshot = await this.db
        .collection('galleries')
        .where('category', '==', category.toLowerCase())
        .where('active', '==', true)
        .orderBy('order', 'asc')
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('[Firestore] Query error:', error);
      throw error;
    }
  }

  /**
   * Get all galleries with pagination
   */
  async getAllGalleries(limit = 50, startAfter = null) {
    if (!this.db) throw new Error('Firestore not initialized');

    try {
      let query = this.db
        .collection('galleries')
        .where('active', '==', true)
        .orderBy('order', 'asc')
        .orderBy('createdAt', 'desc')
        .limit(limit);

      if (startAfter) {
        query = query.startAfter(startAfter);
      }

      const snapshot = await query.get();
      const galleries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

      return { galleries, lastVisible, hasMore: galleries.length === limit };
    } catch (error) {
      console.error('[Firestore] Pagination query error:', error);
      throw error;
    }
  }

  /**
   * Update gallery item
   */
  async updateGallery(id, updates) {
    if (!this.db) throw new Error('Firestore not initialized');

    const updateData = {
      ...updates,
      updatedAt: new Date()
    };

    try {
      await this.db.collection('galleries').doc(id).update(updateData);
      console.log(`%c[Firestore] Gallery updated: ${id}`, 'color: #00ff88;');
      return { id, ...updateData };
    } catch (error) {
      console.error('[Firestore] Update error:', error);
      throw new Error(`Failed to update gallery: ${error.message}`);
    }
  }

  /**
   * Delete gallery item (soft delete)
   */
  async deleteGallery(id) {
    if (!this.db) throw new Error('Firestore not initialized');

    try {
      await this.db.collection('galleries').doc(id).update({
        active: false,
        updatedAt: new Date()
      });
      console.log(`%c[Firestore] Gallery deleted: ${id}`, 'color: #ff007f;');
      return true;
    } catch (error) {
      console.error('[Firestore] Delete error:', error);
      throw new Error(`Failed to delete gallery: ${error.message}`);
    }
  }

  /**
   * Permanently delete gallery item
   */
  async permanentlyDeleteGallery(id) {
    if (!this.db) throw new Error('Firestore not initialized');

    try {
      await this.db.collection('galleries').doc(id).delete();
      console.log(`%c[Firestore] Gallery permanently deleted: ${id}`, 'color: #ff007f;');
      return true;
    } catch (error) {
      console.error('[Firestore] Permanent delete error:', error);
      throw error;
    }
  }

  /**
   * Search galleries by title or description
   */
  async searchGalleries(searchTerm, category = null) {
    if (!this.db) throw new Error('Firestore not initialized');

    try {
      let query = this.db
        .collection('galleries')
        .where('active', '==', true);

      if (category) {
        query = query.where('category', '==', category.toLowerCase());
      }

      const snapshot = await query.get();
      const searchLower = searchTerm.toLowerCase();

      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item =>
          item.title.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower)
        )
        .sort((a, b) => a.order - b.order);
    } catch (error) {
      console.error('[Firestore] Search error:', error);
      throw error;
    }
  }

  /**
   * Real-time listener for category
   * Calls callback whenever data changes
   */
  onGalleriesByCategory(category, callback) {
    if (!this.db) {
      console.error('[Firestore] Not initialized');
      return () => {}; // Return empty unsubscribe function
    }

    try {
      const unsubscribe = this.db
        .collection('galleries')
        .where('category', '==', category.toLowerCase())
        .where('active', '==', true)
        .orderBy('order', 'asc')
        .orderBy('createdAt', 'desc')
        .onSnapshot(
          snapshot => {
            const galleries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(galleries, null);
          },
          error => {
            console.error('[Firestore] Real-time listener error:', error);
            callback(null, error);
          }
        );

      // Track listener for cleanup
      this.listeners.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('[Firestore] Listener setup error:', error);
      throw error;
    }
  }

  /**
   * Batch update gallery order
   */
  async updateGalleryOrder(updates) {
    if (!this.db) throw new Error('Firestore not initialized');

    try {
      const batch = this.db.batch();
      updates.forEach(({ id, order }) => {
        batch.update(this.db.collection('galleries').doc(id), {
          order,
          updatedAt: new Date()
        });
      });
      await batch.commit();
      console.log('%c[Firestore] Batch order updated ✅', 'color: #00ff88;');
      return true;
    } catch (error) {
      console.error('[Firestore] Batch update error:', error);
      throw error;
    }
  }

  /**
   * Clean up all listeners
   */
  cleanup() {
    this.listeners.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (e) {
        console.warn('[Firestore] Listener cleanup error:', e);
      }
    });
    this.listeners = [];
    console.log('%c[Firestore] Listeners cleaned up', 'color: #9d00ff;');
  }

  /**
   * Check if user is admin
   */
  async isAdmin(userId) {
    if (!this.db) throw new Error('Firestore not initialized');

    try {
      const doc = await this.db.collection('admins').doc(userId).get();
      return doc.exists && doc.data().role === 'admin';
    } catch (error) {
      console.error('[Firestore] Admin check error:', error);
      return false;
    }
  }
}

// Global Firestore Service Instance
window.firestoreService = new FirestoreService();
