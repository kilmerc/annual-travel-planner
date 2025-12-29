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

// Event type definitions
export const EVENT_TYPES = Object.freeze({
    DIVISION: 'division',
    GTS: 'gts',
    PI: 'pi',
    BP: 'bp',
    OTHER: 'other'
});

export const EVENT_TYPE_LABELS = Object.freeze({
    division: 'Division Visit',
    gts: 'GTS All-Hands',
    pi: 'PI Planning',
    bp: 'BP Team Meeting',
    other: 'Other Business'
});

// Constraint type definitions
export const CONSTRAINT_TYPES = Object.freeze({
    VACATION: 'vacation',
    HOLIDAY: 'holiday',
    BLACKOUT: 'blackout',
    PREFERENCE: 'preference'
});

export const CONSTRAINT_TYPE_LABELS = Object.freeze({
    vacation: 'Personal Vacation (Hard Stop)',
    holiday: 'Company Holiday (Hard Stop)',
    blackout: 'Business Blackout (Hard Stop)',
    preference: 'Prefer No Travel (Soft)'
});

// Hard constraint types (cannot travel)
export const HARD_CONSTRAINT_TYPES = Object.freeze([
    CONSTRAINT_TYPES.VACATION,
    CONSTRAINT_TYPES.HOLIDAY,
    CONSTRAINT_TYPES.BLACKOUT
]);

/**
 * Get quarter for a given month index
 * @param {number} monthIndex - Month index (0-11)
 * @returns {object} Quarter object
 */
export function getQuarterForMonth(monthIndex) {
    return QUARTERS.find(q => q.months.includes(monthIndex));
}
