/* 
========================================================================
   V2T GROUPS - Premium Futuristic 3D Dashboard & Gallery JS Controller
   Logic: Canvas Particles, 3D Tilt Effect, Lightbox Modal, HUD Updates
======================================================================== 
*/

document.addEventListener('DOMContentLoaded', () => {
    // Initialize standard features
    initHUDClock();
    initCanvasParticles();
    init3DTilt();
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
        
        // Output format: HH:MM:SS LOCAL
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
    
    // Resize handler
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle Object
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.5; // Drift speed X
            this.vy = (Math.random() - 0.5) * 0.5; // Drift speed Y
            this.radius = Math.random() * 1.5 + 0.5;
            this.alpha = Math.random() * 0.5 + 0.2;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;

            // Bounce off edges
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

    // Populate particles
    for (let i = 0; i < maxParticles; i++) {
        particles.push(new Particle());
    }

    // Animation Loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw and update particles
        particles.forEach(p => {
            p.update();
            p.draw();
        });

        // Draw lines between close particles
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
        const maxTilt = 12; // Maximum rotation angle in degrees
        
        cardWrapper.addEventListener('mousemove', (e) => {
            const rect = cardWrapper.getBoundingClientRect();
            
            // Mouse position relative to the element (from 0 to width/height)
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Normalized values between -1 and 1
            const normalizedX = (mouseX / rect.width) * 2 - 1;
            const normalizedY = (mouseY / rect.height) * 2 - 1;
            
            // Calculate tilt rotations
            // Moving mouse to right tilts it positive around Y (right side comes closer)
            // Moving mouse down tilts it negative around X (bottom side goes back)
            const tiltX = -(normalizedY * maxTilt).toFixed(2);
            const tiltY = (normalizedX * maxTilt).toFixed(2);
            
            // Apply rotations in perspective with smooth scaling
            cardInner.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.03, 1.03, 1.03)`;
        });

        cardWrapper.addEventListener('mouseleave', () => {
            // Reset to flat state
            cardInner.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
            cardInner.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)';
        });
        
        cardWrapper.addEventListener('mouseenter', () => {
            // Remove transitions during active cursor movement to keep it responsive
            cardInner.style.transition = 'none';
        });
    });
}

/* --- Fullscreen Lightbox Image Gallery --- */
function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;

    const lightboxImg = lightbox.querySelector('.lightbox-img');
    const lightboxTitle = lightbox.querySelector('.lightbox-title');
    const lightboxDesc = lightbox.querySelector('.lightbox-desc');
    const lightboxCounter = lightbox.querySelector('.lightbox-counter');
    
    const closeBtn = lightbox.querySelector('.lightbox-close');
    const prevBtn = lightbox.querySelector('.lightbox-prev');
    const nextBtn = lightbox.querySelector('.lightbox-next');
    
    const galleryCards = document.querySelectorAll('.gallery-card');
    if (galleryCards.length === 0) return;

    let galleryItems = [];
    let currentIndex = 0;

    // Collect gallery images data
    galleryCards.forEach((card, index) => {
        const img = card.querySelector('.gallery-img');
        const title = card.querySelector('.gallery-card-title').textContent;
        const desc = card.querySelector('.gallery-card-desc').textContent;
        const src = img.getAttribute('src');

        galleryItems.push({ src, title, desc });

        // Add click listener to card
        card.addEventListener('click', () => {
            openLightbox(index);
        });
    });

    function openLightbox(index) {
        currentIndex = index;
        updateLightboxContent();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; // Stop page scrolling
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = 'auto'; // Restore page scrolling
    }

    function showNext() {
        currentIndex = (currentIndex + 1) % galleryItems.length;
        updateLightboxContent();
    }

    function showPrev() {
        currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
        updateLightboxContent();
    }

    function updateLightboxContent() {
        const item = galleryItems[currentIndex];
        
        // Add fade out/scale down effect during change
        lightboxImg.style.transform = 'scale(0.95)';
        lightboxImg.style.opacity = '0.3';
        
        setTimeout(() => {
            lightboxImg.src = item.src;
            lightboxTitle.textContent = item.title;
            lightboxDesc.textContent = item.desc;
            lightboxCounter.textContent = `IMAGE ${currentIndex + 1} OF ${galleryItems.length}`;
            
            // Fade and scale back in
            lightboxImg.style.transform = 'scale(1)';
            lightboxImg.style.opacity = '1';
        }, 120);
    }

    // Button Events
    closeBtn.addEventListener('click', closeLightbox);
    nextBtn.addEventListener('click', showNext);
    prevBtn.addEventListener('click', showPrev);

    // Close on clicking the backdrop overlay (outside the image container and buttons)
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target.classList.contains('lightbox-content-wrapper')) {
            closeLightbox();
        }
    });

    // Keyboard controls
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
}
