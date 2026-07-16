/* 
========================================================================
   V2T GROUPS - Premium Futuristic 3D Dashboard & Gallery JS Controller
   Logic: Canvas Particles, 3D Tilt, HUD Updates, Lightbox & IndexedDB Loader
======================================================================== 
*/

document.addEventListener('DOMContentLoaded', async () => {
    initHUDClock();
    initCanvasParticles();
    init3DTilt();
    
    // Initialize client CMS load (hides removed static items, appends custom ones)
    await initCMS();
    
    // Initialize Lightbox (gathers both static and custom cards for slide preview)
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

/* --- Fullscreen Lightbox Image Gallery (Event Delegation) --- */
let galleryItems = [];
let currentIndex = 0;
let lightboxInitialized = false;

function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    rebuildGalleryItems();

    if (lightboxInitialized) return;

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
            
            // Format counter display
            lightboxCounter.textContent = `IMAGE ${currentIndex + 1} OF ${galleryItems.length}`;
            
            lightboxImg.style.transform = 'scale(1)';
            lightboxImg.style.opacity = '1';
        }, 120);
    }

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

    // Delegated click handler on gallery grid
    const galleryGrid = document.querySelector('.gallery-grid');
    if (galleryGrid) {
        galleryGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.gallery-card');
            if (card) {
                rebuildGalleryItems();
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

function rebuildGalleryItems() {
    const galleryCards = document.querySelectorAll('.gallery-card');
    galleryItems = [];
    galleryCards.forEach(card => {
        const img = card.querySelector('.gallery-img');
        const title = card.querySelector('.gallery-card-title').textContent;
        
        // Build lightbox description: Appends price if it exists on card
        let desc = card.querySelector('.gallery-card-desc').textContent;
        const priceEl = card.querySelector('.gallery-price');
        if (priceEl) {
            desc += ` | Price: ${priceEl.textContent}`;
        }
        
        const src = img.getAttribute('src');
        galleryItems.push({ src, title, desc });
    });
}


/* 
========================================================================
   PUBLIC DATABASE LOADER (IndexedDB Powered)
======================================================================== 
*/

class DBManager {
    constructor() {
        this.dbName = 'v2t_groups_cms';
        this.db = null;
        this.dbRef = null;
        this.useFirebase = false;
    }

    init() {
        return new Promise((resolve, reject) => {
            // Check if Firebase config is set up
            if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.databaseURL) {
                try {
                    window.firebase.initializeApp(window.FIREBASE_CONFIG);
                    this.dbRef = window.firebase.database().ref();
                    this.useFirebase = true;
                    console.log("Firebase Realtime Cloud Database initialized successfully.");
                    resolve();
                    return;
                } catch (e) {
                    console.error("Failed to initialize Firebase client. Falling back to IndexedDB.", e);
                }
            }

            const request = indexedDB.open(this.dbName, 3); // Upgraded to v3 to support price overrides
            request.onblocked = () => {
                console.warn("Database upgrade blocked by another open tab.");
            };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('portfolio_items')) {
                    const store = db.createObjectStore('portfolio_items', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('category', 'category', { unique: false });
                }
                if (!db.objectStoreNames.contains('deleted_static_items')) {
                    db.createObjectStore('deleted_static_items', { keyPath: 'cardId' });
                }
                if (!db.objectStoreNames.contains('overridden_prices')) {
                    db.createObjectStore('overridden_prices', { keyPath: 'itemId' });
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                this.db.onversionchange = () => {
                    this.db.close();
                    location.reload();
                };
                resolve();
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }

    getItems(category) {
        if (this.useFirebase) {
            return new Promise((resolve, reject) => {
                this.dbRef.child('portfolio_items').once('value', (snapshot) => {
                    const val = snapshot.val();
                    if (!val) {
                        resolve([]);
                        return;
                    }
                    const items = Object.keys(val).map(key => ({
                        id: key,
                        ...val[key]
                    })).filter(x => x.category === category);
                    resolve(items);
                }, reject);
            });
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('portfolio_items', 'readonly');
            const store = transaction.objectStore('portfolio_items');
            const index = store.index('category');
            const request = index.getAll(category);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    getDeletedStaticIds() {
        if (this.useFirebase) {
            return new Promise((resolve, reject) => {
                this.dbRef.child('deleted_static_items').once('value', (snapshot) => {
                    const val = snapshot.val();
                    if (!val) {
                        resolve([]);
                        return;
                    }
                    resolve(Object.keys(val));
                }, reject);
            });
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction('deleted_static_items', 'readonly');
            const store = transaction.objectStore('deleted_static_items');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result.map(x => x.cardId));
            request.onerror = () => reject(request.error);
        });
    }

    getOverriddenPrices() {
        if (this.useFirebase) {
            return new Promise((resolve, reject) => {
                this.dbRef.child('overridden_prices').once('value', (snapshot) => {
                    const val = snapshot.val();
                    if (!val) {
                        resolve([]);
                        return;
                    }
                    const list = Object.keys(val).map(key => ({
                        itemId: key,
                        price: val[key]
                    }));
                    resolve(list);
                }, reject);
            });
        }

        return new Promise((resolve, reject) => {
            if (!this.db.objectStoreNames.contains('overridden_prices')) {
                resolve([]);
                return;
            }
            const transaction = this.db.transaction('overridden_prices', 'readonly');
            const store = transaction.objectStore('overridden_prices');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

const dbManager = new DBManager();
let currentCategory = null;

if (document.body.classList.contains('gallery-art')) currentCategory = 'art';
else if (document.body.classList.contains('gallery-event')) currentCategory = 'event';
else if (document.body.classList.contains('gallery-interior')) currentCategory = 'interior';

async function initCMS() {
    if (!currentCategory) return;

    try {
        await dbManager.init();
        
        // 1. Hide default cards marked as deleted by admin
        await hideDeletedStaticCards();
        
        // 2. Load custom items matching current category
        await loadCustomItems();

        // 3. Apply custom price overrides
        await applyOverriddenPrices();
    } catch (err) {
        console.error("CMS load failed:", err);
    }
}

async function hideDeletedStaticCards() {
    const deletedIds = await dbManager.getDeletedStaticIds();
    deletedIds.forEach(id => {
        const card = document.getElementById(id);
        if (card) {
            card.remove();
        }
    });
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

async function applyOverriddenPrices() {
    try {
        const overrides = await dbManager.getOverriddenPrices();
        overrides.forEach(x => {
            const card = document.getElementById(x.itemId);
            if (card) {
                const priceEl = card.querySelector('.gallery-price');
                if (priceEl) {
                    priceEl.textContent = x.price;
                }
            }
        });
    } catch (e) {
        console.error("Error applying price overrides:", e);
    }
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
            <div class="gallery-img-container">
                <img src="${item.src}" alt="${item.title}" class="gallery-img" loading="lazy">
            </div>
            <div class="gallery-info">
                <div>
                    <span class="gallery-meta">USR.${prefix} // ${String(item.id).padStart(2, '0')}</span>
                    <h3 class="gallery-card-title">${item.title}</h3>
                    <p class="gallery-card-desc">${item.desc}</p>
                </div>
                <div class="gallery-price">${item.price}</div>
            </div>
        </div>
    `;
}
