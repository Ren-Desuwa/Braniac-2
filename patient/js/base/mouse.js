/* [2026-01-30 - MULTI-CURSOR FINAL] */
/* Supports: Arm (Green), Glove (Blue) */
/* Features: Magnet, Dwell, Physical Click, Debounce, Animation Reset */

document.addEventListener('DOMContentLoaded', () => {
    console.log("[MOUSE] Multi-Cursor System Initialized.");

    // --- CONFIGURATION ---
    const DEVICE_CONFIG = {
        "Arm":   { color: "#00FF00", label: "ARM" },   // Green
        "Glove": { color: "#0055FF", label: "GLOVE" }  // Blue
    };

    const DWELL_TIME = 1500;
    const MAGNET_DIST = 40;
    const CLICK_DEBOUNCE = 300; // [RESTORED] Prevent accidental double clicks

    // --- CLASS: REMOTE CURSOR ---
    class RemoteCursor {
        constructor(deviceName) {
            this.name = deviceName;
            this.x = window.innerWidth / 2;
            this.y = window.innerHeight / 2;
            
            // State
            this.isPressed = false;
            this.lastClickTime = 0; // [RESTORED]
            this.dwellTimer = null;
            this.dwellTarget = null;
            
            // Create UI Element
            this.element = document.createElement('div');
            this.element.className = 'remote-cursor'; 
            this.element.id = `cursor-${deviceName}`;
            
            const config = DEVICE_CONFIG[deviceName] || { color: "#FF0000", label: deviceName };
            
            this.element.innerHTML = `
                <div class="dwell-ring" style="border-color: ${config.color}"></div>
                <div class="cursor-pointer" style="background-color: ${config.color}"></div>
                <div class="cursor-label" style="
                    position: absolute; top: -20px; left: 10px; 
                    font-size: 10px; font-weight: bold; color: ${config.color};
                    text-shadow: 1px 1px 1px black;">
                    ${config.label}
                </div>
            `;
            
            // Styles
            this.element.style.position = 'fixed';
            this.element.style.zIndex = '9999';
            this.element.style.pointerEvents = 'none'; 
            this.element.style.transition = 'top 0.1s linear, left 0.1s linear';
            this.element.style.left = this.x + 'px';
            this.element.style.top = this.y + 'px';

            document.body.appendChild(this.element);
            console.log(`[MOUSE] Created cursor for ${deviceName}`);
        }

        update(dx, dy) {
            // 1. Movement
            this.x += dx * 3.5;
            this.y += dy * 3.5;
            this.x = Math.max(0, Math.min(window.innerWidth, this.x));
            this.y = Math.max(0, Math.min(window.innerHeight, this.y));

            // 2. Magnet Logic
            let renderX = this.x;
            let renderY = this.y;
            const target = this.findInteractiveElement(this.x, this.y);
            
            if (target) {
                const rect = target.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                if (Math.hypot(this.x - centerX, this.y - centerY) < MAGNET_DIST) {
                    renderX = centerX;
                    renderY = centerY;
                    this.element.classList.add('magnet-active');
                } else {
                    this.element.classList.remove('magnet-active');
                }
            } else {
                this.element.classList.remove('magnet-active');
            }

            this.element.style.left = `${renderX}px`;
            this.element.style.top = `${renderY}px`;

            return { target, renderX, renderY };
        }

        handleButtons(btn1, target, x, y) {
            if (btn1 === 1) {
                // Physical Click
                if (!this.isPressed) {
                    this.click(x, y); // Execute click
                    this.isPressed = true;
                    this.element.classList.add('clicking');
                    this.resetDwell(); 
                }
            } else {
                // Released
                if (this.isPressed) {
                    this.isPressed = false;
                    this.element.classList.remove('clicking');
                }
                // Dwell Logic (Only when NOT clicking)
                this.handleDwell(target, x, y);
            }
        }

        click(x, y) {
            // [RESTORED] Debounce Check
            const now = Date.now();
            if (now - this.lastClickTime < CLICK_DEBOUNCE) return;
            this.lastClickTime = now;

            console.log(`[${this.name}] CLICK at ${x}, ${y}`);
            
            this.element.style.visibility = 'hidden';
            let el = document.elementFromPoint(x, y);
            this.element.style.visibility = 'visible';

            if (el) {
                this.createRipple(x, y);
                el.click();
                if (['INPUT', 'TEXTAREA'].includes(el.tagName)) el.focus();
            }
        }

        handleDwell(target, x, y) {
            if (target) {
                if (this.dwellTarget !== target) {
                    this.resetDwell();
                    this.dwellTarget = target;
                    this.element.classList.add('dwelling');
                    
                    this.dwellTimer = setTimeout(() => {
                        this.click(x, y);
                        this.resetDwell();
                    }, DWELL_TIME);
                }
            } else {
                if (this.dwellTarget) this.resetDwell();
            }
        }

        resetDwell() {
            if (this.dwellTimer) clearTimeout(this.dwellTimer);
            this.dwellTimer = null;
            this.dwellTarget = null;
            this.element.classList.remove('dwelling');
            
            // [RESTORED] Force Animation Restart
            const ring = this.element.querySelector('.dwell-ring');
            if(ring) {
                ring.style.animation = 'none';
                ring.offsetHeight; /* Trigger Reflow */
                ring.style.animation = null; 
            }
        }

        findInteractiveElement(x, y) {
            this.element.style.visibility = 'hidden';
            let el = document.elementFromPoint(x, y);
            this.element.style.visibility = 'visible';

            while (el && el !== document.body) {
                if (['BUTTON', 'A', 'INPUT'].includes(el.tagName) || 
                    el.classList.contains('game-card') || el.onclick != null) {
                    return el;
                }
                el = el.parentElement;
            }
            return null;
        }

        createRipple(x, y) {
            const ripple = document.createElement('div');
            ripple.className = 'click-ripple';
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            document.body.appendChild(ripple);
            setTimeout(() => ripple.remove(), 500);
        }
    }

    // --- MAIN LOGIC ---
    const cursors = {}; 
    const wsHost = window.location.hostname ? window.location.hostname : "localhost";
    const wsUrl = `ws://${wsHost}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => console.log("[MOUSE] Connected to Hub.");
    
    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (!data.device || isNaN(data.x) || isNaN(data.z)) return;

            if (!cursors[data.device]) {
                cursors[data.device] = new RemoteCursor(data.device);
            }
            
            const cursor = cursors[data.device];
            const state = cursor.update(data.x, data.z);
            
            // Pass 'b1' to handle clicks
            cursor.handleButtons(data.b1, state.target, state.renderX, state.renderY);

        } catch (e) {
            console.error(e);
        }
    };
});