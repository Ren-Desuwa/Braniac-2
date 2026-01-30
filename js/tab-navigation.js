/* [2026-01-26 09:30 pm - batch 1.20.0] */
/* patient/js/core/tab-navigation.js */

/**
 * Brainiac Tab Manager
 * Handles the switching between Dashboard, Tasks, Games, and Settings.
 */

window.Brainiac = window.Brainiac || {};

window.Brainiac.Tabs = {
    
    // Config: Map tab names to DOM View IDs
    views: {
        'dashboard': 'view-dashboard',
        'games': 'view-games',
        'tasks': 'view-tasks',
        'settings': 'view-settings' // Added Settings
    },

    init: function() {
        // 1. Navigation Pills (Dashboard, Tasks, Games)
        const navLinks = document.querySelectorAll('.nav-link[data-tab]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = link.getAttribute('data-tab');
                this.switch(targetTab);
            });
        });

        // 2. Icon Buttons (Settings Trigger)
        const settingsBtn = document.getElementById('settings-trigger-btn');
        if(settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switch('settings');
                // Optional: Deactivate pills visually when in settings
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            });
        }

        // Optional: Auto-load dashboard on start if nothing active
        if(!document.querySelector('.nav-link.active') && !document.getElementById('view-settings').style.display === 'block') {
             this.switch('dashboard');
        }

        console.log("Brainiac Tab System Initialized");
    },

    switch: function(tabName) {
        // 1. Update Navigation State (Visuals)
        // Only update pills if the target is one of the main tabs
        if(['dashboard', 'games', 'tasks'].includes(tabName)) {
            const allLinks = document.querySelectorAll('.nav-link');
            allLinks.forEach(link => {
                if (link.getAttribute('data-tab') === tabName) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        }

        // 2. Hide All Views
        Object.values(this.views).forEach(viewId => {
            if (viewId) {
                const el = document.getElementById(viewId);
                if (el) el.style.display = 'none';
            }
        });

        // 3. Show Target View
        const targetViewId = this.views[tabName];
        if (targetViewId) {
            const targetEl = document.getElementById(targetViewId);
            if (targetEl) {
                // Determine layout type based on tab
                if (tabName === 'games') {
                    targetEl.style.display = 'grid'; 
                } else {
                    targetEl.style.display = 'block'; // Settings & Others use standard block/flow
                }
            }
        } else {
            console.warn(`View for tab '${tabName}' not found.`);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.Brainiac.Tabs.init();
});