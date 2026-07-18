/**
 * V2T GROUPS - API Client Service
 * Handles all HTTP requests to the backend
 */

class APIClient {
  constructor(baseURL = 'http://localhost:3001/api') {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  /**
   * Get authorization headers
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { 'Authorization': `Bearer ${this.token}` })
    };
  }

  /**
   * Generic fetch wrapper
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options
    };

    try {
      const response = await fetch(url, config);

      // Handle 401 - unauthorized
      if (response.status === 401) {
        this.logout();
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // ========== AUTHENTICATION ==========

  /**
   * Login with username and password
   */
  async login(username, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    if (data.token) {
      this.token = data.token;
      localStorage.setItem('auth_token', data.token);
    }

    return data;
  }

  /**
   * Verify current token
   */
  async verifyToken() {
    return this.request('/auth/verify', { method: 'GET' });
  }

  /**
   * Logout
   */
  logout() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // ========== GALLERY OPERATIONS ==========

  /**
   * Get all items in a category
   */
  async getGallery(category, activeOnly = true) {
    return this.request(`/gallery/${category}?active=${activeOnly}`, { method: 'GET' });
  }

  /**
   * Get single gallery item
   */
  async getGalleryItem(category, id) {
    return this.request(`/gallery/${category}/${id}`, { method: 'GET' });
  }

  /**
   * Create new gallery item
   */
  async createGalleryItem(data) {
    return this.request('/gallery', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Update gallery item
   */
  async updateGalleryItem(id, data) {
    return this.request(`/gallery/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * Delete gallery item
   */
  async deleteGalleryItem(id) {
    return this.request(`/gallery/${id}`, { method: 'DELETE' });
  }

  // ========== FILE UPLOADS ==========

  /**
   * Upload image file
   */
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${this.baseURL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * Delete uploaded file
   */
  async deleteFile(filename) {
    return this.request(`/upload/${filename}`, { method: 'DELETE' });
  }
}

// Create global instance
window.apiClient = new APIClient(
  window.API_BASE_URL || 'http://localhost:3001/api'
);
