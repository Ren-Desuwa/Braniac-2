/* [2026-01-27 11:15 pm - batch 1.38.0] */
/* patient/js/games/launcher.js */

document.addEventListener('DOMContentLoaded', () => {
    
    // UI Refs
    const menuBtn = document.getElementById('menu-trigger');
    const menu = document.getElementById('main-menu');
    const exitGameBtn = document.getElementById('exit-game-btn');
    
    const gridContainer = document.getElementById('app-grid');
    const gameFrame = document.getElementById('game-frame');
    
    // Stats Sidebar
    const sidebar = document.getElementById('game-stats-sidebar');
    const statSets = document.getElementById('stats-sets');
    const statReps = document.getElementById('stats-reps');
    const statScore = document.getElementById('stats-score');
    const gameTitleDisplay = document.getElementById('game-title-display');

    // --- 1. Menu Logic ---
    if (menuBtn && menu) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && !menuBtn.contains(e.target)) {
                menu.classList.remove('active');
            }
        });
    }

    // --- 2. Launch Logic ---
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', () => {
            const url = card.getAttribute('data-game-url');
            const title = card.getAttribute('data-game-title');
            if (url) launchGame(url, title);
        });
    });

    function launchGame(url, title) {
        console.log(`Launching: ${title}`);
        
        // UI State
        gridContainer.style.display = 'none';
        gameFrame.src = url;
        gameFrame.classList.add('active');
        exitGameBtn.style.display = 'flex';
        menu.classList.remove('active');

        // Show Sidebar & Reset Stats
        sidebar.style.display = 'flex';
        gameTitleDisplay.textContent = title;
        updateStats(0, 0, 0); // Reset visual
    }

    function closeGame() {
        gameFrame.src = "";
        gameFrame.classList.remove('active');
        gridContainer.style.display = 'flex';
        exitGameBtn.style.display = 'none';
        sidebar.style.display = 'none'; // Hide sidebar
        menu.classList.remove('active');
    }

    if (exitGameBtn) exitGameBtn.addEventListener('click', closeGame);

    // --- 3. Message Listener (Game -> Launcher) ---
    window.addEventListener('message', (event) => {
        const data = event.data;
        
        // Security check: You might want to check event.origin in production
        
        if (data.type === 'updateStats') {
            updateStats(data.score, data.reps, data.sets);
        }
    });

    function updateStats(score, reps, sets) {
        if(statScore) statScore.textContent = score;
        if(statReps) statReps.textContent = reps;
        if(statSets) statSets.textContent = sets;
    }
});