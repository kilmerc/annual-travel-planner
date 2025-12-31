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
import TutorialService from '../services/TutorialService.js';
import ToastService from '../services/ToastService.js';
import ConfirmDialog from '../services/ConfirmDialog.js';
import { formatDate, getFriday, getMonday, dateToISO } from '../services/DateService.js';
import ComboBox from './ComboBox.js';
import { BUILT_IN_LOCATIONS } from '../config/calendarConfig.js';
import { escapeHTML } from '../utils/htmlSanitizer.js';

export class ModalManager {
    #addModalId = 'addModal';
    #exportModalId = 'exportModal';
    #editingEventId = null;
    #editingConstraintId = null;
    #batchTrips = [];
    #tripTypeComboBox = null;
    #tripLocationComboBox = null;
    #constraintTypeComboBox = null;
    #pendingTripTypeSelection = null;
    #pendingConstraintTypeSelection = null;
    #batchWizardState = {
        isActive: false,
        currentStep: 0,        // 0-based: 0 = Trip 1
        totalSteps: 0,
        trips: [],             // Original trip configs
        selections: [],        // User selections: [{ tripIndex, week, location, title, type }, ...]
        timeRangeId: '',
        referenceDate: null,
        excludeEventIds: []
    };

    /**
     * Initialize modal manager
     */
    init() {
        this.#initializeComboBoxes();
        this.#setupEventListeners();

        // Subscribe to events
        EventBus.on('quick-add:clicked', (data) => this.openAddModal(data.date));
        EventBus.on('calendar:day-clicked', (data) => this.openAddModal(data.date));

        // Listen for type configuration changes to refresh ComboBoxes
        EventBus.on('type:configured', (data) => this.#handleTypeConfigured(data));
        EventBus.on('type:deleted', () => this.#refreshComboBoxOptions());
        EventBus.on('location:added', () => this.#refreshLocationComboBox());
        EventBus.on('location:deleted', () => this.#refreshLocationComboBox());
    }

    /**
     * Initialize ComboBox instances
     * @private
     */
    #initializeComboBoxes() {
        // Initialize Trip Type ComboBox
        const eventTypeConfigs = StateManager.getAllEventTypeConfigs();
        const eventTypeOptions = Object.entries(eventTypeConfigs).map(([id, config]) => ({
            value: id,
            label: config.label,
            isBuiltIn: config.isBuiltIn
        }));

        this.#tripTypeComboBox = new ComboBox({
            options: eventTypeOptions,
            value: '', // No default - show all options
            placeholder: 'Select trip type...',
            onChange: (value) => {},
            onAdd: (value, label) => {
                // Track that we want to select this type after it's configured
                this.#pendingTripTypeSelection = value.toLowerCase().replace(/\s+/g, '-');
                // Open type config modal to configure the new type
                EventBus.emit('type-config:open', { kind: 'event', typeId: null, suggestedId: value, suggestedLabel: label });
            },
            onDelete: async (value) => {
                const config = StateManager.getEventTypeConfig(value);
                if (config) {
                    // Check for conflicts and handle deletion
                    const state = StateManager.getState();
                    const eventsWithType = state.events.filter(e => e.type === value);
                    if (eventsWithType.length > 0) {
                        EventBus.emit('type-deletion:open-event', {
                            typeId: value,
                            typeLabel: config.label,
                            eventCount: eventsWithType.length
                        });
                    } else {
                        const confirmed = await ConfirmDialog.show({
                            title: 'Delete Trip Type',
                            message: `Are you sure you want to delete "${config.label}"? This cannot be undone.`,
                            confirmText: 'Delete',
                            isDangerous: true
                        });
                        if (confirmed) {
                            StateManager.deleteEventType(value, 'delete');
                        }
                    }
                }
            },
            placeholder: 'Select trip type...',
            allowCreate: true,
            allowDelete: true
        });
        this.#tripTypeComboBox.render(document.getElementById('tripTypeContainer'));

        // Initialize Location ComboBox
        const allLocations = [...BUILT_IN_LOCATIONS, ...StateManager.getAllLocations()];
        const locationOptions = allLocations.map(loc => ({
            value: loc,
            label: loc,
            isBuiltIn: BUILT_IN_LOCATIONS.includes(loc)
        }));

        this.#tripLocationComboBox = new ComboBox({
            options: locationOptions,
            value: '',
            onChange: (value) => {},
            onAdd: (value, label) => {
                StateManager.addCustomLocation(value);
            },
            onDelete: async (value) => {
                const confirmed = await ConfirmDialog.show({
                    title: 'Delete Location',
                    message: `Are you sure you want to delete "${value}"? This cannot be undone.`,
                    confirmText: 'Delete',
                    isDangerous: true
                });
                if (confirmed) {
                    StateManager.deleteCustomLocation(value);
                }
            },
            placeholder: 'Select or type location...',
            allowCreate: true,
            allowDelete: true
        });
        this.#tripLocationComboBox.render(document.getElementById('tripLocationContainer'));

        // Initialize Constraint Type ComboBox
        const constraintTypeConfigs = StateManager.getAllConstraintTypeConfigs();
        const constraintTypeOptions = Object.entries(constraintTypeConfigs).map(([id, config]) => ({
            value: id,
            label: config.label,
            isBuiltIn: config.isBuiltIn
        }));

        this.#constraintTypeComboBox = new ComboBox({
            options: constraintTypeOptions,
            value: '', // No default - show all options
            placeholder: 'Select constraint type...',
            onChange: (value) => {},
            onAdd: (value, label) => {
                // Track that we want to select this type after it's configured
                this.#pendingConstraintTypeSelection = value.toLowerCase().replace(/\s+/g, '-');
                // Open type config modal to configure the new type
                EventBus.emit('type-config:open', { kind: 'constraint', typeId: null, suggestedId: value, suggestedLabel: label });
            },
            onDelete: async (value) => {
                const config = StateManager.getConstraintTypeConfig(value);
                if (config) {
                    // Check for conflicts and handle deletion
                    const state = StateManager.getState();
                    const constraintsWithType = state.constraints.filter(c => c.type === value);
                    if (constraintsWithType.length > 0) {
                        EventBus.emit('type-deletion:open-constraint', {
                            typeId: value,
                            typeLabel: config.label,
                            constraintCount: constraintsWithType.length
                        });
                    } else {
                        const confirmed = await ConfirmDialog.show({
                            title: 'Delete Constraint Type',
                            message: `Are you sure you want to delete "${config.label}"? This cannot be undone.`,
                            confirmText: 'Delete',
                            isDangerous: true
                        });
                        if (confirmed) {
                            StateManager.deleteConstraintType(value);
                        }
                    }
                }
            },
            placeholder: 'Select constraint type...',
            allowCreate: true,
            allowDelete: true
        });
        this.#constraintTypeComboBox.render(document.getElementById('constraintTypeContainer'));
    }

    /**
     * Handle type configuration event
     * @private
     */
    #handleTypeConfigured(data) {
        this.#refreshComboBoxOptions();

        // Auto-select newly created type if pending
        if (data.kind === 'event' && this.#pendingTripTypeSelection) {
            if (data.typeId === this.#pendingTripTypeSelection) {
                this.#tripTypeComboBox.setValue(data.typeId);
                this.#pendingTripTypeSelection = null;
            }
        } else if (data.kind === 'constraint' && this.#pendingConstraintTypeSelection) {
            if (data.typeId === this.#pendingConstraintTypeSelection) {
                this.#constraintTypeComboBox.setValue(data.typeId);
                this.#pendingConstraintTypeSelection = null;
            }
        }
    }

    /**
     * Refresh ComboBox options after type configuration changes
     * @private
     */
    #refreshComboBoxOptions() {
        // Refresh event types
        const eventTypeConfigs = StateManager.getAllEventTypeConfigs();
        const eventTypeOptions = Object.entries(eventTypeConfigs).map(([id, config]) => ({
            value: id,
            label: config.label,
            isBuiltIn: config.isBuiltIn
        }));
        this.#tripTypeComboBox.updateOptions(eventTypeOptions);

        // Refresh constraint types
        const constraintTypeConfigs = StateManager.getAllConstraintTypeConfigs();
        const constraintTypeOptions = Object.entries(constraintTypeConfigs).map(([id, config]) => ({
            value: id,
            label: config.label,
            isBuiltIn: config.isBuiltIn
        }));
        this.#constraintTypeComboBox.updateOptions(constraintTypeOptions);
    }

    /**
     * Refresh location ComboBox options after location changes
     * @private
     */
    #refreshLocationComboBox() {
        const allLocations = [...BUILT_IN_LOCATIONS, ...StateManager.getAllLocations()];
        const locationOptions = allLocations.map(loc => ({
            value: loc,
            label: loc,
            isBuiltIn: BUILT_IN_LOCATIONS.includes(loc)
        }));
        this.#tripLocationComboBox.updateOptions(locationOptions);
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

        // Reset ComboBoxes to empty (no default selection)
        this.#tripTypeComboBox.setValue('');
        this.#tripLocationComboBox.setValue('');
        this.#constraintTypeComboBox.setValue('');

        if (prefilledDate) {
            document.getElementById('tripDate').value = prefilledDate;
            document.getElementById('tripEndDate').value = prefilledDate;
            document.getElementById('constraintDate').value = prefilledDate;
            document.getElementById('constraintEndDate').value = prefilledDate;
        }

        // Hide delete buttons (we're adding, not editing)
        document.getElementById('btnDeleteTrip').classList.add('hidden');
        document.getElementById('btnDeleteTripFlexible').classList.add('hidden');
        document.getElementById('btnDeleteConstraint').classList.add('hidden');

        // Switch to trip tab by default
        this.#switchTab('trip');

        // Clear suggestion results
        const suggestionResults = document.getElementById('suggestionResults');
        if (suggestionResults) {
            suggestionResults.classList.add('hidden');
            suggestionResults.innerHTML = '';
        }

        // Check and show modal tutorial if first time or requested
        TutorialService.checkAndShowModalTutorial();
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
        this.#tripTypeComboBox.setValue(event.type || '');
        document.getElementById('tripMode').value = event.isFixed ? 'fixed' : 'flexible';

        // Set location using ComboBox
        this.#tripLocationComboBox.setValue(event.location || '');

        if (event.isFixed && event.endDate) {
            document.getElementById('tripDate').value = event.startDate;
            document.getElementById('tripEndDate').value = event.endDate;
        } else {
            document.getElementById('tripDate').value = event.startDate;
        }

        this.#switchTab('trip');
        this.#toggleTripMode();

        // Show delete button for editing trips
        if (event.isFixed) {
            document.getElementById('btnDeleteTrip').classList.remove('hidden');
            document.getElementById('btnDeleteTripFlexible').classList.add('hidden');
        } else {
            document.getElementById('btnDeleteTrip').classList.add('hidden');
            document.getElementById('btnDeleteTripFlexible').classList.remove('hidden');
        }
        document.getElementById('btnDeleteConstraint').classList.add('hidden');

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
        this.#constraintTypeComboBox.setValue(constraint.type || '');
        document.getElementById('constraintDate').value = constraint.startDate;
        document.getElementById('constraintEndDate').value = constraint.endDate || constraint.startDate;

        // Show delete button for editing constraints
        document.getElementById('btnDeleteConstraint').classList.remove('hidden');
        document.getElementById('btnDeleteTrip').classList.add('hidden');
        document.getElementById('btnDeleteTripFlexible').classList.add('hidden');

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

        // Multi-add mode toggle for trips
        const multiAddMode = document.getElementById('multiAddMode');
        if (multiAddMode) {
            multiAddMode.addEventListener('change', () => this.#toggleMultiAddMode());
        }

        // Multi-add mode toggle for constraints
        const multiAddModeConstraint = document.getElementById('multiAddModeConstraint');
        if (multiAddModeConstraint) {
            multiAddModeConstraint.addEventListener('change', () => this.#toggleMultiAddModeConstraint());
        }

        // Add date range button for trips
        const btnAddDateRange = document.getElementById('btnAddDateRange');
        if (btnAddDateRange) {
            btnAddDateRange.addEventListener('click', () => this.#addDateRangeInput());
        }

        // Add date range button for constraints
        const btnAddConstraintDateRange = document.getElementById('btnAddConstraintDateRange');
        if (btnAddConstraintDateRange) {
            btnAddConstraintDateRange.addEventListener('click', () => this.#addConstraintDateRangeInput());
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

        // Delete buttons
        const btnDeleteTrip = document.getElementById('btnDeleteTrip');
        if (btnDeleteTrip) {
            btnDeleteTrip.addEventListener('click', () => this.#deleteEvent());
        }

        const btnDeleteTripFlexible = document.getElementById('btnDeleteTripFlexible');
        if (btnDeleteTripFlexible) {
            btnDeleteTripFlexible.addEventListener('click', () => this.#deleteEvent());
        }

        const btnDeleteConstraint = document.getElementById('btnDeleteConstraint');
        if (btnDeleteConstraint) {
            btnDeleteConstraint.addEventListener('click', () => this.#deleteConstraint());
        }

        // Batch planning buttons
        const btnAddBatchTrip = document.getElementById('btnAddBatchTrip');
        if (btnAddBatchTrip) {
            btnAddBatchTrip.addEventListener('click', () => this.#addBatchTripRow());
        }

        const btnGenerateBatchPlan = document.getElementById('btnGenerateBatchPlan');
        if (btnGenerateBatchPlan) {
            btnGenerateBatchPlan.addEventListener('click', () => this.#generateBatchPlan());
        }

        const btnImportExistingTrips = document.getElementById('btnImportExistingTrips');
        if (btnImportExistingTrips) {
            btnImportExistingTrips.addEventListener('click', () => this.#openTripImportModal());
        }

        const btnConfirmImportTrips = document.getElementById('btnConfirmImportTrips');
        if (btnConfirmImportTrips) {
            btnConfirmImportTrips.addEventListener('click', () => this.#confirmTripImport());
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
     * Toggle multi-add mode for trips
     * @private
     */
    #toggleMultiAddMode() {
        const isChecked = document.getElementById('multiAddMode').checked;
        const btnAddDateRange = document.getElementById('btnAddDateRange');

        if (isChecked) {
            btnAddDateRange.classList.remove('hidden');
        } else {
            btnAddDateRange.classList.add('hidden');
            // Remove extra date ranges, keep only the first
            const container = document.getElementById('dateRangesContainer');
            const dateRanges = container.querySelectorAll('.date-range-group');
            dateRanges.forEach((range, index) => {
                if (index > 0) range.remove();
            });
        }
    }

    /**
     * Toggle multi-add mode for constraints
     * @private
     */
    #toggleMultiAddModeConstraint() {
        const isChecked = document.getElementById('multiAddModeConstraint').checked;
        const btnAddConstraintDateRange = document.getElementById('btnAddConstraintDateRange');

        if (isChecked) {
            btnAddConstraintDateRange.classList.remove('hidden');
        } else {
            btnAddConstraintDateRange.classList.add('hidden');
            // Remove extra date ranges, keep only the first
            const container = document.getElementById('constraintDateRangesContainer');
            const dateRanges = container.querySelectorAll('.constraint-date-range-group');
            dateRanges.forEach((range, index) => {
                if (index > 0) range.remove();
            });
        }
    }

    /**
     * Add a new date range input for trips
     * @private
     */
    #addDateRangeInput() {
        const container = document.getElementById('dateRangesContainer');
        const dateRangeCount = container.querySelectorAll('.date-range-group').length;

        const newRange = document.createElement('div');
        newRange.className = 'date-range-group space-y-2 p-3 border dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900/50 mb-2 relative';
        newRange.innerHTML = `
            <button type="button" class="remove-date-range absolute top-2 right-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                <i class="fas fa-times-circle"></i>
            </button>
            <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Start Date</label>
                <input type="date" class="trip-start-date w-full border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-200">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">End Date</label>
                <input type="date" class="trip-end-date w-full border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-200">
            </div>
        `;

        // Add remove button listener
        newRange.querySelector('.remove-date-range').addEventListener('click', () => {
            newRange.remove();
        });

        container.appendChild(newRange);
    }

    /**
     * Add a new date range input for constraints
     * @private
     */
    #addConstraintDateRangeInput() {
        const container = document.getElementById('constraintDateRangesContainer');
        const dateRangeCount = container.querySelectorAll('.constraint-date-range-group').length;

        const newRange = document.createElement('div');
        newRange.className = 'constraint-date-range-group space-y-2 p-3 border dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900/50 mb-2 relative';
        newRange.innerHTML = `
            <button type="button" class="remove-constraint-date-range absolute top-2 right-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
                <i class="fas fa-times-circle"></i>
            </button>
            <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Start Date</label>
                <input type="date" class="constraint-start-date w-full border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-200">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">End Date</label>
                <input type="date" class="constraint-end-date w-full border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-200">
            </div>
        `;

        // Add remove button listener
        newRange.querySelector('.remove-constraint-date-range').addEventListener('click', () => {
            newRange.remove();
        });

        container.appendChild(newRange);
    }

    /**
     * Get suggestions for flexible trip
     * @private
     */
    #getSuggestions() {
        const timeRangeId = document.getElementById('tripTimeRange').value;
        const location = this.#tripLocationComboBox.getValue().trim();

        if (!location) {
            ToastService.warning('Please enter a location for optimization suggestions.');
            return;
        }

        const container = document.getElementById('suggestionResults');
        container.innerHTML = '<div class="text-xs text-slate-500 dark:text-slate-400 animate-pulse">Analyzing schedule constraints...</div>';
        container.classList.remove('hidden');

        // Get suggestions from scoring engine
        const state = StateManager.getState();
        const suggestions = ScoringEngine.getSuggestionsForTimeRange(
            timeRangeId,
            StateManager.getYear(),
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
                    <div class="font-bold text-sm text-slate-700 dark:text-slate-200">Week of ${escapeHTML(niceDate)}</div>
                    <div class="text-[10px] text-slate-500 dark:text-slate-400">${escapeHTML(opt.reasons.join(', ') || 'Clear schedule')}</div>
                </div>
                <button class="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded" data-action="accept-suggestion" data-iso="${escapeHTML(opt.iso)}">
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
        const type = this.#tripTypeComboBox.getValue();
        const location = this.#tripLocationComboBox.getValue();

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
        const location = this.#tripLocationComboBox.getValue();
        const type = this.#tripTypeComboBox.getValue();
        const isMultiAdd = document.getElementById('multiAddMode').checked;

        if (!title) {
            ToastService.error('Title is required');
            return;
        }

        if (this.#editingEventId) {
            // Update existing event
            const startDateVal = document.getElementById('tripDate').value;
            const endDateVal = document.getElementById('tripEndDate').value;

            if (!startDateVal || !endDateVal) {
                ToastService.error('Start Date and End Date are required');
                return;
            }

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
        } else if (this.#editingConstraintId) {
            // Converting constraint to trip - delete constraint and create trip
            const startDateVal = document.getElementById('tripDate').value;
            const endDateVal = document.getElementById('tripEndDate').value;

            if (!startDateVal || !endDateVal) {
                ToastService.error('Start Date and End Date are required');
                return;
            }

            StateManager.deleteConstraint(this.#editingConstraintId);
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
            this.#editingConstraintId = null;
        } else {
            // Add new event(s)
            const container = document.getElementById('dateRangesContainer');
            const dateRangeGroups = container.querySelectorAll('.date-range-group');

            let allValid = true;
            const dateRanges = [];

            dateRangeGroups.forEach(group => {
                const startInput = group.querySelector('.trip-start-date');
                const endInput = group.querySelector('.trip-end-date');
                const startDateVal = startInput.value;
                const endDateVal = endInput.value;

                if (startDateVal && endDateVal) {
                    dateRanges.push({ startDate: startDateVal, endDate: endDateVal });
                } else if (startDateVal || endDateVal) {
                    allValid = false;
                }
            });

            if (!allValid || dateRanges.length === 0) {
                ToastService.error('Please fill in both Start Date and End Date for all date ranges');
                return;
            }

            // Create an event for each date range
            dateRanges.forEach(range => {
                StateManager.addEvent({
                    id: Date.now().toString() + Math.random(),
                    title,
                    location,
                    type,
                    startDate: range.startDate,
                    endDate: range.endDate,
                    duration: 1,
                    isFixed: true
                });
            });
        }

        this.close(this.#addModalId);

        // Reset form
        document.getElementById('tripForm').reset();
        document.getElementById('multiAddMode').checked = false;
        this.#toggleMultiAddMode();
    }

    /**
     * Save constraint
     * @private
     */
    #saveConstraint() {
        const title = document.getElementById('constraintTitle').value;
        const type = this.#constraintTypeComboBox.getValue();
        const isMultiAdd = document.getElementById('multiAddModeConstraint').checked;

        if (!title) {
            ToastService.error('Title is required');
            return;
        }

        if (this.#editingConstraintId) {
            // Update existing constraint
            const startDateVal = document.getElementById('constraintDate').value;
            const endDateVal = document.getElementById('constraintEndDate').value;

            if (!startDateVal || !endDateVal) {
                ToastService.error('Start Date and End Date are required');
                return;
            }

            StateManager.updateConstraint(this.#editingConstraintId, {
                title,
                type,
                startDate: startDateVal,
                endDate: endDateVal
            });
            this.#editingConstraintId = null;
        } else if (this.#editingEventId) {
            // Converting trip to constraint - delete event and create constraint
            const startDateVal = document.getElementById('constraintDate').value;
            const endDateVal = document.getElementById('constraintEndDate').value;

            if (!startDateVal || !endDateVal) {
                ToastService.error('Start Date and End Date are required');
                return;
            }

            StateManager.deleteEvent(this.#editingEventId);
            StateManager.addConstraint({
                id: Date.now().toString(),
                title,
                type,
                startDate: startDateVal,
                endDate: endDateVal
            });
            this.#editingEventId = null;
        } else {
            // Add new constraint(s)
            const container = document.getElementById('constraintDateRangesContainer');
            const dateRangeGroups = container.querySelectorAll('.constraint-date-range-group');

            let allValid = true;
            const dateRanges = [];

            dateRangeGroups.forEach(group => {
                const startInput = group.querySelector('.constraint-start-date');
                const endInput = group.querySelector('.constraint-end-date');
                const startDateVal = startInput.value;
                const endDateVal = endInput.value;

                if (startDateVal && endDateVal) {
                    dateRanges.push({ startDate: startDateVal, endDate: endDateVal });
                } else if (startDateVal || endDateVal) {
                    allValid = false;
                }
            });

            if (!allValid || dateRanges.length === 0) {
                ToastService.error('Please fill in both Start Date and End Date for all date ranges');
                return;
            }

            // Create a constraint for each date range
            dateRanges.forEach(range => {
                StateManager.addConstraint({
                    id: Date.now().toString() + Math.random(),
                    title,
                    type,
                    startDate: range.startDate,
                    endDate: range.endDate
                });
            });
        }

        this.close(this.#addModalId);

        // Reset form
        document.getElementById('constraintForm').reset();
        document.getElementById('multiAddModeConstraint').checked = false;
        this.#toggleMultiAddModeConstraint();
    }

    /**
     * Export data
     * @private
     */
    #exportData() {
        const state = StateManager.getState();
        DataService.downloadJSON(state, `travel_plan_${StateManager.getYear()}.json`);
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
                ToastService.success('Data imported successfully!');
            } catch (error) {
                ToastService.error(`Import failed: ${error.message}`);
            }
        };

        input.click();
    }

    /**
     * Delete event
     * @private
     */
    async #deleteEvent() {
        if (!this.#editingEventId) {
            console.error('No event being edited');
            return;
        }

        const confirmed = await ConfirmDialog.show({
            title: 'Delete Trip',
            message: 'Are you sure you want to delete this trip? This cannot be undone.',
            confirmText: 'Delete',
            isDangerous: true
        });

        if (!confirmed) {
            return;
        }

        StateManager.deleteEvent(this.#editingEventId);
        this.#editingEventId = null;
        this.close(this.#addModalId);
    }

    /**
     * Delete constraint
     * @private
     */
    async #deleteConstraint() {
        if (!this.#editingConstraintId) {
            console.error('No constraint being edited');
            return;
        }

        const confirmed = await ConfirmDialog.show({
            title: 'Delete Constraint',
            message: 'Are you sure you want to delete this constraint? This cannot be undone.',
            confirmText: 'Delete',
            isDangerous: true
        });

        if (!confirmed) {
            return;
        }

        StateManager.deleteConstraint(this.#editingConstraintId);
        this.#editingConstraintId = null;
        this.close(this.#addModalId);
    }

    /**
     * Add batch trip row
     * @private
     */
    #addBatchTripRow() {
        const container = document.getElementById('batchTripsContainer');
        if (!container) return;

        const index = container.children.length;
        const tripRow = document.createElement('div');
        tripRow.className = 'p-4 border dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900/50 space-y-3';
        tripRow.dataset.index = index;

        tripRow.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <h4 class="font-semibold text-sm">Trip ${index + 1}</h4>
                <button type="button" class="remove-batch-trip text-red-500 hover:text-red-700" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Title</label>
                    <input type="text" class="batch-title w-full border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-200" placeholder="e.g. London Team Visit">
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Type</label>
                    <div class="batch-type-container"></div>
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Location</label>
                <div class="batch-location-container"></div>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Preferred Seasons (Optional)</label>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" class="season-winter cursor-pointer" value="winter"> Winter (Dec-Feb)
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" class="season-spring cursor-pointer" value="spring"> Spring (Mar-May)
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" class="season-summer cursor-pointer" value="summer"> Summer (Jun-Aug)
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" class="season-fall cursor-pointer" value="fall"> Fall (Sep-Nov)
                    </label>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <input type="checkbox" class="can-consolidate cursor-pointer">
                <label class="text-xs cursor-pointer">Can consolidate with other trips</label>
            </div>
        `;

        container.appendChild(tripRow);

        // Create ComboBox for trip type
        const eventTypeConfigs = StateManager.getAllEventTypeConfigs();
        const eventTypeOptions = Object.entries(eventTypeConfigs).map(([id, config]) => ({
            value: id,
            label: config.label,
            isBuiltIn: config.isBuiltIn
        }));

        const typeContainer = tripRow.querySelector('.batch-type-container');
        const typeComboBox = new ComboBox({
            options: eventTypeOptions,
            value: '', // No default - show all options
            placeholder: 'Select trip type...',
            onChange: (value) => {},
            onAdd: (value, label) => {
                EventBus.emit('type-config:open', { kind: 'event', typeId: null, suggestedId: value, suggestedLabel: label });
            },
            onDelete: async (value) => {
                const config = StateManager.getEventTypeConfig(value);
                if (config) {
                    const state = StateManager.getState();
                    const eventsWithType = state.events.filter(e => e.type === value);
                    if (eventsWithType.length > 0) {
                        EventBus.emit('type-deletion:open-event', {
                            typeId: value,
                            typeLabel: config.label,
                            eventCount: eventsWithType.length
                        });
                    } else {
                        const confirmed = await ConfirmDialog.show({
                            title: 'Delete Trip Type',
                            message: `Are you sure you want to delete "${config.label}"?`,
                            confirmText: 'Delete',
                            isDangerous: true
                        });
                        if (confirmed) {
                            StateManager.deleteEventType(value, 'delete');
                        }
                    }
                }
            }
        });
        typeComboBox.render(typeContainer);

        // Create ComboBox for location
        const allLocations = [...BUILT_IN_LOCATIONS, ...StateManager.getAllLocations()];
        const locationOptions = allLocations.map(loc => ({
            value: loc,
            label: loc,
            isBuiltIn: BUILT_IN_LOCATIONS.includes(loc)
        }));

        const locationContainer = tripRow.querySelector('.batch-location-container');
        const locationComboBox = new ComboBox({
            options: locationOptions,
            value: '',
            onChange: (value) => {},
            onAdd: (value, label) => {
                StateManager.addCustomLocation(value);
            },
            onDelete: async (value) => {
                const confirmed = await ConfirmDialog.show({
                    title: 'Delete Location',
                    message: `Are you sure you want to delete "${value}"?`,
                    confirmText: 'Delete',
                    isDangerous: true
                });
                if (confirmed) {
                    StateManager.deleteCustomLocation(value);
                }
            },
            placeholder: 'Select or type location...',
            allowCreate: true,
            allowDelete: true
        });
        locationComboBox.render(locationContainer);

        // Store the ComboBox instances on the row for later retrieval
        tripRow.typeComboBox = typeComboBox;
        tripRow.locationComboBox = locationComboBox;

        // Add remove listener
        tripRow.querySelector('.remove-batch-trip').addEventListener('click', (e) => {
            tripRow.remove();
        });
    }

    /**
     * Generate batch plan
     * @private
     */
    #generateBatchPlan() {
        const container = document.getElementById('batchTripsContainer');
        if (!container || container.children.length === 0) {
            ToastService.warning('Please add at least one trip to the batch');
            return;
        }

        // Get the selected time range
        const timeRangeId = document.getElementById('batchTimeRange').value;

        // Collect batch trip data using helper method
        const batchTrips = this.#collectBatchTrips(container);

        if (batchTrips.length === 0) {
            ToastService.warning('Please enter locations for your trips');
            return;
        }

        // Collect all original event IDs to exclude from scoring
        const excludeEventIds = batchTrips
            .filter(t => t.originalEventId)
            .map(t => t.originalEventId);

        // Get reference date for time range calculation
        const referenceDate = this.#getBatchReferenceDate(batchTrips);

        // Initialize wizard instead of parallel processing
        this.#initializeBatchWizard(batchTrips, timeRangeId, referenceDate, excludeEventIds);
    }

    /**
     * Display batch results
     * @private
     */
    #displayBatchResults(results) {
        const resultsContainer = document.getElementById('batchResults');
        if (!resultsContainer) return;

        let html = '<div class="border-t dark:border-slate-600 pt-4"><h4 class="font-bold mb-4 text-lg">Batch Plan Results</h4>';

        results.forEach(({ trip, suggestions, tripIndex }) => {
            const isExistingTrip = !!trip.originalEventId;
            const containerClass = isExistingTrip ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-600' : 'bg-white dark:bg-slate-800';

            html += `
                <div class="mb-6 p-4 border-2 dark:border-slate-600 rounded ${containerClass}" data-trip-index="${tripIndex}">
                    <h5 class="font-semibold mb-3 flex items-center gap-2">
                        Trip ${tripIndex + 1}: ${escapeHTML(trip.title || trip.location)}
                        ${isExistingTrip ? '<span class="text-xs px-2 py-0.5 bg-indigo-600 text-white rounded">Existing Trip</span>' : ''}
                    </h5>
                    ${suggestions.length === 0 ? '<p class="text-slate-500 text-sm">No available weeks found</p>' : ''}
                    <div class="space-y-2">
            `;

            // For existing trips, add "Keep original" option first
            if (isExistingTrip) {
                const originalEvent = StateManager.getEvent(trip.originalEventId);
                const originalWeek = originalEvent?.startDate || '';
                const originalWeekFormatted = originalWeek
                    ? formatDate(originalWeek, { month: 'short', day: 'numeric' })
                    : 'Unknown';

                html += `
                    <div class="flex justify-between items-center p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-600 rounded">
                        <label class="flex items-center gap-3 text-sm flex-1 cursor-pointer">
                            <input type="radio" name="batch-trip-${tripIndex}" class="batch-week-radio cursor-pointer"
                                   data-trip-index="${tripIndex}"
                                   data-week="${escapeHTML(originalWeek)}"
                                   data-original-week="true"
                                   data-original-event-id="${escapeHTML(trip.originalEventId)}"
                                   data-action="keep"
                                   checked>
                            <div>
                                <strong><i class="fas fa-anchor mr-1"></i>Keep Current Week:</strong> Week of ${escapeHTML(originalWeekFormatted)}
                                <span class="text-xs text-slate-500 ml-2">(No change)</span>
                            </div>
                        </label>
                    </div>
                `;
            }

            // Add suggestion options
            suggestions.forEach((sug, idx) => {
                const checkedAttr = !isExistingTrip && idx === 0 ? 'checked' : '';
                html += `
                    <div class="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900 rounded">
                        <label class="flex items-center gap-3 text-sm flex-1 cursor-pointer">
                            <input type="radio" name="batch-trip-${tripIndex}" class="batch-week-radio cursor-pointer"
                                   data-trip-index="${tripIndex}"
                                   data-week="${escapeHTML(sug.iso)}"
                                   data-title="${escapeHTML(trip.title || '')}"
                                   data-type="${escapeHTML(trip.type)}"
                                   data-location="${escapeHTML(trip.location)}"
                                   ${isExistingTrip ? `data-original-event-id="${escapeHTML(trip.originalEventId)}"` : ''}
                                   ${checkedAttr}>
                            <div>
                                <strong>${isExistingTrip ? 'Move to' : `Option ${idx + 1}:`}</strong> Week of ${escapeHTML(sug.iso)}
                                <span class="text-xs text-slate-500 ml-2">(Score: ${sug.score})</span>
                            </div>
                        </label>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        html += `
            <div class="border-t dark:border-slate-600 pt-4 mt-4">
                <button id="btnAddSelectedBatchTrips" class="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded shadow-sm font-medium transition">
                    <i class="fas fa-check mr-2"></i>Apply Changes to Calendar
                </button>
            </div>
        `;

        html += '</div>';
        resultsContainer.innerHTML = html;
        resultsContainer.classList.remove('hidden');

        // Track selected weeks for real-time validation
        const selectedWeeks = new Set();

        // Initialize with "keep original" selections
        resultsContainer.querySelectorAll('.batch-week-radio[data-action="keep"]:checked').forEach(radio => {
            selectedWeeks.add(radio.dataset.week);
        });

        // Add event listeners for radio buttons
        resultsContainer.querySelectorAll('.batch-week-radio').forEach(radio => {
            radio.addEventListener('change', () => {
                // Update selected weeks tracking
                selectedWeeks.clear();
                resultsContainer.querySelectorAll('.batch-week-radio:checked').forEach(checkedRadio => {
                    selectedWeeks.add(checkedRadio.dataset.week);
                });

                // Disable radio buttons for weeks that are selected in other trips
                resultsContainer.querySelectorAll('.batch-week-radio').forEach(r => {
                    const week = r.dataset.week;
                    const isThisRadioChecked = r.checked;

                    // Disable if this week is selected by a different trip
                    const isWeekTakenByOtherTrip = selectedWeeks.has(week) && !isThisRadioChecked;
                    r.disabled = isWeekTakenByOtherTrip;

                    // Visual feedback for disabled state
                    if (isWeekTakenByOtherTrip) {
                        r.parentElement.classList.add('opacity-50', 'cursor-not-allowed');
                    } else {
                        r.parentElement.classList.remove('opacity-50', 'cursor-not-allowed');
                    }
                });
            });
        });

        // Add event listener for "Apply Changes" button
        const addSelectedBtn = document.getElementById('btnAddSelectedBatchTrips');
        if (addSelectedBtn) {
            addSelectedBtn.addEventListener('click', () => {
                this.#applyBatchChanges(resultsContainer);
            });
        }
    }

    /**
     * Apply batch changes to calendar
     * @private
     * @param {HTMLElement} resultsContainer - Results container element
     */
    #applyBatchChanges(resultsContainer) {
        const selectedRadios = resultsContainer.querySelectorAll('.batch-week-radio:checked');

        if (selectedRadios.length === 0) {
            ToastService.warning('Please select at least one trip to add');
            return;
        }

        let updateCount = 0;
        let createCount = 0;
        let keepCount = 0;

        // Process each selected radio
        selectedRadios.forEach(radio => {
            const originalEventId = radio.dataset.originalEventId;
            const isKeepOriginal = radio.dataset.action === 'keep';

            if (originalEventId) {
                // Existing trip
                if (isKeepOriginal) {
                    // No-op: Keep trip as-is
                    keepCount++;
                } else {
                    // Update trip to new week
                    const newWeek = radio.dataset.week;
                    const title = radio.dataset.title;
                    const type = radio.dataset.type;
                    const location = radio.dataset.location;

                    StateManager.updateEvent(originalEventId, {
                        title: title || StateManager.getEvent(originalEventId).title,
                        type: type || StateManager.getEvent(originalEventId).type,
                        location: location || StateManager.getEvent(originalEventId).location,
                        startDate: newWeek,
                        endDate: null, // Flexible trip
                        isFixed: false,
                        duration: 1
                    });

                    updateCount++;
                }
            } else {
                // New trip
                const title = radio.dataset.title;
                const type = radio.dataset.type;
                const location = radio.dataset.location;
                const date = radio.dataset.week;

                StateManager.addEvent({
                    id: Date.now().toString(),
                    title: title || `Visit ${location}`,
                    type: type || 'division',
                    location,
                    startDate: date,
                    duration: 1,
                    isFixed: false
                });

                createCount++;
            }
        });

        // Clear results and show success
        const totalChanges = updateCount + createCount;
        const summaryParts = [];
        if (createCount > 0) summaryParts.push(`${createCount} new trip${createCount > 1 ? 's' : ''} added`);
        if (updateCount > 0) summaryParts.push(`${updateCount} trip${updateCount > 1 ? 's' : ''} rescheduled`);
        if (keepCount > 0) summaryParts.push(`${keepCount} trip${keepCount > 1 ? 's' : ''} kept unchanged`);

        resultsContainer.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-check-circle text-green-600 text-5xl mb-4"></i>
                <p class="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">
                    Batch plan applied successfully!
                </p>
                <p class="text-sm text-slate-600 dark:text-slate-400">
                    ${summaryParts.join(', ')}
                </p>
                <button class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded" onclick="document.getElementById('batchResults').classList.add('hidden')">
                    Close
                </button>
            </div>
        `;
    }

    /**
     * Open trip import modal
     * @private
     */
    #openTripImportModal() {
        const state = StateManager.getState();
        const currentYear = StateManager.getYear();

        // Filter trips for current year, non-archived
        const currentYearTrips = state.events.filter(e => {
            if (e.archived) return false;
            const eventDate = new Date(e.startDate + 'T00:00:00');
            const eventYear = eventDate.getFullYear();
            return eventYear === currentYear;
        });

        if (currentYearTrips.length === 0) {
            ToastService.info('No trips found for current year');
            return;
        }

        // Populate modal
        const listContainer = document.getElementById('tripImportList');
        listContainer.innerHTML = '';

        currentYearTrips.forEach(event => {
            const typeConfig = StateManager.getEventTypeConfig(event.type);
            const typeLabel = typeConfig?.label || event.type;

            const startDate = formatDate(event.startDate, { month: 'short', day: 'numeric' });
            const endDate = event.endDate
                ? formatDate(event.endDate, { month: 'short', day: 'numeric' })
                : formatDate(getFriday(new Date(event.startDate + 'T00:00:00')), { month: 'short', day: 'numeric' });

            const itemEl = document.createElement('div');
            itemEl.className = 'flex items-center gap-3 p-3 border dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer';
            itemEl.innerHTML = `
                <input type="checkbox" class="trip-import-checkbox cursor-pointer" data-event-id="${escapeHTML(event.id)}" id="import-${escapeHTML(event.id)}">
                <label for="import-${escapeHTML(event.id)}" class="flex-1 cursor-pointer">
                    <div class="font-medium text-slate-700 dark:text-slate-200">${escapeHTML(event.title)}</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">
                        <span class="inline-block px-2 py-0.5 rounded text-xs mr-2" style="background-color: ${typeConfig?.color || '#6b7280'}22; color: ${typeConfig?.color || '#6b7280'}">
                            ${escapeHTML(typeLabel)}
                        </span>
                        ${escapeHTML(event.location)} • ${escapeHTML(startDate)} - ${escapeHTML(endDate)}
                    </div>
                </label>
            `;

            listContainer.appendChild(itemEl);
        });

        this.open('tripImportModal');
    }

    /**
     * Confirm trip import
     * @private
     */
    #confirmTripImport() {
        const checkboxes = document.querySelectorAll('.trip-import-checkbox:checked');

        if (checkboxes.length === 0) {
            ToastService.warning('Please select at least one trip to import');
            return;
        }

        const eventIds = Array.from(checkboxes).map(cb => cb.dataset.eventId);

        // Populate batch form with selected trips
        this.#populateBatchFormWithTrips(eventIds);

        this.close('tripImportModal');
        ToastService.success(`Imported ${eventIds.length} trip${eventIds.length > 1 ? 's' : ''}`);

        // Update reference date selector visibility
        const container = document.getElementById('batchTripsContainer');
        const batchTrips = this.#collectBatchTrips(container);
        this.#updateReferenceDateSelector(batchTrips);
    }

    /**
     * Populate batch form with existing trips
     * @private
     * @param {Array<string>} eventIds - Array of event IDs
     */
    #populateBatchFormWithTrips(eventIds) {
        const container = document.getElementById('batchTripsContainer');

        eventIds.forEach(eventId => {
            const event = StateManager.getEvent(eventId);
            if (!event) return;

            const index = container.children.length;
            const tripRow = document.createElement('div');
            tripRow.className = 'p-4 border-2 border-indigo-300 dark:border-indigo-600 rounded bg-indigo-50 dark:bg-indigo-900/20 space-y-3';
            tripRow.dataset.index = index;
            tripRow.dataset.originalEventId = eventId; // CRITICAL: Track original event

            tripRow.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <div class="flex items-center gap-2">
                        <h4 class="font-semibold text-sm text-slate-700 dark:text-slate-200">Trip ${index + 1}</h4>
                        <span class="text-xs px-2 py-0.5 bg-indigo-600 text-white rounded">Existing Trip</span>
                    </div>
                    <button type="button" class="remove-batch-trip text-red-500 hover:text-red-700" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Title</label>
                        <input type="text" class="batch-title w-full border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-200" placeholder="e.g. London Team Visit" value="${escapeHTML(event.title)}">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Type</label>
                        <div class="batch-type-container"></div>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Location</label>
                    <div class="batch-location-container"></div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Preferred Seasons (Optional)</label>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" class="season-winter cursor-pointer" value="winter"> Winter (Dec-Feb)
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" class="season-spring cursor-pointer" value="spring"> Spring (Mar-May)
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" class="season-summer cursor-pointer" value="summer"> Summer (Jun-Aug)
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" class="season-fall cursor-pointer" value="fall"> Fall (Sep-Nov)
                        </label>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <input type="checkbox" class="can-consolidate cursor-pointer" ${event.canConsolidate ? 'checked' : ''}>
                    <label class="text-xs text-slate-700 dark:text-slate-200 cursor-pointer">Can consolidate with other trips</label>
                </div>
            `;

            container.appendChild(tripRow);

            // Create ComboBox for trip type
            const eventTypeConfigs = StateManager.getAllEventTypeConfigs();
            const eventTypeOptions = Object.entries(eventTypeConfigs).map(([id, config]) => ({
                value: id,
                label: config.label,
                isBuiltIn: config.isBuiltIn
            }));

            const typeContainer = tripRow.querySelector('.batch-type-container');
            const typeComboBox = new ComboBox({
                options: eventTypeOptions,
                value: event.type, // Pre-select current type
                placeholder: 'Select trip type...',
                onChange: (value) => {},
                onAdd: (value, label) => {
                    EventBus.emit('type-config:open', { kind: 'event', typeId: null, suggestedId: value, suggestedLabel: label });
                },
                onDelete: async (value) => {
                    const result = await ConfirmDialog.confirm(
                        'Delete Trip Type',
                        `Are you sure you want to delete this trip type? This action cannot be undone.`
                    );
                    if (result) {
                        StateManager.deleteEventTypeConfig(value);
                        ToastService.success('Trip type deleted');
                    }
                }
            });
            typeComboBox.render(typeContainer);

            // Create ComboBox for location
            const allLocations = [...BUILT_IN_LOCATIONS, ...StateManager.getAllLocations()];
            const locationOptions = allLocations.map(loc => ({
                value: loc,
                label: loc,
                isBuiltIn: BUILT_IN_LOCATIONS.includes(loc)
            }));

            const locationContainer = tripRow.querySelector('.batch-location-container');
            const locationComboBox = new ComboBox({
                options: locationOptions,
                value: event.location || '', // Pre-select current location
                onChange: (value) => {},
                onAdd: (value, label) => {
                    StateManager.addCustomLocation(value);
                },
                onDelete: async (value) => {
                    const confirmed = await ConfirmDialog.show({
                        title: 'Delete Location',
                        message: `Are you sure you want to delete "${value}"?`,
                        confirmText: 'Delete',
                        isDangerous: true
                    });
                    if (confirmed) {
                        StateManager.deleteCustomLocation(value);
                    }
                },
                placeholder: 'Select or type location...',
                allowCreate: true,
                allowDelete: true
            });
            locationComboBox.render(locationContainer);

            // Store ComboBox instances on the row for later retrieval
            tripRow.typeComboBox = typeComboBox;
            tripRow.locationComboBox = locationComboBox;

            // Add remove listener
            tripRow.querySelector('.remove-batch-trip').addEventListener('click', (e) => {
                tripRow.remove();
                // Update reference date selector when trips removed
                const updatedTrips = this.#collectBatchTrips(container);
                this.#updateReferenceDateSelector(updatedTrips);
            });
        });
    }

    /**
     * Calculate reference date for batch planning
     * @private
     * @param {Array} batchTrips - Batch trips
     * @returns {Date} Reference date
     */
    #getBatchReferenceDate(batchTrips) {
        const referenceMode = document.querySelector('input[name="batchReferenceDate"]:checked')?.value;

        if (referenceMode === 'current') {
            return new Date();
        }

        // Get earliest trip date from existing trips
        const existingTrips = batchTrips.filter(t => t.originalEventId);
        if (existingTrips.length === 0) {
            return new Date(); // Fallback to current if no existing trips
        }

        const earliestDate = existingTrips.reduce((earliest, trip) => {
            const event = StateManager.getEvent(trip.originalEventId);
            if (!event) return earliest;
            const tripDate = new Date(event.startDate + 'T00:00:00');
            return !earliest || tripDate < earliest ? tripDate : earliest;
        }, null);

        return earliestDate || new Date();
    }

    /**
     * Update reference date selector visibility and values
     * @private
     * @param {Array} batchTrips - Batch trips
     */
    #updateReferenceDateSelector(batchTrips) {
        const selector = document.getElementById('batchReferenceDateSelector');
        const existingTrips = batchTrips.filter(t => t.originalEventId);

        if (existingTrips.length > 0) {
            selector.classList.remove('hidden');

            // Calculate and display earliest date
            const earliestDate = this.#getBatchReferenceDate(batchTrips);
            document.getElementById('earliestTripDate').textContent = formatDate(earliestDate, { month: 'short', year: 'numeric' });

            // Display current date
            const currentDate = new Date();
            document.getElementById('currentDate').textContent = formatDate(currentDate, { month: 'short', year: 'numeric' });
        } else {
            selector.classList.add('hidden');
        }
    }

    /**
     * Collect batch trips from container
     * @private
     * @param {HTMLElement} container - Batch trips container
     * @returns {Array} Array of batch trip objects
     */
    #collectBatchTrips(container) {
        return Array.from(container.children).map((row) => {
            const title = row.querySelector('.batch-title').value.trim();
            const type = row.typeComboBox ? row.typeComboBox.getValue() : '';
            const location = row.locationComboBox ? row.locationComboBox.getValue().trim() : '';
            const canConsolidate = row.querySelector('.can-consolidate').checked;
            const originalEventId = row.dataset.originalEventId || null;

            // Collect selected seasons
            const seasons = [];
            if (row.querySelector('.season-winter')?.checked) seasons.push('winter');
            if (row.querySelector('.season-spring')?.checked) seasons.push('spring');
            if (row.querySelector('.season-summer')?.checked) seasons.push('summer');
            if (row.querySelector('.season-fall')?.checked) seasons.push('fall');

            return { title, type, location, canConsolidate, originalEventId, seasons };
        }).filter(t => t.location);
    }

    /**
     * Initialize batch wizard
     * @private
     */
    #initializeBatchWizard(trips, timeRangeId, referenceDate, excludeEventIds) {
        this.#batchWizardState = {
            isActive: true,
            currentStep: 0,
            totalSteps: trips.length,
            trips: trips,
            selections: [],
            timeRangeId: timeRangeId,
            referenceDate: referenceDate,
            excludeEventIds: excludeEventIds
        };
        this.#showBatchStepScreen();
    }

    /**
     * Advance to next wizard step
     * @private
     */
    #advanceWizardStep(selectedWeek) {
        const currentTrip = this.#batchWizardState.trips[this.#batchWizardState.currentStep];
        this.#batchWizardState.selections.push({
            tripIndex: this.#batchWizardState.currentStep,
            week: selectedWeek,
            location: currentTrip.location,
            title: currentTrip.title,
            type: currentTrip.type,
            originalEventId: currentTrip.originalEventId
        });

        this.#batchWizardState.currentStep++;

        if (this.#batchWizardState.currentStep >= this.#batchWizardState.totalSteps) {
            this.#showBatchReviewScreen();
        } else {
            this.#showBatchStepScreen();
        }
    }

    /**
     * Go back to previous wizard step
     * Public method - called from HTML onclick
     */
    goBackWizardStep() {
        if (this.#batchWizardState.currentStep > 0) {
            this.#batchWizardState.currentStep--;
            this.#batchWizardState.selections.pop();
            this.#showBatchStepScreen();
        }
    }

    /**
     * Edit a specific wizard selection
     * Public method - called from HTML onclick
     */
    editWizardSelection(tripIndex) {
        ToastService.info('Trips after this one will need to be re-selected');
        this.#batchWizardState.selections = this.#batchWizardState.selections.slice(0, tripIndex);
        this.#batchWizardState.currentStep = tripIndex;
        this.#showBatchStepScreen();
    }

    /**
     * Reset wizard state
     * Public method - called from HTML onclick
     */
    resetBatchWizard() {
        this.#batchWizardState = {
            isActive: false,
            currentStep: 0,
            totalSteps: 0,
            trips: [],
            selections: [],
            timeRangeId: '',
            referenceDate: null,
            excludeEventIds: []
        };
    }

    /**
     * Select a week in the wizard (onclick handler)
     * Public method - called from HTML onclick
     */
    selectWizardWeek(week) {
        this.#advanceWizardStep(week);
    }

    /**
     * Get season filter display message
     * @private
     * @param {Array<string>} requestedSeasons - Array of season strings
     * @returns {string} Display message for seasons or empty string
     */
    #getSeasonsFilterMessage(requestedSeasons) {
        if (!requestedSeasons || requestedSeasons.length === 0) {
            return ''; // No filter requested
        }

        const seasonLabels = {
            winter: 'Winter',
            spring: 'Spring',
            summer: 'Summer',
            fall: 'Fall'
        };

        const seasonNames = requestedSeasons.map(s => seasonLabels[s] || s).join('/');
        return `Preferred: ${seasonNames}`;
    }

    /**
     * Show batch step screen for current trip
     * @private
     */
    #showBatchStepScreen() {
        const { currentStep, totalSteps, trips, selections } = this.#batchWizardState;
        const currentTrip = trips[currentStep];

        // Get suggestions for current trip
        const state = StateManager.getState();
        const events = state.events.filter(e => !this.#batchWizardState.excludeEventIds.includes(e.id));

        const suggestions = ScoringEngine.getSuggestionsForTimeRange(
            this.#batchWizardState.timeRangeId,
            this.#batchWizardState.referenceDate,
            currentTrip.location,
            events,
            state.constraints,
            this.#batchWizardState.excludeEventIds,
            selections, // Previous selections for adjacency
            currentTrip.seasons || [] // Season filter
        );

        // Get season display message
        const seasonMessage = this.#getSeasonsFilterMessage(currentTrip.seasons);

        // Build HTML
        const resultsContainer = document.getElementById('batchResults');
        resultsContainer.innerHTML = `
            <div class="p-4 bg-white dark:bg-slate-800 rounded-lg">
                <!-- Progress indicator -->
                <div class="mb-4 text-center">
                    <span class="text-sm font-semibold text-blue-600">Step ${currentStep + 1} of ${totalSteps}</span>
                    <div class="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-2">
                        <div class="bg-blue-600 h-2 rounded-full" style="width: ${((currentStep + 1) / totalSteps) * 100}%"></div>
                    </div>
                </div>

                <!-- Previous selections summary -->
                ${selections.length > 0 ? `
                    <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                        <h4 class="text-xs font-bold text-blue-800 dark:text-blue-200 uppercase mb-2">Previously Selected</h4>
                        ${selections.map(s => `
                            <div class="text-sm text-blue-700 dark:text-blue-300">
                                ✓ ${escapeHTML(s.title)} - Week of ${formatDate(s.week)}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <!-- Current trip -->
                <div class="mb-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded border-2 border-indigo-300 dark:border-indigo-600">
                    <h3 class="font-semibold text-lg mb-2">${escapeHTML(currentTrip.title)}</h3>
                    <div class="text-sm text-slate-600 dark:text-slate-400">
                        Type: ${StateManager.getEventTypeConfig(currentTrip.type)?.label || currentTrip.type} |
                        Location: ${escapeHTML(currentTrip.location)}
                        ${seasonMessage ? ` | ${escapeHTML(seasonMessage)}` : ''}
                    </div>
                </div>

                <!-- Suggestions -->
                <h4 class="font-semibold mb-3">Select a week for this trip:</h4>
                ${suggestions.length === 0 ? `
                    <div class="text-center py-8">
                        <i class="fas fa-exclamation-triangle text-yellow-600 text-4xl mb-4"></i>
                        <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">No available weeks found for this trip.</p>
                        <p class="text-xs text-slate-500 dark:text-slate-600 mb-4">Try going back and changing previous selections, or select a different time range.</p>
                    </div>
                ` : suggestions.map(sugg => `
                    <div class="mb-3 p-4 border-2 border-slate-300 dark:border-slate-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer transition-all"
                         onclick="window.modalManager.selectWizardWeek('${sugg.iso}')">
                        <div class="flex justify-between items-start mb-2">
                            <div class="font-semibold">Week of ${formatDate(sugg.iso)}</div>
                            <span class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded">
                                Score: ${sugg.score}
                            </span>
                        </div>
                        <ul class="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                            ${sugg.reasons.slice(0, 3).map(r => `<li>• ${escapeHTML(r)}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}

                <!-- Navigation -->
                <div class="flex justify-between mt-4">
                    <button class="px-4 py-2 bg-slate-500 text-white rounded hover:bg-slate-600 ${currentStep === 0 ? 'opacity-50 cursor-not-allowed' : ''}"
                            onclick="window.modalManager.goBackWizardStep()"
                            ${currentStep === 0 ? 'disabled' : ''}>
                        ← Back
                    </button>
                    <button class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            onclick="window.modalManager.resetBatchWizard(); document.getElementById('batchResults').classList.add('hidden');">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        resultsContainer.classList.remove('hidden');

        // Store reference for onclick handlers
        window.modalManager = this;
    }

    /**
     * Show batch review screen
     * @private
     */
    #showBatchReviewScreen() {
        const { selections } = this.#batchWizardState;

        const resultsContainer = document.getElementById('batchResults');
        resultsContainer.innerHTML = `
            <div class="p-4 bg-white dark:bg-slate-800 rounded-lg">
                <h3 class="text-xl font-semibold mb-4 text-center">Review Your Batch Plan</h3>

                <!-- Simple timeline -->
                <div class="mb-6 p-4 bg-slate-100 dark:bg-slate-900 rounded">
                    <div class="text-xs text-center text-slate-500 mb-2">Timeline</div>
                    <div class="flex justify-between items-center">
                        ${selections.map((s, i) => `
                            <div class="flex flex-col items-center">
                                <div class="w-3 h-3 rounded-full bg-blue-600 mb-1"></div>
                                <div class="text-xs text-slate-600 dark:text-slate-400">${i + 1}</div>
                            </div>
                        `).join('<div class="flex-1 h-0.5 bg-slate-300 dark:bg-slate-600 mx-2"></div>')}
                    </div>
                </div>

                <!-- All selections -->
                ${selections.map((s, i) => `
                    <div class="mb-3 p-4 border dark:border-slate-600 rounded">
                        <div class="flex justify-between items-start">
                            <div>
                                <div class="font-semibold">${escapeHTML(s.title)}</div>
                                <div class="text-sm text-slate-600 dark:text-slate-400">
                                    Week of ${formatDate(s.week)} | ${escapeHTML(s.location)}
                                </div>
                            </div>
                            <button class="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                                    onclick="window.modalManager.editWizardSelection(${i})">
                                Change Week
                            </button>
                        </div>
                    </div>
                `).join('')}

                <!-- Summary stats -->
                <div class="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded text-sm">
                    <strong>Summary:</strong> ${selections.length} trips planned | No conflicts detected
                </div>

                <!-- Actions -->
                <div class="flex justify-between mt-6">
                    <button class="px-4 py-2 bg-slate-500 text-white rounded hover:bg-slate-600"
                            onclick="window.modalManager.resetBatchWizard(); document.getElementById('batchResults').classList.add('hidden');">
                        Start Over
                    </button>
                    <button class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            onclick="window.modalManager.finalizeBatchWizard()">
                        Add All Trips to Calendar
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Finalize batch wizard and add all trips to calendar
     * Public method - called from HTML onclick
     */
    finalizeBatchWizard() {
        const { selections } = this.#batchWizardState;

        // Convert selections to events and add to state
        selections.forEach(s => {
            if (s.originalEventId) {
                // Update existing event
                StateManager.updateEvent(s.originalEventId, {
                    startDate: s.week,
                    endDate: null, // Flexible trip
                    location: s.location,
                    title: s.title,
                    type: s.type
                });
            } else {
                // Add new event
                StateManager.addEvent({
                    title: s.title,
                    type: s.type,
                    location: s.location,
                    startDate: s.week,
                    endDate: null, // Flexible trip
                    duration: 1,
                    isFixed: false
                });
            }
        });

        ToastService.success(`${selections.length} trips added to calendar`);
        this.resetBatchWizard();
        document.getElementById('batchResults').classList.add('hidden');
        this.close(this.#addModalId);
    }
}

export default ModalManager;
