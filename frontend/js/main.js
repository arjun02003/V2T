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

    if (window.galleryService) {
        const category = document.body.classList.contains('gallery-art') ? 'art'
            : document.body.classList.contains('gallery-event') ? 'event'
            : document.body.classList.contains('gallery-interior') ? 'interior'
            : null;

        if (category) {
            try {
                await window.galleryService.init(category);
            } catch (error) {
                console.error('Gallery init failed:', error);
            }
            window.galleryService.renderGallery(category, '#gallery-grid');
        }
    }

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
        if (!cardInner) return;
        
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
let firestoreGalleryItems = [];
let firestoreGalleryUnsubscribe = null;
let latestRealtimeItems = {};
let latestDeletedMap = {};
let latestPricesMap = {};

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
    
    if (!lightboxImg || !lightboxTitle || !lightboxDesc || !lightboxCounter || !closeBtn || !prevBtn || !nextBtn) {
        return;
    }

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
        if (!item || !lightboxImg || !lightboxTitle || !lightboxDesc || !lightboxCounter) return;
        
        lightboxImg.style.transform = 'scale(0.95)';
        lightboxImg.style.opacity = '0.3';
        
        setTimeout(() => {
            if (!lightboxImg || !lightboxTitle || !lightboxDesc || !lightboxCounter) return;
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
        if (!img) return;
        const titleEl = card.querySelector('.gallery-card-title');
        const descEl = card.querySelector('.gallery-card-desc');
        const title = titleEl ? titleEl.textContent : 'Untitled';
        
        // Build lightbox description: Appends price if it exists on card
        let desc = descEl ? descEl.textContent : '';
        const priceEl = card.querySelector('.gallery-price');
        if (priceEl) {
            desc += ` | Price: ${priceEl.textContent}`;
        }
        
        const src = img.getAttribute('src') || '';
        galleryItems.push({ src, title, desc });
    });
}

/* 
========================================================================
   PUBLIC DATABASE LOADER (IndexedDB Powered)
======================================================================== 
*/

