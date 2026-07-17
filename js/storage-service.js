/**
 * V2T GROUPS - Firebase Storage Service Module
 * Handles image uploads, deletions, and URL management
 * Folder Structure: gallery/{category}/{filename}
 */

class StorageService {
  constructor() {
    this.storage = null;
    this.initialized = false;
    this.validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    this.maxFileSize = 5 * 1024 * 1024; // 5MB
  }

  /**
   * Initialize Storage connection
   */
  async init() {
    return new Promise((resolve, reject) => {
      if (this.initialized && this.storage) {
        resolve();
        return;
      }

      if (!window.firebaseStorage) {
        reject(new Error('[Storage] Firebase Storage not available'));
        return;
      }

      this.storage = window.firebaseStorage;
      this.initialized = true;
      console.log('%c[Storage] Service initialized ✅', 'color: #00f0ff; font-weight: bold;');
      resolve();
    });
  }

  /**
   * Validate image file
   */
  validateFile(file) {
    if (!file) {
      throw new Error('No file selected');
    }

    if (!this.validMimes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPG, PNG, WebP allowed.');
    }

    if (file.size > this.maxFileSize) {
      throw new Error(`File too large. Maximum ${this.maxFileSize / 1024 / 1024}MB allowed.`);
    }

    return true;
  }

  /**
   * Upload image to Firebase Storage
   * @param {File} file - Image file to upload
   * @param {string} category - Gallery category (art, event, interior)
   * @param {Function} onProgress - Progress callback (0-100)
   * @returns {Promise<{url: string, path: string}>}
   */
  async uploadImage(file, category, onProgress = null) {
    if (!this.storage) throw new Error('Storage not initialized');

    // Validate
    this.validateFile(file);

    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 9);
    const filename = `${timestamp}_${random}_${file.name.replace(/\s+/g, '_')}`;
    const storagePath = `gallery/${category}/${filename}`;

    try {
      const storageRef = this.storage.ref(storagePath);
      const uploadTask = storageRef.put(file);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          snapshot => {
            // Progress
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            if (onProgress) {
              onProgress(progress);
            }
            console.log(`[Storage] Upload progress: ${progress}%`);
          },
          error => {
            // Error
            console.error('[Storage] Upload error:', error);
            reject(new Error(`Upload failed: ${error.message}`));
          },
          async () => {
            // Complete
            const url = await uploadTask.snapshot.ref.getDownloadURL();
            console.log(`%c[Storage] Image uploaded: ${storagePath}`, 'color: #00ff88;');
            resolve({ url, path: storagePath });
          }
        );
      });
    } catch (error) {
      console.error('[Storage] Upload error:', error);
      throw error;
    }
  }

  /**
   * Delete image from Firebase Storage
   */
  async deleteImage(storagePath) {
    if (!this.storage) throw new Error('Storage not initialized');

    if (!storagePath) {
      throw new Error('Storage path required');
    }

    try {
      await this.storage.ref(storagePath).delete();
      console.log(`%c[Storage] Image deleted: ${storagePath}`, 'color: #ff007f;');
      return true;
    } catch (error) {
      console.error('[Storage] Delete error:', error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  /**
   * Get download URL for image
   */
  async getDownloadUrl(storagePath) {
    if (!this.storage) throw new Error('Storage not initialized');

    try {
      const url = await this.storage.ref(storagePath).getDownloadURL();
      return url;
    } catch (error) {
      console.error('[Storage] Get URL error:', error);
      throw error;
    }
  }

  /**
   * Replace image (delete old, upload new)
   */
  async replaceImage(oldPath, newFile, category, onProgress = null) {
    if (!this.storage) throw new Error('Storage not initialized');

    try {
      // Upload new image
      const { url, path } = await this.uploadImage(newFile, category, onProgress);

      // Delete old image
      if (oldPath) {
        try {
          await this.deleteImage(oldPath);
        } catch (e) {
          console.warn('[Storage] Old image deletion warning:', e);
          // Continue even if old delete fails
        }
      }

      return { url, path };
    } catch (error) {
      console.error('[Storage] Replace error:', error);
      throw error;
    }
  }

  /**
   * Delete multiple images
   */
  async deleteMultipleImages(paths) {
    if (!this.storage) throw new Error('Storage not initialized');

    const results = {
      successful: [],
      failed: []
    };

    for (const path of paths) {
      try {
        await this.deleteImage(path);
        results.successful.push(path);
      } catch (error) {
        console.error(`[Storage] Failed to delete ${path}:`, error);
        results.failed.push({ path, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get storage stats
   */
  async getStorageStats() {
    if (!this.storage) throw new Error('Storage not initialized');

    try {
      // This requires Firebase Admin SDK, not available in client
      console.warn('[Storage] Storage stats only available via Admin SDK');
      return null;
    } catch (error) {
      console.error('[Storage] Stats error:', error);
      throw error;
    }
  }
}

// Global Storage Service Instance
window.storageService = new StorageService();
