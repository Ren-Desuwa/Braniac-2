/* [2026-01-26 11:45 pm - batch 1.23.0] */
/* patient/js/settings/settings.js */

window.Brainiac = window.Brainiac || {};

window.Brainiac.Settings = {
    
    // Default Scale
    defaults: {
        appScale: 1.0
    },

    state: {},

    init: function() {
        this.loadState();
        this.applyToRoot(); // Apply immediately
        
        // Bind UI only if on Settings Page
        if (document.querySelector('.settings-controls')) {
            this.bindEvents();
            this.updatePreview();
        }
    },

    loadState: function() {
        const stored = localStorage.getItem('brainiac_settings');
        // Merge with defaults to ensure structure exists
        this.state = stored ? { ...this.defaults, ...JSON.parse(stored) } : { ...this.defaults };
        
        // Populate Slider
        this.setInputValue(this.state.appScale);
    },

    setInputValue: function(value) {
        const slider = document.getElementById('global-scale-slider');
        const display = document.getElementById('global-scale-val');
        if(slider && display) {
            slider.value = value;
            display.textContent = value + 'x';
        }
    },

    bindEvents: function() {
        const slider = document.getElementById('global-scale-slider');
        const minusBtn = document.getElementById('scale-minus');
        const plusBtn = document.getElementById('scale-plus');
        const display = document.getElementById('global-scale-val');

        if(!slider) return;

        // Slider Drag
        slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            display.textContent = val + 'x';
            this.updateState(val);
        });

        // Minus Button
        minusBtn.addEventListener('click', () => {
            let val = parseFloat(slider.value);
            if (val > parseFloat(slider.min)) {
                val = parseFloat((val - 0.1).toFixed(1));
                slider.value = val;
                display.textContent = val + 'x';
                this.updateState(val);
            }
        });

        // Plus Button
        plusBtn.addEventListener('click', () => {
            let val = parseFloat(slider.value);
            if (val < parseFloat(slider.max)) {
                val = parseFloat((val + 0.1).toFixed(1));
                slider.value = val;
                display.textContent = val + 'x';
                this.updateState(val);
            }
        });

        // Apply Button
        const applyBtn = document.getElementById('apply-settings-btn');
        if(applyBtn){
            applyBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }
    },

    updateState: function(value) {
        this.state.appScale = value;
        this.updatePreview();
        // Optional: Live update the whole app while dragging
        // this.applyToRoot(); 
    },

    updatePreview: function() {
        const previewAvatar = document.querySelector('.preview-avatar');
        const previewText = document.querySelector('.preview-text');
        const previewCard = document.querySelector('.preview-card');
        
        if(!previewText) return;

        const baseText = 16;
        const basePadding = 24;

        // Apply scaling to preview elements
        previewText.style.fontSize = (baseText * this.state.appScale) + 'px';
        previewAvatar.style.fontSize = (32 * this.state.appScale) + 'px';
        previewCard.style.padding = (basePadding * this.state.appScale) + 'px';
    },

    saveSettings: function() {
        localStorage.setItem('brainiac_settings', JSON.stringify(this.state));
        
        const btn = document.getElementById('apply-settings-btn');
        const originalText = btn.textContent;
        btn.textContent = "Saved!";
        btn.style.backgroundColor = "white";
        
        this.applyToRoot(); // Apply globally

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.backgroundColor = "#76FF03";
        }, 1000);
    },

    applyToRoot: function() {
        const root = document.documentElement;
        root.style.setProperty('--app-scale', this.state.appScale);
        console.log(`Global Scale Applied: ${this.state.appScale}x`);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.Brainiac.Settings.init();
});