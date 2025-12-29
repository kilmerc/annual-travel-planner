/**
 * Calendar Configuration
 *
 * Standard calendar year runs Jan 1 - Dec 31
 * Q1: Jan-Mar
 * Q2: Apr-Jun
 * Q3: Jul-Sep
 * Q4: Oct-Dec
 */

export const QUARTERS = Object.freeze([
    { id: 1, name: "Q1", months: [0, 1, 2], label: "Jan - Mar" },  // Jan=0, Feb=1, Mar=2
    { id: 2, name: "Q2", months: [3, 4, 5], label: "Apr - Jun" },  // Apr=3, May=4, Jun=5
    { id: 3, name: "Q3", months: [6, 7, 8], label: "Jul - Sep" },  // Jul=6, Aug=7, Sep=8
    { id: 4, name: "Q4", months: [9, 10, 11], label: "Oct - Dec" } // Oct=9, Nov=10, Dec=11
]);

export const MONTH_NAMES = Object.freeze([
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
]);

export const MONTH_NAMES_FULL = Object.freeze([
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]);

// Built-in event type definitions (only archived is essential for app functionality)
export const BUILT_IN_EVENT_TYPES = Object.freeze({
    ARCHIVED: 'archived'
});

// Default event type configurations (only archived - users add their own types)
export const DEFAULT_EVENT_TYPE_CONFIGS = Object.freeze({
    archived: {
        label: 'Archived',
        color: '#9ca3af', // gray-400
        colorDark: '#6b7280', // gray-500
        isHardStop: false,
        isBuiltIn: true
    }
});

// Built-in constraint type definitions (none - users add their own)
export const BUILT_IN_CONSTRAINT_TYPES = Object.freeze({});

// Default constraint type configurations (empty - users add their own types)
export const DEFAULT_CONSTRAINT_TYPE_CONFIGS = Object.freeze({});

// Built-in locations (empty - users add their own locations)
export const BUILT_IN_LOCATIONS = Object.freeze([]);

// Backward compatibility exports for tests
export const EVENT_TYPES = BUILT_IN_EVENT_TYPES;

export const EVENT_TYPE_LABELS = Object.freeze({
    archived: DEFAULT_EVENT_TYPE_CONFIGS.archived.label
});

export const CONSTRAINT_TYPES = BUILT_IN_CONSTRAINT_TYPES;

export const CONSTRAINT_TYPE_LABELS = Object.freeze({});

export const HARD_CONSTRAINT_TYPES = Object.freeze([]);

/**
 * Get quarter for a given month index
 * @param {number} monthIndex - Month index (0-11)
 * @returns {object} Quarter object
 */
export function getQuarterForMonth(monthIndex) {
    return QUARTERS.find(q => q.months.includes(monthIndex));
}
