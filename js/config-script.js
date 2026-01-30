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
defaultProfiles.Glove.mixX.z = 1; defaultProfiles.Glove.mixY.y = 1; 
defaultProfiles.Arm.mixX.x = 1; defaultProfiles.Arm.mixY.y = 1;

let profiles = JSON.parse(localStorage.getItem('brainiac_v7')) || defaultProfiles;
const lastData = { Arm: { x:0, y:0, z:0, valid:false, connected:false }, Glove: { x:0, y:0, z:0, valid:false, connected:false } };

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
};

document.getElementById('btn-save').onclick = () => { 
    localStorage.setItem('brainiac_v7', JSON.stringify(profiles)); 
    document.getElementById('btn-save').innerText = "SAVED!"; 
    setTimeout(() => document.getElementById('btn-save').innerText = "SAVE CONFIGURATION", 1000); 
};

// --- 4. CALIBRATION ---
let calib = { run: false, step: 0, dev: null, center: {x:0, y:0} };
const STEPS = ["CENTER", "TOP", "BOTTOM", "LEFT", "RIGHT"];

window.startCalib = (dev) => {
    calib = { run: true, step: 0, dev: dev, center: {x:0,y:0} };
    profiles[dev].useRelative = false; // Force Absolute
    loadUI();
    document.getElementById('calib-overlay').style.display = 'flex';
    updateCalibUI();
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
setTimeout(resetCenter, 500); // Trigger center once layout loads

ws.onmessage = (e) => {
    try {
        const packet = JSON.parse(e.data);
        const devices = Array.isArray(packet) ? packet : [packet];
        const arena = document.getElementById('arena');
        const w = arena.clientWidth; 
        const h = arena.clientHeight;
        // console.log(JSON.parse(e.data));

        devices.forEach(data => {
            const dev = data.device; // "Arm" or "Glove"
            if (!dev) return;
            const suffix = dev.toLowerCase();
            const p = profiles[dev];
            const prev = lastData[dev];

            // [FIX] Auto-Center on First Connection
            if (!prev.connected) {
                state[dev].tx = w/2; state[dev].ty = h/2;
                state[dev].cx = w/2; state[dev].cy = h/2;
                prev.connected = true;
                prev.valid = false;
            }

            // RAW DISPLAY
            ['x','y','z'].forEach(k => document.getElementById(`${suffix}-${k}`).innerText = data[k].toFixed(1));
            const gx=(data.gx||0)/1000, gy=(data.gy||0)/1000, gz=(data.gz||0)/1000;
            document.getElementById(`${suffix}-gx`).innerText = gx.toFixed(2);
            document.getElementById(`${suffix}-gy`).innerText = gy.toFixed(2);
            document.getElementById(`${suffix}-gz`).innerText = gz.toFixed(2);
            
            // [FIX] Status Badge Logic
            const badge = document.getElementById(`${suffix}-status`);
            if (dev === "Glove") {
                // Check if B2 is present. Using loose equality to catch '1' vs 1
                if (data.b2 == 1) {
                    badge.innerText = (data.b1) ? "CLICK" : "ONLINE";
                    badge.style.color = (data.b1) ? "#fff" : "#00e5ff"; // Blue
                } else {
                    badge.innerText = "OFFLINE";
                    badge.style.color = "#888"; // Grey
                }
            } else {
                badge.innerText = (data.b1) ? "CLICK" : "IDLE";
                badge.style.color = (data.b1) ? "#00E676" : "#888";
            }
            
            // --- PIPELINE ---
            let inX, inY, inZ;
            
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

            if (p.dynamic) inZ = (inX * gx) + (inY * gy) + (inZ * gz);

            if (p.gravityLock) {
                const threshold = p.gravThresh / 100;
                if (Math.abs(gy) > threshold) {
                    // Logic for vertical hand could be inserted here
                }
            }

            let mixedX = (inX * p.mixX.x) + (inY * p.mixX.y) + (inZ * p.mixX.z);
            let mixedY = (inX * p.mixY.x) + (inY * p.mixY.y) + (inZ * p.mixY.z);

            const dz = (v) => (Math.abs(v) > p.deadzone) ? (v - (Math.sign(v)*p.deadzone)) : 0;
            const ax=dz(data.lax||0), ay=dz(data.lay||0), az=dz(data.laz||0);
            let accX = (ax * p.mixX.lax) + (ay * p.mixX.lay) + (az * p.mixX.laz);
            let accY = (ax * p.mixY.lax) + (ay * p.mixY.lay) + (az * p.mixY.laz);

            if (calib.run && calib.dev === dev) {
                let valX = mixedX; let valY = mixedY;
                document.getElementById('calib-val').innerText = `X:${valX.toFixed(1)} Y:${valY.toFixed(1)}`;
                if (calib.step===0) { calib.center.x=valX; calib.center.y=valY; }
                else if (calib.step===1) p.calib.minY = valY - calib.center.y;
                else if (calib.step===2) p.calib.maxY = valY - calib.center.y;
                else if (calib.step===3) p.calib.minX = valX - calib.center.x;
                else if (calib.step===4) p.calib.maxX = valX - calib.center.x;
                return;
            }

            // Global Inverts
            if (p.invX) mixedX = -mixedX;
            if (p.invY) mixedY = -mixedY;

            if (p.useRelative) {
                state[dev].tx += (mixedX * p.gyroScale) + (accX * (p.accelScale/100));
                state[dev].ty += (mixedY * p.gyroScale) + (accY * (p.accelScale/100));
            } else {
                if (p.calib.active) {
                    const c = p.calib;
                    let normX = 0.5, normY = 0.5;
                    // Improved Calib Logic: Use the recorded Min/Max ranges
                    // (Current - Center) gives offset.
                    let offX = mixedX - calib.center.x;
                    let offY = mixedY - calib.center.y;
                    
                    if (offX < 0 && c.minX !== 0) normX = 0.5 - ((offX / c.minX) * 0.5); // minX is negative
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

            // Clamp
            state[dev].tx = Math.max(0, Math.min(w, state[dev].tx));
            state[dev].ty = Math.max(0, Math.min(h, state[dev].ty));

            const cursor = document.getElementById(`cursor-${suffix}`);
            if (data.b1) cursor.classList.add('click'); else cursor.classList.remove('click');
        });
    } catch(e) {}
};

function render() {
    ['Arm', 'Glove'].forEach(dev => {
        const s = state[dev];
        const smooth = (profiles[dev].smooth / 100) || 0.2; 
        s.cx += (s.tx - s.cx) * smooth; 
        s.cy += (s.ty - s.cy) * smooth;
        const el = document.getElementById(`cursor-${dev.toLowerCase()}`);
        if(el) { el.style.left = `${s.cx}px`; el.style.top = `${s.cy}px`; }
    });
    requestAnimationFrame(render);
}
loadUI(); render();