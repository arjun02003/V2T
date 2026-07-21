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

    console.log('API Request:', endpoint, config);

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error || 'Unauthorized';

        if (endpoint !== '/auth/login') {
          this.logout();
          console.error('API 401 detected on protected endpoint:', endpoint, message);
          throw new Error('Session expired. Please login again.');
        }

        console.warn('Login endpoint returned 401:', message);
        throw new Error(message);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP Error: ${response.status}`);
      }

      const result = await response.json();
      console.log('API Response:', endpoint, result);
      return result;
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
    const payload = { email: username, password };
    console.log('Login request payload:', { email: payload.email });

    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (data.token) {
      this.token = data.token;
      localStorage.setItem('auth_token', data.token);
      console.log('Login token stored:', data.token?.slice(0, 20) + '...');
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
    console.log('Logging out, clearing token');
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
  async uploadFile(file, category = 'general') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    try {
      const response = await fetch(`${this.baseURL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const detail = errorData.details ? ` (${JSON.stringify(errorData.details)})` : '';
        throw new Error(errorData.error ? `${errorData.error}${detail}` : 'Upload failed');
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
