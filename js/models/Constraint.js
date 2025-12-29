/**
 * Constraint - Travel constraint data model
 *
 * Constraints are weeks where travel is blocked or discouraged:
 * - Hard constraints: Cannot travel (isHardStop determined by type config)
 * - Soft constraints: Prefer not to travel, but allowed
 *
 * Note: Hardness is now determined by the constraint type configuration
 * in StateManager, not by this model. Use StateManager.getConstraintTypeConfig()
 * to check the isHardStop flag.
 */

import { BUILT_IN_CONSTRAINT_TYPES } from '../config/calendarConfig.js';
import { dateToISO } from '../services/DateService.js';

// Counter to ensure unique IDs
let idCounter = 0;

export class Constraint {
    constructor({ id, title, type, startDate, endDate = null }) {
        this.id = id || `${Date.now()}-${idCounter++}`;
        this.title = title;
        this.type = type;

        // Validate input before processing
        this.#validateInput(startDate);

        // Store actual dates - if already ISO string, use directly; otherwise convert
        this.startDate = this.#toISODate(startDate);
        this.endDate = endDate ? this.#toISODate(endDate) : this.startDate;

        // Final validation
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
     * Validate input data before processing
     * @private
     */
    #validateInput(startDate) {
        if (!this.title || this.title.trim() === '') {
            throw new Error('Constraint title is required');
        }

        if (!this.type || typeof this.type !== 'string') {
            throw new Error('Constraint type is required');
        }

        // Validate type against built-in types only
        const allConstraintTypes = Object.values(BUILT_IN_CONSTRAINT_TYPES);
        if (!allConstraintTypes.includes(this.type)) {
            throw new Error(`Invalid constraint type: ${this.type}`);
        }

        // Validate startDate before processing
        if (!startDate) {
            throw new Error('Constraint start date is required');
        }
    }

    /**
     * Validate constraint data after processing
     * @private
     */
    #validate() {
        // Final check that startDate was processed correctly
        if (!this.startDate) {
            throw new Error('Constraint start date is required');
        }
    }

    /**
     * Check if this is a hard constraint (cannot travel)
     * Note: This requires StateManager to be imported, creating circular dependency.
     * Deprecated: Use StateManager.getConstraintTypeConfig(type).isHardStop instead
     * @deprecated
     * @returns {boolean} True if hard constraint
     */
    isHard() {
        // For backward compatibility with tests, check against known hard types
        const knownHardTypes = ['vacation', 'holiday', 'blackout'];
        return knownHardTypes.includes(this.type);
    }

    /**
     * Check if this is a soft constraint (prefer not to travel)
     * @deprecated
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
