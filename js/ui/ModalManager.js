/**
 * ModalManager - Modal dialog management
 *
 * Handles:
 * - Add Trip modal (Fixed and Flexible modes)
 * - Add Constraint modal
 * - Export/Import modal
 */

import EventBus from '../utils/EventBus.js';
import StateManager from '../services/StateManager.js';
import ScoringEngine from '../services/ScoringEngine.js';
import DataService from '../services/DataService.js';
import { formatDate } from '../services/DateService.js';

export class ModalManager {
    #addModalId = 'addModal';
    #exportModalId = 'exportModal';
    #editingEventId = null;
    #editingConstraintId = null;

    /**
     * Initialize modal manager
     */
    init() {
        this.#setupEventListeners();

        // Subscribe to events
        EventBus.on('quick-add:clicked', (data) => this.openAddModal(data.date));
        EventBus.on('calendar:day-clicked', (data) => this.openAddModal(data.date));
    }

    /**
     * Open add trip/constraint modal
     * @param {string} prefilledDate - Optional pre-filled date (ISO)
     */
    openAddModal(prefilledDate = null) {
        this.#editingEventId = null;
        this.#editingConstraintId = null;

        this.open(this.#addModalId);

        // Reset form
        document.getElementById('tripForm').reset();
        document.getElementById('constraintForm').reset();

        if (prefilledDate) {
            document.getElementById('tripDate').value = prefilledDate;
            document.getElementById('tripEndDate').value = prefilledDate;
            document.getElementById('constraintDate').value = prefilledDate;
            document.getElementById('constraintEndDate').value = prefilledDate;
        }

        // Switch to trip tab by default
        this.#switchTab('trip');

        // Clear suggestion results
        const suggestionResults = document.getElementById('suggestionResults');
        if (suggestionResults) {
            suggestionResults.classList.add('hidden');
            suggestionResults.innerHTML = '';
        }
    }

    /**
     * Open edit event modal
     * @param {string} eventId - Event ID to edit
     */
    openEditEventModal(eventId) {
        const event = StateManager.getEvent(eventId);
        if (!event) {
            console.error('Event not found:', eventId);
            return;
        }

        this.#editingEventId = eventId;
        this.#editingConstraintId = null;

        this.open(this.#addModalId);

        // Pre-fill form with event data
        document.getElementById('tripTitle').value = event.title || '';
        document.getElementById('tripLocation').value = event.location || '';
        document.getElementById('tripType').value = event.type || 'division';
        document.getElementById('tripMode').value = event.isFixed ? 'fixed' : 'flexible';

        if (event.isFixed && event.endDate) {
            document.getElementById('tripDate').value = event.startDate;
            document.getElementById('tripEndDate').value = event.endDate;
        } else {
            document.getElementById('tripDate').value = event.startDate;
        }

        this.#switchTab('trip');
        this.#toggleTripMode();

        // Clear suggestion results
        const suggestionResults = document.getElementById('suggestionResults');
        if (suggestionResults) {
            suggestionResults.classList.add('hidden');
            suggestionResults.innerHTML = '';
        }
    }

    /**
     * Open edit constraint modal
     * @param {string} constraintId - Constraint ID to edit
     */
    openEditConstraintModal(constraintId) {
        const constraint = StateManager.getConstraint(constraintId);
        if (!constraint) {
            console.error('Constraint not found:', constraintId);
            return;
        }

        this.#editingConstraintId = constraintId;
        this.#editingEventId = null;

        this.open(this.#addModalId);

        // Pre-fill form with constraint data
        document.getElementById('constraintTitle').value = constraint.title || '';
        document.getElementById('constraintType').value = constraint.type || 'vacation';
        document.getElementById('constraintDate').value = constraint.startDate;
        document.getElementById('constraintEndDate').value = constraint.endDate || constraint.startDate;

        this.#switchTab('constraint');
    }

    /**
     * Open export/import modal
     */
    openExportModal() {
        this.open(this.#exportModalId);

        // Populate textarea with current state
        const state = StateManager.getState();
        const json = DataService.exportToJSON(state);
        document.getElementById('ioTextarea').value = json;
    }

    /**
     * Open modal with animation
     * @param {string} modalId - Modal element ID
     */
    open(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.classList.remove('hidden', 'pointer-events-none');

        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.classList.add('opacity-100', 'pointer-events-auto');
        }, 10);
    }

    /**
     * Close modal with animation
     * @param {string} modalId - Modal element ID
     */
    close(modalId) {
        const modal = document.getElementById(modalId);
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
        // Tab switching
        document.addEventListener('click', (e) => {
            const tabBtn = e.target.closest('.tab-btn');
            if (tabBtn) {
                const tabName = tabBtn.dataset.tab;
                this.#switchTab(tabName);
            }
        });

        // Trip mode toggle (Fixed vs Flexible)
        const tripModeSelect = document.getElementById('tripMode');
        if (tripModeSelect) {
            tripModeSelect.addEventListener('change', () => this.#toggleTripMode());
        }

        // Find best weeks button
        const findBestBtn = document.getElementById('btnFindBest');
        if (findBestBtn) {
            findBestBtn.addEventListener('click', () => this.#getSuggestions());
        }

        // Save buttons
        const saveFixedBtn = document.getElementById('btnSaveFixedTrip');
        if (saveFixedBtn) {
            saveFixedBtn.addEventListener('click', () => this.#saveFixedTrip());
        }

        const saveConstraintBtn = document.getElementById('btnSaveConstraint');
        if (saveConstraintBtn) {
            saveConstraintBtn.addEventListener('click', () => this.#saveConstraint());
        }

        // Export/Import buttons
        const exportBtn = document.getElementById('btnExportData');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.#exportData());
        }

        const importBtn = document.getElementById('btnImportData');
        if (importBtn) {
            importBtn.addEventListener('click', () => this.#importData());
        }

        // Modal close buttons
        document.addEventListener('click', (e) => {
            const closeBtn = e.target.closest('[data-modal-close]');
            if (closeBtn) {
                const modalId = closeBtn.dataset.modalClose;
                this.close(modalId);
            }
        });

        // Edit event buttons
        document.addEventListener('click', (e) => {
            const editBtn = e.target.closest('[data-action="edit-event"]');
            if (editBtn) {
                const eventId = editBtn.dataset.id;
                this.openEditEventModal(eventId);
            }
        });

        // Edit constraint buttons
        document.addEventListener('click', (e) => {
            const editBtn = e.target.closest('[data-action="edit-constraint"]');
            if (editBtn) {
                const constraintId = editBtn.dataset.id;
                this.openEditConstraintModal(constraintId);
            }
        });
    }

    /**
     * Switch tab
     * @private
     */
    #switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('border-blue-600', 'text-blue-600', 'dark:text-blue-400');
            btn.classList.add('border-transparent', 'text-slate-500', 'dark:text-slate-400');
        });

        const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.remove('border-transparent', 'text-slate-500', 'dark:text-slate-400');
            activeBtn.classList.add('border-blue-600', 'text-blue-600', 'dark:text-blue-400');
        }

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

        const activeContent = document.getElementById(`${tabName}Form`);
        if (activeContent) {
            activeContent.classList.remove('hidden');
            activeContent.classList.add('block');
        }
    }

    /**
     * Toggle trip mode (Fixed vs Flexible)
     * @private
     */
    #toggleTripMode() {
        const mode = document.getElementById('tripMode').value;
        const flexibleInputs = document.getElementById('flexibleInputs');
        const fixedInputs = document.getElementById('fixedInputs');

        if (mode === 'flexible') {
            flexibleInputs.classList.remove('hidden');
            fixedInputs.classList.add('hidden');
        } else {
            flexibleInputs.classList.add('hidden');
            fixedInputs.classList.remove('hidden');
        }
    }

    /**
     * Get suggestions for flexible trip
     * @private
     */
    #getSuggestions() {
        const quarterId = parseInt(document.getElementById('tripQuarter').value);
        const location = document.getElementById('tripLocation').value.toLowerCase().trim();

        if (!location) {
            alert('Please enter a location for optimization suggestions.');
            return;
        }

        const container = document.getElementById('suggestionResults');
        container.innerHTML = '<div class="text-xs text-slate-500 dark:text-slate-400 animate-pulse">Analyzing schedule constraints...</div>';
        container.classList.remove('hidden');

        // Get suggestions from scoring engine
        const state = StateManager.getState();
        const suggestions = ScoringEngine.getSuggestionsForQuarter(
            quarterId,
            state.year,
            location,
            state.events,
            state.constraints
        );

        // Display suggestions
        setTimeout(() => {
            this.#displaySuggestions(suggestions);
        }, 300);
    }

    /**
     * Display suggestions
     * @private
     */
    #displaySuggestions(suggestions) {
        const container = document.getElementById('suggestionResults');
        container.innerHTML = '';

        if (suggestions.length === 0) {
            container.innerHTML = '<div class="text-red-500 dark:text-red-400 text-xs font-bold">No viable weeks found in this quarter due to constraints.</div>';
            return;
        }

        suggestions.forEach(opt => {
            const el = document.createElement('div');
            el.className = `p-2 border rounded cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition flex justify-between items-center ${
                opt.score > 150 ? 'border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-slate-200 dark:border-slate-600'
            }`;

            const niceDate = formatDate(opt.date, { month: 'short', day: 'numeric' });
            el.innerHTML = `
                <div>
                    <div class="font-bold text-sm text-slate-700 dark:text-slate-200">Week of ${niceDate}</div>
                    <div class="text-[10px] text-slate-500 dark:text-slate-400">${opt.reasons.join(', ') || 'Clear schedule'}</div>
                </div>
                <button class="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded" data-action="accept-suggestion" data-iso="${opt.iso}">
                    ${opt.score > 200 ? 'Add to Trip' : 'Book'}
                </button>
            `;

            // Add click handler for accept button
            const acceptBtn = el.querySelector('[data-action="accept-suggestion"]');
            acceptBtn.addEventListener('click', () => {
                this.#acceptSuggestion(opt.iso);
            });

            container.appendChild(el);
        });
    }

    /**
     * Accept suggestion and create event
     * @private
     */
    #acceptSuggestion(isoDate) {
        const title = document.getElementById('tripTitle').value || 'Division Visit';
        const type = document.getElementById('tripType').value;
        const location = document.getElementById('tripLocation').value;

        StateManager.addEvent({
            id: Date.now().toString(),
            title,
            type,
            location,
            startDate: isoDate,
            duration: 1,
            isFixed: false
        });

        this.close(this.#addModalId);
    }

    /**
     * Save fixed trip
     * @private
     */
    #saveFixedTrip() {
        const title = document.getElementById('tripTitle').value;
        const location = document.getElementById('tripLocation').value;
        const startDateVal = document.getElementById('tripDate').value;
        const endDateVal = document.getElementById('tripEndDate').value;
        const type = document.getElementById('tripType').value;

        if (!title || !startDateVal || !endDateVal) {
            alert('Title, Start Date, and End Date are required');
            return;
        }

        if (this.#editingEventId) {
            // Update existing event
            StateManager.updateEvent(this.#editingEventId, {
                title,
                location,
                type,
                startDate: startDateVal,
                endDate: endDateVal,
                duration: 1,
                isFixed: true
            });
            this.#editingEventId = null;
        } else {
            // Add new event
            StateManager.addEvent({
                id: Date.now().toString(),
                title,
                location,
                type,
                startDate: startDateVal,
                endDate: endDateVal,
                duration: 1,
                isFixed: true
            });
        }

        this.close(this.#addModalId);

        // Reset form
        document.getElementById('tripForm').reset();
    }

    /**
     * Save constraint
     * @private
     */
    #saveConstraint() {
        const title = document.getElementById('constraintTitle').value;
        const type = document.getElementById('constraintType').value;
        const startDateVal = document.getElementById('constraintDate').value;
        const endDateVal = document.getElementById('constraintEndDate').value;

        if (!title || !startDateVal || !endDateVal) {
            alert('Title, Start Date, and End Date are required');
            return;
        }

        if (this.#editingConstraintId) {
            // Update existing constraint
            StateManager.updateConstraint(this.#editingConstraintId, {
                title,
                type,
                startDate: startDateVal,
                endDate: endDateVal
            });
            this.#editingConstraintId = null;
        } else {
            // Add new constraint
            StateManager.addConstraint({
                id: Date.now().toString(),
                title,
                type,
                startDate: startDateVal,
                endDate: endDateVal
            });
        }

        this.close(this.#addModalId);

        // Reset form
        document.getElementById('constraintForm').reset();
    }

    /**
     * Export data
     * @private
     */
    #exportData() {
        const state = StateManager.getState();
        DataService.downloadJSON(state, `travel_plan_fy${state.fiscalYear}.json`);
    }

    /**
     * Import data
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
                this.close(this.#exportModalId);
                alert('Data imported successfully!');
            } catch (error) {
                alert(`Import failed: ${error.message}`);
            }
        };

        input.click();
    }
}

export default ModalManager;
