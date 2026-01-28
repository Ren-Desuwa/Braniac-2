/* [2026-01-30 - batch 3.1.0] */
/* patient/js/base/mouse.js */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. SETUP CURSOR UI ---
    // Remove existing if any (prevents duplicates)
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
    
    let isPressed = false;      // Track button state to prevent "turbo clicking"
    let lastClickTime = 0;      // Debounce timer

    // --- 3. CONNECT ---
    const socket = new WebSocket(`ws://${window.location.hostname}/ws`);

    socket.onopen = () => console.log("[MOUSE] Connected to ESP32 Input Stream");
    
    socket.onmessage = (event) => {
        // DATA FORMAT: {"x": 12.5, "z": -5.0, "b1": 1}
        const data = JSON.parse(event.data);
        
        // A. MOVEMENT (Inverted/Scaled for screen mapping)
        // Sensitivity: 3.5 (Adjust this number if it feels too slow/fast)
        posX += data.x * 3.5; 
        posY += data.z * 3.5; // Use data.y if your gyro orientation is flat

        // Clamp to screen edges
        posX = Math.max(0, Math.min(window.innerWidth, posX));
        posY = Math.max(0, Math.min(window.innerHeight, posY));

        // Update Visuals
        cursor.style.left = `${posX}px`;
        cursor.style.top = `${posY}px`;

        // B. CLICK LOGIC (Physical Button "b1")
        if (data.b1 === 1) {
            if (!isPressed) {
                // Button was JUST pressed (Rising Edge)
                performClick(posX, posY);
                isPressed = true;
                cursor.classList.add('clicking'); // Visual feedback
            }
        } else {
            if (isPressed) {
                // Button was released
                isPressed = false;
                cursor.classList.remove('clicking');
            }
        }
    };

    /**
     * Finds the element under the virtual cursor and clicks it.
     */
    function performClick(x, y) {
        // Debounce: Don't allow clicks faster than 300ms
        const now = Date.now();
        if (now - lastClickTime < 300) return;
        lastClickTime = now;

        // 1. Hide cursor temporarily so we can see what's UNDER it
        cursor.style.visibility = 'hidden';
        
        // 2. Find the element
        let el = document.elementFromPoint(x, y);
        
        // 3. Show cursor again
        cursor.style.visibility = 'visible';

        // 4. Trigger Click
        if (el) {
            console.log("[MOUSE] Clicking:", el.tagName, el.className);
            
            // Visual Feedback ripple (Optional)
            createRipple(x, y);

            // Dispatch events (Simulate a real mouse click sequence)
            el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            el.click(); 
            
            // Handle Focus for inputs
            if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(el.tagName)) {
                el.focus();
            }
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
});>