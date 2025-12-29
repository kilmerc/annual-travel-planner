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
import ComboBox from './ComboBox.js';
import { BUILT_IN_LOCATIONS } from '../config/calendarConfig.js';

export class ModalManager {
    #addModalId = 'addModal';
    #exportModalId = 'exportModal';
    #editingEventId = null;
    #editingConstraintId = null;
    #batchTrips = [];
    #tripTypeComboBox = null;
    #tripLocationComboBox = null;
    #constraintTypeComboBox = null;

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
        EventBus.on('type:configured', () => this.#refreshComboBoxOptions());
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
            value: 'division', // Default
            onChange: (value) => {},
            onAdd: (value, label) => {
                // Open type config modal to configure the new type
                EventBus.emit('type-config:open', { kind: 'event', typeId: value });
            },
            onDelete: (value) => {
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
                        if (confirm(`Delete type "${config.label}"?`)) {
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
            onDelete: (value) => {
                if (confirm(`Delete location "${value}"?`)) {
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
            value: 'vacation', // Default
            onChange: (value) => {},
            onAdd: (value, label) => {
                // Open type config modal to configure the new type
                EventBus.emit('type-config:open', { kind: 'constraint', typeId: value });
            },
            onDelete: (value) => {
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
                        if (confirm(`Delete type "${config.label}"?`)) {
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

        // Reset ComboBoxes to default values
        this.#tripTypeComboBox.setValue('division');
        this.#tripLocationComboBox.setValue('');
        this.#constraintTypeComboBox.setValue('vacation');

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
        document.getElementById('tripType').value = event.type || 'division';
        document.getElementById('tripMode').value = event.isFixed ? 'fixed' : 'flexible';

        // Handle location - check if it's a division code or custom location
        const divisionCodes = ['DAL', 'VAL', 'VCE', 'VCW', 'VER', 'VIN', 'VNE', 'VNY', 'VSC', 'VTX', 'VUT'];
        const location = event.location || '';

        if (divisionCodes.includes(location.toUpperCase())) {
            document.getElementById('tripLocationSelect').value = location.toUpperCase();
            document.getElementById('tripLocation').value = location.toUpperCase();
            document.getElementById('tripLocation').classList.add('hidden');
        } else {
            document.getElementById('tripLocationSelect').value = 'custom';
            document.getElementById('tripLocation').value = location;
            document.getElementById('tripLocation').classList.remove('hidden');
        }

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
        document.getElementById('constraintType').value = constraint.type || 'vacation';
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

        // Location dropdown toggle
        const tripLocationSelect = document.getElementById('tripLocationSelect');
        if (tripLocationSelect) {
            tripLocationSelect.addEventListener('change', () => this.#toggleLocationInput());
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
     * Toggle location input (dropdown vs custom text)
     * @private
     */
    #toggleLocationInput() {
        const selectValue = document.getElementById('tripLocationSelect').value;
        const customInput = document.getElementById('tripLocation');

        if (selectValue === 'custom') {
            customInput.classList.remove('hidden');
            customInput.value = '';
            customInput.focus();
        } else {
            customInput.classList.add('hidden');
            customInput.value = selectValue;
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
        const type = document.getElementById('tripType').value;
        const isMultiAdd = document.getElementById('multiAddMode').checked;

        if (!title) {
            alert('Title is required');
            return;
        }

        if (this.#editingEventId) {
            // Update existing event
            const startDateVal = document.getElementById('tripDate').value;
            const endDateVal = document.getElementById('tripEndDate').value;

            if (!startDateVal || !endDateVal) {
                alert('Start Date and End Date are required');
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
                alert('Start Date and End Date are required');
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
                alert('Please fill in both Start Date and End Date for all date ranges');
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
        const type = document.getElementById('constraintType').value;
        const isMultiAdd = document.getElementById('multiAddModeConstraint').checked;

        if (!title) {
            alert('Title is required');
            return;
        }

        if (this.#editingConstraintId) {
            // Update existing constraint
            const startDateVal = document.getElementById('constraintDate').value;
            const endDateVal = document.getElementById('constraintEndDate').value;

            if (!startDateVal || !endDateVal) {
                alert('Start Date and End Date are required');
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
                alert('Start Date and End Date are required');
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
                alert('Please fill in both Start Date and End Date for all date ranges');
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
        DataService.downloadJSON(state, `travel_plan_${state.year}.json`);
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

    /**
     * Delete event
     * @private
     */
    #deleteEvent() {
        if (!this.#editingEventId) {
            console.error('No event being edited');
            return;
        }

        if (!confirm('Are you sure you want to delete this trip? This cannot be undone.')) {
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
    #deleteConstraint() {
        if (!this.#editingConstraintId) {
            console.error('No constraint being edited');
            return;
        }

        if (!confirm('Are you sure you want to delete this constraint? This cannot be undone.')) {
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
                    <select class="batch-type w-full border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-200">
                        <option value="division">Division Visit</option>
                        <option value="gts">GTS All-Hands</option>
                        <option value="pi">PI Planning</option>
                        <option value="bp">BP Team Meeting</option>
                        <option value="conference">Conference</option>
                        <option value="other">Other Business</option>
                    </select>
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Location</label>
                <select class="batch-location-select w-full border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-200">
                    <option value="">Select Division...</option>
                    <option value="DAL">DAL</option>
                    <option value="VAL">VAL</option>
                    <option value="VCE">VCE</option>
                    <option value="VCW">VCW</option>
                    <option value="VER">VER</option>
                    <option value="VIN">VIN</option>
                    <option value="VNE">VNE</option>
                    <option value="VNY">VNY</option>
                    <option value="VSC">VSC</option>
                    <option value="VTX">VTX</option>
                    <option value="VUT">VUT</option>
                    <option value="custom">Other Location (Custom)...</option>
                </select>
                <input type="text" class="batch-location-custom w-full border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-200 mt-2 hidden" placeholder="Enter city (e.g. London, Singapore, Austin)">
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Preferred Seasons</label>
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <label class="flex items-center gap-2">
                        <input type="checkbox" class="season-winter" value="winter"> Winter (Dec-Feb)
                    </label>
                    <label class="flex items-center gap-2">
                        <input type="checkbox" class="season-spring" value="spring"> Spring (Mar-May)
                    </label>
                    <label class="flex items-center gap-2">
                        <input type="checkbox" class="season-summer" value="summer"> Summer (Jun-Aug)
                    </label>
                    <label class="flex items-center gap-2">
                        <input type="checkbox" class="season-fall" value="fall"> Fall (Sep-Nov)
                    </label>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <input type="checkbox" class="can-consolidate">
                <label class="text-xs">Can consolidate with other trips</label>
            </div>
        `;

        container.appendChild(tripRow);

        // Add remove listener
        tripRow.querySelector('.remove-batch-trip').addEventListener('click', (e) => {
            e.target.closest('[data-index]').remove();
        });

        // Add location dropdown toggle listener
        const locationSelect = tripRow.querySelector('.batch-location-select');
        const customInput = tripRow.querySelector('.batch-location-custom');
        locationSelect.addEventListener('change', () => {
            if (locationSelect.value === 'custom') {
                customInput.classList.remove('hidden');
            } else {
                customInput.classList.add('hidden');
                customInput.value = '';
            }
        });
    }

    /**
     * Generate batch plan
     * @private
     */
    #generateBatchPlan() {
        const container = document.getElementById('batchTripsContainer');
        if (!container || container.children.length === 0) {
            alert('Please add at least one trip to the batch');
            return;
        }

        // Collect batch trip data
        const batchTrips = Array.from(container.children).map((row) => {
            const title = row.querySelector('.batch-title').value.trim();
            const type = row.querySelector('.batch-type').value;
            const locationSelect = row.querySelector('.batch-location-select').value;
            const location = locationSelect === 'custom'
                ? row.querySelector('.batch-location-custom').value.trim()
                : locationSelect;
            const seasons = [];
            if (row.querySelector('.season-winter').checked) seasons.push('winter');
            if (row.querySelector('.season-spring').checked) seasons.push('spring');
            if (row.querySelector('.season-summer').checked) seasons.push('summer');
            if (row.querySelector('.season-fall').checked) seasons.push('fall');
            const canConsolidate = row.querySelector('.can-consolidate').checked;

            return { title, type, location, seasons, canConsolidate };
        }).filter(t => t.location);

        if (batchTrips.length === 0) {
            alert('Please enter locations for your trips');
            return;
        }

        // Get suggestions for each trip
        const state = StateManager.getState();
        const year = state.year;
        const events = state.events;
        const constraints = state.constraints;

        const results = batchTrips.map((trip, idx) => {
            // Find best quarters based on season preferences
            const quarters = this.#getQuartersForSeasons(trip.seasons);

            // Get suggestions for each quarter and combine
            const allSuggestions = [];
            quarters.forEach(qId => {
                const suggestions = ScoringEngine.getSuggestionsForQuarter(qId, year, trip.location, events, constraints);
                allSuggestions.push(...suggestions.map(s => ({ ...s, quarter: qId })));
            });

            // Sort by score and take top 3
            const top3 = allSuggestions.sort((a, b) => b.score - a.score).slice(0, 3);

            return {
                trip,
                suggestions: top3,
                tripIndex: idx
            };
        });

        this.#displayBatchResults(results);
    }

    /**
     * Get quarters that match season preferences
     * @private
     */
    #getQuartersForSeasons(seasons) {
        if (!seasons || seasons.length === 0) return [1, 2, 3, 4]; // All quarters if no preference

        const quarterMap = {
            winter: [4, 1], // Dec-Feb spans Q4 and Q1
            spring: [2],    // Mar-May is Q2
            summer: [3],    // Jun-Aug is Q3
            fall: [4]       // Sep-Nov is Q4
        };

        const quarters = new Set();
        seasons.forEach(season => {
            quarterMap[season]?.forEach(q => quarters.add(q));
        });

        return Array.from(quarters);
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
            html += `
                <div class="mb-6 p-4 border dark:border-slate-600 rounded bg-white dark:bg-slate-800" data-trip-index="${tripIndex}">
                    <h5 class="font-semibold mb-3">Trip ${tripIndex + 1}: ${trip.title || trip.location}</h5>
                    ${suggestions.length === 0 ? '<p class="text-slate-500 text-sm">No available weeks found</p>' : ''}
                    <div class="space-y-2">
                        ${suggestions.map((sug, idx) => `
                            <div class="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-900 rounded">
                                <label class="flex items-center gap-3 text-sm flex-1 cursor-pointer">
                                    <input type="radio" name="batch-trip-${tripIndex}" class="batch-week-radio"
                                           data-trip-index="${tripIndex}"
                                           data-week="${sug.iso}"
                                           data-title="${trip.title || ''}"
                                           data-type="${trip.type}"
                                           data-location="${trip.location}">
                                    <div>
                                        <strong>Option ${idx + 1}:</strong> Week of ${sug.iso}
                                        <span class="text-xs text-slate-500 ml-2">(Score: ${sug.score})</span>
                                    </div>
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        html += `
            <div class="border-t dark:border-slate-600 pt-4 mt-4">
                <button id="btnAddSelectedBatchTrips" class="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded shadow-sm font-medium transition">
                    <i class="fas fa-check mr-2"></i>Add Selected Trips to Calendar
                </button>
            </div>
        `;

        html += '</div>';
        resultsContainer.innerHTML = html;
        resultsContainer.classList.remove('hidden');

        // Track selected weeks for real-time validation
        const selectedWeeks = new Set();

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
                    const tripIndex = r.dataset.tripIndex;
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

        // Add event listener for "Add Selected Trips" button
        const addSelectedBtn = document.getElementById('btnAddSelectedBatchTrips');
        if (addSelectedBtn) {
            addSelectedBtn.addEventListener('click', () => {
                const selectedRadios = resultsContainer.querySelectorAll('.batch-week-radio:checked');

                if (selectedRadios.length === 0) {
                    alert('Please select at least one trip to add');
                    return;
                }

                // Add all selected trips
                selectedRadios.forEach(radio => {
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
                        endDate: null,
                        duration: 1,
                        isFixed: false
                    });
                });

                // Clear results and show success
                resultsContainer.innerHTML = `
                    <div class="text-center py-8">
                        <i class="fas fa-check-circle text-green-600 text-5xl mb-4"></i>
                        <p class="text-lg font-semibold text-green-600 dark:text-green-400">
                            ${selectedRadios.length} trip${selectedRadios.length > 1 ? 's' : ''} added to calendar!
                        </p>
                        <button class="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded" onclick="document.getElementById('batchResults').classList.add('hidden')">
                            Close
                        </button>
                    </div>
                `;
            });
        }
    }
}

export default ModalManager;
