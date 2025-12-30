/**
 * CalendarView - Year-at-a-glance calendar view
 *
 * Displays all 12 months in a grid layout with event/constraint indicators
 * Supports dynamic type colors and archived event rendering
 */

import EventBus from '../utils/EventBus.js';
import StateManager from '../services/StateManager.js';
import { MONTH_NAMES_FULL } from '../config/calendarConfig.js';
import { getCalendarGrid, dateToISO, getMonday, overlapsWithWeek } from '../services/DateService.js';

export class CalendarView {
    #container = null;
    #highlightMode = null; // 'traveling', 'home', 'conflicts', or null
    #travelWeeks = [];
    #conflictDates = [];

    constructor() {
        // Listen for highlight events
        EventBus.on('highlight:traveling-weeks', (data) => this.#toggleHighlight('traveling', data.weeks, []));
        EventBus.on('highlight:home-weeks', (data) => this.#toggleHighlight('home', data.travelWeeks, []));
        EventBus.on('highlight:conflicts', (data) => this.#toggleHighlight('conflicts', [], data.conflictDates));
    }

    /**
     * Toggle week highlighting
     * @private
     */
    #toggleHighlight(mode, weeks, conflictDates) {
        if (this.#highlightMode === mode) {
            // Toggle off
            this.#highlightMode = null;
            this.#travelWeeks = [];
            this.#conflictDates = [];
        } else {
            // Toggle on
            this.#highlightMode = mode;
            this.#travelWeeks = weeks || [];
            this.#conflictDates = conflictDates || [];
        }
        this.#updateHighlighting();
    }

    /**
     * Update highlighting on calendar
     * @private
     */
    #updateHighlighting() {
        if (!this.#container) return;

        // Remove all existing highlights
        this.#container.querySelectorAll('.day-cell').forEach(cell => {
            cell.classList.remove('highlight-travel', 'highlight-home', 'highlight-conflict');
        });

        if (this.#highlightMode === null) return;

        console.log('CalendarView highlighting mode:', this.#highlightMode);
        console.log('CalendarView travel weeks:', this.#travelWeeks);

        // Get all day cells and apply highlighting
        this.#container.querySelectorAll('.day-cell').forEach(cell => {
            const dateStr = cell.dataset.date;
            if (!dateStr) return;

            // Only highlight Mon-Fri (skip weekends)
            const date = new Date(dateStr + 'T12:00:00');
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) return; // Skip Sunday (0) and Saturday (6)

            const monday = getMonday(date);
            const mondayISO = dateToISO(monday);

            if (this.#highlightMode === 'traveling') {
                if (this.#travelWeeks.includes(mondayISO)) {
                    cell.classList.add('highlight-travel');
                }
            } else if (this.#highlightMode === 'home') {
                if (!this.#travelWeeks.includes(mondayISO)) {
                    cell.classList.add('highlight-home');
                }
            } else if (this.#highlightMode === 'conflicts') {
                if (this.#conflictDates.includes(dateStr)) {
                    cell.classList.add('highlight-conflict');
                }
            }
        });
    }

    /**
     * Render the calendar view
     * @param {HTMLElement} container - Container element
     */
    render(container) {
        this.#container = container;
        const state = StateManager.getState();
        const year = StateManager.getYear();

        // Debug: Check what data we have
        console.log('CalendarView - Rendering with state:', {
            year,
            eventsCount: state.events ? state.events.length : 0,
            constraintsCount: state.constraints ? state.constraints.length : 0,
            events: state.events,
            constraints: state.constraints
        });

        container.innerHTML = '';
        container.className = 'flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden';

        // Add legend
        const legend = this.#renderLegend();
        container.appendChild(legend);

        // Calendar grid container
        const calendarGrid = document.createElement('div');
        calendarGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6 overflow-y-auto flex-1';

        // Render all 12 months (Jan through Dec)
        const monthsToRender = [
            { year: year, month: 0 },   // Jan
            { year: year, month: 1 },   // Feb
            { year: year, month: 2 },   // Mar
            { year: year, month: 3 },   // Apr
            { year: year, month: 4 },   // May
            { year: year, month: 5 },   // Jun
            { year: year, month: 6 },   // Jul
            { year: year, month: 7 },   // Aug
            { year: year, month: 8 },   // Sep
            { year: year, month: 9 },   // Oct
            { year: year, month: 10 },  // Nov
            { year: year, month: 11 }   // Dec
        ];

        monthsToRender.forEach(({ year, month }) => {
            const monthEl = this.#renderMonth(year, month, state.events, state.constraints);
            calendarGrid.appendChild(monthEl);
        });

        container.appendChild(calendarGrid);
        this.#attachEventListeners();
    }

    /**
     * Render legend with dynamic types
     * @private
     */
    #renderLegend() {
        const legendEl = document.createElement('div');
        legendEl.className = 'bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 overflow-x-auto';

        const isDarkMode = document.documentElement.classList.contains('dark');

        let html = '<div class="flex items-center gap-6 flex-wrap text-xs">';
        html += '<div class="font-bold text-slate-700 dark:text-slate-300 mr-2">Legend:</div>';

        // Event Types
        const eventTypeConfigs = StateManager.getAllEventTypeConfigs();
        Object.entries(eventTypeConfigs).forEach(([typeId, config]) => {
            const color = isDarkMode ? config.colorDark : config.color;
            html += `
                <div class="flex items-center gap-1">
                    <div class="w-4 h-4 rounded" style="background-color: ${color}"></div>
                    <span class="text-slate-600 dark:text-slate-400">${config.label}</span>
                </div>
            `;
        });

        html += '<div class="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>';

        // Constraint Types
        const constraintTypeConfigs = StateManager.getAllConstraintTypeConfigs();
        Object.entries(constraintTypeConfigs).forEach(([typeId, config]) => {
            const color = isDarkMode ? config.colorDark : config.color;
            html += `
                <div class="flex items-center gap-1">
                    <div class="w-4 h-4 rounded" style="background-color: ${color}"></div>
                    <span class="text-slate-600 dark:text-slate-400">${config.label}</span>
                </div>
            `;
        });

        // Archived indicator
        html += '<div class="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>';
        html += `
            <div class="flex items-center gap-1">
                <div class="w-4 h-4 rounded bg-slate-300 dark:bg-slate-600 opacity-60 flex items-center justify-center">
                    <i class="fas fa-archive text-[8px] text-slate-600 dark:text-slate-400"></i>
                </div>
                <span class="text-slate-600 dark:text-slate-400">Archived</span>
            </div>
        `;

        html += '</div>';
        legendEl.innerHTML = html;

        return legendEl;
    }

    /**
     * Render a single month
     * @private
     */
    #renderMonth(year, monthIndex, events, constraints) {
        const monthEl = document.createElement('div');
        monthEl.className = 'bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col';

        // Month header
        const header = document.createElement('div');
        header.className = 'bg-slate-700 dark:bg-slate-600 text-white px-4 py-2 font-semibold text-center flex-shrink-0';
        header.textContent = `${MONTH_NAMES_FULL[monthIndex]} ${year}`;
        monthEl.appendChild(header);

        // Calendar grid
        const grid = this.#renderMonthGrid(year, monthIndex, events, constraints);
        monthEl.appendChild(grid);

        return monthEl;
    }

    /**
     * Render month grid with days
     * @private
     */
    #renderMonthGrid(year, monthIndex, events, constraints) {
        const gridContainer = document.createElement('div');
        gridContainer.className = 'p-2 flex-1 flex flex-col';

        // Day headers (S M T W T F S)
        const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        const headerRow = document.createElement('div');
        headerRow.className = 'grid grid-cols-7 gap-1 mb-1';

        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'text-center text-xs font-semibold text-slate-500 dark:text-slate-400 py-1';
            dayHeader.textContent = day;
            headerRow.appendChild(dayHeader);
        });

        gridContainer.appendChild(headerRow);

        // Calendar days
        const calendarDays = getCalendarGrid(year, monthIndex);
        const daysGrid = document.createElement('div');
        daysGrid.className = 'grid grid-cols-7 gap-1 flex-1';
        daysGrid.style.gridAutoRows = '1fr';

        calendarDays.forEach(date => {
            const dayEl = this.#renderDay(date, monthIndex, events, constraints);
            daysGrid.appendChild(dayEl);
        });

        gridContainer.appendChild(daysGrid);
        return gridContainer;
    }

    /**
     * Render a single day cell
     * @private
     */
    #renderDay(date, currentMonthIndex, events, constraints) {
        const dayEl = document.createElement('div');
        const isCurrentMonth = date.getMonth() === currentMonthIndex;
        const dayNum = date.getDate();

        // Base classes - more padding to accommodate event bars
        dayEl.className = `day-cell text-center text-xs relative min-h-[50px] p-1 rounded transition flex flex-col ${
            isCurrentMonth ? 'text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800' : 'text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-900'
        } hover:bg-slate-100 dark:hover:bg-slate-700`;

        // Get this specific date in ISO format
        const currentDateISO = dateToISO(date);
        const monday = getMonday(date);
        const mondayISO = dateToISO(monday);

        // Ensure we have arrays to work with
        const eventList = Array.isArray(events) ? events : [];
        const constraintList = Array.isArray(constraints) ? constraints : [];

        // Check for events that include this specific date
        const dayEvents = eventList.filter(e => {
            if (!e) return false;

            // For flexible trips (isFixed=false or no endDate), check if in same week
            if (!e.isFixed || !e.endDate) {
                // Skip weekends for flexible events
                const dayOfWeek = date.getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) return false; // Skip Sunday (0) and Saturday (6)
                // Check if this date is in the same week as the event
                return e.startDate === mondayISO;
            }

            // For fixed trips, check if this specific date falls within the range
            const eventStart = new Date(e.startDate);
            const eventEnd = new Date(e.endDate);
            const thisDate = new Date(currentDateISO);
            return thisDate >= eventStart && thisDate <= eventEnd;
        });

        // Check for ALL constraints that include this specific date
        const dayConstraints = constraintList.filter(c => {
            if (!c) return false;
            const constraintStart = new Date(c.startDate);
            const constraintEnd = new Date(c.endDate);
            const thisDate = new Date(currentDateISO);
            return thisDate >= constraintStart && thisDate <= constraintEnd;
        });

        // Only highlight Mon-Fri days (getDay: 1=Mon, 5=Fri)
        const isWeekday = date.getDay() >= 1 && date.getDay() <= 5;

        // Day number at top
        const dayNumber = document.createElement('div');
        dayNumber.className = 'font-semibold mb-1';
        dayNumber.textContent = dayNum;
        dayEl.appendChild(dayNumber);

        // Container for event/constraint bars
        const barsContainer = document.createElement('div');
        barsContainer.className = 'flex flex-col gap-0.5 flex-1 overflow-y-auto';

        // Render constraint bars (on ALL days, including weekends)
        dayConstraints.forEach(constraint => {
            const bar = this.#createConstraintBar(constraint);
            barsContainer.appendChild(bar);
        });

        // Render event bars (on ALL days, including weekends)
        dayEvents.forEach(event => {
            const bar = this.#createEventBar(event);
            barsContainer.appendChild(bar);
        });

        dayEl.appendChild(barsContainer);

        // Store date for click handling
        dayEl.dataset.date = dateToISO(date);
        dayEl.dataset.mondayIso = mondayISO;

        return dayEl;
    }

    /**
     * Create a clickable event bar
     * @private
     */
    #createEventBar(event) {
        const bar = document.createElement('div');
        bar.className = `text-[9px] px-1 py-0.5 rounded cursor-pointer hover:brightness-110 transition truncate flex items-center gap-1`;

        // Check if archived
        if (event.archived) {
            // Archived events: grey with reduced opacity and archive icon
            bar.classList.add('bg-slate-300', 'dark:bg-slate-600', 'text-slate-600', 'dark:text-slate-400', 'opacity-60');

            // Add archive icon
            const icon = document.createElement('i');
            icon.className = 'fas fa-archive text-[8px]';
            bar.appendChild(icon);

            const text = document.createElement('span');
            text.className = 'truncate flex-1';
            text.textContent = event.title;
            bar.appendChild(text);

            bar.title = `${event.title} - ${event.location} (ARCHIVED - Click to edit)`;
        } else {
            // Active events: use dynamic colors from type configuration
            const typeConfig = StateManager.getEventTypeConfig(event.type);

            if (typeConfig) {
                // Use dynamic colors from configuration
                const isDarkMode = document.documentElement.classList.contains('dark');
                const color = isDarkMode ? typeConfig.colorDark : typeConfig.color;
                bar.style.backgroundColor = color;
                bar.style.color = '#ffffff';
            } else {
                // Fallback to default grey if type not found
                bar.classList.add('bg-slate-500', 'text-white');
            }

            bar.textContent = event.title;
            bar.title = `${event.title} - ${event.location} (Click to edit)`;
        }

        bar.dataset.action = 'edit-event';
        bar.dataset.id = event.id;

        return bar;
    }

    /**
     * Create a clickable constraint bar
     * @private
     */
    #createConstraintBar(constraint) {
        const bar = document.createElement('div');
        bar.className = `text-[9px] px-1 py-0.5 rounded cursor-pointer hover:brightness-110 transition truncate`;

        // Use dynamic colors from type configuration
        const typeConfig = StateManager.getConstraintTypeConfig(constraint.type);

        if (typeConfig) {
            // Use dynamic colors from configuration
            const isDarkMode = document.documentElement.classList.contains('dark');
            const color = isDarkMode ? typeConfig.colorDark : typeConfig.color;
            bar.style.backgroundColor = color;
            bar.style.color = '#ffffff';
        } else {
            // Fallback to default grey if type not found
            bar.classList.add('bg-slate-500', 'text-white');
        }

        bar.textContent = constraint.title;
        bar.title = `${constraint.title} (Click to edit)`;
        bar.dataset.action = 'edit-constraint';
        bar.dataset.id = constraint.id;

        return bar;
    }

    /**
     * Attach event listeners
     * @private
     */
    #attachEventListeners() {
        if (!this.#container) return;

        this.#container.addEventListener('click', (e) => {
            const dayEl = e.target.closest('[data-date]');
            if (!dayEl) return;

            const dateISO = dayEl.dataset.date;

            // Emit event for modal to open with pre-filled date
            EventBus.emit('calendar:day-clicked', { date: dateISO });
        });
    }
}

export default CalendarView;
