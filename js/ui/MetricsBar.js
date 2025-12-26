/**
 * MetricsBar - Statistics display component
 *
 * Calculates and displays:
 * - Weeks Traveling
 * - Weeks Home
 * - Conflicts
 */

import EventBus from '../utils/EventBus.js';
import StateManager from '../services/StateManager.js';
import ScoringEngine from '../services/ScoringEngine.js';

export class MetricsBar {
    #container = null;

    /**
     * Initialize the metrics bar
     * @param {HTMLElement} container - Container element
     */
    init(container) {
        this.#container = container;

        // Subscribe to state changes
        EventBus.on('state:changed', () => this.update());
        EventBus.on('event:added', () => this.update());
        EventBus.on('event:deleted', () => this.update());
        EventBus.on('event:updated', () => this.update());
        EventBus.on('constraint:added', () => this.update());
        EventBus.on('constraint:deleted', () => this.update());

        // Initial render
        this.update();
    }

    /**
     * Calculate metrics
     * @returns {object} Metrics object
     */
    calculate() {
        const state = StateManager.getState();
        const events = state.events;
        const constraints = state.constraints;

        // Weeks traveling = number of events
        const weeksTraveling = events.length;

        // Weeks home = 52 - weeks traveling
        const weeksHome = 52 - weeksTraveling;

        // Conflicts = hard constraint violations + double-bookings
        const conflicts = ScoringEngine.detectConflicts(events, constraints);
        const conflictCount = conflicts.length;

        return {
            weeksTraveling,
            weeksHome,
            conflicts: conflictCount,
            conflictDetails: conflicts
        };
    }

    /**
     * Update the metrics display
     */
    update() {
        if (!this.#container) return;

        const metrics = this.calculate();

        this.#container.innerHTML = `
            <div class="flex items-center gap-2">
                <i class="fas fa-plane-departure text-blue-500 dark:text-blue-400"></i>
                <span class="font-semibold text-slate-700 dark:text-slate-300">Weeks Traveling:</span>
                <span id="statTravelWeeks" class="font-mono font-bold text-blue-600 dark:text-blue-400">${metrics.weeksTraveling}</span>
            </div>
            <div class="flex items-center gap-2">
                <i class="fas fa-home text-green-500 dark:text-green-400"></i>
                <span class="font-semibold text-slate-700 dark:text-slate-300">Weeks Home:</span>
                <span id="statHomeWeeks" class="font-mono font-bold text-green-600 dark:text-green-400">${metrics.weeksHome}</span>
            </div>
            <div class="flex items-center gap-2">
                <i class="fas fa-exclamation-triangle ${metrics.conflicts > 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-300 dark:text-slate-600'}"></i>
                <span class="font-semibold text-slate-700 dark:text-slate-300">Conflicts:</span>
                <span id="statConflicts" class="font-mono font-bold ${metrics.conflicts > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-600'}">${metrics.conflicts}</span>
            </div>
            <div class="flex-grow"></div>
            <button id="btnAddPlan" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-md text-sm font-medium shadow-sm transition flex items-center gap-2">
                <i class="fas fa-plus"></i> Plan Travel / Constraint
            </button>
        `;
    }

    /**
     * Get current metrics
     * @returns {object} Metrics object
     */
    getMetrics() {
        return this.calculate();
    }
}

export default MetricsBar;
