/* [2026-01-28 10:00 am - batch 1.48.0] */
/* patient/games/cookout/cookout-script.js */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- DOM REFERENCES ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    const startScreen = document.getElementById('startScreen');
    const startBtn = document.getElementById('startGameBtn');
    const guideTrack = document.getElementById('guide-track');
    const guideText = document.querySelector('.guide-text');

    // --- CONFIG ---
    const CONFIG = {
        targetReps: 5,
        targetSets: 3,
        cookTime: 2000, // 2 seconds to cook
        snapDistance: 80 // Pixel distance to snap to grill/plate
    };
    
    const BASE_W = 600;
    const BASE_H = 900;

    // --- STATE ---
    let currentSet = 1;
    let currentReps = 0;
    let score = 0;
    let isPlaying = false;
    
    // Game Phases: 'PICKUP', 'PUSHING', 'COOKING', 'PULLING', 'PLATED'
    let phase = 'PICKUP'; 
    let cookTimer = 0;

    // --- ASSETS ---
    const ASSET_PATH = 'assets/images/';
    const assets = {
        spatula: new Image(),
        burgerRaw: new Image(),
        burgerCooked: new Image(),
        plate: new Image(),
        grillTexture: new Image() // Optional, falling back to CSS/Canvas
    };
    
    // Set sources (Ensure these files exist or placeholders will draw)
    assets.spatula.src = ASSET_PATH + 'spatula.png';
    assets.burgerRaw.src = ASSET_PATH + 'burger-raw.png';
    assets.burgerCooked.src = ASSET_PATH + 'burger-cooked.png';
    assets.plate.src = ASSET_PATH + 'plate.png';

    // --- ENTITIES ---
    // Zones
    const grillZone = { x: 100, y: 50, w: 400, h: 250, color: '#333' };
    const plateZone = { x: 150, y: 650, w: 300, h: 200, color: '#eee' };
    
    // Player Hand (Spatula)
    const player = { x: BASE_W/2, y: BASE_H - 150 };
    
    // The Burger Object
    const burger = { x: BASE_W/2, y: BASE_H - 150, w: 120, h: 100, state: 'raw' };

    // --- COMMUNICATION ---
    function sendStats() {
        window.parent.postMessage({
            type: 'updateStats',
            score: score,
            reps: currentReps,
            sets: currentSet
        }, '*');
    }

    // --- INPUT ---
    const lastMouse = { x: BASE_W/2, y: BASE_H/2 };
    document.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleY = canvas.height / rect.height;
        lastMouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
        lastMouse.y = (e.clientY - rect.top) * scaleY;
    });

    // --- LOGIC LOOP ---
    function update(dt) {
        if (!isPlaying) return;

        // Move Spatula to Mouse (Damped)
        player.x += (lastMouse.x - player.x) * 0.2;
        player.y += (lastMouse.y - player.y) * 0.2;

        // --- PHASE LOGIC ---
        
        switch (phase) {
            case 'PICKUP':
                // Reset burger to Spatula position
                burger.state = 'raw';
                burger.x = player.x - burger.w/2;
                burger.y = player.y - burger.h/2;
                
                // Switch to PUSHING immediately
                phase = 'PUSHING';
                setGuide('up', 'PUSH TO GRILL');
                break;

            case 'PUSHING':
                // Burger is attached to Spatula
                burger.x = player.x - burger.w/2;
                burger.y = player.y - burger.h/2;

                // Check if we reached the Grill (Top)
                if (player.y < (grillZone.y + grillZone.h - 50)) {
                    // Success: Drop it on the grill
                    phase = 'COOKING';
                    burger.y = grillZone.y + 50; // Lock to grill
                    cookTimer = 0;
                    setGuide('wait', 'WAIT FOR IT...');
                }
                break;

            case 'COOKING':
                // Spatula is free, Burger is locked on Grill
                cookTimer += dt;
                
                // Visual rattle effect while cooking
                burger.x = (BASE_W/2 - burger.w/2) + (Math.random() * 2 - 1);

                if (cookTimer > CONFIG.cookTime) {
                    burger.state = 'cooked';
                    phase = 'READY_TO_PULL';
                    setGuide('down', 'PULL TO PLATE');
                }
                break;
            
            case 'READY_TO_PULL':
                // Player must go UP to grab the burger
                if (Math.abs(player.y - (burger.y + burger.h/2)) < 50) {
                    phase = 'PULLING';
                }
                break;

            case 'PULLING':
                // Burger attached to Spatula again
                burger.x = player.x - burger.w/2;
                burger.y = player.y - burger.h/2;

                // Check if we reached the Plate (Bottom)
                if (player.y > plateZone.y) {
                    // Success: Plated!
                    phase = 'PLATED';
                    score += 100;
                    completeRep();
                }
                break;
                
            case 'PLATED':
                // Momentary pause before next burger
                // handled by completeRep logic mostly
                break;
        }
    }

    function completeRep() {
        currentReps++;
        sendStats();
        
        if (currentReps >= CONFIG.targetReps) {
            currentReps = 0;
            currentSet++;
            sendStats();
            if (currentSet > CONFIG.targetSets) endSession();
            else resetRound();
        } else {
            resetRound();
        }
    }

    function resetRound() {
        // Wait a moment then respawn new raw burger
        setTimeout(() => {
            phase = 'PICKUP';
        }, 1000);
    }

    function setGuide(direction, text) {
        guideTrack.className = `guide-track vertical ${direction}`;
        if(direction === 'wait') guideTrack.style.opacity = 0.5;
        else guideTrack.style.opacity = 1;
        
        guideText.textContent = text;
    }

    // --- DRAW ---
    function draw() {
        ctx.clearRect(0, 0, BASE_W, BASE_H);

        // 1. Grill Zone (Top)
        ctx.fillStyle = grillZone.color;
        ctx.fillRect(grillZone.x, grillZone.y, grillZone.w, grillZone.h);
        // Grill lines
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 4;
        for(let i=0; i<grillZone.w; i+=30) {
            ctx.beginPath(); 
            ctx.moveTo(grillZone.x + i, grillZone.y); 
            ctx.lineTo(grillZone.x + i, grillZone.y + grillZone.h); 
            ctx.stroke();
        }

        // 2. Plate Zone (Bottom)
        if (assets.plate.complete) {
            ctx.drawImage(assets.plate, plateZone.x, plateZone.y, plateZone.w, plateZone.h);
        } else {
            ctx.fillStyle = plateZone.color;
            ctx.beginPath(); ctx.ellipse(BASE_W/2, plateZone.y + 100, 150, 80, 0, 0, Math.PI*2); ctx.fill();
        }

        // 3. Burger
        let bImg = (burger.state === 'raw') ? assets.burgerRaw : assets.burgerCooked;
        
        if (phase === 'COOKING') {
            // Smoke particles could go here
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5})`;
            ctx.beginPath(); ctx.arc(burger.x + 60, burger.y, 20, 0, Math.PI*2); ctx.fill();
        }

        if (bImg.complete) {
            ctx.drawImage(bImg, burger.x, burger.y, burger.w, burger.h);
        } else {
            // Fallback Circle
            ctx.fillStyle = (burger.state === 'raw') ? '#ff9999' : '#8B4513';
            ctx.beginPath(); ctx.arc(burger.x + burger.w/2, burger.y + burger.h/2, 50, 0, Math.PI*2); ctx.fill();
        }

        // 4. Spatula (Player)
        if (assets.spatula.complete) {
            ctx.drawImage(assets.spatula, player.x - 40, player.y - 40, 80, 150);
        } else {
            ctx.fillStyle = '#aaa'; ctx.fillRect(player.x - 10, player.y, 20, 100); // Handle
            ctx.fillStyle = '#ccc'; ctx.fillRect(player.x - 30, player.y - 40, 60, 40); // Blade
        }
    }

    function loop(timestamp) {
        if(!isPlaying) return;
        const dt = timestamp - (lastTime || timestamp);
        lastTime = timestamp;
        
        update(dt);
        draw();
        requestAnimationFrame(loop);
    }
    let lastTime = 0;

    // --- INIT ---
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
        phase = 'PICKUP';
        loop(0);
    });

    function endSession() {
        isPlaying = false;
        document.getElementById('screenTitle').textContent = "Order Up!";
        document.getElementById('screenDesc').innerHTML = `Great Service!<br>Score: ${score}`;
        startScreen.style.display = 'flex';
    }
});