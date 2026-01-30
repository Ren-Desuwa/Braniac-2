/* [2026-01-31 - Robust Parser Fix] */
/* Location: js/db.js */

window.BrainiacDB = {
    cache: {},

    getUser: function() {
        try {
            const session = JSON.parse(localStorage.getItem('brainiac_session'));
            return session ? session.user : 'guest';
        } catch (e) { return 'guest'; }
    },

    write: async function(filename, content, mode = "append") {
        this.cache[filename] = null; // Clear cache on write
        try {
            const params = new URLSearchParams({ file: filename, mode: mode });
            await fetch(`/db/write?${params.toString()}`, { method: 'POST', body: content });
        } catch (e) { console.error("[DB] Write Error:", e); }
    },

    currentFile: '', 

    read: async function(filename) {
        this.currentFile = filename; // Store for the parser
        const bust = Date.now();
        if (this.cache[filename]) return this.cache[filename];
        try {
            const params = new URLSearchParams({ file: filename, _: bust });
            const response = await fetch(`/db/read?${params.toString()}`);
            if (response.ok) {
                const text = await response.text();
                this.cache[filename] = text;
                return text;
            }
        } catch (e) { console.error("[DB] Read Error:", e); }
        return null;
    },

    parseCSV: function(csvText) {
        if (!csvText) return [];
        const lines = csvText.trim().split(/\r?\n/);
        if (lines.length < 1) return [];

        // --- THE SMART REGISTRY ---
        let headers;
        let startLine = 1;

        if (this.currentFile.includes('-tasks.csv')) {
            // Static headers specifically for task files
            headers = ["task_id", "assigned_by_id", "title", "description", "game_id", "reps", "sets", "status", "posted_time"];
            // If you have a header in the file, skip line 0. 
            // If the file is data-only, change startLine to 0.
            startLine = 1; 
        } else {
            // Fallback for all other files (profiles, settings, etc.)
            headers = lines[0].split(',').map(h => h.trim());
            startLine = 1;
        }

        const result = [];
        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const row = this.splitCSVLine(line);
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || ''; 
            });
            result.push(obj);
        }
        return result;
    },

    // Helper to handle quoted commas correctly
    splitCSVLine: function(line) {
        const row = [];
        let currentVal = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
                row.push(currentVal.trim());
                currentVal = '';
            } else { currentVal += char; }
        }
        row.push(currentVal.trim());
        return row;
    },
    
    parseKV: function(csvText) {
        if (!csvText) return {};
        const data = {};
        csvText.trim().split('\n').forEach(line => {
            const parts = line.split(',');
            if(parts.length >= 2) data[parts[0].trim()] = parts[1].trim();
        });
        return data;
    }
};