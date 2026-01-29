/* [2026-01-30 - COMPLETE EDITION] */
/* patient/js/base/db.js */

window.BrainiacDB = {
    // Cache to store loaded CSVs so we don't spam the SD card
    cache: {},

    /**
     * Get the current logged-in user from LocalStorage
     */
    getUser: function() {
        try {
            const session = JSON.parse(localStorage.getItem('brainiac_session'));
            return session ? session.user : 'guest';
        } catch (e) {
            return 'guest';
        }
    },

    /**
     * [NEW] READ: Fetch file content from SD Card
     * @param {string} filename - e.g., "/patients/patient/logs.csv"
     */
    read: async function(filename) {
        // 1. Check Cache first to save speed
        if (this.cache[filename]) {
            console.log(`[DB] Cache Hit: ${filename}`);
            return this.cache[filename];
        }

        console.log(`[DB] Fetching: ${filename}...`);

        // 2. Network Request to C++ Backend
        try {
            // This matches server->on("/db/read", ...) in NetworkManager.h
            const params = new URLSearchParams({ file: filename });
            const response = await fetch(`/db/read?${params.toString()}`);
            
            if (response.ok) {
                const text = await response.text();
                this.cache[filename] = text; // Store in cache
                return text;
            } else {
                console.warn(`[DB] File not found or empty: ${filename}`);
                return null;
            }
        } catch (e) {
            console.error("[DB] Read Network Error:", e);
            return null;
        }
    },

    /**
     * CORE: Write data to the ESP32 Database
     * @param {string} filename - e.g., "/patients/patient/logs.csv"
     * @param {string} content - The text to append
     * @param {string} mode - "append" (default) or "write" (overwrite)
     */
    write: async function(filename, content, mode = "append") {
        console.log(`[DB] Saving to ${filename}...`);
        
        // 1. Optimistic Cache Update (Update local copy immediately so UI feels fast)
        if (this.cache[filename]) {
            if (mode === 'write') this.cache[filename] = content;
            else this.cache[filename] += content;
        }

        // 2. Network Request
        try {
            const params = new URLSearchParams({ file: filename, mode: mode });
            // This matches server->on("/db/write", ...) in NetworkManager.h
            const response = await fetch(`/db/write?${params.toString()}`, {
                method: 'POST',
                body: content
            });
            
            if (response.ok) console.log("[DB] Save Success");
            else console.error("[DB] Save Failed", await response.text());
            
        } catch (e) {
            console.error("[DB] Write Network Error:", e);
        }
    },

    /**
     * HELPER: Log a Game Session safely
     */
    logGame: function(gameId, score, reps, sets, configSnapshot = "") {
        const user = this.getUser();
        const date = new Date().toISOString().split('T')[0];
        const time = new Date().toLocaleTimeString();
        
        // CSV Format: Date, Time, GameID, Score, Reps, Sets, Config
        const csvLine = `\n${date},${time},${gameId},${score},${reps},${sets},"${configSnapshot}"`;
        
        // Note: DBManager.h automatically prepends "/database" to this path
        const path = `/patients/${user}/logs.csv`;
        this.write(path, csvLine, "append");
    },

    /**
     * SYNC: Listen for "Update" broadcasts from ESP32
     * Call this from your main WebSocket handler if you implement live sync
     */
    handleSync: function(msg) {
        if (msg.type === 'UPDATE') {
            console.log("⚡ Cloud Sync:", msg.file);
            // If we have this file cached, clear it so we fetch fresh next time
            if (this.cache[msg.file]) delete this.cache[msg.file];
            
            // Dispatch event for UI to redraw if needed
            window.dispatchEvent(new CustomEvent('db-sync', { detail: msg.file }));
        }
    }
};