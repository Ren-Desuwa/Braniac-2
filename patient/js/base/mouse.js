/* [2026-01-30 - batch 3.1.0] */
/* patient/js/base/mouse.js */
/* Features: Gyro Input, Physical Click, Dwell Click, Magnet Snapping */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. SETUP CURSOR UI ---
    const oldCursor = document.getElementById('pseudo-cursor');
    if (oldCursor) oldCursor.remove();

    const cursor = document.createElement('div');
    cursor.id = 'pseudo-cursor';
    cursor.innerHTML = `
        <div class="dwell-ring"></div>
        <div class="cursor-pointer"></div>
    `;
    document.body.appendChild(cursor);

    // --- 2. STATE ---
    let posX = window.innerWidth / 2;
    let posY = window.innerHeight / 2;
    let isPressed = false;
    let lastClickTime = 0;
    
    // Dwell & Magnet State
    let dwellTimer = null;
    let dwellTarget = null;
    const DWELL_TIME = 1500; // 1.5 seconds to trigger click
    const MAGNET_DIST = 40;  // Pixels to snap

    // --- 3. CONNECT ---
    const socket = new WebSocket(`ws://${window.location.hostname}/ws`);
    socket.onopen = () => console.log("[MOUSE] Connected");

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // A. MOVEMENT
        posX += data.x * 3.5; 
        posY += data.z * 3.5; 

        posX = Math.max(0, Math.min(window.innerWidth, posX));
        posY = Math.max(0, Math.min(window.innerHeight, posY));

        // B. MAGNET LOGIC (Snap to buttons)
        let finalX = posX;
        let finalY = posY;
        const target = findInteractiveElement(posX, posY);

        if (target) {
            const rect = target.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const dist = Math.hypot(posX - centerX, posY - centerY);

            if (dist < MAGNET_DIST) {
                // Snap visual cursor to button center
                finalX = centerX;
                finalY = centerY;
                cursor.classList.add('magnet-active');
            } else {
                cursor.classList.remove('magnet-active');
            }
        } else {
            cursor.classList.remove('magnet-active');
        }

        // Apply Position
        cursor.style.left = `${finalX}px`;
        cursor.style.top = `${finalY}px`;

        // C. PHYSICAL CLICK (Priority)
        if (data.b1 === 1) {
            if (!isPressed) {
                performClick(finalX, finalY);
                isPressed = true;
                cursor.classList.add('clicking');
                resetDwell(); // Physical click cancels dwell
            }
        } else {
            if (isPressed) {
                isPressed = false;
                cursor.classList.remove('clicking');
            }
            // Only Dwell if button is NOT pressed
            handleDwell(target, finalX, finalY);
        }
    };

    // --- HELPER FUNCTIONS ---

    function findInteractiveElement(x, y) {
        // Hide cursor to peek underneath
        cursor.style.visibility = 'hidden';
        let el = document.elementFromPoint(x, y);
        cursor.style.visibility = 'visible';

        // Traverse up to find clickable parent (like <button> inside <div>)
        while (el && el !== document.body) {
            const tag = el.tagName;
            if (['BUTTON', 'A', 'INPUT'].includes(tag) || 
                el.classList.contains('game-card') || 
                el.onclick != null) {
                return el;
            }
            el = el.parentElement;
        }
        return null;
    }

    function handleDwell(target, x, y) {
        if (target) {
            if (dwellTarget !== target) {
                // New target found: Restart Timer
                resetDwell();
                dwellTarget = target;
                cursor.classList.add('dwelling');
                
                dwellTimer = setTimeout(() => {
                    performClick(x, y);
                    resetDwell();
                }, DWELL_TIME);
            }
        } else {
            // Lost target
            if (dwellTarget) resetDwell();
        }
    }

    function resetDwell() {
        clearTimeout(dwellTimer);
        dwellTimer = null;
        dwellTarget = null;
        cursor.classList.remove('dwelling');
        
        // Reset animation hack
        const ring = cursor.querySelector('.dwell-ring');
        if(ring) {
            ring.style.animation = 'none';
            ring.offsetHeight; /* trigger reflow */
            ring.style.animation = null; 
        }
    }

    function performClick(x, y) {
        const now = Date.now();
        if (now - lastClickTime < 300) return;
        lastClickTime = now;

        cursor.style.visibility = 'hidden';
        let el = document.elementFromPoint(x, y);
        cursor.style.visibility = 'visible';

        if (el) {
            createRipple(x, y);
            el.click();
            if (['INPUT', 'TEXTAREA'].includes(el.tagName)) el.focus();
        }
    }

    function createRipple(x, y) {
        const ripple = document.createElement('div');
        ripple.className = 'click-ripple';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 500);
    }
});