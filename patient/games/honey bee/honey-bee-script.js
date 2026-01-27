/* [2026-01-28 03:00 am - batch 1.42.0] */
/* patient/games/honey bee/honey-bee-script.js */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- DOM REFERENCES ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    const startScreen = document.getElementById('startScreen');
    const startBtn = document.getElementById('startGameBtn');
    const screenTitle = document.getElementById('screenTitle');
    const screenDesc = document.getElementById('screenDesc');
    
    // THE NEW CSS GUIDE TRACK
    const guideTrack = document.getElementById('guide-track');

    // --- LOGIC CONFIG ---
    const GAME_CONFIG = {
        targetReps: 5,
        targetSets: 3,
        spawnRate: 1500, 
        maxFlowers: 4, // Allow more flowers for "Clumping" look
    };
    
    // --- RESOLUTION ---
    const BASE_W = 650;
    const BASE_H = 900;
    let scaleFactor = 1;

    // --- GAME STATE ---
    let currentSet = 1;
    let currentReps = 0;
    let score = 0;
    let isPlaying = false;
    let carryingPollen = false; 
    let spawnTimer = 0;

    // --- ASSETS ---
    const ASSET_PATH = 'assets/images/'; 
    const assets = {
        bee: new Image(),
        hive: new Image(),
        background: new Image(),
        flowerPink: new Image(),
        flowerPinkShine: new Image(),
        flowerPinkNoShine: new Image(),
        flowerWhite: new Image(),
        flowerTulip: new Image()
    };
    
    assets.bee.src = ASSET_PATH + 'bee.png';
    assets.hive.src = ASSET_PATH + 'hive.png';
    assets.background.src = ASSET_PATH + 'tree-close.jpg';
    assets.flowerPink.src = ASSET_PATH + 'pink-flower.png';
    assets.flowerPinkShine.src = ASSET_PATH + 'pink-flower-noshine.png';
    assets.flowerPinkNoShine.src = ASSET_PATH + 'pink-flower-shine.png';
    assets.flowerWhite.src = ASSET_PATH + 'white-flower.png';
    assets.flowerTulip.src = ASSET_PATH + 'pink-tulip-heart.png';

    assets.background.onload = () => { if(!isPlaying) drawAttractMode(); };

    // --- ENTITIES ---
    const player = { x: BASE_W/2, y: BASE_H/2, w: 80, h: 80 };
    const hive = { x: (BASE_W/2) - 60, y: 30, w: 120, h: 120 };
    
    let flowers = []; 
    let particles = [];

    // --- COMMUNICATION ---
    function sendStats() {
        window.parent.postMessage({
            type: 'updateStats',
            score: score,
            reps: currentReps,
            sets: currentSet
        }, '*');
    }

    // --- UTILS ---
    function rand(min, max) { return Math.random() * (max - min) + min; }
    function dist(x1, y1, x2, y2) { return Math.sqrt((x2-x1)**2 + (y2-y1)**2); }

    function resize() {
        canvas.width = BASE_W;
        canvas.height = BASE_H;
        scaleFactor = 1;
        if(!isPlaying) drawAttractMode();
    }
    window.addEventListener('resize', resize);

    // --- DRAW HELPER ---
    function drawSprite(img, x, y, targetW, targetH) {
        if (!img.complete || img.naturalWidth === 0) return;
        const ratio = img.naturalWidth / img.naturalHeight;
        let drawW = targetW;
        let drawH = targetW / ratio;
        let offsetY = (targetH - drawH) / 2;
        ctx.drawImage(img, x, y + offsetY, drawW, drawH);
    }

    function drawBackgroundFitWidth(img) {
        if (!img.complete) { ctx.fillStyle = '#5D4037'; ctx.fillRect(0,0,BASE_W,BASE_H); return; }
        ctx.fillStyle = '#5D4037'; ctx.fillRect(0,0,BASE_W,BASE_H);
        const imgRatio = img.naturalWidth / img.naturalHeight;
        const renderW = canvas.width;
        const renderH = renderW / imgRatio;
        ctx.drawImage(img, 0, (canvas.height - renderH)/2, renderW, renderH);
    }

    // --- INPUT ---
    const lastMouse = { x: BASE_W/2, y: BASE_H/2 };
    document.addEventListener('mousemove', (e) => { 
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        lastMouse.x = (e.clientX - rect.left) * scaleX;
        lastMouse.y = (e.clientY - rect.top) * scaleY;
    });

    // --- PARTICLES ---
    function createParticle(x, y, color) {
        for(let i = 0; i < 8; i++){
            particles.push({
                x: x, y: y, vx: rand(-4, 4), vy: rand(-4, 4),
                life: 1.0, color: color, size: rand(4, 8)
            });
        }
    }

    function rectsCollide(a, b) {
        const bH = b.h || b.w; 
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + bH && a.y + a.h > b.y;
    }

    // --- SPAWN LOGIC (Clumped) ---
    function spawnFlower() {
        if (flowers.length >= GAME_CONFIG.maxFlowers) return;

        // Tighter X range (Center patch)
        const centerX = (BASE_W / 2) - 40; 
        const xOffset = rand(-30, 30); // Slight offset
        
        // Tighter Y range (Patch area)
        const randomY = rand(BASE_H - 140, BASE_H - 80);

        // Relaxed overlap check allows clumping
        const isTooClose = flowers.some(f => dist(centerX + xOffset, randomY, f.x, f.y) < 40);
        if (isTooClose) return;

        const types = [assets.flowerPink, assets.flowerWhite, assets.flowerTulip];
        const img = types[Math.floor(Math.random() * types.length)];

        flowers.push({
            x: centerX + xOffset, 
            y: randomY, 
            w: 80, h: 80, 
            img: img, points: 10, 
            scale: 0.1, targetScale: 1.0
        });
        
        createParticle(centerX + xOffset + 40, randomY + 40, '#FFFFFF');
    }

    // --- CORE LOOP ---
    function update() {
        if (!isPlaying) return;

        // Player Move
        player.x += (lastMouse.x - player.w/2 - player.x) * 0.1;
        player.y += (lastMouse.y - player.h/2 - player.y) * 0.1;
        const playerBox = { x: player.x + 10, y: player.y + 10, w: player.w - 20, h: player.h - 20 };

        // 1. Spawning
        spawnTimer += 16;
        if (spawnTimer > GAME_CONFIG.spawnRate) {
            spawnFlower();
            spawnTimer = 0;
        }

        // 2. Logic & State Management
        if (!carryingPollen) {
            // STATE: GO DOWN
            guideTrack.className = "guide-track down"; // Flip arrows down

            for (let i = flowers.length - 1; i >= 0; i--) {
                let f = flowers[i];
                if(f.scale < f.targetScale) f.scale += 0.1;

                if (rectsCollide(playerBox, f)) {
                    carryingPollen = true;
                    createParticle(f.x + f.w/2, f.y + f.h/2, '#FFFF00');
                    score += f.points;
                    sendStats();
                    flowers.splice(i, 1);
                    break;
                }
            }
        } else {
            // STATE: GO UP
            guideTrack.className = "guide-track up"; // Flip arrows up

            flowers.forEach(f => { if(f.scale < f.targetScale) f.scale += 0.1; });

            if (rectsCollide(playerBox, hive)) {
                carryingPollen = false;
                createParticle(hive.x + hive.w/2, hive.y + hive.h/2, '#FFA500');
                completeRep();
            }
        }

        // 3. Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].x += particles[i].vx;
            particles[i].y += particles[i].vy;
            particles[i].life -= 0.03;
            if (particles[i].life <= 0) particles.splice(i, 1);
        }
    }

    function completeRep() {
        currentReps++;
        sendStats();
        
        if (currentReps >= GAME_CONFIG.targetReps) {
            currentReps = 0;
            currentSet++;
            sendStats();
            
            if (currentSet > GAME_CONFIG.targetSets) {
                endSession();
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 1. Background
        drawBackgroundFitWidth(assets.background);
        
        // Darken for contrast with white arrows
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fillRect(0, 0, BASE_W, BASE_H);

        // (No guide line drawn here anymore, handled by CSS div)

        // 2. Targets
        flowers.forEach(f => {
            if (f.img.complete) {
                const cx = f.x + f.w/2;
                const cy = f.y + f.h/2;
                const scaledW = f.w * f.scale;
                const scaledH = f.h * f.scale;
                
                if (!carryingPollen) { ctx.shadowBlur = 30; ctx.shadowColor = "yellow"; }
                
                drawSprite(f.img, cx - scaledW/2, cy - scaledH/2, scaledW, scaledH);
                ctx.shadowBlur = 0;
            }
        });

        if (carryingPollen) { ctx.shadowBlur = 40; ctx.shadowColor = "#FFD700"; }
        drawSprite(assets.hive, hive.x, hive.y, hive.w, hive.h);
        ctx.shadowBlur = 0;

        // 3. Particles
        particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        // 4. Player
        ctx.save();
        ctx.translate(player.x + player.w/2, player.y + player.h/2);
        if (carryingPollen) {
            ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI*2);
            ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'; ctx.fill();
        }
        
        const tilt = (lastMouse.x - (BASE_W/2)) * 0.0005;
        ctx.rotate(tilt);

        if(assets.bee.complete) {
            const ratio = assets.bee.naturalWidth / assets.bee.naturalHeight;
            const drawW = player.w;
            const drawH = player.w / ratio;
            ctx.drawImage(assets.bee, -drawW/2, -drawH/2, drawW, drawH);
        } else {
            ctx.fillStyle = "yellow"; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    }

    function drawAttractMode() {
        drawBackgroundFitWidth(assets.background);
    }

    // --- GAME CONTROL ---
    function loop() {
        if (!isPlaying) return;
        update();
        draw();
        requestAnimationFrame(loop);
    }

    startBtn.addEventListener('click', () => {
        startScreen.style.display = 'none';
        guideTrack.style.display = 'flex'; // Show track
        
        currentSet = 1; currentReps = 0; score = 0;
        carryingPollen = false; spawnTimer = 0;
        flowers = []; 
        spawnFlower(); 
        sendStats(); 
        isPlaying = true;
        loop();
    });

    function endSession() {
        isPlaying = false;
        screenTitle.innerText = "Session Complete!";
        screenDesc.innerHTML = `Great work!<br>Total Score: <strong>${score}</strong>`;
        startBtn.innerText = "Start New Session";
        startScreen.style.display = 'flex';
        guideTrack.style.display = 'none'; // Hide track
    }

    resize();
});