/**
 * ScoringEngine - Optimization algorithm for suggesting best travel weeks
 *
 * Scoring logic:
 * - Base score: 100 points
 * - Hard constraint (isHardStop=true): -1000 points (disqualified)
 * - Soft constraint (isHardStop=false): -20 points (discouraged)
 * - Location consolidation (same city): +500 points
 * - Location conflict (different city): -1000 points
 * - Filter viable: score > -500
 * - Return top 3 weeks sorted by score
 *
 * Note: Hard vs Soft constraint determination now uses dynamic type
 * configurations from StateManager instead of hardcoded type list.
 */

import { QUARTERS } from '../config/calendarConfig.js';
import { dateToISO, getMonday, getFriday, formatDate, overlapsWithWeek, getTimeRangeDates, getMondaysInRange } from '../services/DateService.js';
import StateManager from './StateManager.js';

export class ScoringEngine {
    /**
     * Get suggestions for flexible trip in a specific quarter
     * @param {number} quarterId - Quarter ID (1-4)
     * @param {number} year - Calendar year
     * @param {string} location - Desired location
     * @param {Array} events - Existing events
     * @param {Array} constraints - Existing constraints
     * @returns {Array} Top 3 suggested weeks
     */
    getSuggestionsForQuarter(quarterId, year, location, events, constraints) {
        const quarter = QUARTERS.find(q => q.id === quarterId);
        if (!quarter) {
            throw new Error(`Invalid quarter ID: ${quarterId}`);
        }

        // Filter out archived events - they should not affect scheduling
        const activeEvents = events.filter(e => !e.archived);

        // Generate candidate weeks (all Mondays in the quarter)
        const candidates = this.#generateCandidates(quarter, year);

        // Score each candidate week
        const scored = candidates.map(date => {
            const score = this.scoreWeek(date, location, activeEvents, constraints);
            return {
                date,
                iso: dateToISO(date),
                ...score
            };
        });

        // Filter viable (score > -500) and sort by score descending
        const viable = scored
            .filter(s => s.score > -500)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

        return viable;
    }

    /**
     * Get suggestions for flexible trip in a specific time range
     * @param {string} timeRangeId - Time range ID (current-year, current-quarter, next-3-months, etc.)
     * @param {number} referenceYear - Reference year for "current-year" option
     * @param {string} location - Desired location
     * @param {Array} events - Existing events
     * @param {Array} constraints - Existing constraints
     * @returns {Array} Top 3 suggested weeks
     */
    getSuggestionsForTimeRange(timeRangeId, referenceYear, location, events, constraints) {
        // Get date range for the time range ID
        const { startDate, endDate } = getTimeRangeDates(timeRangeId, referenceYear);

        // Filter out archived events - they should not affect scheduling
        const activeEvents = events.filter(e => !e.archived);

        // Generate candidate weeks (all Mondays in the time range)
        const candidates = getMondaysInRange(startDate, endDate);

        // Score each candidate week
        const scored = candidates.map(date => {
            const score = this.scoreWeek(date, location, activeEvents, constraints);
            return {
                date,
                iso: dateToISO(date),
                ...score
            };
        });

        // Filter viable (score > -500) and sort by score descending
        const viable = scored
            .filter(s => s.score > -500)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);

        return viable;
    }

    /**
     * Score a specific week for a location
     * @param {Date|string} date - Date in the week
     * @param {string} location - Desired location
     * @param {Array} events - Existing events
     * @param {Array} constraints - Existing constraints
     * @returns {object} Score result with score, reasons, and action
     */
    scoreWeek(date, location, events, constraints) {
        const monday = getMonday(date);
        const iso = dateToISO(monday);
        let score = 100; // Base score
        const reasons = [];
        let action = 'schedule';

        // Check for constraints that overlap with this Mon-Fri week
        const conflictingConstraints = constraints.filter(c =>
            overlapsWithWeek(c.startDate, c.endDate, monday)
        );

        conflictingConstraints.forEach(constraint => {
            // Check if this constraint type is configured as a hard stop
            const typeConfig = StateManager.getConstraintTypeConfig(constraint.type);
            const isHard = typeConfig?.isHardStop ?? false;

            if (isHard) {
                score = -1000; // Disqualified
                reasons.push(`Blocked: ${constraint.title}`);
            } else {
                score -= 20; // Soft penalty
                reasons.push(`Preference: ${constraint.title}`);
            }
        });

        // Check for existing trips that overlap with this Mon-Fri week
        const existingTrips = events.filter(e => {
            // For flexible trips (no endDate), check exact week match
            if (!e.endDate) {
                return e.startDate === iso;
            }
            // For fixed trips, check if they overlap with this week
            return overlapsWithWeek(e.startDate, e.endDate, monday);
        });

        existingTrips.forEach(trip => {
            const locationMatch = this.#locationsMatch(location, trip.location);

            if (locationMatch) {
                score += 500; // Consolidation bonus
                reasons.push(`Existing trip to ${trip.location} (${trip.title}). Consolidate here!`);
                action = 'consolidate';
            } else {
                score -= 1000; // Conflict penalty
                reasons.push(`Already in ${trip.location}`);
            }
        });

        return {
            score,
            reasons,
            action
        };
    }

    /**
     * Detect conflicts between events and constraints
     * @param {Array} events - Events array
     * @param {Array} constraints - Constraints array
     * @returns {Array} Array of conflict objects
     */
    detectConflicts(events, constraints) {
        const conflicts = [];

        // Helper to parse ISO date strings in local time (avoid timezone issues)
        const parseLocalDate = (dateStr) => {
            if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                const [year, month, day] = dateStr.split('-').map(Number);
                return new Date(year, month - 1, day);
            }
            return new Date(dateStr);
        };

        // Filter out archived events - they should not be considered in conflict detection
        const activeEvents = events.filter(e => !e.archived);

        activeEvents.forEach(event => {
            // For flexible events (no endDate or isFixed=false), use Mon-Fri of the week
            let eventStartDate = event.startDate;
            let eventEndDate;

            if (!event.isFixed || !event.endDate) {
                // Flexible event - startDate is Monday, calculate Friday
                const monday = parseLocalDate(event.startDate);
                const friday = getFriday(monday);
                eventEndDate = dateToISO(friday);
            } else {
                // Fixed event - use actual dates
                eventEndDate = event.endDate;
            }

            // Check for hard constraint conflicts that overlap with the event
            const hardConstraints = constraints.filter(c => {
                const typeConfig = StateManager.getConstraintTypeConfig(c.type);
                return typeConfig?.isHardStop ?? false;
            });

            hardConstraints.forEach(hardConstraint => {
                // Check if event overlaps with constraint
                const eventStart = parseLocalDate(eventStartDate);
                const eventEnd = parseLocalDate(eventEndDate);
                const constraintStart = parseLocalDate(hardConstraint.startDate);
                const constraintEnd = parseLocalDate(hardConstraint.endDate);

                const overlaps = eventStart <= constraintEnd && eventEnd >= constraintStart;

                if (overlaps) {
                    conflicts.push({
                        type: 'hard-constraint',
                        event,
                        constraint: hardConstraint,
                        message: `Event "${event.title}" conflicts with ${hardConstraint.title}`
                    });
                }
            });

            // Check for double-booking (overlapping events in different locations)
            activeEvents.forEach(other => {
                if (event.id === other.id) return;

                // For flexible events (no endDate or isFixed=false), use Mon-Fri of the week
                let otherStartDate = other.startDate;
                let otherEndDate;

                if (!other.isFixed || !other.endDate) {
                    // Flexible event - startDate is Monday, calculate Friday
                    const monday = parseLocalDate(other.startDate);
                    const friday = getFriday(monday);
                    otherEndDate = dateToISO(friday);
                } else {
                    // Fixed event - use actual dates
                    otherEndDate = other.endDate;
                }

                const eventStart = parseLocalDate(eventStartDate);
                const eventEnd = parseLocalDate(eventEndDate);
                const otherStart = parseLocalDate(otherStartDate);
                const otherEnd = parseLocalDate(otherEndDate);

                const overlaps = eventStart <= otherEnd && eventEnd >= otherStart;

                if (overlaps) {
                    // Avoid duplicate conflict entries
                    const alreadyReported = conflicts.some(c =>
                        c.type === 'double-booking' &&
                        ((c.event1.id === event.id && c.event2.id === other.id) ||
                         (c.event1.id === other.id && c.event2.id === event.id))
                    );

                    if (!alreadyReported) {
                        conflicts.push({
                            type: 'double-booking',
                            event1: event,
                            event2: other,
                            message: `Double-booked: "${event.title}" and "${other.title}"`
                        });
                    }
                }
            });
        });

        return conflicts;
    }

    /**
     * Find consolidation opportunities
     * @param {Array} events - Events array
     * @returns {Array} Weeks with multiple events to the same location
     */
    findConsolidationOpportunities(events) {
        const opportunities = [];
        const weekGroups = new Map();

        // Filter out archived events
        const activeEvents = events.filter(e => !e.archived);

        // Group events by week
        activeEvents.forEach(event => {
            const week = event.startDate;
            if (!weekGroups.has(week)) {
                weekGroups.set(week, []);
            }
            weekGroups.get(week).push(event);
        });

        // Find weeks with same-location events
        weekGroups.forEach((weekEvents, week) => {
            if (weekEvents.length > 1) {
                // Check if any events share locations
                for (let i = 0; i < weekEvents.length; i++) {
                    for (let j = i + 1; j < weekEvents.length; j++) {
                        if (this.#locationsMatch(weekEvents[i].location, weekEvents[j].location)) {
                            opportunities.push({
                                week,
                                events: [weekEvents[i], weekEvents[j]],
                                location: weekEvents[i].location
                            });
                        }
                    }
                }
            }
        });

        return opportunities;
    }

    /**
     * Generate candidate Monday dates for a quarter
     * @private
     * @param {object} quarter - Quarter object
     * @param {number} year - Calendar year
     * @returns {Array<Date>} Array of Monday dates
     */
    #generateCandidates(quarter, year) {
        const candidates = [];

        quarter.months.forEach(monthIdx => {
            // All months are in the same calendar year now
            const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();

            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(year, monthIdx, d);
                if (date.getDay() === 1) { // Monday
                    candidates.push(date);
                }
            }
        });

        return candidates;
    }

    /**
     * Check if two locations match (case-insensitive substring match)
     * @private
     * @param {string} loc1 - First location
     * @param {string} loc2 - Second location
     * @returns {boolean} True if locations match
     */
    #locationsMatch(loc1, loc2) {
        const l1 = (loc1 || '').toLowerCase().trim();
        const l2 = (loc2 || '').toLowerCase().trim();

        return l1.includes(l2) || l2.includes(l1);
    }
}

// Export singleton instance
export default new ScoringEngine();
