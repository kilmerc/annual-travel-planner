/**
 * ViewManager - View orchestration
 *
 * Manages the Calendar view rendering
 */

import EventBus from '../utils/EventBus.js';
import { CalendarView } from './CalendarView.js';

export class ViewManager {
    #container = null;
    #calendarView = null;

    constructor() {
        this.#calendarView = new CalendarView();
    }

    /**
     * Initialize view manager
     * @param {HTMLElement} container - Container element
     */
    init(container) {
        this.#container = container;

        // Subscribe to state changes
        EventBus.on('state:changed', () => this.render());
        EventBus.on('year:changed', () => this.render());

        // Initial render
        this.render();
    }

    /**
     * Render the calendar view
     */
    render() {
        if (!this.#container) return;

        // Clear container
        this.#container.innerHTML = '';

        // Render calendar view
        this.#calendarView.render(this.#container);
    }
}

export default ViewManager;
