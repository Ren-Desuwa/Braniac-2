/* [2026-01-31] launcher.js - With Auto-Start Fix */

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
    function launchGame(url, title, reps, sets) {
        console.log(`Launching: ${title} (Reps:${reps}, Sets:${sets})`);
        
        // Hide Grid, Show Frame
        gridContainer.style.display = 'none';
        
        // Construct URL with params for the game to read
        const finalUrl = `${url}?reps=${reps}&sets=${sets}`;
        gameFrame.src = finalUrl;
        
        gameFrame.classList.add('active');
        exitGameBtn.style.display = 'flex';
        menu.classList.remove('active');

        // Show Sidebar & Reset Stats
        sidebar.style.display = 'flex';
        if(gameTitleDisplay) gameTitleDisplay.textContent = title;
        updateStats(0, 0, 0); 
    }

    function closeGame() {
        gameFrame.src = ""; // Stop the game
        gameFrame.classList.remove('active');
        gridContainer.style.display = 'flex';
        exitGameBtn.style.display = 'none';
        sidebar.style.display = 'none'; 
        menu.classList.remove('active');
        
        // Clear the URL param so refreshing doesn't restart the game immediately
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (exitGameBtn) exitGameBtn.addEventListener('click', closeGame);

    // Attach Click Listeners to Cards
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', () => {
            const url = card.getAttribute('data-game-url');
            const title = card.getAttribute('data-game-title');
            const reps = card.getAttribute('data-reps') || 5;
            const sets = card.getAttribute('data-sets') || 3;

            if (url) launchGame(url, title, reps, sets);
        });
    });

    // --- 3. Message Listener (Game -> Launcher) ---
    window.addEventListener('message', (event) => {
        const data = event.data;
        if (data.type === 'updateStats') {
            updateStats(data.score, data.reps, data.sets);
        }
    });

    function updateStats(score, reps, sets) {
        if(statScore) statScore.textContent = score;
        if(statReps) statReps.textContent = reps;
        if(statSets) statSets.textContent = sets;
    }

    // --- 4. Auto-Start Logic (THE FIX) ---
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('game');

    if (gameId) {
        // Find the card that matches the ID
        const targetCard = document.querySelector(`.game-card[data-game-id="${gameId}"]`);
        
        if (targetCard) {
            console.log(`[Auto-Start] Found card for: ${gameId}`);
            // Force a click on it to trigger the launch
            targetCard.click();
        } else {
            console.warn(`[Auto-Start] No card found for ID: ${gameId}`);
        }
    }
});