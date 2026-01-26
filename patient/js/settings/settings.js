/* [2026-01-26 09:30 pm - batch 1.20.0] */
/* patient/js/settings/settings.js */

window.Brainiac = window.Brainiac || {};

window.Brainiac.Settings = {
    
    // Default Values
    defaults: {
        accessText: 16,
        accessBtn: 16,
        accessPanel: 16,
        gameText: 16,
        gameBtn: 16,
        gamePanel: 16
    },

    // Current Values
    state: {},

    init: function() {
        console.log("Settings Module Initialized");
        this.loadState();
        this.bindEvents();
        this.updatePreview();
    },

    loadState: function() {
        // In a real app, load from localStorage. Using defaults for now.
        const stored = localStorage.getItem('brainiac_settings');
        this.state = stored ? JSON.parse(stored) : { ...this.defaults };
        
        // Populate Inputs
        this.setInputValue('access-text', this.state.accessText);
        this.setInputValue('access-btn', this.state.accessBtn);
        this.setInputValue('access-panel', this.state.accessPanel);
        
        this.setInputValue('game-text', this.state.gameText);
        this.setInputValue('game-btn', this.state.gameBtn);
        this.setInputValue('game-panel', this.state.gamePanel);
    },

    setInputValue: function(idBase, value) {
        const slider = document.getElementById(`${idBase}-slider`);
        const display = document.getElementById(`${idBase}-val`);
        if(slider && display) {
            slider.value = value;
            display.textContent = value;
        }
    },

    bindEvents: function() {
        // Attach logic to all setting rows
        const settingRows = document.querySelectorAll('.setting-row');
        
        settingRows.forEach(row => {
            const slider = row.querySelector('.slider');
            const minusBtn = row.querySelector('.minus');
            const plusBtn = row.querySelector('.plus');
            const display = row.querySelector('.value-display');
            const idBase = slider.id.replace('-slider', ''); // e.g., 'access-text'

            // Slider Change
            slider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                display.textContent = val;
                this.updateState(idBase, val);
            });

            // Minus Button
            minusBtn.addEventListener('click', () => {
                let val = parseInt(slider.value);
                if (val > parseInt(slider.min)) {
                    val--;
                    slider.value = val;
                    display.textContent = val;
                    this.updateState(idBase, val);
                }
            });

            // Plus Button
            plusBtn.addEventListener('click', () => {
                let val = parseInt(slider.value);
                if (val < parseInt(slider.max)) {
                    val++;
                    slider.value = val;
                    display.textContent = val;
                    this.updateState(idBase, val);
                }
            });
        });

        // Apply Button
        document.getElementById('apply-settings-btn').addEventListener('click', () => {
            this.saveSettings();
        });
    },

    updateState: function(key, value) {
        // Convert hyphenated-key to camelCase for state object
        // e.g., access-text -> accessText
        const parts = key.split('-');
        const camelKey = parts[0] + parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
        
        this.state[camelKey] = value;
        this.updatePreview();
    },

    updatePreview: function() {
        const previewAvatar = document.querySelector('.preview-avatar');
        const previewText = document.querySelector('.preview-text');
        const previewCard = document.querySelector('.preview-card');

        // 1. Accessibility -> Text Size (affects Font Size of preview text)
        // Mapping: 14 (base) -> 1.2rem. Range 10-30.
        // Formula: val / 10 + 'rem'
        previewText.style.fontSize = (this.state.accessText / 10) + 'rem';
        
        // 2. Accessibility -> Button Size (affects Padding/Scale of dummy buttons if we had them)
        // For visual, let's scale the Avatar Text size
        previewAvatar.style.fontSize = (this.state.accessBtn / 6) + 'rem';

        // 3. Accessibility -> Panel Size (affects Card padding)
        previewCard.style.padding = (this.state.accessPanel / 8) + 'rem';
    },

    saveSettings: function() {
        localStorage.setItem('brainiac_settings', JSON.stringify(this.state));
        
        // Visual Feedback
        const btn = document.getElementById('apply-settings-btn');
        const originalText = btn.textContent;
        btn.textContent = "Saved!";
        btn.style.backgroundColor = "white";
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.backgroundColor = "#76FF03";
        }, 1000);

        // Here we would also update the :root CSS variables to actually apply to the app
        this.applyToRoot();
    },

    applyToRoot: function() {
        const root = document.documentElement;
        // Example application of settings
        // root.style.setProperty('--font-size-base', this.state.accessText + 'px');
        console.log("Settings applied to root variables.");
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.Brainiac.Settings.init();
});