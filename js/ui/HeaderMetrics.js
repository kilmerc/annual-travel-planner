/**
 * HeaderMetrics - Compact metrics display in header
 *
 * Calculates and displays:
 * - Weeks Traveling
 * - Weeks Home
 * - Conflicts
 */

import EventBus from '../utils/EventBus.js';
import StateManager from '../services/StateManager.js';
import ScoringEngine from '../services/ScoringEngine.js';
import { getMonday, dateToISO, getFriday } from '../services/DateService.js';

export class HeaderMetrics {
    #container = null;
    #currentMetrics = null;

    /**
     * Initialize the header metrics
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

        // Setup event listeners
        this.#setupEventListeners();

        // Initial render
        this.update();
    }

    /**
     * Setup event listeners for clickable metrics
     * @private
     */
    #setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('#metricConflicts')) {
                this.#highlightConflicts();
            } else if (e.target.closest('#metricTraveling')) {
                this.#highlightTravelingWeeks();
            } else if (e.target.closest('#metricHome')) {
                this.#highlightHomeWeeks();
            }
        });
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
        this.#currentMetrics = metrics;

        this.#container.innerHTML = `
            <div id="metricTraveling" class="flex items-center gap-2 ${metrics.weeksTraveling > 0 ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-2 py-1 -mx-2 transition' : ''}">
                <i class="fas fa-plane-departure text-blue-500 dark:text-blue-400"></i>
                <span class="font-semibold text-slate-700 dark:text-slate-300">Weeks Traveling:</span>
                <span id="statTravelWeeks" class="font-mono font-bold text-blue-600 dark:text-blue-400">${metrics.weeksTraveling}</span>
                ${metrics.weeksTraveling > 0 ? '<i class="fas fa-chevron-right text-xs text-slate-400 ml-1"></i>' : ''}
            </div>
            <div id="metricHome" class="flex items-center gap-2 ${metrics.weeksHome > 0 ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-2 py-1 -mx-2 transition' : ''}">
                <i class="fas fa-home text-green-500 dark:text-green-400"></i>
                <span class="font-semibold text-slate-700 dark:text-slate-300">Weeks Home:</span>
                <span id="statHomeWeeks" class="font-mono font-bold text-green-600 dark:text-green-400">${metrics.weeksHome}</span>
                ${metrics.weeksHome > 0 ? '<i class="fas fa-chevron-right text-xs text-slate-400 ml-1"></i>' : ''}
            </div>
            <div id="metricConflicts" class="flex items-center gap-2 ${metrics.conflicts > 0 ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded px-2 py-1 -mx-2 transition' : ''}">
                <i class="fas fa-exclamation-triangle ${metrics.conflicts > 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-300 dark:text-slate-600'}"></i>
                <span class="font-semibold text-slate-700 dark:text-slate-300">Conflicts:</span>
                <span id="statConflicts" class="font-mono font-bold ${metrics.conflicts > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-600'}">${metrics.conflicts}</span>
                ${metrics.conflicts > 0 ? '<i class="fas fa-chevron-right text-xs text-slate-400 ml-1"></i>' : ''}
            </div>
        `;
    }

    /**
     * Calculate all Mon-Fri weeks that have travel
     * @private
     * @returns {Array<string>} Array of Monday ISO dates
     */
    #calculateTravelWeeks() {
        // Helper to parse ISO date strings in local time (avoid timezone issues)
        const parseLocalDate = (dateStr) => {
            if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                const [year, month, day] = dateStr.split('-').map(Number);
                return new Date(year, month - 1, day);
            }
            return new Date(dateStr);
        };

        const state = StateManager.getState();
        const travelWeeks = new Set();

        state.events.forEach(event => {
            if (!event.isFixed || !event.endDate) {
                // Flexible event - startDate is Monday, represents Mon-Fri week
                travelWeeks.add(event.startDate);
            } else {
                // Fixed event - find all Mon-Fri weeks that overlap with this event
                const eventStart = parseLocalDate(event.startDate);
                const eventEnd = parseLocalDate(event.endDate);

                // Get Monday of the week containing the start date
                let currentMonday = getMonday(eventStart);
                const lastMonday = getMonday(eventEnd);

                // Add all weeks that overlap with this event
                while (currentMonday <= lastMonday) {
                    const currentFriday = getFriday(currentMonday);
                    // Check if this Mon-Fri week overlaps with the event
                    if (currentFriday >= eventStart && currentMonday <= eventEnd) {
                        travelWeeks.add(dateToISO(currentMonday));
                    }
                    // Move to next week
                    const nextMonday = new Date(currentMonday);
                    nextMonday.setDate(nextMonday.getDate() + 7);
                    currentMonday = nextMonday;
                }
            }
        });

        return Array.from(travelWeeks);
    }

    /**
     * Highlight traveling weeks
     * @private
     */
    #highlightTravelingWeeks() {
        const travelWeeks = this.#calculateTravelWeeks();
        EventBus.emit('highlight:traveling-weeks', { weeks: travelWeeks });
    }

    /**
     * Highlight home weeks
     * @private
     */
    #highlightHomeWeeks() {
        const travelWeeks = this.#calculateTravelWeeks();
        EventBus.emit('highlight:home-weeks', { travelWeeks });
    }

    /**
     * Highlight conflict days
     * @private
     */
    #highlightConflicts() {
        if (!this.#currentMetrics || this.#currentMetrics.conflicts === 0) {
            return;
        }

        // Collect all dates involved in conflicts
        const conflictDates = new Set();

        this.#currentMetrics.conflictDetails.forEach(conflict => {
            if (conflict.type === 'hard-constraint') {
                // Add all dates from the event
                const eventStart = new Date(conflict.event.startDate);
                const eventEnd = new Date(conflict.event.endDate || conflict.event.startDate);
                for (let d = new Date(eventStart); d <= eventEnd; d.setDate(d.getDate() + 1)) {
                    conflictDates.add(this.#dateToISO(d));
                }

                // Add all dates from the constraint
                const constraintStart = new Date(conflict.constraint.startDate);
                const constraintEnd = new Date(conflict.constraint.endDate);
                for (let d = new Date(constraintStart); d <= constraintEnd; d.setDate(d.getDate() + 1)) {
                    conflictDates.add(this.#dateToISO(d));
                }
            } else if (conflict.type === 'double-booking') {
                // Add all dates from both events
                const event1Start = new Date(conflict.event1.startDate);
                const event1End = new Date(conflict.event1.endDate || conflict.event1.startDate);
                for (let d = new Date(event1Start); d <= event1End; d.setDate(d.getDate() + 1)) {
                    conflictDates.add(this.#dateToISO(d));
                }

                const event2Start = new Date(conflict.event2.startDate);
                const event2End = new Date(conflict.event2.endDate || conflict.event2.startDate);
                for (let d = new Date(event2Start); d <= event2End; d.setDate(d.getDate() + 1)) {
                    conflictDates.add(this.#dateToISO(d));
                }
            }
        });

        EventBus.emit('highlight:conflicts', { conflictDates: Array.from(conflictDates) });
    }

    /**
     * Convert date to ISO string
     * @private
     */
    #dateToISO(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Get current metrics
     * @returns {object} Metrics object
     */
    getMetrics() {
        return this.calculate();
    }
}

export default HeaderMetrics;
