/**
 * ScoringEngine - Optimization algorithm for suggesting best travel weeks
 *
 * Scoring logic:
 * - Base score: 100 points
 * - Hard constraint (vacation/holiday/blackout): -1000 points (disqualified)
 * - Soft constraint (preference): -20 points (discouraged)
 * - Location consolidation (same city): +500 points
 * - Location conflict (different city): -1000 points
 * - Filter viable: score > -500
 * - Return top 3 weeks sorted by score
 */

import { QUARTERS } from '../config/fiscalCalendar.js';
import { HARD_CONSTRAINT_TYPES } from '../config/fiscalCalendar.js';
import { dateToISO, getMonday, formatDate, overlapsWithWeek } from '../services/DateService.js';

export class ScoringEngine {
    /**
     * Get suggestions for flexible trip in a specific quarter
     * @param {number} quarterId - Quarter ID (1-4)
     * @param {number} fiscalYear - Fiscal year
     * @param {string} location - Desired location
     * @param {Array} events - Existing events
     * @param {Array} constraints - Existing constraints
     * @returns {Array} Top 3 suggested weeks
     */
    getSuggestionsForQuarter(quarterId, fiscalYear, location, events, constraints) {
        const quarter = QUARTERS.find(q => q.id === quarterId);
        if (!quarter) {
            throw new Error(`Invalid quarter ID: ${quarterId}`);
        }

        // Generate candidate weeks (all Mondays in the quarter)
        const candidates = this.#generateCandidates(quarter, fiscalYear);

        // Score each candidate week
        const scored = candidates.map(date => {
            const score = this.scoreWeek(date, location, events, constraints);
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
            const isHard = HARD_CONSTRAINT_TYPES.includes(constraint.type);
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

        events.forEach(event => {
            const eventStartDate = event.startDate;
            const eventEndDate = event.endDate || event.startDate;

            // Check for hard constraint conflicts that overlap with the event
            const hardConstraints = constraints.filter(c =>
                HARD_CONSTRAINT_TYPES.includes(c.type)
            );

            hardConstraints.forEach(hardConstraint => {
                // Check if event overlaps with constraint
                const eventStart = new Date(eventStartDate);
                const eventEnd = new Date(eventEndDate);
                const constraintStart = new Date(hardConstraint.startDate);
                const constraintEnd = new Date(hardConstraint.endDate);

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
            events.forEach(other => {
                if (event.id === other.id) return;

                const otherStartDate = other.startDate;
                const otherEndDate = other.endDate || other.startDate;

                const eventStart = new Date(eventStartDate);
                const eventEnd = new Date(eventEndDate);
                const otherStart = new Date(otherStartDate);
                const otherEnd = new Date(otherEndDate);

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

        // Group events by week
        events.forEach(event => {
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
