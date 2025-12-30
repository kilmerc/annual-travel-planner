/**
 * SettingsView - Application settings management
 *
 * Features:
 * - Dark/Light mode toggle
 * - Load sample data
 * - Import/Export JSON
 * - Clear all data
 * - App information
 */

import StateManager from '../services/StateManager.js';
import DataService from '../services/DataService.js';
import TutorialService from '../services/TutorialService.js';
import ToastService from '../services/ToastService.js';
import ConfirmDialog from '../services/ConfirmDialog.js';
import EventBus from '../utils/EventBus.js';
import GoogleDriveService from '../services/GoogleDriveService.js';

export class SettingsView {
    #modalId = 'settingsModal';
    #theme = 'light';

    constructor() {
        this.#loadTheme();
    }

    /**
     * Initialize settings
     */
    init() {
        this.#applyTheme();
        this.#setupEventListeners();
    }

    /**
     * Open settings modal
     */
    open() {
        const modal = document.getElementById(this.#modalId);
        if (!modal) return;

        // Update UI to reflect current settings
        this.#updateSettingsUI();

        modal.classList.remove('hidden', 'pointer-events-none');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.classList.add('opacity-100', 'pointer-events-auto');
        }, 10);
    }

    /**
     * Close settings modal
     */
    close() {
        const modal = document.getElementById(this.#modalId);
        if (!modal) return;

        modal.classList.remove('opacity-100', 'pointer-events-auto');
        modal.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }

    /**
     * Setup event listeners
     * @private
     */
    #setupEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.#toggleTheme());
        }

        // Load sample data
        const loadSampleBtn = document.getElementById('btnLoadSample');
        if (loadSampleBtn) {
            loadSampleBtn.addEventListener('click', () => this.#loadSampleData());
        }

        // Export data
        const exportBtn = document.getElementById('btnExportSettings');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.#exportData());
        }

        // Import data
        const importBtn = document.getElementById('btnImportSettings');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.#importData());
        }

        // Clear all data
        const clearBtn = document.getElementById('btnClearSettings');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.#clearAllData());
        }

        // Restart tutorial
        const restartTutorialBtn = document.getElementById('btnRestartTutorial');
        if (restartTutorialBtn) {
            restartTutorialBtn.addEventListener('click', () => {
                this.close(); // Close settings first
                setTimeout(() => {
                    TutorialService.reset();
                }, 300); // Wait for modal to close
            });
        }

        // Learn How It Works
        const btnLearnHowItWorks = document.getElementById('btnLearnHowItWorks');
        if (btnLearnHowItWorks) {
            btnLearnHowItWorks.addEventListener('click', () => {
                this.close(); // Close settings first
                setTimeout(() => {
                    EventBus.emit('help:open');
                }, 300); // Wait for modal to close
            });
        }

        // Manage Event Types (includes both trip and constraint types)
        const manageEventTypesBtn = document.getElementById('btnManageEventTypes');
        if (manageEventTypesBtn) {
            manageEventTypesBtn.addEventListener('click', () => {
                this.close(); // Close settings first
                setTimeout(() => {
                    EventBus.emit('manage-types:open');
                }, 300);
            });
        }

        // Manage Locations
        const manageLocationsBtn = document.getElementById('btnManageLocations');
        if (manageLocationsBtn) {
            manageLocationsBtn.addEventListener('click', () => {
                this.close(); // Close settings first
                setTimeout(() => {
                    EventBus.emit('manage-locations:open');
                }, 300);
            });
        }

        // Google Drive Settings
        const btnDriveSettings = document.getElementById('btnDriveSettings');
        console.log('Google Drive button found:', !!btnDriveSettings);
        if (btnDriveSettings) {
            btnDriveSettings.addEventListener('click', () => {
                console.log('Google Drive button clicked!');
                this.close(); // Close settings first
                setTimeout(() => {
                    console.log('Emitting google-drive:open event');
                    EventBus.emit('google-drive:open');
                }, 300);
            });
        }

        // Close button
        const closeBtn = document.querySelector('[data-modal-close="settingsModal"]');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
    }

    /**
     * Update settings UI to reflect current state
     * @private
     */
    #updateSettingsUI() {
        // Update theme toggle icon
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.className = this.#theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }

        const themeLabel = document.getElementById('themeLabel');
        if (themeLabel) {
            themeLabel.textContent = this.#theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
        }

        // Update data statistics
        const state = StateManager.getState();
        const statsEl = document.getElementById('dataStats');
        if (statsEl) {
            statsEl.innerHTML = `
                <div class="text-sm text-slate-600 dark:text-slate-400">
                    <div><strong>${state.events.length}</strong> travel events</div>
                    <div><strong>${state.constraints.length}</strong> constraints</div>
                    <div><strong>${state.customLocations.length}</strong> custom locations</div>
                </div>
            `;
        }

        // Update Google Drive status
        const driveStatusEl = document.getElementById('driveStatus');
        if (driveStatusEl) {
            const isConnected = GoogleDriveService.isSignedIn();
            driveStatusEl.innerHTML = isConnected
                ? '<i class="fas fa-check-circle text-green-500"></i> Google Drive Connected'
                : '<i class="fas fa-times-circle text-slate-400"></i> Not Connected';
        }
    }

    /**
     * Toggle between dark and light theme
     * @private
     */
    #toggleTheme() {
        this.#theme = this.#theme === 'light' ? 'dark' : 'light';
        this.#saveTheme();
        this.#applyTheme();
        this.#updateSettingsUI();
    }

    /**
     * Apply current theme
     * @private
     */
    #applyTheme() {
        const html = document.documentElement;
        if (this.#theme === 'dark') {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }
    }

    /**
     * Load theme from localStorage
     * @private
     */
    #loadTheme() {
        const saved = localStorage.getItem('travelPlannerTheme');
        if (saved) {
            this.#theme = saved;
        } else {
            // Check system preference
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                this.#theme = 'dark';
            }
        }
    }

    /**
     * Save theme to localStorage
     * @private
     */
    #saveTheme() {
        localStorage.setItem('travelPlannerTheme', this.#theme);
    }

    /**
     * Load sample data
     * @private
     */
    async #loadSampleData() {
        const confirmed = await ConfirmDialog.show({
            title: 'Load Sample Data',
            message: 'This will replace your current data with sample data. Continue?',
            confirmText: 'Load Sample Data',
            isDangerous: false
        });

        if (!confirmed) {
            return;
        }

        try {
            // Fetch sample data
            const response = await fetch('./data/SampleData2026.json');
            if (!response.ok) {
                throw new Error('Failed to load sample data');
            }

            const sampleData = await response.json();
            StateManager.importState(sampleData);

            ToastService.success('Sample data loaded successfully!');
            this.#updateSettingsUI();
        } catch (error) {
            console.error('Error loading sample data:', error);
            ToastService.error(`Failed to load sample data: ${error.message}`);
        }
    }

    /**
     * Export data to JSON file
     * @private
     */
    #exportData() {
        const state = StateManager.getState();
        DataService.downloadJSON(state);
        ToastService.success('Data exported successfully!');
    }

    /**
     * Import data from JSON file
     * @private
     */
    async #importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const contents = await DataService.readFile(file);
                const data = DataService.importFromJSON(contents);
                StateManager.importState(data);
                ToastService.success('Data imported successfully!');
                this.#updateSettingsUI();
            } catch (error) {
                ToastService.error(`Import failed: ${error.message}`);
            }
        };

        input.click();
    }

    /**
     * Clear all data
     * @private
     */
    async #clearAllData() {
        const confirmed = await ConfirmDialog.show({
            title: 'Clear All Data',
            message: 'Are you sure? This will delete all events and constraints. This cannot be undone.',
            confirmText: 'Clear All Data',
            isDangerous: true
        });

        if (!confirmed) {
            return;
        }

        StateManager.clearAll();
        ToastService.success('All data cleared successfully!');
        this.#updateSettingsUI();
    }
}

export default SettingsView;
