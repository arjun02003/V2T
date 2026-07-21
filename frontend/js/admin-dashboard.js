/**
 * V2T GROUPS - Admin Dashboard Script
 * Handles authentication, gallery management, and CRUD operations
 */

class AdminDashboard {
  constructor() {
    this.currentCategory = 'art';
    this.currentUser = null;
    this.galleries = [];
    this.listeners = {};
    this.isUploadingPhoto = false;

    this.cacheDOM();
    this.bindEvents();
    this.initServices();
  }

  cacheDOM() {
    // Login
    this.loginContainer = document.getElementById('loginContainer') || document.getElementById('login-container');
    this.adminContent = document.getElementById('adminContent') || document.getElementById('admin-dashboard');
    this.loginForm = document.getElementById('loginForm') || document.getElementById('login-form');
    this.loginError = document.getElementById('loginError');
    this.loginBtn = document.getElementById('loginBtn') || this.loginForm?.querySelector('button[type="submit"]');

    // Admin
    this.logoutBtn = document.getElementById('logoutBtn') || document.getElementById('btn-logout');
    this.categoryBtns = document.querySelectorAll('.category-btn');
    
    // Upload
    this.uploadForm = document.getElementById('uploadForm');
    this.uploadBtn = document.getElementById('uploadBtn');
    this.imageFileInput = document.getElementById('imageFile');
    this.titleInput = document.getElementById('title');
    this.descriptionInput = document.getElementById('description');
    this.orderInput = document.getElementById('order');
    this.fileNameDisplay = document.getElementById('fileName');
    this.uploadProgress = document.getElementById('uploadProgress');
    this.progressFill = this.uploadProgress?.querySelector('.progress-fill') || null;

    // Gallery Table
    this.galleryTableBody = document.getElementById('galleryTableBody');
    
    // Messages
    this.successMessage = document.getElementById('successMessage');
  }

  bindEvents() {
    // Login
    this.loginForm?.addEventListener('submit', (e) => this.handleLogin(e));
    this.logoutBtn?.addEventListener('click', () => this.handleLogout());

    // Categories
    if (this.categoryBtns && this.categoryBtns.length > 0) {
      this.categoryBtns.forEach(btn => {
        btn.addEventListener('click', (e) => this.switchCategory(e.target.dataset.category));
      });
    }

    // Upload
    this.uploadForm?.addEventListener('submit', (e) => this.handleUpload(e));
    this.imageFileInput?.addEventListener('change', (e) => this.handleFileSelect(e));

    // Drag and drop
    const fileLabel = document.querySelector('.file-input-label');
    if (fileLabel && this.imageFileInput) {
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileLabel.addEventListener(eventName, (e) => e.preventDefault());
      });
      fileLabel.addEventListener('drop', (e) => {
        this.imageFileInput.files = e.dataTransfer.files;
        this.handleFileSelect({ target: this.imageFileInput });
      });
    }
  }

  async initServices() {
    try {
      console.log('[Admin] Initializing backend auth services...');

      const token = localStorage.getItem('auth_token');
      if (token) {
        window.apiClient.token = token;
        try {
          await window.apiClient.verifyToken();
          this.showAdminPanel();
          this.loadGalleries();
          return;
        } catch (verifyError) {
          console.warn('[Admin] Token verification failed:', verifyError);
          window.apiClient.logout();
        }
      }

      this.showLoginPanel();
      console.log('[Admin] Backend auth initialized ✅');
    } catch (error) {
      console.error('[Admin] Init error:', error);
      this.showLoginError(error.message || 'Failed to initialize. Check console for details.');
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    this.loginError?.classList.remove('show');

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const email = emailInput?.value.trim() || '';
    const password = passwordInput?.value || '';

    if (!email || !password) {
      this.showLoginError('Please enter email and password');
      return;
    }

    this.loginBtn.disabled = true;
    const originalText = this.loginBtn.textContent;
    this.loginBtn.innerHTML = '<span class="loading-spinner"></span>Signing in...';

    try {
      const data = await window.apiClient.login(email, password);
      console.log('[Admin] Login successful:', data);
      if (!data.token) {
        throw new Error('Login succeeded but no token was returned');
      }
      this.loginForm.reset();
      this.showAdminPanel();
      this.loadGalleries();
    } catch (error) {
      console.error('[Admin] Login error:', error);
      this.showLoginError(error.message || 'Login failed');
    } finally {
      this.loginBtn.disabled = false;
      this.loginBtn.textContent = originalText;
    }
  }

  async handleLogout() {
    if (!confirm('Are you sure you want to sign out?')) {
      return;
    }

    try {
      window.apiClient.logout();
      this.unsubscribeAllListeners?.();
      this.showLoginPanel();
      console.log('[Admin] Logout successful');
    } catch (error) {
      console.error('[Admin] Logout error:', error);
      this.showError('Failed to sign out');
    }
  }

  showAdminPanel() {
    this.loginContainer.style.display = 'none';
    this.adminContent.classList.add('authenticated');
  }

  showLoginPanel() {
    this.loginContainer.style.display = 'flex';
    this.adminContent.classList.remove('authenticated');
  }

  showLoginError(message) {
    this.loginError.textContent = message;
    this.loginError.classList.add('show');
  }

  showError(message) {
    console.error('[Admin] Error:', message);
    // Could show error toast here
  }

  showSuccess(message) {
    this.successMessage.textContent = message;
    this.successMessage.classList.add('show');
    setTimeout(() => {
      this.successMessage.classList.remove('show');
    }, 3000);
  }

  switchCategory(category) {
    this.currentCategory = category;
    
    // Update active button
    this.categoryBtns.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.category === category) {
        btn.classList.add('active');
      }
    });

    // Reset form
    this.uploadForm.reset();
    this.fileNameDisplay.textContent = '';

    // Load galleries
    this.loadGalleries();
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) {
      this.fileNameDisplay.textContent = '';
      return;
    }

    try {
      window.storageService.validateFile(file);
      this.fileNameDisplay.textContent = `✅ ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
    } catch (error) {
      this.fileNameDisplay.textContent = `❌ ${error.message}`;
      this.imageFileInput.value = '';
    }
  }

  async handleUpload(e) {
    e.preventDefault();

    if (this.isUploadingPhoto) {
      return;
    }

    const file = this.imageFileInput.files[0];
    const title = this.titleInput.value.trim();
    const description = this.descriptionInput.value.trim();
    const order = parseInt(this.orderInput.value) || 0;

    if (!file || !title) {
      this.showError('Please select image and enter title');
      return;
    }

    this.isUploadingPhoto = true;
    this.uploadBtn.disabled = true;
    this.uploadProgress?.classList.add('active');
    if (this.progressFill) {
      this.progressFill.style.width = '0%';
    }

    try {
      // Upload image
      console.log('[Admin] Uploading image...');
      const { url, path } = await window.storageService.uploadImage(
        file,
        this.currentCategory,
        (progress) => {
          if (this.progressFill) {
            this.progressFill.style.width = progress + '%';
          }
        }
      );

      // Create gallery item
      const galleryData = {
        title,
        description,
        category: this.currentCategory,
        imageUrl: url,
        storagePath: path,
        order,
        active: true
      };

      await window.firestoreService.createGallery(galleryData);
      
      console.log('[Admin] Gallery item created');
      this.showSuccess('✅ Image uploaded and gallery item created!');
      this.uploadForm.reset();
      this.fileNameDisplay.textContent = '';
      this.uploadProgress.classList.remove('active');
      this.loadGalleries();
    } catch (error) {
      console.error('[Admin] Upload error:', error);
      this.showError(error.message);
    } finally {
      this.isUploadingPhoto = false;
      this.uploadBtn.disabled = false;
      this.uploadProgress.classList.remove('active');
    }
  }

  async loadGalleries() {
    try {
      // Unsubscribe from previous listener
      if (this.listeners[this.currentCategory]) {
        this.listeners[this.currentCategory]();
      }

      // Subscribe to real-time updates
      this.listeners[this.currentCategory] = window.firestoreService.onGalleriesByCategory(
        this.currentCategory,
        (galleries) => {
          this.galleries = galleries;
          this.renderGalleryTable();
        }
      );
    } catch (error) {
      console.error('[Admin] Load galleries error:', error);
      this.showError('Failed to load galleries');
    }
  }

  renderGalleryTable() {
    if (!this.galleryTableBody) return;
    if (!this.galleries || this.galleries.length === 0) {
      this.galleryTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--neon-magenta);">
            No items in this category yet
          </td>
        </tr>
      `;
      return;
    }

    this.galleryTableBody.innerHTML = this.galleries.map(item => `
      <tr>
        <td>
          <img src="${this.escapeHtml(item.imageUrl)}" alt="${this.escapeHtml(item.title)}" class="gallery-img-thumb">
        </td>
        <td>${this.escapeHtml(item.title)}</td>
        <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(item.description || 'N/A')}</td>
        <td>${item.order}</td>
        <td>${new Date(item.createdAt?.toDate?.() || 0).toLocaleDateString()}</td>
        <td>
          <div class="action-btns">
            <button class="edit-btn" onclick="adminDashboard.editItem('${this.escapeHtml(item.id)}')">Edit</button>
            <button class="delete-btn" onclick="adminDashboard.deleteItem('${this.escapeHtml(item.id)}', '${this.escapeHtml(item.storagePath)}')">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  async editItem(itemId) {
    const item = this.galleries.find(g => g.id === itemId);
    if (!item) return;

    const newTitle = prompt('Edit title:', item.title);
    if (!newTitle) return;

    const newDescription = prompt('Edit description:', item.description || '');
    const newOrder = prompt('Edit order:', item.order);

    try {
      await window.firestoreService.updateGallery(itemId, {
        title: newTitle,
        description: newDescription,
        order: parseInt(newOrder) || 0
      });
      this.showSuccess('✅ Item updated successfully');
    } catch (error) {
      console.error('[Admin] Edit error:', error);
      this.showError('Failed to update item');
    }
  }

  async deleteItem(itemId, storagePath) {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete from storage
      if (storagePath) {
        await window.storageService.deleteImage(storagePath);
      }

      // Delete from Firestore
      await window.firestoreService.permanentlyDeleteGallery(itemId);
      this.showSuccess('✅ Item deleted successfully');
    } catch (error) {
      console.error('[Admin] Delete error:', error);
      this.showError('Failed to delete item');
    }
  }

  unsubscribeAllListeners() {
    Object.values(this.listeners).forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.listeners = {};
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.adminDashboard = new AdminDashboard();
  console.log('[Admin] Dashboard initialized ✅');
});
