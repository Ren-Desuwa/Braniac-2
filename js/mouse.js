/* [2026-01-31] BRAINIAC OS MOUSE DRIVER (DEEP IFRAME SUPPORT) */

const MOUSE_CONFIG = {
    sensitivity: 15,
    gloveTimeout: 2000,
    smoothness: 0.2 // 0.1 = heavy, 1.0 = instant
};

// State memory for "Delta" calculation
const lastState = {
    Arm:   { x:0, y:0, z:0, valid:false },
    Glove: { x:0, y:0, z:0, valid:false }
};

const defaultProfiles = { 
    "Glove": { mixX: {z:1}, mixY: {y:1} }, 
    "Arm":   { mixX: {x:1}, mixY: {y:1} }
};
const profiles = JSON.parse(localStorage.getItem('brainiac_v7')) || defaultProfiles;

const cursors = {};
let lastGloveTime = 0;

document.addEventListener('DOMContentLoaded', () => {
    console.log("[OS] Deep-Link Driver Loaded.");
    ['Arm', 'Glove'].forEach(dev => {
        const el = document.getElementById(`cursor-${dev}`);
        if (el) cursors[dev] = new RemoteCursor(dev, el);
    });
    connectWebSocket();
    requestAnimationFrame(renderLoop);
});

function renderLoop() {
    ['Arm', 'Glove'].forEach(dev => {
        if(cursors[dev]) cursors[dev].render();
    });
    requestAnimationFrame(renderLoop);
}

class RemoteCursor {
    constructor(id, element) {
        this.id = id;
        this.el = element;
        // Current Visual Position (cx, cy)
        this.cx = window.innerWidth / 2;
        this.cy = window.innerHeight / 2;
        // Target Destination (tx, ty)
        this.tx = this.cx;
        this.ty = this.cy;
        this.isPressed = false;
    }

    processPacket(pkt) {
        const prev = lastState[this.id];
        const p = profiles[this.id] || defaultProfiles[this.id];

        // 1. CALCULATE DELTA
        if (!prev.valid) {
            prev.x = pkt.x; prev.y = pkt.y; prev.z = pkt.z; 
            prev.valid = true;
            return; 
        }

        let dx = pkt.x - prev.x;
        let dy = pkt.y - prev.y;
        let dz = pkt.z - prev.z;

        if(dx > 180) dx -= 360; if(dx < -180) dx += 360;
        if(dy > 180) dy -= 360; if(dy < -180) dy += 360;
        if(dz > 180) dz -= 360; if(dz < -180) dz += 360;

        prev.x = pkt.x; prev.y = pkt.y; prev.z = pkt.z;

        // 2. APPLY MAPPING
        const mixX = p.mixX || {x:1, y:0, z:0};
        const mixY = p.mixY || {x:0, y:1, z:0};

        let moveX = (dx * (mixX.x||0)) + (dy * (mixX.y||0)) + (dz * (mixX.z||0));
        let moveY = (dx * (mixY.x||0)) + (dy * (mixY.y||0)) + (dz * (mixY.z||0));

        // 3. UPDATE TARGET
        const scale = MOUSE_CONFIG.sensitivity;
        this.tx += moveX * scale;
        this.ty -= moveY * scale;

        this.tx = Math.max(0, Math.min(window.innerWidth, this.tx));
        this.ty = Math.max(0, Math.min(window.innerHeight, this.ty));
        
        // Button Logic
        if(pkt.b1 === 1 && !this.isPressed) { 
            this.isPressed = true; 
            this.click(); 
        } else if (pkt.b1 === 0) {
            this.isPressed = false;
        }
    }

    render() {
        const now = Date.now();
        const isGloveActive = (now - lastGloveTime) < MOUSE_CONFIG.gloveTimeout;
        
        // Priority Logic: You can comment this out if you want Arm to work even when Glove is on
        if (this.id === 'Arm' && isGloveActive) { this.el.style.display = 'none'; return; }
        if (this.id === 'Glove' && !isGloveActive) { this.el.style.display = 'none'; return; }
        
        this.el.style.display = 'flex';

        this.cx += (this.tx - this.cx) * MOUSE_CONFIG.smoothness;
        this.cy += (this.ty - this.cy) * MOUSE_CONFIG.smoothness;

        this.el.style.transform = `translate3d(${this.cx}px, ${this.cy}px, 0)`;
        
        // [NEW] Use the recursive dispatcher
        this.dispatchDeepEvent('mousemove');
    }

    click() {
        this.el.classList.add('clicking');
        setTimeout(() => this.el.classList.remove('clicking'), 200);

        this.el.style.visibility = 'hidden';
        // [NEW] Use the recursive dispatcher for clicks too
        this.dispatchDeepEvent('click');
        this.el.style.visibility = 'visible';
    }

    // --- RECURSIVE EVENT INJECTOR ---
    dispatchDeepEvent(eventType) {
        // Start recursion from the current window (akbay.html)
        this.injectEventRecursive(window, this.cx, this.cy, eventType);
    }

    injectEventRecursive(currentWindow, x, y, eventType) {
        try {
            const doc = currentWindow.document;
            const el = doc.elementFromPoint(x, y);

            if (el) {
                // 1. Dispatch event to the element found (so buttons highlight, etc)
                const opts = {
                    bubbles: true,
                    cancelable: true,
                    view: currentWindow,
                    clientX: x, // Important: Local coordinates for that window
                    clientY: y
                };
                
                // Construct event based on type
                const evt = (eventType === 'click') 
                    ? new MouseEvent('click', opts)
                    : new MouseEvent('mousemove', opts);

                el.dispatchEvent(evt);

                // 2. If it is an IFRAME, calculate offset and Recurse
                if (el.tagName === 'IFRAME') {
                    const rect = el.getBoundingClientRect();
                    const newX = x - rect.left;
                    const newY = y - rect.top;

                    if (el.contentWindow) {
                        this.injectEventRecursive(el.contentWindow, newX, newY, eventType);
                    }
                }
            }
        } catch (err) {
            // Blocked by cross-origin policies? (Should be fine on local file/server)
            // console.warn("Iframe Access Blocked:", err);
        }
    }
}

function connectWebSocket() {
    const wsUrl = `ws://${window.location.hostname || "192.168.4.1"}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            const packets = Array.isArray(data) ? data : [data];
            packets.forEach(pkt => {
                if (pkt.device === 'Glove' && (Math.abs(pkt.x)>0.1 || Math.abs(pkt.z)>0.1)) {
                    lastGloveTime = Date.now();
                }
                if(cursors[pkt.device]) cursors[pkt.device].processPacket(pkt);
            });
        } catch(err) {}
    };
    socket.onclose = () => setTimeout(connectWebSocket, 1000);
}