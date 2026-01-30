/* [2026-01-31 - Static + Dynamic Hybrid] */
/* js/pt-dashboard.js */

const PATIENTS = [
    { id: 'miguel', name: 'Miguel', color: '#FFA500', status: 'online' },
    { id: 'bert',   name: 'Lolo Bert', color: '#607D8B', status: 'offline' },
    { id: 'ken',    name: 'Ken',    color: '#2196F3', status: 'offline' }
];

let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    switchView('feed');
});

function switchView(viewName) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.nav-item[onclick="switchView('${viewName}')"]`).classList.add('active');

    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${viewName}`).classList.add('active');

    // Trigger data updates
    if (viewName === 'feed') refreshFeed();
    if (viewName === 'patients') refreshPatients();
    if (viewName === 'tasks') refreshAllTasks();
}

// --- HYBRID FEED LOGIC ---
async function refreshFeed() {
    // We target the dynamic insert slot so we don't wipe the static header
    const dynamicSlot = document.getElementById('feed-dynamic-insert');
    dynamicSlot.innerHTML = ''; 
    
    if (!window.BrainiacDB) return;
    
    // [FIX] Reading from the correct database path
    // Note: For this demo, the feed shows Miguel's tasks. 
    // In a full app, you might iterate through all patients.
    const csv = await window.BrainiacDB.read('/database/miguel-tasks.csv');
    const tasks = window.BrainiacDB.parseCSV(csv);

    console.log("DEBUG TASKS:", tasks);

    // Show only the 3 newest real tasks so we don't overwhelm the demo
    const recentTasks = tasks.slice(-3).reverse(); 

    recentTasks.forEach(t => {
        // Safe check for game_id to prevent crashes
        const gId = t.game_id || ''; 
        
        let thumbColor = '#eee';
        let thumbIcon = '';
        if (gId.includes('honey')) { thumbColor = '#FFF59D'; thumbIcon = '🐝'; }
        else if (gId.includes('rain')) { thumbColor = '#A7E4A7'; thumbIcon = '🐱'; }
        else if (gId.includes('cook')) { thumbColor = '#FFAB91'; thumbIcon = '🍔'; }

        // Generate the Feed Card HTML
        const html = `
        <article class="feed-card" style="border-left: 5px solid var(--accent-blue);">
            <div class="feed-header">
                <div class="header-icon" style="width:40px; height:40px; background:#2f81f7; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">PT</div>
                <div style="flex:1;">
                    <h2 style="font-size:1rem; margin:0;">${t.title}</h2>
                    <span class="post-date" style="font-size:0.85rem; color:#888;">Assigned to <strong>Miguel</strong> • ${t.posted_time}</span>
                </div>
                <div style="background:#E3F2FD; color:#1976D2; padding:4px 8px; border-radius:6px; font-size:0.75rem; font-weight:bold;">NEW</div>
            </div>
            <div class="feed-body">
                <p style="margin-bottom:15px; font-size:1rem; color:#333; line-height:1.5;">${t.description}</p>
                <div style="display:flex; align-items:center; gap:15px; padding:10px; background:#f9f9f9; border-radius:12px; border:1px solid #eee;">
                    <div style="width:60px; height:60px; background:${thumbColor}; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.8rem;">${thumbIcon}</div>
                    <div>
                        <h4 style="margin:0; font-size:1rem; color:#333; text-transform:capitalize;">${t.game_id}</h4>
                        <span style="color:#666; font-size:0.9rem;">Target: <strong>${t.sets} Sets</strong> of <strong>${t.reps} Reps</strong></span>
                    </div>
                </div>
            </div>
        </article>`;
        dynamicSlot.innerHTML += html;
    });
}

function refreshPatients() {
    const container = document.getElementById('patients-container');
    container.innerHTML = '';
    PATIENTS.forEach(p => {
        const html = `
        <div class="friend-item" onclick="alert('Profile view coming soon!')">
            <div class="friend-avatar" style="background:${p.color}">${p.name.charAt(0)}<div class="status-dot ${p.status}"></div></div>
            <div style="flex:1;">
                <div style="font-weight:700; color:#333;">${p.name}</div>
                <div style="font-size:0.85rem; color:#888;">${p.status === 'online' ? 'Active Now' : 'Last active 2h ago'}</div>
            </div>
        </div>`;
        container.innerHTML += html;
    });
}

async function refreshAllTasks() {
    const dynamicContainer = document.getElementById('dynamic-tasks-list');
    dynamicContainer.innerHTML = '';
    
    if (!window.BrainiacDB) return;
    
    // [FIX] Reading from the correct database path
    const csv = await window.BrainiacDB.read('/database/miguel-tasks.csv');
    const tasks = window.BrainiacDB.parseCSV(csv);
    
    // Reverse to show new ones first
    const recentTasks = tasks.slice(-5).reverse(); 

    recentTasks.forEach(t => {
        const isDone = t.status === 'completed';
        const html = `
        <div class="compact-task ${t.status}" data-status="${t.status}">
            <div class="c-info">
                <h4>${t.title} <span style="font-weight:normal; color:#2f81f7;">(Miguel)</span></h4>
                <span>${t.game_id} • ${t.reps}x${t.sets}</span>
            </div>
            <div class="c-status ${isDone ? 'done' : ''}">${isDone ? 'Done' : 'Pending'}</div>
        </div>`;
        dynamicContainer.innerHTML += html;
    });
    
    // Re-apply filter after loading new elements
    filterTasks(currentFilter);
}

function filterTasks(status, btnElement) {
    currentFilter = status;
    if (btnElement) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    }
    const allItems = document.querySelectorAll('.compact-task');
    allItems.forEach(item => {
        const itemStatus = item.getAttribute('data-status');
        if (status === 'all' || itemStatus === status) item.style.display = 'flex';
        else item.style.display = 'none';
    });
}

/* js/pt-dashboard.js */

async function quickPost() {
    const desc = document.getElementById('quick-desc').value;
    const game = document.getElementById('quick-game').value;
    const patientSelect = document.getElementById('quick-patient');
    
    const patientId = patientSelect.value; 
    const patientName = patientSelect.options[patientSelect.selectedIndex].text;
    
    if (!desc) return alert("Please enter instructions");

    const taskId = Date.now();
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const title = game.includes('honey') ? 'Flexion Training' : (game.includes('cook') ? 'Timing Drill' : 'Reflex Drill');
    
    // --- THE FIX IS HERE ---
    // I added quotes around "${title}" so spaces don't break the database parser.
    // Format: id, assigned_by_id, title, description, game_id, reps, sets, status, posted_time
    const line = `\n${taskId},pt_joy,"${title}","${desc}",${game},5,3,pending,${time}`;
    
    await window.BrainiacDB.write(`/database/${patientId}-tasks.csv`, line, "append");
    
    alert(`Task Posted to ${patientName}!`);
    document.getElementById('quick-desc').value = '';
    
    refreshFeed();
    refreshAllTasks();
}