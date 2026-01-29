/* [2026-01-30 - MULTI-CURSOR FINAL - FIXED] */
/* Fixes: Event Dispatching for Games, Delta Calculation */

document.addEventListener('DOMContentLoaded', () => {
    console.log("[MOUSE] Multi-Cursor System Initialized.");

    const DEVICE_CONFIG = {
        "Arm":   { color: "#00FF00", label: "ARM" },   // Green
        "Glove": { color: "#0055FF", label: "GLOVE" }  // Blue
    };

    const DWELL_TIME = 1500;
    const MAGNET_DIST = 40;
    const CLICK_DEBOUNCE = 300;

    class RemoteCursor {
        constructor(deviceName) {
            this.name = deviceName;
            this.x = window.innerWidth / 2;
            this.y = window.innerHeight / 2;
            
            // [FIX 1] Track previous data to calculate Delta
            this.lastDataX = null;
            this.lastDataY = null;

            this.isPressed = false;
            this.lastClickTime = 0;
            this.dwellTimer = null;
            this.dwellTarget = null;
            
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
            
            this.element.style.position = 'fixed';
            this.element.style.zIndex = '9999';
            this.element.style.pointerEvents = 'none'; 
            this.element.style.transition = 'top 0.05s linear, left 0.05s linear'; // Faster transition
            this.element.style.left = this.x + 'px';
            this.element.style.top = this.y + 'px';

            document.body.appendChild(this.element);
        }

        update(rawX, rawY) {
            // [FIX 1] Initialize previous data if first frame
            if (this.lastDataX === null) {
                this.lastDataX = rawX;
                this.lastDataY = rawY;
                return { target: null, renderX: this.x, renderY: this.y };
            }

            // [FIX 1] Calculate Change (Delta) since last packet
            const deltaX = rawX - this.lastDataX;
            const deltaY = rawY - this.lastDataY;
            
            this.lastDataX = rawX;
            this.lastDataY = rawY;

            // Apply Delta to Screen Position
            // Multiplier 15 matches your config.html feel
            this.x += deltaX * 15; 
            this.y += deltaY * 15;

            // Clamp to Screen
            this.x = Math.max(0, Math.min(window.innerWidth, this.x));
            this.y = Math.max(0, Math.min(window.innerHeight, this.y));

            // [FIX 2] DISPATCH EVENT FOR GAMES
            // This tricks the browser into thinking a real mouse moved
            this.dispatchGlobalEvent(this.x, this.y);

            // Magnet Logic
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

        // [FIX 2 Helper]
        dispatchGlobalEvent(x, y) {
            // Dispatch standard mousemove for games
            const evt = new MouseEvent('mousemove', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: x,
                clientY: y
            });
            document.dispatchEvent(evt);

            // Also dispatch to iframes (Launcher logic)
            const iframe = document.querySelector('iframe');
            if (iframe && iframe.contentWindow) {
                const iframeRect = iframe.getBoundingClientRect();
                // Adjust coordinates relative to iframe
                const iframeEvt = new MouseEvent('mousemove', {
                    view: iframe.contentWindow,
                    bubbles: true,
                    cancelable: true,
                    clientX: x - iframeRect.left,
                    clientY: y - iframeRect.top
                });
                iframe.contentDocument.dispatchEvent(iframeEvt);
            }
        }

        handleButtons(btn1, target, x, y) {
            if (btn1 === 1) {
                if (!this.isPressed) {
                    this.click(x, y); 
                    this.isPressed = true;
                    this.element.classList.add('clicking');
                    this.resetDwell(); 
                }
            } else {
                if (this.isPressed) {
                    this.isPressed = false;
                    this.element.classList.remove('clicking');
                }
                this.handleDwell(target, x, y);
            }
        }

        click(x, y) {
            const now = Date.now();
            if (now - this.lastClickTime < CLICK_DEBOUNCE) return;
            this.lastClickTime = now;

            // Visual Ripple
            this.createRipple(x, y);

            // Temporarily hide cursor to click element underneath
            this.element.style.visibility = 'hidden';
            let el = document.elementFromPoint(x, y);
            
            // Handle Iframe Clicks
            const iframe = document.querySelector('iframe');
            if (el === iframe) {
                const iframeRect = iframe.getBoundingClientRect();
                el = iframe.contentDocument.elementFromPoint(x - iframeRect.left, y - iframeRect.top);
            }

            this.element.style.visibility = 'visible';

            if (el) {
                console.log(`[${this.name}] Clicked:`, el);
                el.click();
                if (['INPUT', 'TEXTAREA'].includes(el.tagName)) el.focus();
                
                // Dispatch mousedown/mouseup for games that use it
                const down = new MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y });
                const up = new MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y });
                el.dispatchEvent(down);
                el.dispatchEvent(up);
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
            
            const ring = this.element.querySelector('.dwell-ring');
            if(ring) {
                ring.style.animation = 'none';
                ring.offsetHeight; 
                ring.style.animation = null; 
            }
        }

        findInteractiveElement(x, y) {
            this.element.style.visibility = 'hidden';
            let el = document.elementFromPoint(x, y);
            this.element.style.visibility = 'visible';

            // Check if we are over an iframe
            if (el && el.tagName === 'IFRAME') {
                try {
                    const iframe = el;
                    const iframeRect = iframe.getBoundingClientRect();
                    const innerEl = iframe.contentDocument.elementFromPoint(x - iframeRect.left, y - iframeRect.top);
                    if (innerEl && (innerEl.tagName === 'BUTTON' || innerEl.onclick)) {
                        return iframe; // Return iframe as the target to trigger Magnet/Dwell
                    }
                } catch(e) { /* CORS restriction if different origin */ }
            }

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

    // --- WEBSOCKET CONNECTION ---
    const cursors = {}; 
    const wsHost = window.location.hostname ? window.location.hostname : "192.168.4.1";
    const wsUrl = `ws://${wsHost}/ws`;
    
    console.log(`[MOUSE] Connecting to ${wsUrl}...`);
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => console.log("[MOUSE] Connected to Hub.");
    socket.onerror = (e) => console.log("[MOUSE] WebSocket Error:", e);
    
    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            // Sanity check data
            if (!data.device || isNaN(data.x) || isNaN(data.z)) return;

            if (!cursors[data.device]) {
                cursors[data.device] = new RemoteCursor(data.device);
            }
            
            const cursor = cursors[data.device];
            
            // Use X and Z (Yaw) for 2D movement
            const state = cursor.update(data.x, data.z);
            
            cursor.handleButtons(data.b1, state.target, state.renderX, state.renderY);

        } catch (e) {
            // Ignore malformed JSON
        }
    };
});