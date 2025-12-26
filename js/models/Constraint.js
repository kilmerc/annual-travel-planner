/**
 * Constraint - Travel constraint data model
 *
 * Constraints are weeks where travel is blocked or discouraged:
 * - Hard constraints: vacation, holiday, blackout (cannot travel)
 * - Soft constraints: preference (prefer not to travel, but allowed)
 */

import { CONSTRAINT_TYPES, HARD_CONSTRAINT_TYPES } from '../config/fiscalCalendar.js';
import { dateToISO } from '../services/DateService.js';

export class Constraint {
    constructor({ id, title, type, startDate, endDate = null }) {
        this.id = id || Date.now().toString();
        this.title = title;
        this.type = type;

        // Store actual dates - if already ISO string, use directly; otherwise convert
        this.startDate = this.#toISODate(startDate);
        this.endDate = endDate ? this.#toISODate(endDate) : this.startDate;

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
     * Validate constraint data
     * @private
     */
    #validate() {
        if (!this.title || this.title.trim() === '') {
            throw new Error('Constraint title is required');
        }

        if (!this.type) {
            throw new Error('Constraint type is required');
        }

        if (!Object.values(CONSTRAINT_TYPES).includes(this.type)) {
            throw new Error(`Invalid constraint type: ${this.type}`);
        }

        if (!this.startDate) {
            throw new Error('Constraint start date is required');
        }
    }

    /**
     * Check if this is a hard constraint (cannot travel)
     * @returns {boolean} True if hard constraint
     */
    isHard() {
        return HARD_CONSTRAINT_TYPES.includes(this.type);
    }

    /**
     * Check if this is a soft constraint (prefer not to travel)
     * @returns {boolean} True if soft constraint
     */
    isSoft() {
        return !this.isHard();
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
            startDate: this.startDate,
            endDate: this.endDate
        };
    }

    /**
     * Create Constraint from plain object
     * @static
     * @param {object} data - Plain object data
     * @returns {Constraint} Constraint instance
     */
    static fromJSON(data) {
        return new Constraint(data);
    }

    /**
     * Clone the constraint
     * @returns {Constraint} New constraint instance
     */
    clone() {
        return new Constraint(this.toJSON());
    }
}

export default Constraint;
