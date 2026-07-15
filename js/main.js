/* 
========================================================================
   V2T GROUPS - Premium Futuristic 3D Dashboard & Gallery JS Controller
   Logic: Canvas Particles, 3D Tilt, HUD Updates, Lightbox & IndexedDB CMS
======================================================================== 
*/

document.addEventListener('DOMContentLoaded', async () => {
    initHUDClock();
    initCanvasParticles();
    init3DTilt();
    
    // Initialize IndexedDB CMS (appends custom uploaded images to the DOM)
    await initCMS();
    
    // Initialize Lightbox (gathers both static and user-uploaded cards)
    initLightbox();
});

/* --- HUD Clock Utility --- */
function initHUDClock() {
    const timeDisplay = document.getElementById('system-time');
    if (!timeDisplay) return;

    function updateClock() {
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');
        
        // Output format: SYSTEM TIME: HH:MM:SS LCL
        timeDisplay.textContent = `SYSTEM TIME: ${hrs}:${mins}:${secs} LCL`;
    }
    
    updateClock();
    setInterval(updateClock, 1000);
}

/* --- Interactive Canvas Particles Network --- */
function initCanvasParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    const maxParticles = 60;
    const connectionDistance = 100;
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.radius = Math.random() * 1.5 + 0.5;
            this.alpha = Math.random() * 0.5 + 0.2;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 240, 255, ${this.alpha})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < maxParticles; i++) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < connectionDistance) {
                    const lineAlpha = (1 - dist / connectionDistance) * 0.15;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(0, 240, 255, ${lineAlpha})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(animate);
    }
    animate();
}

/* --- 3D Holographic Tilt Interaction --- */
function init3DTilt() {
    const cards = document.querySelectorAll('.card-wrapper');
    if (cards.length === 0) return;

    cards.forEach(cardWrapper => {
        const cardInner = cardWrapper.querySelector('.card-3d');
        const maxTilt = 12;
        
        cardWrapper.addEventListener('mousemove', (e) => {
            const rect = cardWrapper.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            const normalizedX = (mouseX / rect.width) * 2 - 1;
            const normalizedY = (mouseY / rect.height) * 2 - 1;
            
            const tiltX = -(normalizedY * maxTilt).toFixed(2);
            const tiltY = (normalizedX * maxTilt).toFixed(2);
            
            cardInner.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.03, 1.03, 1.03)`;
        });

        cardWrapper.addEventListener('mouseleave', () => {
            cardInner.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
            cardInner.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)';
        });
        
        cardWrapper.addEventListener('mouseenter', () => {
            cardInner.style.transition = 'none';
        });
    });
}

/* --- Fullscreen Lightbox Image Gallery (Event Delegation Powered) --- */
let galleryItems = [];
let currentIndex = 0;
let lightboxInitialized = false;

function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    // Build array of items currently in the DOM
    rebuildGalleryItems();

    if (lightboxInitialized) return; // Prevent binding button/global handlers multiple times

    const lightboxImg = lightbox.querySelector('.lightbox-img');
    const lightboxTitle = lightbox.querySelector('.lightbox-title');
    const lightboxDesc = lightbox.querySelector('.lightbox-desc');
    const lightboxCounter = lightbox.querySelector('.lightbox-counter');
    
    const closeBtn = lightbox.querySelector('.lightbox-close');
    const prevBtn = lightbox.querySelector('.lightbox-prev');
    const nextBtn = lightbox.querySelector('.lightbox-next');

    window.openLightbox = function(index) {
        currentIndex = index;
        updateLightboxContent();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    function showNext() {
        if (galleryItems.length === 0) return;
        currentIndex = (currentIndex + 1) % galleryItems.length;
        updateLightboxContent();
    }

    function showPrev() {
        if (galleryItems.length === 0) return;
        currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
        updateLightboxContent();
    }

    function updateLightboxContent() {
        const item = galleryItems[currentIndex];
        if (!item) return;
        
        lightboxImg.style.transform = 'scale(0.95)';
        lightboxImg.style.opacity = '0.3';
        
        setTimeout(() => {
            lightboxImg.src = item.src;
            lightboxTitle.textContent = item.title;
            lightboxDesc.textContent = item.desc;
            lightboxCounter.textContent = `IMAGE ${currentIndex + 1} OF ${galleryItems.length}`;
            
            lightboxImg.style.transform = 'scale(1)';
            lightboxImg.style.opacity = '1';
        }, 120);
    }

    // Button Events
    closeBtn.addEventListener('click', closeLightbox);
    nextBtn.addEventListener('click', showNext);
    prevBtn.addEventListener('click', showPrev);

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target.classList.contains('lightbox-content-wrapper')) {
            closeLightbox();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') {
            closeLightbox();
        } else if (e.key === 'ArrowRight') {
            showNext();
        } else if (e.key === 'ArrowLeft') {
            showPrev();
        }
    });

    // Event Delegation on Gallery Grid container
    const galleryGrid = document.querySelector('.gallery-grid');
    if (galleryGrid) {
        galleryGrid.addEventListener('click', (e) => {
            // Delete click
            const deleteBtn = e.target.closest('.delete-card-btn');
            if (deleteBtn) {
                e.stopPropagation();
                const card = deleteBtn.closest('.gallery-card');
                deleteCustomItem(card);
                return;
            }

            // Card click
            const card = e.target.closest('.gallery-card');
            if (card) {
                rebuildGalleryItems(); // Refresh items in case changes were made
                const allCards = Array.from(document.querySelectorAll('.gallery-card'));
                const index = allCards.indexOf(card);
                if (index !== -1) {
                    window.openLightbox(index);
                }
            }
        });
    }

    lightboxInitialized = true;
}

// Scrapes the current DOM gallery card structure and populates array
function rebuildGalleryItems() {
    const galleryCards = document.querySelectorAll('.gallery-card');
    galleryItems = [];
    galleryCards.forEach(card => {
        const img = card.querySelector('.gallery-img');
        const title = card.querySelector('.gallery-card-title').textContent;
        const desc = card.querySelector('.gallery-card-desc').textContent;
        const src = img.getAttribute('src');
        galleryItems.push({ src, title, desc });
    });
}


/* 
========================================================================
   DYNAMIC CLIENT-SIDE CMS (IndexedDB Powered)
======================================================================== 
*/

class DBManager {
    constructor() {
        this.dbName = 'v2t_groups_cms';
        this.storeName = 'portfolio_items';
        this.db = null;
    }

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('category', 'category', { unique: false });
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve();
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }

    getItems(category) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(this.storeName, 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('category');
            const request = index.getAll(category);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    addItem(item) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.add(item);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    deleteItem(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(this.storeName, 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

const dbManager = new DBManager();
let currentCategory = null;

// Identify category
if (document.body.classList.contains('gallery-art')) currentCategory = 'art';
else if (document.body.classList.contains('gallery-event')) currentCategory = 'event';
else if (document.body.classList.contains('gallery-interior')) currentCategory = 'interior';

async function initCMS() {
    if (!currentCategory) return;

    try {
        await dbManager.init();
        await loadCustomItems();
        setupUploadModal();
    } catch (err) {
        console.error("Failed to initialize client CMS database:", err);
    }
}

async function loadCustomItems() {
    const items = await dbManager.getItems(currentCategory);
    const grid = document.querySelector('.gallery-grid');
    if (!grid) return;

    items.forEach(item => {
        const cardHTML = createCustomCardHTML(item);
        grid.insertAdjacentHTML('beforeend', cardHTML);
    });

    updateItemCounter();
}

function updateItemCounter() {
    const counter = document.getElementById('gallery-counter');
    if (!counter) return;
    const totalItems = document.querySelectorAll('.gallery-card').length;
    counter.textContent = String(totalItems).padStart(2, '0');
}

function createCustomCardHTML(item) {
    const prefix = currentCategory === 'art' ? 'ART' : currentCategory === 'event' ? 'EVT' : 'INT';
    return `
        <div class="gallery-card custom-card" id="custom-card-${item.id}" data-db-id="${item.id}">
            <button class="delete-card-btn" aria-label="Delete Card">
                <svg viewBox="0 0 24 24"><path d="M19 7l-.8 13.3c0 1-.9 1.7-1.9 1.7H7.7c-1 0-1.8-.7-1.9-1.7L5 7M10 11v6M14 11v6M9 7V4c0-.6.4-1 1-1h4c.6 0 1 .4 1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <div class="gallery-img-container">
                <img src="${item.src}" alt="${item.title}" class="gallery-img" loading="lazy">
            </div>
            <div class="gallery-info">
                <div>
                    <span class="gallery-meta">USR.${prefix} // ${String(item.id).padStart(2, '0')}</span>
                    <h3 class="gallery-card-title">${item.title}</h3>
                    <p class="gallery-card-desc">${item.desc}</p>
                </div>
            </div>
        </div>
    `;
}

async function deleteCustomItem(card) {
    const dbId = parseInt(card.getAttribute('data-db-id'));
    if (confirm("Are you sure you want to remove this custom project from the gallery?")) {
        try {
            await dbManager.deleteItem(dbId);
            card.remove();
            rebuildGalleryItems();
            updateItemCounter();
        } catch (err) {
            console.error("Delete from IndexedDB failed:", err);
        }
    }
}

function setupUploadModal() {
    const overlay = document.getElementById('upload-modal-overlay');
    const openBtn = document.getElementById('btn-open-upload');
    const closeBtn = document.getElementById('btn-close-upload');
    const form = document.getElementById('upload-form');
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('input-file');
    const previewContainer = document.getElementById('preview-container');
    const previewImg = document.getElementById('preview-img');
    const dropzoneText = document.getElementById('dropzone-text');
    
    let base64Image = null;

    if (!overlay || !openBtn || !closeBtn || !form) return;

    openBtn.addEventListener('click', () => overlay.classList.add('active'));

    const closeModal = () => {
        overlay.classList.remove('active');
        resetForm();
    };

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    dropzone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        handleFile(e.target.files[0]);
    });

    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--neon-cyan)';
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'rgba(255,255,255,0.1)';
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'rgba(255,255,255,0.1)';
        handleFile(e.dataTransfer.files[0]);
    });

    function handleFile(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert("Please select a valid image file.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            base64Image = e.target.result;
            previewImg.src = base64Image;
            previewContainer.style.display = 'block';
            dropzoneText.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    function resetForm() {
        form.reset();
        base64Image = null;
        previewContainer.style.display = 'none';
        dropzoneText.style.display = 'block';
        previewImg.src = '';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!base64Image) {
            alert("No image loaded. Please upload or drag an image first.");
            return;
        }

        const title = document.getElementById('input-title').value;
        const desc = document.getElementById('input-desc').value;

        const newItem = {
            category: currentCategory,
            src: base64Image,
            title: title,
            desc: desc
        };

        try {
            const id = await dbManager.addItem(newItem);
            newItem.id = id;
            
            const grid = document.querySelector('.gallery-grid');
            if (grid) {
                const cardHTML = createCustomCardHTML(newItem);
                grid.insertAdjacentHTML('beforeend', cardHTML);
                rebuildGalleryItems();
                updateItemCounter();
            }

            closeModal();
        } catch (err) {
            console.error("Failed to add custom item:", err);
            alert("Error saving item to database. Try again.");
        }
    });
}
