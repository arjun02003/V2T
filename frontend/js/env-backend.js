/**
 * V2T GROUPS - Environment Configuration
 * Configure your API connection and settings here
 */

// ========== API CONFIGURATION ==========
// Point to your backend server
window.API_BASE_URL = 'http://localhost:3001/api';

// For production, use your server URL:
// window.API_BASE_URL = 'https://api.yourdomain.com/api';

// ========== GALLERY CONFIGURATION ==========
window.GALLERY_CONFIG = {
  categories: {
    art: 'Art Gallery',
    event: 'Event Decoration',
    interior: 'Interior Design'
  },
  itemsPerPage: 12,
  imageQuality: 0.8
};

// ========== ADMIN CONFIGURATION ==========
window.ADMIN_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  autoRefreshInterval: 5000 // ms
};

console.log('✅ Environment configuration loaded');
console.log('🌐 API Base URL:', window.API_BASE_URL);
