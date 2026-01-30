/* [2026-01-30] BRAINIAC OS MOUSE DRIVER (STATIC HTML MODE) */

const MOUSE_CONFIG = {
    sensitivity: 15, // Multiplier for movement
    deadzone: 0.5    // Minimum movement to register
};

const cursors = {};
let socket = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log("[OS] Mouse Driver Loaded.");
    
    // Initialize wrappers for the existing HTML elements
    ['Arm', 'Glove'].forEach(devId => {
        const el = document.getElementById(`cursor-${devId}`);
        if (el) {
            cursors[devId] = new RemoteCursor(devId, el);
        } else {
            console.warn(`[OS] Warning: Element #cursor-${devId} not found in HTML.`);
        }
    });

    connectWebSocket();
});

class RemoteCursor {
    constructor(id, element) {
        this.id = id;
        this.el = element;
        this.x = window.innerWidth / 2;
        this.y = window.innerHeight / 2;
        this.isPressed = false;
    }

    updatePosition(gyroX, gyroY) {
        // Show cursor if it was hidden
        if (this.el.style.display === 'none' || this.el.style.display === '') {
            this.el.style.display = 'flex';
        }

        // Apply Deadzone
        if (Math.abs(gyroX) < MOUSE_CONFIG.deadzone) gyroX = 0;
        if (Math.abs(gyroY) < MOUSE_CONFIG.deadzone) gyroY = 0;

        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;

        // MAPPING: X -> X, Y -> -Y (Inverted)
        const deltaX = gyroX * MOUSE_CONFIG.sensitivity;
        const deltaY = gyroY * -MOUSE_CONFIG.sensitivity; 

        // Calculate
        let rawX = cx + deltaX;
        let rawY = cy + deltaY;

        // Clamp to Dotted Border (approx 20px padding)
        this.x = Math.max(20, Math.min(window.innerWidth - 20, rawX));
        this.y = Math.max(20, Math.min(window.innerHeight - 20, rawY));

        this.updateVisuals();
        this.dispatchHover();
    }

    updateVisuals() {
        this.el.style.left = this.x + 'px';
        this.el.style.top = this.y + 'px';
    }

    dispatchHover() {
        const frame = document.getElementById('app-frame');
        if (frame && frame.contentDocument) {
            const rect = frame.getBoundingClientRect();
            const evt = new MouseEvent('mousemove', {
                bubbles: true, cancelable: true,
                clientX: this.x - rect.left, 
                clientY: this.y - rect.top,
                view: frame.contentWindow
            });
            
            const el = frame.contentDocument.elementFromPoint(this.x - rect.left, this.y - rect.top);
            if(el) el.dispatchEvent(evt);
        }
    }

    click() {
        this.el.classList.add('clicking');
        setTimeout(() => this.el.classList.remove('clicking'), 200);

        this.el.style.visibility = 'hidden';
        let target = document.elementFromPoint(this.x, this.y);
        
        if (target && target.tagName === 'IFRAME') {
            try {
                const rect = target.getBoundingClientRect();
                const innerX = this.x - rect.left;
                const innerY = this.y - rect.top;
                const innerEl = target.contentDocument.elementFromPoint(innerX, innerY);
                
                if (innerEl) {
                    innerEl.click();
                    innerEl.focus();
                    const opts = { bubbles:true, clientX: innerX, clientY: innerY, view: target.contentWindow };
                    innerEl.dispatchEvent(new MouseEvent('mousedown', opts));
                    innerEl.dispatchEvent(new MouseEvent('mouseup', opts));
                }
            } catch(e) { console.error("Iframe Click Error", e); }
        } else if (target) {
            target.click();
        }
        this.el.style.visibility = 'visible';
    }
}

function connectWebSocket() {
    const wsUrl = `ws://${window.location.hostname || "192.168.4.1"}/ws`;
    socket = new WebSocket(wsUrl);
    
    socket.onopen = () => console.log("[OS] Connected.");
    socket.onclose = () => setTimeout(connectWebSocket, 2000);

    socket.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            const packets = Array.isArray(data) ? data : [data];

            packets.forEach(pkt => {
                const c = cursors[pkt.device];
                if (!c) return; // Ignore if no matching HTML element exists

                c.updatePosition(pkt.x, pkt.y);

                // Handle Button (1 = pressed)
                if(pkt.b1 === 1) {
                    if(!c.isPressed) { c.isPressed = true; c.click(); }
                } else {
                    c.isPressed = false;
                }
            });
        } catch(err) {}
    };
}