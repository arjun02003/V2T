/**
 * V2T GROUPS - Gallery Service
 * Loads gallery items from backend API and displays them on the website
 */

class GalleryService {
  constructor(apiBaseURL = 'http://localhost:3001/api') {
    this.apiBaseURL = apiBaseURL;
    this.galleries = {
      art: [],
      event: [],
      interior: []
    };
  }

  /**
   * Initialize and load all galleries
   */
  async init() {
    try {
      console.log('🔄 Loading galleries from backend...');
      
      // Load each category
      for (const category of ['art', 'event', 'interior']) {
        await this.loadCategory(category);
      }

      console.log('✅ Galleries loaded successfully');
      return this.galleries;
    } catch (error) {
      console.error('❌ Failed to load galleries:', error);
      return null;
    }
  }

  /**
   * Load gallery items for a specific category
   */
  async loadCategory(category) {
    try {
      const response = await fetch(
        `${this.apiBaseURL}/gallery/${category}?active=true`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      this.galleries[category] = data.data || [];
      console.log(`✅ Loaded ${category}: ${this.galleries[category].length} items`);
    } catch (error) {
      console.warn(`⚠️ Failed to load ${category}:`, error);
      this.galleries[category] = [];
    }
  }

  /**
   * Get all items in a category
   */
  getCategory(category) {
    return this.galleries[category] || [];
  }

  /**
   * Get single item
   */
  getItem(category, id) {
    return this.galleries[category]?.find(item => item.id === id);
  }

  /**
   * Get all galleries
   */
  getAll() {
    return this.galleries;
  }

  /**
   * Render gallery grid
   */
  renderGallery(category, containerSelector) {
    const items = this.getCategory(category);
    const container = document.querySelector(containerSelector);

    if (!container) {
      console.warn(`Container not found: ${containerSelector}`);
      return;
    }

    if (items.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No items available yet</p>';
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="gallery-item" data-id="${item.id}">
        <img src="${item.image_url}" alt="${item.title}" class="gallery-image">
        <div class="gallery-info">
          <h3>${item.title}</h3>
          <p class="gallery-price">${item.price}</p>
          <p class="gallery-desc">${item.description}</p>
        </div>
      </div>
    `).join('');
  }
}

// Create global instance
window.galleryService = new GalleryService(
  window.API_BASE_URL || 'http://localhost:3001/api'
);

// Auto-load galleries when page loads
document.addEventListener('DOMContentLoaded', async () => {
  await window.galleryService.init();
});
