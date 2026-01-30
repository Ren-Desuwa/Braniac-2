/* [2026-01-31] PT Profile Viewer Logic */
/* js/pt-profile-view.js */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get User ID from URL (e.g. ?id=miguel)
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('id');

    if (!userId) {
        alert("No patient specified!");
        window.location.href = "physical-therapist.html";
        return;
    }

    // 2. Load Data from DB
    if (!window.BrainiacDB) return;

    try {
        // Fetch Profile
        const profileRaw = await window.BrainiacDB.read(`/database/${userId}-profile.csv`);
        const profile = window.BrainiacDB.parseKV(profileRaw);

        // Fetch Logs (for history)
        const logsRaw = await window.BrainiacDB.read(`/database/${userId}-logs.csv`);
        const logs = window.BrainiacDB.parseCSV(logsRaw);

        renderProfile(userId, profile, logs);
    } catch (e) {
        console.error("Error loading profile:", e);
        document.getElementById('loading-msg').innerText = "Profile not found.";
    }
});

function renderProfile(id, profile, logs) {
    document.getElementById('loading-msg').style.display = 'none';
    document.getElementById('profile-content').style.display = 'block';

    // 1. Hero Section
    const name = profile.display_name || id;
    document.getElementById('p-name').textContent = name;
    document.getElementById('p-title').textContent = profile.title || 'Patient';
    
    // Avatar
    const avatarEl = document.getElementById('p-avatar');
    if (profile.avatar_mode === 'image') {
        avatarEl.style.backgroundImage = `url('${profile.avatar_data}')`;
        avatarEl.innerText = '';
    } else {
        avatarEl.style.backgroundColor = profile.avatar_data || '#888';
        avatarEl.innerText = name.charAt(0).toUpperCase();
    }

    // 2. Stats
    document.getElementById('stat-level').textContent = profile.level || 1;
    document.getElementById('stat-streak').textContent = (profile.streak || 0) + ' Days';
    document.getElementById('stat-xp').textContent = profile.current_xp || 0;

    // 3. History List
    const container = document.getElementById('history-container');
    container.innerHTML = '';

    if (!logs || logs.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#ccc;">No recent activity.</p>';
        return;
    }

    // Show last 5 logs
    logs.slice(-5).reverse().forEach(log => {
        let icon = '🎮';
        let color = '#eee';
        
        if (log.game_id.includes('honey')) { icon = '🐝'; color = '#FFF59D'; }
        else if (log.game_id.includes('rain')) { icon = '🐱'; color = '#A7E4A7'; }
        else if (log.game_id.includes('cook')) { icon = '🍔'; color = '#FFAB91'; }

        const isWin = log.score > 0;
        
        const html = `
        <div class="history-item ${isWin ? 'win' : 'fail'}">
            <div class="h-icon" style="background:${color}">${icon}</div>
            <div class="h-info">
                <h4>${log.game_id}</h4>
                <span>${log.date} • ${log.time}</span>
            </div>
            <div class="h-score">${log.score} pts</div>
        </div>`;
        
        container.innerHTML += html;
    });
}