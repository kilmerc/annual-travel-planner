/**
 * Smart Business Travel Planner - Application Bootstrap
 *
 * Entry point for the application
 * Initializes all services and UI components
 */

import StateManager from './services/StateManager.js';
import TutorialService from './services/TutorialService.js';
import ViewManager from './ui/ViewManager.js';
import MetricsBar from './ui/MetricsBar.js';
import ModalManager from './ui/ModalManager.js';
import SettingsView from './ui/SettingsView.js';
import TypeConfigModal from './ui/TypeConfigModal.js';
import TypeDeletionModal from './ui/TypeDeletionModal.js';
import TypeManagementModal from './ui/TypeManagementModal.js';
import LocationManagementModal from './ui/LocationManagementModal.js';
import HelpModal from './ui/HelpModal.js';

class TravelPlannerApp {
    constructor() {
        // Services (singletons)
        this.stateManager = StateManager;

        // UI Components
        this.viewManager = new ViewManager();
        this.metricsBar = new MetricsBar();
        this.modalManager = new ModalManager();
        this.settingsView = new SettingsView();
        this.typeConfigModal = new TypeConfigModal();
        this.typeDeletionModal = new TypeDeletionModal();
        this.typeManagementModal = new TypeManagementModal();
        this.locationManagementModal = new LocationManagementModal();
        this.helpModal = new HelpModal();
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing Travel Planner...');

        // Get DOM elements
        const mainContent = document.getElementById('mainContent');
        const metricsBarEl = document.getElementById('metricsBar');

        if (!mainContent || !metricsBarEl) {
            console.error('Required DOM elements not found');
            return;
        }

        // Initialize UI components
        this.viewManager.init(mainContent);
        this.metricsBar.init(metricsBarEl);
        this.modalManager.init();
        this.settingsView.init();
        this.typeConfigModal.init();
        this.typeDeletionModal.init();
        this.typeManagementModal.init();
        this.locationManagementModal.init();
        this.helpModal.init();

        // Setup header controls
        this.setupHeaderControls();

        // Update display
        this.updateHeader();

        // Check if this is first time and show tutorial
        TutorialService.checkFirstTime();

        console.log('Travel Planner initialized successfully');
    }

    /**
     * Setup header controls (view toggles, year navigation, etc.)
     * @private
     */
    setupHeaderControls() {
        // Year navigation
        const btnYearPrev = document.getElementById('btnYearPrev');
        const btnYearNext = document.getElementById('btnYearNext');

        if (btnYearPrev) {
            btnYearPrev.addEventListener('click', () => {
                const currentYear = this.stateManager.getYear();
                this.stateManager.setYear(currentYear - 1);
                this.updateHeader();
            });
        }

        if (btnYearNext) {
            btnYearNext.addEventListener('click', () => {
                const currentYear = this.stateManager.getYear();
                this.stateManager.setYear(currentYear + 1);
                this.updateHeader();
            });
        }

        // Add plan button (using event delegation since it's dynamically created)
        document.addEventListener('click', (e) => {
            if (e.target.closest('#btnAddPlan')) {
                this.modalManager.openAddModal();
            }
        });

        // Settings button
        const btnSettings = document.getElementById('btnSettings');
        if (btnSettings) {
            btnSettings.addEventListener('click', () => {
                this.settingsView.open();
            });
        }

        // Help button
        const btnHelp = document.getElementById('btnHelp');
        if (btnHelp) {
            btnHelp.addEventListener('click', () => {
                TutorialService.start();
            });
        }
    }

    /**
     * Update header display (year)
     * @private
     */
    updateHeader() {
        const displayYear = document.getElementById('displayYear');
        if (displayYear) {
            const year = this.stateManager.getYear();
            displayYear.textContent = `${year}`;
        }
    }
}

// Bootstrap application when DOM is ready
const app = new TravelPlannerApp();
window.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Expose app for debugging (optional)
if (window.location.hostname === 'localhost' || window.location.protocol === 'file:') {
    window.__travelPlanner = app;
}

export default app;
