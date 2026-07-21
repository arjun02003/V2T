/**
 * V2T GROUPS - Gallery Service
 * Loads gallery items from backend API and displays them on the website
 */

class GalleryService {
  constructor(apiBaseURL = 'http://localhost:3001/api') {
    this.apiBaseURL = apiBaseURL.replace(/\/$/, '');
    this.galleries = {
      art: [],
      event: [],
      interior: []
    };
  }

  /**
   * Initialize and load galleries for a category
   */
  async init(category = null) {
    try {
      console.log('🔄 Loading gallery from backend...', category);
      
      if (category) {
        await this.loadCategory(category);
      } else {
        for (const cat of ['art', 'event', 'interior']) {
          await this.loadCategory(cat);
        }
      }

      console.log('✅ Gallery load complete');
      return this.galleries;
    } catch (error) {
      console.error('❌ Failed to load gallery:', error);
      return null;
    }
  }

  /**
   * Load gallery items for a specific category
   */
  async loadCategory(category) {
    try {
      const response = await fetch(
        `${this.apiBaseURL}/gallery/${encodeURIComponent(category)}?active=true`,
        { method: 'GET' }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      this.galleries[category] = Array.isArray(data?.data) ? data.data : [];
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
    const items = this.getCategory(category) || [];
    const container = document.querySelector(containerSelector);

    if (!container) {
      console.warn(`Container not found: ${containerSelector}`);
      return;
    }

    container.innerHTML = '';

    if (items.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No items available yet</p>';
      const counter = document.getElementById('gallery-counter');
      if (counter) counter.textContent = '00';
      return;
    }

    container.innerHTML = items.map(item => `
      <div class="gallery-card" data-id="${item.id}">
        <div class="gallery-img-container">
          <img src="${item.image_url}" alt="${item.title}" class="gallery-img" loading="lazy">
        </div>
        <div class="gallery-info">
          <div>
            <span class="gallery-meta">${item.category?.toUpperCase() || 'ITEM'} // ${String(item.id).slice(0, 6)}</span>
            <h3 class="gallery-card-title">${item.title}</h3>
            <p class="gallery-card-desc">${item.description}</p>
          </div>
          <div class="gallery-price">${item.price}</div>
        </div>
      </div>
    `).join('');

    const counter = document.getElementById('gallery-counter');
    if (counter) counter.textContent = String(items.length).padStart(2, '0');
  }
}

// Create global instance
window.galleryService = new GalleryService(
  window.API_BASE_URL || 'http://localhost:3001/api'
);
