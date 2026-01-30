/* [2026-01-30] BRAINIAC OS MOUSE DRIVER (FIXED) */

// --- CONFIGURATION ---
const MOUSE_CONFIG = {
    scale: 7,
    invertY: true,
    dwellTime: 1500,
    magnetDist: 40
};

const DEVICE_CONFIG = {
    "Arm":   { color: "#00E676", label: "ARM" },   // Matched config.html colors
    "Glove": { color: "#00e5ff", label: "GLOVE" }
};

const cursors = {};
let socket = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log("[OS] Mouse Driver Loaded.");
    
    // FIX 1: Instantiate Cursors Immediately (The "Ghost" Fix)
    // This ensures DOM elements exist before any data arrives.
    Object.keys(DEVICE_CONFIG).forEach(devId => {
        cursors[devId] = new RemoteCursor(devId);
    });

    connectWebSocket();
});

// --- CURSOR CLASS ---
class RemoteCursor {
    constructor(id) {
        this.id = id;
        this.x = window.innerWidth / 2; 
        this.y = window.innerHeight / 2;
        this.isPressed = false;
        
        // Check if element exists (hardcoded), otherwise create it
        this.el = document.getElementById(`cursor-${id}`) || this.createCursorElement(id);
        
        // Force initial position to center so it's visible
        this.updateVisuals();
    }

    createCursorElement(id) {
        const div = document.createElement('div');
        div.className = 'remote-cursor';
        div.id = `cursor-${id}`;
        
        const cfg = DEVICE_CONFIG[id] || { color: '#FFFFFF', label: id };
        
        div.innerHTML = `
            <div class="cursor-pointer" style="background:${cfg.color}; box-shadow:0 0 10px ${cfg.color}"></div>
            <div class="cursor-label" style="color:${cfg.color}; text-shadow: 1px 1px 2px black;">${cfg.label}</div>
        `;
        document.body.appendChild(div);
        return div;
    }

    updatePosition(angleX, angleY) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const ox = angleX * MOUSE_CONFIG.scale;
        const oy = angleY * MOUSE_CONFIG.scale * (MOUSE_CONFIG.invertY ? -1 : 1);

        // Boundary Clamping (30px buffer for cursor size)
        this.x = Math.max(0, Math.min(window.innerWidth - 30, cx + ox));
        this.y = Math.max(0, Math.min(window.innerHeight - 30, cy + oy));

        this.updateVisuals();
        this.dispatchHover();
    }

    updateVisuals() {
        this.el.style.left = this.x + 'px';
        this.el.style.top = this.y + 'px';
    }

    dispatchHover() {
        // ... (Keep your existing iframe injection logic here) ...
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
                    // Dispatch detailed events for compatibility
                    const opts = { bubbles:true, clientX: innerX, clientY: innerY, view: target.contentWindow };
                    innerEl.dispatchEvent(new MouseEvent('mousedown', opts));
                    innerEl.dispatchEvent(new MouseEvent('mouseup', opts));
                }
            } catch(e) { console.error("Iframe Access Error:", e); }
        } else if (target) {
            target.click();
        }
        this.el.style.visibility = 'visible';
    }
}

// --- WEBSOCKET MANAGER ---
function connectWebSocket() {
    // FIX 2: Better fallback IP
    const wsUrl = `ws://${window.location.hostname || "192.168.4.1"}/ws`;
    console.log(`[OS] Connecting to ${wsUrl}...`);
    
    socket = new WebSocket(wsUrl);

    socket.onopen = () => console.log("[OS] Connected.");
    
    socket.onclose = () => {
        console.log("[OS] Disconnected. Retrying in 2s...");
        setTimeout(connectWebSocket, 2000);
    };

    socket.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            
            // Handle array of devices or single object
            const packets = Array.isArray(data) ? data : [data];

            packets.forEach(pkt => {
                if(!pkt.device) return;

                // Create if it doesn't exist (e.g. dynamic new device)
                if(!cursors[pkt.device]) cursors[pkt.device] = new RemoteCursor(pkt.device);
                
                const c = cursors[pkt.device];
                c.updatePosition(pkt.x, pkt.y);

                if(pkt.b1) {
                    if(!c.isPressed) { c.isPressed = true; c.click(); }
                } else {
                    c.isPressed = false;
                }
            });
        } catch(err) { console.error("Parse Error", err); }
    };
}