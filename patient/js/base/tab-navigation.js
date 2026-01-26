/* [2026-01-26 03:40 pm - batch 1.11.0] */
/* patient/js/core/tab-navigation.js */

/**
 * Brainiac Tab Manager
 * Handles the switching between Dashboard, Tasks, and Games views.
 */

window.Brainiac = window.Brainiac || {};

window.Brainiac.Tabs = {
    
    // Config: Map tab names to DOM View IDs
    // UPDATED: 'tasks' now points to 'view-tasks'
    views: {
        'dashboard': 'view-dashboard',
        'games': 'view-games',
        'tasks': 'view-tasks' 
    },

    init: function() {
        const navLinks = document.querySelectorAll('.nav-link[data-tab]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = link.getAttribute('data-tab');
                this.switch(targetTab);
            });
        });

        // Optional: Auto-load dashboard on start if nothing active
        if(!document.querySelector('.nav-link.active')) {
             this.switch('dashboard');
        }

        console.log("Brainiac Tab System Initialized");
    },

    switch: function(tabName) {
        // 1. Update Navigation State (Visuals)
        const allLinks = document.querySelectorAll('.nav-link');
        allLinks.forEach(link => {
            if (link.getAttribute('data-tab') === tabName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

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
                    targetEl.style.display = 'grid'; // Grid layout for Games
                } else {
                    targetEl.style.display = 'flex'; // Flex column for Dashboard & Tasks
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