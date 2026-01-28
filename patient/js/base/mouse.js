/* patient/js/base/mouse.js */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup the Cursor Element
    const cursor = document.createElement('div');
    cursor.id = 'pseudo-cursor';
    cursor.innerHTML = `
        <div class="dwell-ring"></div>
        <div class="cursor-pointer"></div>
    `;
    document.body.appendChild(cursor);

    let posX = window.innerWidth / 2;
    let posY = window.innerHeight / 2;
    let dwellTimer = null;
    let lastHoveredElement = null;

    // --- WEBSOCKET CONNECTION ---
    // Connect to the ESP32 WebSocket stream
    const socket = new WebSocket(`ws://${window.location.hostname}/ws`);

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        // Map Gyro X/Z to Screen X/Y
        // Sensitivity multipliers may need adjustment based on physical testing
        posX += data.x * 2.5; 
        posY += data.z * 2.5;

        // Clamp to screen bounds
        posX = Math.max(0, Math.min(window.innerWidth, posX));
        posY = Math.max(0, Math.min(window.innerHeight, posY));

        updateCursorPosition();
    };

    function updateCursorPosition() {
        cursor.style.left = `${posX}px`;
        cursor.style.top = `${posY}px`;

        // Check what is under the pseudo-cursor
        const elementAtPoint = document.elementFromPoint(posX, posY);
        handleDwellLogic(elementAtPoint);
    }

    // --- DWELL & CLICK LOGIC ---
    function handleDwellLogic(el) {
        // Only trigger dwell on "clickable" elements
        const isClickable = el && (
            el.tagName === 'BUTTON' || 
            el.tagName === 'A' || 
            el.classList.contains('game-card') ||
            window.getComputedStyle(el).cursor === 'pointer'
        );

        if (isClickable) {
            if (lastHoveredElement !== el) {
                resetDwell();
                lastHoveredElement = el;
                cursor.classList.add('dwelling');
                
                // Start 5 second timer
                dwellTimer = setTimeout(() => {
                    executeClick(el);
                }, 5000);
            }
        } else {
            resetDwell();
        }
    }

    function resetDwell() {
        clearTimeout(dwellTimer);
        cursor.classList.remove('dwelling');
        lastHoveredElement = null;
    }

    function executeClick(el) {
        if (!el) return;
        
        // Visual feedback
        el.style.transform = 'scale(0.95)';
        setTimeout(() => el.style.transform = '', 100);

        // Dispatch Click
        el.click();
        console.log("Pseudo-click executed on:", el);
        resetDwell();
    }

    // Support for physical mouse clicks (Fallback/Assistance)
    document.addEventListener('mousedown', (e) => {
        const el = document.elementFromPoint(posX, posY);
        if (el) executeClick(el);
    });
});