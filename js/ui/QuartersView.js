/**
 * QuartersView - Quarterly grid rendering
 *
 * Displays 4 columns (Q1-Q4) with weeks stacked vertically
 */

import EventBus from '../utils/EventBus.js';
import StateManager from '../services/StateManager.js';
import { QUARTERS, MONTH_NAMES } from '../config/calendarConfig.js';
import { dateToISO, getMonday, formatDateWithOrdinal, overlapsWithWeek } from '../services/DateService.js';

export class QuartersView {
    #container = null;

    /**
     * Render the quarters view
     * @param {HTMLElement} container - Container element
     */
    render(container) {
        this.#container = container;
        const state = StateManager.getState();
        const year = state.year;

        container.innerHTML = '';
        container.className = 'flex gap-0 h-full overflow-x-auto';

        QUARTERS.forEach(quarter => {
            const qCol = this.#renderQuarterColumn(quarter, year, state.events, state.constraints);
            container.appendChild(qCol);
        });

        this.#attachEventListeners();
    }

    /**
     * Render a single quarter column
     * @private
     */
    #renderQuarterColumn(quarter, year, events, constraints) {
        const qCol = document.createElement('div');
        qCol.className = 'flex-1 min-w-[280px] flex flex-col h-full border-r border-slate-200 dark:border-slate-700 last:border-0 bg-white dark:bg-slate-800 rounded-lg shadow-sm ml-2 first:ml-0';

        // Quarter header
        const header = document.createElement('div');
        header.className = 'p-4 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 sticky top-0 z-10';
        header.innerHTML = `
            <h2 class="text-lg font-bold text-slate-700 dark:text-slate-200 flex justify-between">
                ${quarter.name}
                <span class="text-sm font-normal text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-600 px-2 py-0.5 rounded border dark:border-slate-500">${quarter.label}</span>
            </h2>
        `;
        qCol.appendChild(header);

        // Weeks container
        const weeksContainer = document.createElement('div');
        weeksContainer.className = 'overflow-y-auto flex-1 p-2 space-y-1 relative';
        weeksContainer.id = `q-${quarter.id}-weeks`;

        // Render weeks for each month in the quarter
        quarter.months.forEach(monthIdx => {
            // All months are in the same calendar year now

            // Month header
            const monthHeader = document.createElement('div');
            monthHeader.className = 'text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-4 mb-2 pl-2';
            monthHeader.textContent = `${MONTH_NAMES[monthIdx]} ${year}`;
            weeksContainer.appendChild(monthHeader);

            // Find all Mondays in this month
            const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(year, monthIdx, d);
                if (date.getDay() === 1) { // Monday
                    const weekStartISO = dateToISO(date);
                    const weekSlot = this.#renderWeekSlot(date, weekStartISO, events, constraints);
                    weeksContainer.appendChild(weekSlot);
                }
            }
        });

        qCol.appendChild(weeksContainer);
        return qCol;
    }

    /**
     * Render a week slot
     * @private
     */
    #renderWeekSlot(date, weekStartISO, events, constraints) {
        const el = document.createElement('div');
        el.className = 'week-row group relative border border-slate-200 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 hover:border-blue-300 dark:hover:border-blue-500 transition-all min-h-[60px] flex flex-col justify-center';

        const dayNum = date.getDate();
        const suffix = (dayNum > 3 && dayNum < 21) ? 'th' :
                       ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][dayNum % 10];

        el.innerHTML = `
            <div class="flex items-start justify-between mb-1">
                <span class="text-xs font-mono text-slate-400 dark:text-slate-500">Week of ${dayNum}${suffix}</span>
                <button data-action="quick-add" data-week="${weekStartISO}" class="add-btn opacity-0 group-hover:opacity-100 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded px-1 transition text-xs" title="Add Item">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div id="slot-${weekStartISO}" class="space-y-1"></div>
        `;

        const slotContainer = el.querySelector(`#slot-${weekStartISO}`);

        // Add constraint if exists and overlaps with this Mon-Fri week
        const constraint = constraints.find(c => overlapsWithWeek(c.startDate, c.endDate, date));
        if (constraint) {
            const isHard = ['vacation', 'holiday', 'blackout'].includes(constraint.type);
            el.classList.add(isHard ? 'bg-constraint-hard' : 'bg-constraint-soft');
            if (isHard) {
                el.classList.remove('bg-white', 'dark:bg-slate-700');
            }

            const constraintEl = document.createElement('div');
            constraintEl.className = `flex justify-between items-center text-xs font-semibold ${isHard ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}`;
            constraintEl.innerHTML = `
                <span><i class="fas fa-ban mr-1"></i> ${constraint.title}</span>
                <div class="flex gap-1">
                    <button data-action="edit-constraint" data-id="${constraint.id}" class="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button data-action="delete-constraint" data-id="${constraint.id}" class="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400" title="Delete">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            slotContainer.appendChild(constraintEl);
        }

        // Add events that overlap with this Mon-Fri week
        const weekEvents = events.filter(e => {
            // For flexible trips (no endDate), check exact week match
            if (!e.endDate) {
                return e.startDate === weekStartISO;
            }
            // For fixed trips, check if they overlap with this week
            return overlapsWithWeek(e.startDate, e.endDate, date);
        });
        weekEvents.forEach(event => {
            const eventEl = document.createElement('div');
            eventEl.className = `text-xs p-1.5 rounded shadow-sm border mb-1 flex justify-between items-center bg-type-${event.type}`;
            eventEl.dataset.eventType = event.type;
            eventEl.innerHTML = `
                <div class="truncate flex-1">
                    <div class="font-bold truncate">${event.title}</div>
                    <div class="text-[10px] opacity-75"><i class="fas fa-map-marker-alt mr-1"></i>${event.location}</div>
                </div>
                <div class="flex gap-1 ml-2">
                    <button data-action="edit-event" data-id="${event.id}" class="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 px-1" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button data-action="delete-event" data-id="${event.id}" class="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 px-1" title="Delete">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            slotContainer.appendChild(eventEl);

            // Add border if there's a conflict with hard constraint
            if (constraint && ['vacation', 'holiday', 'blackout'].includes(constraint.type)) {
                eventEl.classList.add('ring-2', 'ring-red-500');
            }
        });

        return el;
    }

    /**
     * Attach event listeners
     * @private
     */
    #attachEventListeners() {
        if (!this.#container) return;

        this.#container.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;

            const action = btn.dataset.action;

            if (action === 'quick-add') {
                const week = btn.dataset.week;
                EventBus.emit('quick-add:clicked', { date: week });
            } else if (action === 'delete-event') {
                const id = btn.dataset.id;
                StateManager.deleteEvent(id);
            } else if (action === 'delete-constraint') {
                const id = btn.dataset.id;
                StateManager.deleteConstraint(id);
            }
        });
    }
}

export default QuartersView;
