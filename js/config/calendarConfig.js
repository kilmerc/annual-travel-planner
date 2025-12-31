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

// Default event type configurations (built-in types)
export const DEFAULT_EVENT_TYPE_CONFIGS = Object.freeze({
    division: {
        label: 'Division Visit',
        color: '#3b82f6', // blue-500
        colorDark: '#60a5fa', // blue-400
        isHardStop: false,
        isBuiltIn: true
    },
    gts: {
        label: 'GTS All-Hands',
        color: '#a855f7', // purple-500
        colorDark: '#c084fc', // purple-400
        isHardStop: false,
        isBuiltIn: true
    },
    pi: {
        label: 'PI Planning',
        color: '#f97316', // orange-500
        colorDark: '#fb923c', // orange-400
        isHardStop: false,
        isBuiltIn: true
    },
    bp: {
        label: 'BP Team Meeting',
        color: '#22c55e', // green-500
        colorDark: '#4ade80', // green-400
        isHardStop: false,
        isBuiltIn: true
    },
    conference: {
        label: 'Conference',
        color: '#14b8a6', // teal-500
        colorDark: '#2dd4bf', // teal-400
        isHardStop: false,
        isBuiltIn: true
    },
    other: {
        label: 'Other Business',
        color: '#6b7280', // gray-500
        colorDark: '#9ca3af', // gray-400
        isHardStop: false,
        isBuiltIn: true
    },
    archived: {
        label: 'Archived',
        color: '#9ca3af', // gray-400
        colorDark: '#6b7280', // gray-500
        isHardStop: false,
        isBuiltIn: true
    }
});

// Built-in constraint type definitions
export const BUILT_IN_CONSTRAINT_TYPES = Object.freeze({
    VACATION: 'vacation',
    HOLIDAY: 'holiday',
    BLACKOUT: 'blackout',
    PREFERENCE: 'preference',
    BUSINESS_SOFT: 'business-soft'
});

// Default constraint type configurations (built-in types)
export const DEFAULT_CONSTRAINT_TYPE_CONFIGS = Object.freeze({
    vacation: {
        label: 'Personal Vacation',
        color: '#ef4444', // red-500
        colorDark: '#f87171', // red-400
        isHardStop: true,
        isBuiltIn: true
    },
    holiday: {
        label: 'Public Holiday',
        color: '#ec4899', // pink-500
        colorDark: '#f472b6', // pink-400
        isHardStop: true,
        isBuiltIn: true
    },
    blackout: {
        label: 'Blackout Period',
        color: '#be123c', // rose-700
        colorDark: '#e11d48', // rose-600
        isHardStop: true,
        isBuiltIn: true
    },
    preference: {
        label: 'Preference',
        color: '#eab308', // yellow-500
        colorDark: '#facc15', // yellow-400
        isHardStop: false,
        isBuiltIn: true
    },
    'business-soft': {
        label: 'Business (Soft)',
        color: '#fb923c', // orange-400
        colorDark: '#fdba74', // orange-300
        isHardStop: false,
        isBuiltIn: true
    }
});

// Built-in locations (empty - users add their own locations)
export const BUILT_IN_LOCATIONS = Object.freeze([]);

// Backward compatibility exports for tests
export const EVENT_TYPES = BUILT_IN_EVENT_TYPES;

export const EVENT_TYPE_LABELS = Object.freeze({
    division: DEFAULT_EVENT_TYPE_CONFIGS.division.label,
    gts: DEFAULT_EVENT_TYPE_CONFIGS.gts.label,
    pi: DEFAULT_EVENT_TYPE_CONFIGS.pi.label,
    bp: DEFAULT_EVENT_TYPE_CONFIGS.bp.label,
    conference: DEFAULT_EVENT_TYPE_CONFIGS.conference.label,
    other: DEFAULT_EVENT_TYPE_CONFIGS.other.label,
    archived: DEFAULT_EVENT_TYPE_CONFIGS.archived.label
});

export const CONSTRAINT_TYPES = BUILT_IN_CONSTRAINT_TYPES;

export const CONSTRAINT_TYPE_LABELS = Object.freeze({
    vacation: DEFAULT_CONSTRAINT_TYPE_CONFIGS.vacation.label,
    holiday: DEFAULT_CONSTRAINT_TYPE_CONFIGS.holiday.label,
    blackout: DEFAULT_CONSTRAINT_TYPE_CONFIGS.blackout.label,
    preference: DEFAULT_CONSTRAINT_TYPE_CONFIGS.preference.label,
    'business-soft': DEFAULT_CONSTRAINT_TYPE_CONFIGS['business-soft'].label
});

export const HARD_CONSTRAINT_TYPES = Object.freeze(['vacation', 'holiday', 'blackout']);

/**
 * Get quarter for a given month index
 * @param {number} monthIndex - Month index (0-11)
 * @returns {object} Quarter object
 */
export function getQuarterForMonth(monthIndex) {
    return QUARTERS.find(q => q.months.includes(monthIndex));
}
