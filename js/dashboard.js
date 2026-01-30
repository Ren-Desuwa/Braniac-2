/* [2026-01-30 - Simplified Structure] */
/* Location: js/dashboard.js */

document.addEventListener('DOMContentLoaded', async () => {
    const db = window.BrainiacDB;
    const user = db.getUser();
    
    console.log(`[Dash] Loading for user: ${user}`);

    // 1. Load System Registries
    const gamesCSV = await db.read('/database/system-games.csv');
    const therapistsCSV = await db.read('/database/system-therapists.csv');
    
    const games = listToMap(db.parseCSV(gamesCSV), 'id');
    const therapists = listToMap(db.parseCSV(therapistsCSV), 'pt_id');

    // 2. Load Patient Profile
    const profileCSV = await db.read(`/database/${user}-profile.csv`);
    const profile = db.parseKV(profileCSV);
    renderProfile(profile);

    // 3. Load Tasks & Logs
    const tasksCSV = await db.read(`/database/${user}-tasks.csv`);
    const logsCSV = await db.read(`/database/${user}-logs.csv`);
    
    renderTasks(db.parseCSV(tasksCSV), games, therapists);
    renderXP(db.parseCSV(logsCSV), profile);

    setInterval(async () => {
        const tasksCSV = await db.read(`/database/${user}-tasks.csv`);
        
        // We compare simple length or just re-render to be safe
        // In a real app, we'd check a timestamp. Here, re-rendering is cheap.
        if (tasksCSV) {
            const currentTasks = db.parseCSV(tasksCSV);
            // Check if count changed (Simple "Is there a new task?" check)
            const pendingCount = currentTasks.filter(t => t.status === 'pending').length;
            const currentPendingDisplay = document.querySelectorAll('.task-list .task-btn').length;
            
            if (pendingCount !== currentPendingDisplay) {
                console.log("[Dash] New Data Detected! Refreshing UI...");
                renderTasks(currentTasks, games, therapists);
            }
        }
    }, 5000); // 5 Seconds
});

// --- RENDER FUNCTIONS ---

function renderProfile(profile) {
    if (!profile.display_name) return;

    // Text
    document.querySelector('.profile-info h1').textContent = profile.display_name;
    document.querySelector('.profile-info p').textContent = profile.title || 'Patient';
    
    // Avatar
    const avatarEl = document.querySelector('.avatar-large');
    avatarEl.style.backgroundImage = '';
    avatarEl.innerHTML = ''; 
    
    if (profile.avatar_mode === 'image') {
        avatarEl.style.backgroundImage = `url('${profile.avatar_data}')`;
        avatarEl.style.backgroundSize = 'cover';
    } else {
        avatarEl.style.backgroundColor = profile.avatar_data || '#888';
        avatarEl.style.display = 'flex';
        avatarEl.style.alignItems = 'center';
        avatarEl.style.justifyContent = 'center';
        avatarEl.style.color = 'white';
        avatarEl.style.fontSize = '2.5rem';
        avatarEl.textContent = profile.display_name.charAt(0).toUpperCase();
    }
}

function renderTasks(tasks, games, therapists) {
    const feed = document.querySelector('.feed-panel');
    const sidebar = document.querySelector('.task-list');
    
    // Clear static placeholders
    feed.innerHTML = '';
    sidebar.innerHTML = '';
    
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    document.querySelector('.panel-title').textContent = `${pendingTasks.length} Pending Tasks`;

    const displayTasks = [...tasks].reverse();

    displayTasks.forEach(task => {
        // Sidebar Item
        if (task.status === 'pending') {
            const btn = document.createElement('button');
            btn.className = 'pill-btn task-btn';
            btn.textContent = task.title;
            sidebar.appendChild(btn);
        }

        // Feed Card
        const game = games[task.game_id] || { display_name: task.game_id, color_theme: 'grey' };
        const pt = therapists[task.assigned_by_id] || { display_name: 'Unknown PT', avatar_color: '#ccc' };
        
        const isDone = task.status === 'completed';
        const statusColor = isDone ? 'var(--accent-green)' : 'var(--accent-yellow)';
        const statusText = isDone ? 'Completed' : 'Assigned';
        const playLink = `launcher.html?game=${task.game_id}&reps=${task.reps}&sets=${task.sets}&assigner=${task.assigned_by_id}`;

        const html = `
        <article class="task-assignment-card" style="border-left: 5px solid ${statusColor}">
            <div class="task-assignment-header">
                <div class="header-icon" style="background:${pt.avatar_color}">
                    ${pt.display_name ? pt.display_name.charAt(0) : '?'}
                </div>
                <div class="header-text">
                    <h2>${task.title}</h2>
                    <span class="post-date">By ${pt.display_name} • ${task.posted_time}</span>
                </div>
                <div class="header-progress">
                    <span class="progress-label">${statusText}</span>
                    <div class="circular-progress ${isDone ? 'completed' : ''}">
                        <span class="progress-val">${task.reps}x${task.sets}</span>
                    </div>
                </div>
            </div>
            <div class="task-assignment-body">
                <p class="instructions">${task.description}</p>
                <div class="game-attachments">
                    <div class="game-attachment-link">
                        <div class="attachment-thumb" style="background:${game.color_theme === 'yellow' ? '#FFF59D' : '#A7E4A7'}"></div>
                        <div class="attachment-info">
                            <h4>${game.display_name}</h4>
                            <span>Target: ${task.sets} Sets</span>
                        </div>
                        ${!isDone ? `<a href="${playLink}" class="play-sm-btn">Play</a>` : ''}
                    </div>
                </div>
            </div>
        </article>`;
        
        feed.innerHTML += html;
    });
}

function renderXP(logs, profile) {
    const completed = logs.filter(l => l.status === 'completed').length;
    const currentXP = completed * 50; 
    const nextLevel = profile.next_level_xp || 1000;
    
    document.querySelector('.xp-text').textContent = `${currentXP}/${nextLevel} xp`;
    const pct = Math.min(100, (currentXP / nextLevel) * 100);
    document.querySelector('.xp-bar-fill').style.width = `${pct}%`;
    
    const level = Math.floor(currentXP / 1000) + 1;
    document.querySelector('.level-card h2').textContent = `Level ${level}`;
}

function listToMap(list, keyField) {
    const map = {};
    if (!list) return map;
    list.forEach(item => { if(item && item[keyField]) map[item[keyField]] = item; });
    return map;
}