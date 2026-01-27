/* [2026-01-28 11:15 pm - batch 1.68.0] */
/* patient/games/raining cats and dogs/raining-cats-dogs-script.js */

document.addEventListener('DOMContentLoaded', () => {
    
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const startScreen = document.getElementById('startScreen');
    const startBtn = document.getElementById('startGameBtn');
    const guideTrack = document.getElementById('guide-bottom');
    const guideText = document.getElementById('guide-text');

    // --- RESOLUTION ---
    const BASE_W = 605;
    const BASE_H = 1000;

    const CONFIG = {
        targetReps: 5,
        targetSets: 3,
        spawnRate: 1200,
        gravity: 3.5,
        armColor: '#ffccaa',
        sleeveColor: '#2f81f7', 
        armThick: 28
    };

    // --- STATE ---
    let currentSet = 1, currentReps = 0, score = 0;
    let isPlaying = false;
    let hasCaughtItem = false;
    
    // Target positions for mouse following
    let targetX = BASE_W / 2;
    let targetY = BASE_H - 250;
    let reachLevelY = 0; // For tracking pull-back completion

    // --- ASSETS ---
    const ASSET_PATH = 'assets/images/';
    const assets = { basket: new Image(), cats: [], dogs: [] };

    assets.basket.src = ASSET_PATH + 'basket.png';

    for(let i=1; i<=3; i++) {
        let c = new Image(); c.src = `${ASSET_PATH}cat-falling-${i}.png`; assets.cats.push(c);
        let d = new Image(); d.src = `${ASSET_PATH}dog-falling-${i}.png`; assets.dogs.push(d);
    }
    
    assets.basket.onload = () => { if(!isPlaying) draw(); };

    // --- ENTITIES ---
    const shoulders = { y: BASE_H + 50, offset: 150 }; 
    const basket = { x: BASE_W / 2, y: BASE_H - 250, w: 375, h: 216 };
    
    // Boundaries for basket movement
    const MIN_Y = 200;
    const MAX_Y = BASE_H - 220;
    const MIN_X = 50;
    const MAX_X = BASE_W - basket.w - 50;
    
    let items = [];
    let particles = [];

    // --- COMMUNICATION ---
    function sendStats() {
        window.parent.postMessage({ type: 'updateStats', score, reps: currentReps, sets: currentSet }, '*');
    }

    // --- INPUT (Free Roam X/Y) ---
    document.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = BASE_W / rect.width;
        const scaleY = BASE_H / rect.height;

        // Map mouse directly to game coordinates
        let mouseX = (e.clientX - rect.left) * scaleX;
        let mouseY = (e.clientY - rect.top) * scaleY;

        // Center basket on mouse and clamp to boundaries
        targetX = Math.max(MIN_X, Math.min(MAX_X, mouseX - basket.w / 2));
        targetY = Math.max(MIN_Y, Math.min(MAX_Y, mouseY - basket.h / 2));

        // Calculate vertical reach level for "Pull" logic (0.0 = bottom, 1.0 = top)
        reachLevelY = 1 - ((targetY - MIN_Y) / (MAX_Y - MIN_Y));
    });

    // --- IK LOGIC ---
    function drawArm(shoulderX, shoulderY, handX, handY, isLeft) {
        const upperArmLen = 380;
        const forearmLen = 350;
        
        const dx = handX - shoulderX;
        const dy = handY - shoulderY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        // Slightly limit reach so arms don't completely lock straight
        const reachLimit = upperArmLen + forearmLen - 15;
        const clampedDist = Math.min(dist, reachLimit);
        
        const angleToHand = Math.atan2(dy, dx);
        
        const a = upperArmLen, b = forearmLen, c = clampedDist;
        const cosAngle = (a*a + c*c - b*b) / (2*a*c);
        const angleElbow = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
        
        const bendDir = isLeft ? -1 : 1;
        const elbowX = shoulderX + Math.cos(angleToHand + (angleElbow * bendDir)) * upperArmLen;
        const elbowY = shoulderY + Math.sin(angleToHand + (angleElbow * bendDir)) * upperArmLen;

        // Sleeve
        ctx.beginPath(); ctx.moveTo(shoulderX, shoulderY); ctx.lineTo(elbowX, elbowY);
        ctx.lineWidth = CONFIG.armThick + 8; ctx.strokeStyle = CONFIG.sleeveColor; ctx.lineCap = 'round'; ctx.stroke();

        // Skin
        ctx.beginPath(); ctx.moveTo(elbowX, elbowY); ctx.lineTo(handX, handY);
        ctx.lineWidth = CONFIG.armThick; ctx.strokeStyle = CONFIG.armColor; ctx.lineCap = 'round'; ctx.stroke();

        // Elbow
        ctx.beginPath(); ctx.arc(elbowX, elbowY, (CONFIG.armThick/2) + 2, 0, Math.PI*2);
        ctx.fillStyle = CONFIG.sleeveColor; ctx.fill();
    }

    // --- GAMEPLAY ---
    let spawnTimer = 0;

    function spawnItem() {
        // Spawn only in the middle 50% of the screen width
        const margin = BASE_W * 0.25;
        const spawnX = Math.random() * (BASE_W - margin*2) + margin;
        
        const isCat = Math.random() > 0.5;
        const spriteList = isCat ? assets.cats : assets.dogs;
        const sprite = spriteList[Math.floor(Math.random() * spriteList.length)];
        
        // Increased item size to 100x100
        items.push({
            x: spawnX, y: -100, w: 100, h: 100,
            img: sprite, vx: (Math.random() - 0.5) * 1.5, vy: CONFIG.gravity + (Math.random())
        });
    }

    function createParticles(x, y, color) {
        for(let i=0; i<8; i++) {
            particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
                life: 1.0, color: color, size: Math.random() * 5 + 3
            });
        }
    }

    function update() {
        if (!isPlaying) return;

        // 1. Move Basket (Smooth Lerp to target X/Y)
        basket.x += (targetX - basket.x) * 0.15;
        basket.y += (targetY - basket.y) * 0.15;

        // 2. Logic
        spawnTimer += 16;

        if (!hasCaughtItem) {
            setGuideState('push');
            
            if (spawnTimer > CONFIG.spawnRate) {
                spawnItem();
                spawnTimer = 0;
            }

            for (let i = items.length - 1; i >= 0; i--) {
                let it = items[i];
                it.x += it.vx; it.y += it.vy;

                // --- UPDATED COLLISION LOGIC ---
                const itemCX = it.x + it.w/2;
                const itemCY = it.y + it.h/2;

                // Hitbox is higher up in the basket now.
                // Must be within X bounds AND between the top rim and slightly below it.
                const hitTop = basket.y + 30; 
                const hitBottom = basket.y + basket.h * 0.4; // Only top 40% of basket catches

                if (itemCX > basket.x + 20 && itemCX < basket.x + basket.w - 20 && // Horiz bounds (padded)
                    itemCY > hitTop && itemCY < hitBottom) { // Vert higher bounds
                    
                    hasCaughtItem = true;
                    score += 10;
                    createParticles(itemCX, itemCY, '#FFD700');
                    items.splice(i, 1);
                    sendStats();
                }
                if (it.y > BASE_H) items.splice(i, 1);
            }
        } else {
            setGuideState('pull');
            spawnTimer = 0;
            items.forEach(it => { it.x += it.vx; it.y += it.vy; });

            // Check if pulled back close to bottom (reachLevelY near 0)
            if (reachLevelY < 0.15) {
                hasCaughtItem = false;
                createParticles(basket.x + basket.w/2, basket.y + 50, '#00FF00');
                completeRep();
            }
        }

        // 3. Particles
        for(let i=particles.length-1; i>=0; i--) {
            particles[i].life -= 0.05;
            particles[i].x += particles[i].vx; particles[i].y += particles[i].vy;
            if(particles[i].life <= 0) particles.splice(i, 1);
        }
    }

    function draw() {
        ctx.clearRect(0, 0, BASE_W, BASE_H);

        // Items
        items.forEach(it => { if(it.img.complete) ctx.drawImage(it.img, it.x, it.y, it.w, it.h); });

        // Arms
        const shoulderY = BASE_H + 50;
        const leftShoulderX = (BASE_W/2) - shoulders.offset;
        const rightShoulderX = (BASE_W/2) + shoulders.offset;
        // Hands attach slightly lower on the basket now
        const handY = basket.y + basket.h * 0.6;
        const leftHandX = basket.x + 30;
        const rightHandX = basket.x + basket.w - 30;

        drawArm(leftShoulderX, shoulderY, leftHandX, handY, true);
        drawArm(rightShoulderX, shoulderY, rightHandX, handY, false);

        // Basket
        if(assets.basket.complete) ctx.drawImage(assets.basket, basket.x, basket.y, basket.w, basket.h);

        // Particles
        particles.forEach(p => {
            ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
        });
        ctx.globalAlpha = 1.0;
    }

    function completeRep() {
        currentReps++; sendStats();
        if(currentReps >= CONFIG.targetReps) {
            currentReps = 0; currentSet++; sendStats();
            if(currentSet > CONFIG.targetSets) endSession();
        }
    }

    function setGuideState(state) {
        if(state === 'push') {
            guideTrack.classList.add('state-push');
            guideTrack.classList.remove('state-pull');
            guideText.textContent = "PUSH";
        } else {
            guideTrack.classList.add('state-pull');
            guideTrack.classList.remove('state-push');
            guideText.textContent = "PULL";
        }
    }

    function loop() {
        if(!isPlaying) return;
        update(); draw(); requestAnimationFrame(loop);
    }

    function resize() {
        canvas.width = BASE_W;
        canvas.height = BASE_H;
    }
    window.addEventListener('resize', resize);
    resize();

    startBtn.addEventListener('click', () => {
        startScreen.style.display = 'none';
        guideTrack.style.display = 'flex';
        isPlaying = true;
        loop();
    });

    function endSession() {
        isPlaying = false;
        document.getElementById('screenTitle').textContent = "Session Complete!";
        document.getElementById('screenDesc').innerHTML = `Score: <strong>${score}</strong>`;
        startBtn.innerText = "Play Again";
        startScreen.style.display = 'flex';
        guideTrack.style.display = 'none';
    }
});