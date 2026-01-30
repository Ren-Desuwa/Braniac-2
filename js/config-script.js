// --- 1. CONFIG STORE V7 ---
const KEYS = ['x','y','z','lax','lay','laz'];

function createProfile() {
    return { 
        mixX: { x:0, y:0, z:0, lax:0, lay:0, laz:0 }, 
        mixY: { x:0, y:0, z:0, lax:0, lay:0, laz:0 }, 
        gyroScale: 15, accelScale: 5, deadzone: 200, 
        smooth: 20, 
        dynamic: true, gravityLock: true, gravThresh: 70, 
        useRelative: false, invX: false, invY: false,
        calib: { active: false, minX:0, maxX:0, minY:0, maxY:0, centerX:0, centerY:0 }
    };
}

const defaultProfiles = { "Glove": createProfile(), "Arm": createProfile() };
// Default Mappings
defaultProfiles.Glove.mixX.z = 1; defaultProfiles.Glove.mixY.y = 1; 
defaultProfiles.Arm.mixX.x = 1; defaultProfiles.Arm.mixY.y = 1;

// Load from storage OR use defaults
let profiles = JSON.parse(localStorage.getItem('brainiac_v7')) || defaultProfiles;

// [FIX] SAFETY CHECK: If Glove has NO mappings (all 0), force defaults
function validateMappings() {
    ['Arm', 'Glove'].forEach(dev => {
        const p = profiles[dev];
        // Check if all Gyro keys in X and Y mixers are 0
        const allZeroX = ['x','y','z'].every(k => p.mixX[k] === 0);
        const allZeroY = ['x','y','z'].every(k => p.mixY[k] === 0);
        
        if(allZeroX && allZeroY) {
            console.log(`[Config] ${dev} has no mappings. Applying defaults.`);
            if(dev === 'Glove') { p.mixX.z = 1; p.mixY.y = 1; }
            if(dev === 'Arm')   { p.mixX.x = 1; p.mixY.y = 1; }
        }
    });
}
validateMappings(); // Run immediately on load

const lastData = { Arm: { x:0, y:0, z:0, valid:false, connected:false }, Glove: { x:0, y:0, z:0, valid:false, connected:false } };

// --- LOGGING UTILS ---
let frameCount = 0;
const logEl = document.getElementById('console-log');

function logToScreen(msg) {
    if(!logEl) return;
    const line = document.createElement('div');
    line.innerText = `> ${msg}`;
    line.style.borderBottom = "1px solid #333";
    line.style.padding = "2px 0";
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
    
    // cleanup old logs to prevent lag
    if (logEl.childElementCount > 30) logEl.removeChild(logEl.firstChild);
}

// --- 2. UI SYNC ---
function loadUI() {
    ['Arm', 'Glove'].forEach(dev => {
        const p = profiles[dev];
        const suffix = dev.toLowerCase();
        KEYS.forEach(k => { setBtn(dev, 'x', k, p.mixX[k]); setBtn(dev, 'y', k, p.mixY[k]); });

        setVal(`rng-sg-${suffix}`, p.gyroScale, `lbl-sg-${suffix}`);
        setVal(`rng-sa-${suffix}`, p.accelScale, `lbl-sa-${suffix}`);
        setVal(`rng-gt-${suffix}`, p.gravThresh/100, `lbl-gt-${suffix}`);
        setVal(`rng-sm-${suffix}`, p.smooth/100,     `lbl-sm-${suffix}`);
        
        document.getElementById(`chk-dyn-${suffix}`).checked = p.dynamic;
        document.getElementById(`chk-grav-${suffix}`).checked = p.gravityLock;
        document.getElementById(`chk-mode-${suffix}`).checked = p.useRelative;
        document.getElementById(`chk-invx-${suffix}`).checked = p.invX;
        document.getElementById(`chk-invy-${suffix}`).checked = p.invY;
    });
}

function setBtn(dev, s, i, v) { 
    const el = document.getElementById(`btn-${s}-${i}-${dev.toLowerCase()}`);
    // Visual state: 0=off, 1=pos, -1=neg
    if(el) el.setAttribute('data-state', v || 0);
}

function setVal(id, v, l) { 
    if(document.getElementById(id)) { 
        document.getElementById(id).value = v * (id.includes('sm')||id.includes('gt') ? 100 : 1); 
        document.getElementById(l).innerText = v; 
    } 
}

// --- 3. INPUT HANDLERS ---
window.cycleMap = (d, s, i) => { 
    let t = (s === 'x') ? profiles[d].mixX : profiles[d].mixY; 
    t[i] = (!t[i]) ? 1 : (t[i] === 1 ? -1 : 0); 
    loadUI(); 
};
window.updateSlider = (d, k, v) => { profiles[d][k] = parseInt(v); loadUI(); };
window.updateChk = (d, k, v) => { profiles[d][k] = v; };

window.resetCenter = () => {
    const arena = document.getElementById('arena');
    const w = arena.clientWidth; const h = arena.clientHeight;
    ['Arm', 'Glove'].forEach(dev => { 
        state[dev].tx = w/2; state[dev].ty = h/2; 
        state[dev].cx = w/2; state[dev].cy = h/2; 
    });
    logToScreen("Center Reset Triggered");
};

// Factory Reset Function
window.factoryReset = () => {
    if(confirm("Reset all configurations to default?")) {
        localStorage.removeItem('brainiac_v7');
        location.reload();
    }
};

document.getElementById('btn-save').onclick = () => { 
    localStorage.setItem('brainiac_v7', JSON.stringify(profiles)); 
    document.getElementById('btn-save').innerText = "SAVED!"; 
    setTimeout(() => document.getElementById('btn-save').innerText = "SAVE CONFIGURATION", 1000); 
    logToScreen("Configuration Saved");
};

// --- 4. CALIBRATION ---
let calib = { run: false, step: 0, dev: null, center: {x:0, y:0} };
const STEPS = ["CENTER", "TOP", "BOTTOM", "LEFT", "RIGHT"];

window.startCalib = (dev) => {
    calib = { run: true, step: 0, dev: dev, center: {x:0,y:0} };
    profiles[dev].useRelative = false; // Force Absolute for calibration
    loadUI();
    document.getElementById('calib-overlay').style.display = 'flex';
    updateCalibUI();
    logToScreen(`Started Calibration for ${dev}`);
};
window.nextCalibStep = () => {
    calib.step++;
    if(calib.step >= STEPS.length) {
        profiles[calib.dev].calib.active = true;
        calib.run = false;
        document.getElementById('calib-overlay').style.display = 'none';
        alert("Calibration Complete!");
    } else updateCalibUI();
};
window.cancelCalib = () => { calib.run = false; document.getElementById('calib-overlay').style.display = 'none'; };
function updateCalibUI() { document.getElementById('calib-step').innerText = `STEP ${calib.step+1}: ${STEPS[calib.step]}`; }

// --- 5. ENGINE ---
const ws = new WebSocket(`ws://${window.location.hostname || "192.168.4.1"}/ws`);
const state = { Arm: { cx:0, cy:0, tx:0, ty:0 }, Glove: { cx:0, cy:0, tx:0, ty:0 } };
setTimeout(resetCenter, 500); 

ws.onmessage = (e) => {
    try {
        const packet = JSON.parse(e.data);
        const devices = Array.isArray(packet) ? packet : [packet];
        const arena = document.getElementById('arena');
        const w = arena.clientWidth; 
        const h = arena.clientHeight;
        
        frameCount++;
        const debug = document.getElementById('chk-debug').checked;

        devices.forEach(data => {
            const dev = data.device; 
            if (!dev) return;
            const suffix = dev.toLowerCase();
            const p = profiles[dev];
            const prev = lastData[dev];

            // Auto-Center on First Connection
            if (!prev.connected) {
                state[dev].tx = w/2; state[dev].ty = h/2;
                state[dev].cx = w/2; state[dev].cy = h/2;
                prev.connected = true;
                prev.valid = false;
                logToScreen(`${dev} Connected!`);
            }

            // RAW DISPLAY
            ['x','y','z'].forEach(k => {
                const el = document.getElementById(`${suffix}-${k}`);
                if(el) el.innerText = data[k].toFixed(1);
            });
            
            // [FIX 1] SMART GRAVITY SCALING
            // Checks if gravity is Integer (e.g. 1000) or Float (e.g. 1.0)
            let gx = data.gx || 0; let gy = data.gy || 0; let gz = data.gz || 0;
            if (Math.abs(gx) > 4 || Math.abs(gy) > 4 || Math.abs(gz) > 4) {
                gx /= 1000; gy /= 1000; gz /= 1000;
            }

            const elGx = document.getElementById(`${suffix}-gx`);
            if(elGx) {
                elGx.innerText = gx.toFixed(2);
                document.getElementById(`${suffix}-gy`).innerText = gy.toFixed(2);
                document.getElementById(`${suffix}-gz`).innerText = gz.toFixed(2);
            }

            // --- STATUS BADGE LOGGING ---
            const badge = document.getElementById(`${suffix}-status`);
            
            if (dev === "Glove") {
                // [DIAGNOSTIC LOG] Runs once every 60 frames (~1 sec) to verify b2
                if (debug && frameCount % 60 === 0) {
                    logToScreen(`[STATUS] b2 Value: ${data.b2} | Type: ${typeof data.b2}`);
                    if (data.b2 == 1) logToScreen(`[STATUS] Check Passed (== 1)`);
                    else logToScreen(`[STATUS] Check FAILED (!= 1)`);
                }

                // [LOGIC FIX] Allow looser check OR data presence
                // If b2 is 1 (int) OR "1" (string) OR we have movement data
                const hasData = (Math.abs(data.x) > 0 || Math.abs(data.y) > 0);
                
                if (data.b2 == 1 || hasData) { 
                    badge.innerText = (data.b1) ? "CLICK" : "ONLINE";
                    badge.style.color = (data.b1) ? "#fff" : "#00e5ff"; 
                } else {
                    badge.innerText = "OFFLINE";
                    badge.style.color = "#888"; 
                }
            } else {
                // Arm Logic
                badge.innerText = (data.b1) ? "CLICK" : "IDLE";
                badge.style.color = (data.b1) ? "#00E676" : "#888";
            }
            
            // --- MOVEMENT PIPELINE ---
            let inX, inY, inZ;
            let logMsg = ""; 

            // 1. INPUT PROCESSING
            if (p.useRelative) {
                if (!prev.valid) { prev.x=data.x; prev.y=data.y; prev.z=data.z; prev.valid=true; return; }
                let dx = data.x - prev.x; let dy = data.y - prev.y; let dz = data.z - prev.z;
                if(dx>180)dx-=360; if(dx<-180)dx+=360; 
                if(dy>180)dy-=360; if(dy<-180)dy+=360;
                if(dz>180)dz-=360; if(dz<-180)dz+=360;
                prev.x=data.x; prev.y=data.y; prev.z=data.z;
                inX=dx; inY=dy; inZ=dz;
            } else {
                inX=data.x; inY=data.y; inZ=data.z;
                prev.x=data.x; prev.y=data.y; prev.z=data.z; prev.valid=true;
            }

            // 2. SAFE DYNAMIC YAW
            if (p.dynamic) {
                // Only use Dynamic Yaw if Gravity is valid (prevent Zeroing out)
                if (Math.abs(gx) + Math.abs(gy) + Math.abs(gz) > 0.1) {
                    inZ = (inX * gx) + (inY * gy) + (inZ * gz);
                }
            }

            // 3. MIXING
            let mixedX = (inX * p.mixX.x) + (inY * p.mixX.y) + (inZ * p.mixX.z);
            let mixedY = (inX * p.mixY.x) + (inY * p.mixY.y) + (inZ * p.mixY.z);

            // LOGGING
            if (debug && dev === "Glove" && frameCount % 30 === 0) {
                 logMsg = `[GLOVE] In: ${inX.toFixed(1)}, ${inY.toFixed(1)}, ${inZ.toFixed(1)}`;
                 logMsg += ` -> Out: ${mixedX.toFixed(1)}, ${mixedY.toFixed(1)}`;
                 logToScreen(logMsg);
            }

            // 4. ACCELEROMETER
            const dz = (v) => (Math.abs(v) > p.deadzone) ? (v - (Math.sign(v)*p.deadzone)) : 0;
            const ax=dz(data.lax||0), ay=dz(data.lay||0), az=dz(data.laz||0);
            let accX = (ax * p.mixX.lax) + (ay * p.mixX.lay) + (az * p.mixX.laz);
            let accY = (ax * p.mixY.lax) + (ay * p.mixY.lay) + (az * p.mixY.laz);

            // 5. INVERTS
            if (p.invX) mixedX = -mixedX;
            if (p.invY) mixedY = -mixedY;

            // 6. APPLY
            if (p.useRelative) {
                state[dev].tx += (mixedX * p.gyroScale) + (accX * (p.accelScale/100));
                state[dev].ty += (mixedY * p.gyroScale) + (accY * (p.accelScale/100));
            } else {
                // Absolute Mode
                if (p.calib.active) {
                    const c = p.calib;
                    let normX = 0.5, normY = 0.5;
                    let offX = mixedX - calib.center.x;
                    let offY = mixedY - calib.center.y;
                    
                    if (offX < 0 && c.minX !== 0) normX = 0.5 - ((offX / c.minX) * 0.5); 
                    else if (offX > 0 && c.maxX !== 0) normX = 0.5 + ((offX / c.maxX) * 0.5);
                    
                    if (offY < 0 && c.minY !== 0) normY = 0.5 - ((offY / c.minY) * 0.5);
                    else if (offY > 0 && c.maxY !== 0) normY = 0.5 + ((offY / c.maxY) * 0.5);
                    
                    state[dev].tx = normX * w;
                    state[dev].ty = normY * h;
                } else {
                    state[dev].tx = (w/2) + (mixedX * p.gyroScale);
                    state[dev].ty = (h/2) + (mixedY * p.gyroScale);
                }
            }

            // 7. CLAMP
            state[dev].tx = Math.max(0, Math.min(w, state[dev].tx));
            state[dev].ty = Math.max(0, Math.min(h, state[dev].ty));

            // 8. CLICK VISUALS
            const cursor = document.getElementById(`cursor-${suffix}`);
            if(cursor) {
                if (data.b1) cursor.classList.add('click'); else cursor.classList.remove('click');
            }
        });
    } catch(e) { /* Ignore parse errors */ }
};

function render() {
    ['Arm', 'Glove'].forEach(dev => {
        const s = state[dev];
        const smooth = (profiles[dev].smooth / 100) || 0.2; 
        
        // Simple Lerp for smoothing
        s.cx += (s.tx - s.cx) * smooth; 
        s.cy += (s.ty - s.cy) * smooth;
        
        const el = document.getElementById(`cursor-${dev.toLowerCase()}`);
        if(el) { el.style.left = `${s.cx}px`; el.style.top = `${s.cy}px`; }
    });
    requestAnimationFrame(render);
}

loadUI(); 
render();