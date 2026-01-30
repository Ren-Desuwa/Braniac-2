/* [2026-01-30] BRAINIAC MOUSE - ABSOLUTE MODE */
/* Settings: Gyro Location, X->X, Y->-Y, Scale 7 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("[MOUSE] Absolute Cursor System Initialized.");

    const DEVICE_CONFIG = {
        "Arm":   { color: "#00FF00", label: "ARM" },   // Green
        "Glove": { color: "#0055FF", label: "GLOVE" }  // Blue
    };

    // --- CONFIGURATION ---
    const SCALE = 7;          // Low scale as requested
    const INVERT_Y = true;    // "Y to -Y"
    
    // Interaction Settings
    const DWELL_TIME = 1500;
    const MAGNET_DIST = 40;
    const CLICK_DEBOUNCE = 300;

    class RemoteCursor {
        constructor(deviceName) {
            this.name = deviceName;
            this.x = window.innerWidth / 2;
            this.y = window.innerHeight / 2;
            
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
            // Smooth transition for absolute movements
            this.element.style.transition = 'top 0.05s linear, left 0.05s linear'; 
            this.element.style.left = this.x + 'px';
            this.element.style.top = this.y + 'px';

            document.body.appendChild(this.element);
        }

        update(angleX, angleY) {
            // --- ABSOLUTE MAPPING LOGIC ---
            // 1. Get Center of Screen
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            // 2. Calculate Offset (Angle * Scale)
            // X -> X
            const offsetX = angleX * SCALE;
            
            // Y -> -Y (Inverted)
            const offsetY = angleY * SCALE * (INVERT_Y ? -1 : 1);

            // 3. Apply to Position
            this.x = centerX + offsetX;
            this.y = centerY + offsetY;

            // 4. Clamp to Screen Edges
            this.x = Math.max(0, Math.min(window.innerWidth, this.x));
            this.y = Math.max(0, Math.min(window.innerHeight, this.y));

            // --- INTERACTION LOGIC (Magnet/Click) ---
            this.dispatchGlobalEvent(this.x, this.y);

            let renderX = this.x;
            let renderY = this.y;
            const target = this.findInteractiveElement(this.x, this.y);
            
            if (target) {
                const rect = target.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                if (Math.hypot(this.x - cx, this.y - cy) < MAGNET_DIST) {
                    renderX = cx;
                    renderY = cy;
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

        dispatchGlobalEvent(x, y) {
            const evt = new MouseEvent('mousemove', {
                view: window, bubbles: true, cancelable: true,
                clientX: x, clientY: y
            });
            document.dispatchEvent(evt);

            const iframe = document.querySelector('iframe');
            if (iframe && iframe.contentWindow) {
                const r = iframe.getBoundingClientRect();
                const ievt = new MouseEvent('mousemove', {
                    view: iframe.contentWindow, bubbles: true, cancelable: true,
                    clientX: x - r.left, clientY: y - r.top
                });
                iframe.contentDocument.dispatchEvent(ievt);
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

            this.createRipple(x, y);

            this.element.style.visibility = 'hidden';
            let el = document.elementFromPoint(x, y);
            
            const iframe = document.querySelector('iframe');
            if (el === iframe) {
                const r = iframe.getBoundingClientRect();
                el = iframe.contentDocument.elementFromPoint(x - r.left, y - r.top);
            }

            this.element.style.visibility = 'visible';

            if (el) {
                el.click();
                if (['INPUT', 'TEXTAREA'].includes(el.tagName)) el.focus();
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

            if (el && el.tagName === 'IFRAME') {
                try {
                    const iframe = el;
                    const r = iframe.getBoundingClientRect();
                    const inner = iframe.contentDocument.elementFromPoint(x - r.left, y - r.top);
                    if (inner && (inner.tagName === 'BUTTON' || inner.onclick)) return iframe;
                } catch(e) {}
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
            
            if (!data.device) return;

            if (!cursors[data.device]) {
                cursors[data.device] = new RemoteCursor(data.device);
            }
            
            const cursor = cursors[data.device];
            
            // --- INPUT MAPPING (USER REQUEST) ---
            // X -> X
            // Y -> Y (Logic inside update() handles the invert to -Y)
            // No other settings.
            
            const state = cursor.update(data.x, data.y);
            
            cursor.handleButtons(data.b1, state.target, state.renderX, state.renderY);

        } catch (e) {
            // Ignore errors
        }
    };
});