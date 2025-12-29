/**
 * Event - Travel event data model
 */

import { EVENT_TYPES } from '../config/calendarConfig.js';
import { dateToISO, getMonday } from '../services/DateService.js';

export class Event {
    constructor({ id, title, type, location, startDate, endDate = null, duration = 1, isFixed = true }) {
        this.id = id || Date.now().toString();
        this.title = title;
        this.type = type;
        this.location = location;
        this.isFixed = isFixed;

        // For fixed trips with specific dates, store actual dates
        // For flexible trips, normalize to Monday of the week
        if (isFixed && endDate) {
            this.startDate = this.#toISODate(startDate);
            this.endDate = this.#toISODate(endDate);
        } else if (isFixed) {
            // Fixed trip without endDate (legacy)
            this.startDate = this.#normalizeDate(startDate);
            this.endDate = null;
        } else {
            // Flexible trip - normalize to Monday of the week
            this.startDate = this.#normalizeDate(startDate);
            this.endDate = null;
        }

        this.duration = duration;

        this.#validate();
    }

    /**
     * Convert date to ISO string without timezone issues
     * @private
     */
    #toISODate(date) {
        // If already ISO format, return as-is
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date;
        }

        // Create Date object and extract local date parts
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Normalize date to Monday of the week (for flexible trips)
     * @private
     */
    #normalizeDate(date) {
        if (!date) return null;
        return dateToISO(getMonday(date));
    }

    /**
     * Validate event data
     * @private
     */
    #validate() {
        if (!this.title || this.title.trim() === '') {
            throw new Error('Event title is required');
        }

        if (!this.location || this.location.trim() === '') {
            throw new Error('Event location is required');
        }

        if (!this.type) {
            throw new Error('Event type is required');
        }

        if (!Object.values(EVENT_TYPES).includes(this.type)) {
            throw new Error(`Invalid event type: ${this.type}`);
        }

        if (!this.startDate) {
            throw new Error('Event start date is required');
        }

        if (this.duration < 1) {
            throw new Error('Event duration must be at least 1 week');
        }
    }

    /**
     * Get plain object representation
     * @returns {object} Plain object
     */
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            type: this.type,
            location: this.location,
            startDate: this.startDate,
            endDate: this.endDate,
            duration: this.duration,
            isFixed: this.isFixed
        };
    }

    /**
     * Create Event from plain object
     * @static
     * @param {object} data - Plain object data
     * @returns {Event} Event instance
     */
    static fromJSON(data) {
        return new Event(data);
    }

    /**
     * Clone the event
     * @returns {Event} New event instance
     */
    clone() {
        return new Event(this.toJSON());
    }
}

export default Event;
