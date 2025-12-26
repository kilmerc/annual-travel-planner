/**
 * TimelineView - Gantt-style horizontal timeline rendering
 *
 * Displays weeks horizontally with month headers
 */

import EventBus from '../utils/EventBus.js';
import StateManager from '../services/StateManager.js';
import { MONTH_NAMES } from '../config/fiscalCalendar.js';
import { getWeeksInYear, getMonday, dateToISO, overlapsWithWeek } from '../services/DateService.js';

export class TimelineView {
    #container = null;

    /**
     * Render the timeline view
     * @param {HTMLElement} container - Container element
     */
    render(container) {
        this.#container = container;
        const state = StateManager.getState();
        const year = state.year;

        container.innerHTML = '';
        container.className = 'flex flex-col h-full bg-white dark:bg-slate-800 overflow-hidden';

        // Get all weeks in the calendar year
        const allWeeks = getWeeksInYear(year);

        // Group weeks by month for header
        const monthGroups = this.#groupWeeksByMonth(allWeeks);

        // Render month header row
        const headerRow = this.#renderMonthHeaders(monthGroups);
        container.appendChild(headerRow);

        // Render week columns with events
        const bodyRow = this.#renderWeekColumns(allWeeks, state.events, state.constraints);
        container.appendChild(bodyRow);

        this.#attachEventListeners();
    }

    /**
     * Group weeks by month for header
     * @private
     */
    #groupWeeksByMonth(weeks) {
        const groups = [];
        let currentMonth = -1;

        weeks.forEach(w => {
            if (w.date.getMonth() !== currentMonth) {
                currentMonth = w.date.getMonth();
                groups.push({
                    month: currentMonth,
                    year: w.date.getFullYear(),
                    count: 1
                });
            } else {
                groups[groups.length - 1].count++;
            }
        });

        return groups;
    }

    /**
     * Render month headers
     * @private
     */
    #renderMonthHeaders(monthGroups) {
        const headerRow = document.createElement('div');
        headerRow.className = 'flex border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 sticky top-0 z-20 h-10';

        monthGroups.forEach(m => {
            const mEl = document.createElement('div');
            mEl.className = 'border-r border-slate-200 dark:border-slate-600 px-2 flex items-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap overflow-hidden';
            mEl.style.flex = m.count; // Proportional width
            mEl.style.minWidth = (m.count * 40) + 'px'; // Minimum width per week slot
            mEl.textContent = `${MONTH_NAMES[m.month]} ${m.year}`;
            headerRow.appendChild(mEl);
        });

        return headerRow;
    }

    /**
     * Render week columns
     * @private
     */
    #renderWeekColumns(weeks, events, constraints) {
        const bodyRow = document.createElement('div');
        bodyRow.className = 'flex flex-1 relative bg-white dark:bg-slate-800 overflow-y-auto';

        weeks.forEach(w => {
            const wCol = this.#renderWeekColumn(w, events, constraints);
            bodyRow.appendChild(wCol);
        });

        return bodyRow;
    }

    /**
     * Render a single week column
     * @private
     */
    #renderWeekColumn(week, events, constraints) {
        const wCol = document.createElement('div');
        wCol.className = 'flex-1 border-r border-slate-100 dark:border-slate-700 min-w-[40px] relative group h-full';
        wCol.id = `tl-week-${week.iso}`;

        // Hover add button
        const addBtn = document.createElement('div');
        addBtn.className = 'absolute top-0 inset-x-0 h-6 opacity-0 group-hover:opacity-100 bg-blue-50 dark:bg-blue-900/30 z-10 flex justify-center items-center cursor-pointer transition';
        addBtn.dataset.action = 'quick-add';
        addBtn.dataset.week = week.iso;
        addBtn.innerHTML = '<i class="fas fa-plus text-[10px] text-blue-500 dark:text-blue-400"></i>';
        wCol.appendChild(addBtn);

        // Check for constraints that overlap with this Mon-Fri week
        const constraint = constraints.find(c => overlapsWithWeek(c.startDate, c.endDate, week.date));
        if (constraint) {
            const isHard = ['vacation', 'holiday', 'blackout'].includes(constraint.type);
            wCol.classList.add(isHard ? 'timeline-constraint-hard' : 'timeline-constraint-soft');
            wCol.title = constraint.title; // Tooltip
        }

        // Add events that overlap with this Mon-Fri week
        const weekEvents = events.filter(e => {
            // For flexible trips (no endDate), check exact week match
            if (!e.endDate) {
                return e.startDate === week.iso;
            }
            // For fixed trips, check if they overlap with this week
            return overlapsWithWeek(e.startDate, e.endDate, week.date);
        });

        weekEvents.forEach((event, index) => {
            const bar = this.#renderEventBar(event, index);
            wCol.appendChild(bar);
        });

        return wCol;
    }

    /**
     * Render event bar
     * @private
     */
    #renderEventBar(event, stackIndex) {
        const bar = document.createElement('div');
        bar.className = `absolute text-[10px] text-white p-1 rounded shadow-sm cursor-pointer hover:brightness-110 z-10 overflow-hidden whitespace-nowrap bar-${event.type}`;
        bar.dataset.eventType = event.type;
        bar.dataset.action = 'delete-event';
        bar.dataset.id = event.id;

        // Simple stacking logic
        const topPos = 30 + (stackIndex * 25);
        bar.style.top = topPos + 'px';
        bar.style.left = '2px';
        bar.style.right = '2px';
        bar.style.height = '20px';
        bar.title = `${event.title} (${event.location})`;
        bar.textContent = event.title;

        return bar;
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

            e.stopPropagation();
            const action = btn.dataset.action;

            if (action === 'quick-add') {
                const week = btn.dataset.week;
                EventBus.emit('quick-add:clicked', { date: week });
            } else if (action === 'delete-event') {
                const id = btn.dataset.id;
                StateManager.deleteEvent(id);
            }
        });
    }
}

export default TimelineView;
