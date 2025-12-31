/**
 * DateService - Date utility functions for the travel planner
 *
 * All dates are normalized to Monday of the week for consistency
 */

/**
 * Get the Monday of the week containing the given date
 * @param {Date|string} d - Date object or date string
 * @returns {Date} Monday of that week
 */
export function getMonday(d) {
    // Handle ISO date strings (YYYY-MM-DD) to avoid timezone issues
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const [year, month, day] = d.split('-').map(Number);
        d = new Date(year, month - 1, day); // Use local timezone
    } else {
        d = new Date(d);
    }

    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const result = new Date(d);
    result.setDate(diff);
    return result;
}

/**
 * Get the Friday of the week containing the given date
 * @param {Date|string} d - Date object or date string
 * @returns {Date} Friday of that week
 */
export function getFriday(d) {
    const monday = getMonday(d);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    return friday;
}

/**
 * Convert date to ISO string (YYYY-MM-DD)
 * @param {Date} date - Date object
 * @returns {string} ISO date string
 */
export function dateToISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get all weeks in a calendar year
 * @param {number} year - Calendar year (starts in January)
 * @returns {Array<object>} Array of week objects with date, iso, monthIdx
 */
export function getWeeksInYear(year) {
    const weeks = [];

    // Calendar year starts Jan 1st
    const startDate = new Date(year, 0, 1); // Jan 1
    // Calendar year ends Dec 31st
    const endDate = new Date(year, 11, 31); // Dec 31

    // Align to Monday of first week
    let current = getMonday(startDate);

    while (current <= endDate) {
        weeks.push({
            date: new Date(current),
            iso: dateToISO(current),
            monthIdx: current.getMonth() // Used for grouping and quarter detection
        });
        current.setDate(current.getDate() + 7);
    }

    return weeks;
}

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatDate(date, options = { month: 'short', day: 'numeric' }) {
    return new Date(date).toLocaleDateString(undefined, options);
}

/**
 * Format date with ordinal suffix (1st, 2nd, 3rd, etc.)
 * @param {Date|string} date - Date to format
 * @returns {string} Date with ordinal suffix
 */
export function formatDateWithOrdinal(date) {
    const d = new Date(date);
    const dayNum = d.getDate();
    const suffix = (dayNum > 3 && dayNum < 21) ? 'th' :
                   ['th', 'st', 'nd', 'rd', 'th', 'th', 'th', 'th', 'th', 'th'][dayNum % 10];
    return `${dayNum}${suffix}`;
}

/**
 * Get all Mondays in a specific month
 * @param {number} year - Year
 * @param {number} monthIndex - Month index (0-11)
 * @returns {Array<Date>} Array of Monday dates
 */
export function getMondaysInMonth(year, monthIndex) {
    const mondays = [];
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, monthIndex, d);
        if (date.getDay() === 1) { // Monday
            mondays.push(date);
        }
    }

    return mondays;
}

/**
 * Check if two dates are in the same week
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {boolean} True if dates are in the same week
 */
export function isSameWeek(date1, date2) {
    const monday1 = getMonday(date1);
    const monday2 = getMonday(date2);
    return dateToISO(monday1) === dateToISO(monday2);
}

/**
 * Get week number within the calendar year
 * @param {Date|string} date - Date to check
 * @param {number} year - Calendar year
 * @returns {number} Week number (1-based)
 */
export function getWeekNumber(date, year) {
    const monday = getMonday(date);
    const yearStart = getMonday(new Date(year, 0, 1)); // Jan 1

    const diffTime = monday - yearStart;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weekNum = Math.floor(diffDays / 7) + 1;

    return weekNum;
}

/**
 * Get all days in a month for calendar rendering
 * @param {number} year - Year
 * @param {number} monthIndex - Month index (0-11)
 * @returns {Array<Date>} Array of all dates in the month
 */
export function getDaysInMonth(year, monthIndex) {
    const days = [];
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
        days.push(new Date(year, monthIndex, d));
    }

    return days;
}

/**
 * Get calendar grid (including leading/trailing days from adjacent months)
 * @param {number} year - Year
 * @param {number} monthIndex - Month index (0-11)
 * @returns {Array<Date>} Array of dates for calendar grid (always starts on Sunday)
 */
export function getCalendarGrid(year, monthIndex) {
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);

    const grid = [];

    // Add leading days from previous month
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const date = new Date(year, monthIndex, 1 - (i + 1));
        grid.push(date);
    }

    // Add days of current month
    const daysInMonth = lastDay.getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        grid.push(new Date(year, monthIndex, d));
    }

    // Add trailing days from next month to complete the week
    const lastDayOfWeek = lastDay.getDay();
    for (let i = 1; i < 7 - lastDayOfWeek; i++) {
        grid.push(new Date(year, monthIndex + 1, i));
    }

    return grid;
}

/**
 * Check if a date range overlaps with any Monday-Friday week
 * Used to determine if a constraint/trip affects a work week
 * @param {Date|string} startDate - Start date of the range
 * @param {Date|string} endDate - End date of the range
 * @param {Date|string} weekDate - Any date in the week to check
 * @returns {boolean} True if the date range overlaps with the Mon-Fri week
 */
export function overlapsWithWeek(startDate, endDate, weekDate) {
    // Parse ISO date strings in local time to avoid timezone issues
    const parseLocalDate = (dateStr) => {
        if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-').map(Number);
            return new Date(year, month - 1, day);
        }
        return new Date(dateStr);
    };

    const rangeStart = parseLocalDate(startDate);
    const rangeEnd = parseLocalDate(endDate);
    const weekMonday = getMonday(weekDate);
    const weekFriday = getFriday(weekDate);

    // Check if ranges overlap
    return rangeStart <= weekFriday && rangeEnd >= weekMonday;
}

/**
 * Get the current quarter (1-4)
 * @param {Date|null} referenceDate - Optional reference date (defaults to current date)
 * @returns {number} Current quarter (1=Jan-Mar, 2=Apr-Jun, 3=Jul-Sep, 4=Oct-Dec)
 */
export function getCurrentQuarter(referenceDate = null) {
    const date = referenceDate || new Date();
    const month = date.getMonth(); // 0-11
    return Math.floor(month / 3) + 1;
}

/**
 * Get date range for a time range ID
 * @param {string} timeRangeId - Time range ID (current-year, current-quarter, next-3-months, etc.)
 * @param {number|Date} referenceYear - Reference year (number) or reference date (Date object)
 * @returns {object} Object with startDate and endDate as Date objects
 */
export function getTimeRangeDates(timeRangeId, referenceYear) {
    // Handle Date object or year number for referenceYear
    const referenceDate = referenceYear instanceof Date ? referenceYear : new Date();
    const year = referenceYear instanceof Date ? referenceYear.getFullYear() : referenceYear;

    let startDate, endDate;

    switch (timeRangeId) {
        case 'current-year':
            startDate = new Date(year, 0, 1); // Jan 1
            endDate = new Date(year, 11, 31); // Dec 31
            break;

        case 'current-quarter':
            const quarter = getCurrentQuarter(referenceDate);
            const quarterStartMonth = (quarter - 1) * 3;
            const quarterEndMonth = quarterStartMonth + 2;
            startDate = new Date(referenceDate.getFullYear(), quarterStartMonth, 1);
            endDate = new Date(referenceDate.getFullYear(), quarterEndMonth + 1, 0); // Last day of quarter
            break;

        case 'next-3-months':
            startDate = new Date(referenceDate);
            endDate = new Date(referenceDate);
            endDate.setMonth(endDate.getMonth() + 3);
            break;

        case 'next-6-months':
            startDate = new Date(referenceDate);
            endDate = new Date(referenceDate);
            endDate.setMonth(endDate.getMonth() + 6);
            break;

        case 'next-12-months':
            startDate = new Date(referenceDate);
            endDate = new Date(referenceDate);
            endDate.setFullYear(endDate.getFullYear() + 1);
            break;

        default:
            // Default to current year
            startDate = new Date(year, 0, 1);
            endDate = new Date(year, 11, 31);
    }

    return { startDate, endDate };
}

/**
 * Get all Mondays within a date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array<Date>} Array of Monday dates
 */
export function getMondaysInRange(startDate, endDate) {
    const mondays = [];
    let current = getMonday(startDate);

    while (current <= endDate) {
        if (current >= startDate) {
            mondays.push(new Date(current));
        }
        current.setDate(current.getDate() + 7);
    }

    return mondays;
}

export default {
    getMonday,
    getFriday,
    dateToISO,
    getWeeksInYear,
    formatDate,
    formatDateWithOrdinal,
    getMondaysInMonth,
    isSameWeek,
    getWeekNumber,
    getDaysInMonth,
    getCalendarGrid,
    overlapsWithWeek,
    getCurrentQuarter,
    getTimeRangeDates,
    getMondaysInRange
};
