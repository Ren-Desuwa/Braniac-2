/* [2026-01-30] BRAINIAC OS MOUSE DRIVER */
/* Features: Absolute Mode, Auto-Reconnect, Cross-Iframe Injection */

// --- CONFIGURATION ---
const MOUSE_CONFIG = {
    scale: 7,
    invertY: true,
    dwellTime: 1500,
    magnetDist: 40
};

const DEVICE_CONFIG = {
    "Arm":   { color: "#00FF00", label: "ARM" },
    "Glove": { color: "#0055FF", label: "GLOVE" }
};

document.addEventListener('DOMContentLoaded', () => {
    console.log("[OS] Mouse Driver Loaded.");
    connectWebSocket();
});

// --- CURSOR CLASS ---
class RemoteCursor {
    constructor(id) {
        this.id = id;
        this.x = window.innerWidth/2; 
        this.y = window.innerHeight/2;
        this.isPressed = false;
        this.el = this.createCursorElement(id);
    }

    createCursorElement(id) {
        const div = document.createElement('div');
        div.className = 'remote-cursor';
        div.id = `cursor-${id}`;
        const cfg = DEVICE_CONFIG[id] || { color: '#FFF', label: id };
        
        div.innerHTML = `
            <div class="cursor-pointer" style="background:${cfg.color}; box-shadow:0 0 10px ${cfg.color}"></div>
            <div class="cursor-label" style="color:${cfg.color}">${cfg.label}</div>
        `;
        document.body.appendChild(div);
        return div;
    }

    updatePosition(angleX, angleY) {
        // Absolute Mapping
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const ox = angleX * MOUSE_CONFIG.scale;
        const oy = angleY * MOUSE_CONFIG.scale * (MOUSE_CONFIG.invertY ? -1 : 1);

        this.x = Math.max(0, Math.min(window.innerWidth, cx + ox));
        this.y = Math.max(0, Math.min(window.innerHeight, cy + oy));

        // Visual Move
        this.el.style.left = this.x + 'px';
        this.el.style.top = this.y + 'px';

        // Hover Effects (inject into iframe)
        this.dispatchHover();
    }

    dispatchHover() {
        const frame = document.getElementById('app-frame');
        if (frame && frame.contentDocument) {
            const rect = frame.getBoundingClientRect();
            // Create a fake mouse event inside the iframe
            const evt = new MouseEvent('mousemove', {
                bubbles: true, cancelable: true,
                clientX: this.x - rect.left, 
                clientY: this.y - rect.top,
                view: frame.contentWindow
            });
            
            // Find element under cursor inside iframe to trigger :hover
            const el = frame.contentDocument.elementFromPoint(this.x - rect.left, this.y - rect.top);
            if(el) el.dispatchEvent(evt);
        }
    }

    click() {
        // Visual Feedback
        this.el.classList.add('clicking');
        setTimeout(() => this.el.classList.remove('clicking'), 200);

        // Logic: Find what is under the cursor
        // 1. Hide cursor so we don't click ourselves
        this.el.style.visibility = 'hidden';
        
        let target = document.elementFromPoint(this.x, this.y);
        
        // 2. Check if it's the Iframe
        if (target && target.tagName === 'IFRAME') {
            const rect = target.getBoundingClientRect();
            const innerX = this.x - rect.left;
            const innerY = this.y - rect.top;
            
            // 3. Drill down into the Iframe
            try {
                const innerEl = target.contentDocument.elementFromPoint(innerX, innerY);
                if (innerEl) {
                    console.log("[OS] Clicking inside Iframe:", innerEl);
                    innerEl.click();
                    innerEl.focus();
                    
                    // Dispatch explicit events for complex apps
                    const mDown = new MouseEvent('mousedown', { bubbles:true, clientX: innerX, clientY: innerY });
                    const mUp = new MouseEvent('mouseup', { bubbles:true, clientX: innerX, clientY: innerY });
                    innerEl.dispatchEvent(mDown);
                    innerEl.dispatchEvent(mUp);
                }
            } catch(e) {
                console.error("[OS] Iframe Access Error (CORS?):", e);
            }
        } else if (target) {
            // Normal click on OS layer
            target.click();
        }

        this.el.style.visibility = 'visible';
    }
}

// --- WEBSOCKET MANAGER ---
const cursors = {};
let socket = null;

function connectWebSocket() {
    const wsUrl = `ws://${window.location.hostname || "192.168.4.1"}/ws`;
    console.log(`[OS] Connecting to ${wsUrl}...`);
    
    socket = new WebSocket(wsUrl);

    socket.onopen = () => console.log("[OS] Connected.");
    
    socket.onclose = () => {
        console.log("[OS] Disconnected. Retrying in 1s...");
        setTimeout(connectWebSocket, 1000);
    };

    socket.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if(!data.device) return;

            if(!cursors[data.device]) cursors[data.device] = new RemoteCursor(data.device);
            
            const c = cursors[data.device];
            c.updatePosition(data.x, data.y);

            // Handle Click (B1)
            if(data.b1) {
                if(!c.isPressed) {
                    c.isPressed = true;
                    c.click();
                }
            } else {
                c.isPressed = false;
            }

        } catch(err) {}
    };
}