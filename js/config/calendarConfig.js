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

// Built-in event type definitions (cannot be deleted)
export const BUILT_IN_EVENT_TYPES = Object.freeze({
    DIVISION: 'division',
    GTS: 'gts',
    PI: 'pi',
    BP: 'bp',
    OTHER: 'other'
});

// Default event type configurations
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
    other: {
        label: 'Other Business',
        color: '#64748b', // slate-500
        colorDark: '#94a3b8', // slate-400
        isHardStop: false,
        isBuiltIn: true
    }
});

// Built-in constraint type definitions (cannot be deleted)
export const BUILT_IN_CONSTRAINT_TYPES = Object.freeze({
    VACATION: 'vacation',
    HOLIDAY: 'holiday',
    BLACKOUT: 'blackout',
    PREFERENCE: 'preference'
});

// Default constraint type configurations
export const DEFAULT_CONSTRAINT_TYPE_CONFIGS = Object.freeze({
    vacation: {
        label: 'Personal Vacation',
        color: '#ef4444', // red-500
        colorDark: '#f87171', // red-400
        isHardStop: true,
        isBuiltIn: true
    },
    holiday: {
        label: 'Company Holiday',
        color: '#ec4899', // pink-500
        colorDark: '#f472b6', // pink-400
        isHardStop: true,
        isBuiltIn: true
    },
    blackout: {
        label: 'Business Blackout',
        color: '#be123c', // rose-600
        colorDark: '#fb7185', // rose-400
        isHardStop: true,
        isBuiltIn: true
    },
    preference: {
        label: 'Prefer No Travel',
        color: '#eab308', // yellow-500
        colorDark: '#facc15', // yellow-400
        isHardStop: false,
        isBuiltIn: true
    }
});

// Built-in division codes (cannot be deleted)
export const BUILT_IN_LOCATIONS = Object.freeze([
    'DAL', 'VAL', 'VCE', 'VCW', 'VER', 'VIN', 'VNE', 'VNY', 'VSC', 'VTX', 'VUT'
]);

// Backward compatibility exports for tests
export const EVENT_TYPES = BUILT_IN_EVENT_TYPES;

export const EVENT_TYPE_LABELS = Object.freeze({
    division: DEFAULT_EVENT_TYPE_CONFIGS.division.label,
    gts: DEFAULT_EVENT_TYPE_CONFIGS.gts.label,
    pi: DEFAULT_EVENT_TYPE_CONFIGS.pi.label,
    bp: DEFAULT_EVENT_TYPE_CONFIGS.bp.label,
    other: DEFAULT_EVENT_TYPE_CONFIGS.other.label
});

export const CONSTRAINT_TYPES = BUILT_IN_CONSTRAINT_TYPES;

export const CONSTRAINT_TYPE_LABELS = Object.freeze({
    vacation: 'Personal Vacation (Hard Stop)',
    holiday: 'Company Holiday (Hard Stop)',
    blackout: 'Business Blackout (Hard Stop)',
    preference: 'Prefer No Travel (Soft)'
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
