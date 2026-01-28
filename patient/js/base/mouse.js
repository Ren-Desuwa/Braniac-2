/* [2026-01-30 - DEBUG VERSION] */
/* patient/js/base/mouse.js */
/* Features: Gyro Input, Physical Click, Dwell Click, Magnet Snapping */
/* LOGGING ENABLED: VERBOSE */

document.addEventListener('DOMContentLoaded', () => {
    console.log("[MOUSE] DOMContentLoaded fired. Starting initialization...");

    // --- 1. SETUP CURSOR UI ---
    try {
        const oldCursor = document.getElementById('pseudo-cursor');
        if (oldCursor) {
            console.log("[MOUSE] Cleaning up old cursor instance.");
            oldCursor.remove();
        }

        const cursor = document.createElement('div');
        cursor.id = 'pseudo-cursor';
        cursor.innerHTML = `
            <div class="dwell-ring"></div>
            <div class="cursor-pointer"></div>
        `;
        document.body.appendChild(cursor);
        console.log("[MOUSE] Cursor DOM element created and appended to body.");
        
        // Log initial visibility check
        const computedStyle = window.getComputedStyle(cursor);
        console.log(`[MOUSE] Initial Cursor Visibility: ${computedStyle.display}, Z-Index: ${computedStyle.zIndex}, Top/Left: ${computedStyle.top}/${computedStyle.left}`);

    } catch (e) {
        console.error("[MOUSE] CRITICAL ERROR creating cursor UI:", e);
    }

    const cursor = document.getElementById('pseudo-cursor'); // Re-select to be safe

    // --- 2. STATE ---
    let posX = window.innerWidth / 2;
    let posY = window.innerHeight / 2;
    let isPressed = false;
    let lastClickTime = 0;
    
    // Dwell & Magnet State
    let dwellTimer = null;
    let dwellTarget = null;
    const DWELL_TIME = 1500; 
    const MAGNET_DIST = 40;  

    // --- 3. CONNECT ---
    // [LOGGING] Verify the exact URL we are trying to hit
    const wsHost = window.location.hostname ? window.location.hostname : "localhost";
    const wsUrl = `ws://${wsHost}/ws`;
    
    console.log(`[MOUSE] Attempting WebSocket connection to: ${wsUrl}`);
    console.log(`[MOUSE] Note: If you are opening this file directly (file://), hostname is empty. Connection will fail.`);

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log("[MOUSE] WebSocket connection ESTABLISHED.");
        console.log("[MOUSE] Waiting for data...");
    };

    socket.onerror = (error) => {
        console.error("[MOUSE] WebSocket ERROR:", error);
        console.error("[MOUSE] Check: Is the ESP32 powered? Are you on the same Wi-Fi? Is the IP correct?");
    };

    socket.onclose = (event) => {
        console.warn(`[MOUSE] WebSocket connection CLOSED. Code: ${event.code}, Reason: ${event.reason}`);
    };

    let packetCount = 0; // throttle logs

    socket.onmessage = (event) => {
        try {
            // [LOGGING] Log the raw string first to prove reception
            if (packetCount < 5) {
                console.log("[MOUSE] RAW DATA RX:", event.data);
            }

            const data = JSON.parse(event.data);
            
            // [LOGGING] Validate keys match C++ (x, y, z, b1)
            if (packetCount < 5) {
                 console.log("[MOUSE] Parsed Object:", data);
                 if (data.x === undefined || data.b1 === undefined) {
                     console.error("[MOUSE] DATA FORMAT MISMATCH! Expected x, y, z, b1. Got keys:", Object.keys(data));
                 }
                 packetCount++;
            }

            // A. MOVEMENT
            // [LOGGING] Watch for NaN or undefined values destroying the math
            if (isNaN(data.x) || isNaN(data.z)) {
                console.warn("[MOUSE] Received NaN movement data!", data);
                return;
            }

            posX += data.x * 3.5; 
            posY += data.z * 3.5; // Using Z for Y-axis as per previous logic

            posX = Math.max(0, Math.min(window.innerWidth, posX));
            posY = Math.max(0, Math.min(window.innerHeight, posY));

            // B. MAGNET LOGIC
            let finalX = posX;
            let finalY = posY;
            const target = findInteractiveElement(posX, posY);

            if (target) {
                const rect = target.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const dist = Math.hypot(posX - centerX, posY - centerY);

                if (dist < MAGNET_DIST) {
                    finalX = centerX;
                    finalY = centerY;
                    if (!cursor.classList.contains('magnet-active')) {
                        console.log("[MOUSE] Magnet SNAP engaged on:", target.tagName);
                        cursor.classList.add('magnet-active');
                    }
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
                    console.log("[MOUSE] Button Press Detected (b1=1). Clicking at:", finalX, finalY);
                    performClick(finalX, finalY);
                    isPressed = true;
                    cursor.classList.add('clicking');
                    resetDwell(); 
                }
            } else {
                if (isPressed) {
                    console.log("[MOUSE] Button Released.");
                    isPressed = false;
                    cursor.classList.remove('clicking');
                }
                handleDwell(target, finalX, finalY);
            }

        } catch (err) {
            console.error("[MOUSE] Error processing message:", err, "Raw Data:", event.data);
        }
    };

    // --- HELPER FUNCTIONS ---

    function findInteractiveElement(x, y) {
        cursor.style.visibility = 'hidden';
        let el = document.elementFromPoint(x, y);
        cursor.style.visibility = 'visible';

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
                console.log("[MOUSE] Dwell Target Acquired:", target.tagName);
                resetDwell();
                dwellTarget = target;
                cursor.classList.add('dwelling');
                
                dwellTimer = setTimeout(() => {
                    console.log("[MOUSE] Dwell Timer Complete. Clicking.");
                    performClick(x, y);
                    resetDwell();
                }, DWELL_TIME);
            }
        } else {
            if (dwellTarget) {
                // console.log("[MOUSE] Dwell Target Lost"); // Commented to reduce spam
                resetDwell();
            }
        }
    }

    function resetDwell() {
        if (dwellTimer) {
            clearTimeout(dwellTimer);
            dwellTimer = null;
        }
        dwellTarget = null;
        cursor.classList.remove('dwelling');
        
        const ring = cursor.querySelector('.dwell-ring');
        if(ring) {
            ring.style.animation = 'none';
            ring.offsetHeight; 
            ring.style.animation = null; 
        }
    }

    function performClick(x, y) {
        const now = Date.now();
        if (now - lastClickTime < 300) return;
        lastClickTime = now;

        console.log(`[MOUSE] Executing CLICK at ${x}, ${y}`);

        cursor.style.visibility = 'hidden';
        let el = document.elementFromPoint(x, y);
        cursor.style.visibility = 'visible';

        if (el) {
            console.log("[MOUSE] Element clicked:", el);
            createRipple(x, y);
            el.click();
            if (['INPUT', 'TEXTAREA'].includes(el.tagName)) el.focus();
        } else {
            console.warn("[MOUSE] Click attempted, but no element found at point.");
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