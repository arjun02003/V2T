/**
 * V2T GROUPS - Updated Admin Dashboard
 * Integrated with Node.js + PostgreSQL Backend
 */

class AdminDashboard {
  constructor() {
    this.currentCategory = 'art';
    this.currentUser = null;
    this.galleries = [];
    this.isUploadingPhoto = false;
    this.uploadingFile = null;

    this.cacheDOM();
    this.bindEvents();
    this.checkAuth();
  }

  cacheDOM() {
    // Login
    this.loginContainer = document.getElementById('login-container');
    this.loginForm = document.getElementById('login-form');
    this.loginError = document.getElementById('loginError');
    this.loginUsername = document.getElementById('login-username');
    this.loginPassword = document.getElementById('login-password');

    // Admin
    this.adminDashboard = document.getElementById('admin-dashboard');
    this.adminActions = document.getElementById('admin-actions');
    this.logoutBtn = document.getElementById('btn-logout');
    
    // Tabs
    this.categoryBtns = document.querySelectorAll('.admin-tab-btn');
    
    // Upload
    this.uploadForm = document.getElementById('admin-upload-form');
    this.uploadBtn = document.getElementById('btn-submit-upload');
    this.fileInput = document.getElementById('input-file');
    this.dropzone = document.getElementById('dropzone');
    this.dropzoneText = document.getElementById('dropzone-text');
    this.previewContainer = document.getElementById('preview-container');
    this.previewImg = document.getElementById('preview-img');
    this.titleInput = document.getElementById('input-title');
    this.priceInput = document.getElementById('input-price');
    this.descInput = document.getElementById('input-desc');

    // Gallery Table
    this.galleryTableBody = document.getElementById('admin-items-list');
  }

  bindEvents() {
    // Login
    this.loginForm?.addEventListener('submit', (e) => this.handleLogin(e));
    this.logoutBtn?.addEventListener('click', () => this.handleLogout());

    // Categories
    this.categoryBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchCategory(e.target.dataset.category);
      });
    });

    // Upload
    this.uploadForm?.addEventListener('submit', (e) => this.handleUpload(e));
    this.fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));

    // Drag and drop
    this.dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropzone.style.borderColor = 'var(--neon-cyan)';
    });

    this.dropzone?.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.dropzone.style.borderColor = '';
    });

    this.dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropzone.style.borderColor = '';
      this.fileInput.files = e.dataTransfer.files;
      this.handleFileSelect({ target: this.fileInput });
    });

    this.dropzone?.addEventListener('click', () => this.fileInput?.click());
  }

  /**
   * Check authentication status
   */
  async checkAuth() {
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      try {
        await window.apiClient.verifyToken();
        this.showDashboard();
        await this.loadGallery(this.currentCategory);
      } catch (error) {
        console.log('Token invalid, showing login');
        this.showLogin();
      }
    } else {
      this.showLogin();
    }
  }

  /**
   * Handle login
   */
  async handleLogin(e) {
    e.preventDefault();

    const username = this.loginUsername.value.trim();
    const password = this.loginPassword.value.trim();

    if (!username || !password) {
      this.showError('Please enter username and password');
      return;
    }

    try {
      this.showLoading('Authenticating...');
      const result = await window.apiClient.login(username, password);
      
      this.showSuccess('✅ Login successful!');
      this.currentUser = result.user;
      
      setTimeout(() => {
        this.showDashboard();
        this.loadGallery(this.currentCategory);
      }, 500);
    } catch (error) {
      this.showError('❌ ' + error.message);
    }
  }

  /**
   * Handle logout
   */
  handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
      window.apiClient.logout();
      this.currentUser = null;
      this.showLogin();
      this.showSuccess('✅ Logged out successfully');
    }
  }

  /**
   * Switch category
   */
  async switchCategory(category) {
    this.currentCategory = category;
    
    // Update active button
    this.categoryBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });

    // Clear form
    this.uploadForm?.reset();
    this.previewContainer.style.display = 'none';
    this.dropzoneText.style.display = 'block';

    // Load gallery
    await this.loadGallery(category);
  }

  /**
   * Load gallery items
   */
  async loadGallery(category) {
    try {
      const result = await window.apiClient.getGallery(category, true);
      this.galleries = result.data || [];
      this.renderGalleryTable();
    } catch (error) {
      this.showError('Failed to load gallery: ' + error.message);
    }
  }

  /**
   * Handle file select
   */
  handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.showError('Please select an image file');
      this.fileInput.value = '';
      return;
    }

    this.uploadingFile = file;

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      this.previewImg.src = event.target.result;
      this.previewContainer.style.display = 'block';
      this.dropzoneText.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  /**
   * Handle upload
   */
  async handleUpload(e) {
    e.preventDefault();

    if (!this.uploadingFile) {
      this.showError('Please select an image file');
      return;
    }

    const title = this.titleInput.value.trim();
    const price = this.priceInput.value.trim();
    const desc = this.descInput.value.trim();

    if (!title || !price || !desc) {
      this.showError('Please fill in all fields');
      return;
    }

    try {
      this.showLoading('Uploading image...');

      // Upload file first
      const uploadResult = await window.apiClient.uploadFile(this.uploadingFile);
      const imageUrl = uploadResult.file.url;

      this.showLoading('Saving to database...');

      // Create gallery item
      const galleryItem = await window.apiClient.createGalleryItem({
        title,
        description: desc,
        category: this.currentCategory,
        price,
        image_url: imageUrl,
        file_path: uploadResult.file.path
      });

      this.showSuccess('✅ Item added successfully!');

      // Reset form
      this.uploadForm.reset();
      this.previewContainer.style.display = 'none';
      this.dropzoneText.style.display = 'block';
      this.uploadingFile = null;

      // Reload gallery
      await this.loadGallery(this.currentCategory);
    } catch (error) {
      this.showError('❌ Upload failed: ' + error.message);
    }
  }

  /**
   * Delete gallery item
   */
  async deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      this.showLoading('Deleting...');
      await window.apiClient.deleteGalleryItem(id);
      this.showSuccess('✅ Item deleted successfully!');
      await this.loadGallery(this.currentCategory);
    } catch (error) {
      this.showError('❌ Delete failed: ' + error.message);
    }
  }

  /**
   * Render gallery table
   */
  renderGalleryTable() {
    if (this.galleries.length === 0) {
      this.galleryTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 30px; color: var(--text-secondary);">
            No items in this category yet
          </td>
        </tr>
      `;
      return;
    }

    this.galleryTableBody.innerHTML = this.galleries.map(item => `
      <tr>
        <td>
          <img src="${item.image_url}" alt="${item.title}" 
               style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;">
        </td>
        <td>
          <div style="font-weight: 500;">${item.title}</div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
            ${item.description.substring(0, 100)}...
          </div>
        </td>
        <td><span class="badge" style="background: var(--bg-secondary); padding: 4px 8px; border-radius: 3px;">
          ${item.category.toUpperCase()}
        </span></td>
        <td>${item.price}</td>
        <td style="text-align: right;">
          <button onclick="window.adminDashboard.deleteItem(${item.id})" 
                  class="btn-delete" style="padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">
            DELETE
          </button>
        </td>
      </tr>
    `).join('');
  }

  /**
   * Show UI messages
   */
  showLogin() {
    this.loginContainer.style.display = 'block';
    this.adminDashboard.style.display = 'none';
    this.adminActions.style.display = 'none';
  }

  showDashboard() {
    this.loginContainer.style.display = 'none';
    this.adminDashboard.style.display = 'block';
    this.adminActions.style.display = 'flex';
  }

  showLoading(message = 'Loading...') {
    alert(message);
  }

  showError(message) {
    console.error(message);
    alert('❌ ' + message);
  }

  showSuccess(message) {
    console.log(message);
    alert(message);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.adminDashboard = new AdminDashboard();
});
