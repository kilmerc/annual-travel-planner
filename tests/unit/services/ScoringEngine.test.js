import { describe, it, expect, beforeEach } from 'vitest';
import { Event } from '../../../js/models/Event.js';
import { Constraint } from '../../../js/models/Constraint.js';
import StateManager from '../../../js/services/StateManager.js';

describe('ScoringEngine', () => {
  let ScoringEngine;

  beforeEach(async () => {
    // Import fresh instance for each test
    const module = await import('../../../js/services/ScoringEngine.js');
    ScoringEngine = module.default;

    // Set up constraint type configs for tests
    StateManager.setConstraintTypeConfig('vacation', {
      label: 'Vacation',
      color: '#ef4444',
      colorDark: '#f87171',
      isHardStop: true
    });
    StateManager.setConstraintTypeConfig('holiday', {
      label: 'Holiday',
      color: '#ec4899',
      colorDark: '#f472b6',
      isHardStop: true
    });
    StateManager.setConstraintTypeConfig('blackout', {
      label: 'Blackout',
      color: '#be123c',
      colorDark: '#e11d48',
      isHardStop: true
    });
    StateManager.setConstraintTypeConfig('preference', {
      label: 'Preference',
      color: '#eab308',
      colorDark: '#facc15',
      isHardStop: false
    });

    // Set up event type configs for tests
    StateManager.setEventTypeConfig('division', {
      label: 'Division Visit',
      color: '#3b82f6',
      colorDark: '#60a5fa',
      isHardStop: false
    });
    StateManager.setEventTypeConfig('gts', {
      label: 'GTS',
      color: '#a855f7',
      colorDark: '#c084fc',
      isHardStop: false
    });
    StateManager.setEventTypeConfig('other', {
      label: 'Other',
      color: '#6b7280',
      colorDark: '#9ca3af',
      isHardStop: false
    });
  });

  describe('scoreWeek', () => {
    it('should return base score for empty week', () => {
      const result = ScoringEngine.scoreWeek('2025-03-17', 'London', [], []);

      expect(result.score).toBe(100);
      expect(result.reasons).toEqual([]);
      expect(result.action).toBe('schedule');
    });

    it('should apply -1000 penalty for hard constraint (vacation)', () => {
      const constraints = [
        new Constraint({
          title: 'Summer Vacation',
          type: 'vacation',
          startDate: '2025-03-17',
          endDate: '2025-03-21'
        })
      ];

      const result = ScoringEngine.scoreWeek('2025-03-17', 'London', [], constraints);

      expect(result.score).toBe(-1000);
      expect(result.reasons).toContain('Blocked: Summer Vacation');
    });

    it('should apply -1000 penalty for hard constraint (holiday)', () => {
      const constraints = [
        new Constraint({
          title: 'Christmas',
          type: 'holiday',
          startDate: '2025-12-25',
          endDate: '2025-12-25'
        })
      ];

      const result = ScoringEngine.scoreWeek('2025-12-22', 'Austin', [], constraints);

      expect(result.score).toBe(-1000);
      expect(result.reasons).toContain('Blocked: Christmas');
    });

    it('should apply -1000 penalty for hard constraint (blackout)', () => {
      const constraints = [
        new Constraint({
          title: 'Company Shutdown',
          type: 'blackout',
          startDate: '2025-12-24',
          endDate: '2025-12-31'
        })
      ];

      const result = ScoringEngine.scoreWeek('2025-12-29', 'London', [], constraints);

      expect(result.score).toBe(-1000);
      expect(result.reasons).toContain('Blocked: Company Shutdown');
    });

    it('should apply -20 penalty for soft constraint (preference)', () => {
      const constraints = [
        new Constraint({
          title: 'Kids Summer Camp',
          type: 'preference',
          startDate: '2025-06-16',
          endDate: '2025-06-20'
        })
      ];

      const result = ScoringEngine.scoreWeek('2025-06-16', 'Austin', [], constraints);

      expect(result.score).toBe(80); // 100 - 20
      expect(result.reasons).toContain('Preference: Kids Summer Camp');
    });

    it('should apply -20 penalty for soft constraint (preference)', () => {
      const constraints = [
        new Constraint({
          title: 'Quarterly Review',
          type: 'preference',
          startDate: '2025-03-31'
        })
      ];

      const result = ScoringEngine.scoreWeek('2025-03-31', 'Paris', [], constraints);

      expect(result.score).toBe(80); // 100 - 20
      expect(result.reasons).toContain('Preference: Quarterly Review');
    });

    it('should apply +500 bonus for location consolidation', () => {
      const events = [
        new Event({
          title: 'PI Planning London',
          type: 'pi',
          location: 'London',
          startDate: '2025-03-17',
          endDate: '2025-03-21',
          isFixed: true
        })
      ];

      const result = ScoringEngine.scoreWeek('2025-03-17', 'London', events, []);

      expect(result.score).toBe(600); // 100 + 500
      expect(result.action).toBe('consolidate');
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.reasons[0]).toContain('Consolidate');
    });

    it('should apply -1000 penalty for location conflict', () => {
      const events = [
        new Event({
          title: 'Paris other',
          type: 'other',
          location: 'Paris',
          startDate: '2025-04-14',
          endDate: '2025-04-18',
          isFixed: true
        })
      ];

      const result = ScoringEngine.scoreWeek('2025-04-14', 'London', events, []);

      expect(result.score).toBe(-900); // 100 - 1000
      expect(result.reasons).toContain('Already in Paris');
    });

    it('should handle multiple constraints', () => {
      const constraints = [
        new Constraint({
          title: 'Vacation',
          type: 'vacation',
          startDate: '2025-07-14',
          endDate: '2025-07-18'
        }),
        new Constraint({
          title: 'Kids Camp',
          type: 'preference',
          startDate: '2025-07-14',
          endDate: '2025-07-18'
        })
      ];

      const result = ScoringEngine.scoreWeek('2025-07-14', 'London', [], constraints);

      // Hard constraint trumps soft constraint
      expect(result.score).toBe(-1020); // -1000 (hard) - 20 (soft)
      expect(result.reasons).toHaveLength(2);
    });

    it('should handle constraint that overlaps mid-week', () => {
      const constraints = [
        new Constraint({
          title: 'Mid-Week Holiday',
          type: 'holiday',
          startDate: '2025-03-19' // Wednesday
        })
      ];

      const result = ScoringEngine.scoreWeek('2025-03-17', 'Austin', [], constraints);

      expect(result.score).toBe(-1000); // Entire week blocked
      expect(result.reasons).toContain('Blocked: Mid-Week Holiday');
    });

    it('should match locations case-insensitively', () => {
      const events = [
        new Event({
          title: 'Trip',
          type: 'division',
          location: 'LONDON',
          startDate: '2025-05-12',
          isFixed: true
        })
      ];

      const result = ScoringEngine.scoreWeek('2025-05-12', 'london', events, []);

      expect(result.score).toBe(600); // Consolidation bonus
    });

    it('should match locations with substring', () => {
      const events = [
        new Event({
          title: 'Trip',
          type: 'division',
          location: 'London Office',
          startDate: '2025-05-12',
          isFixed: true
        })
      ];

      const result = ScoringEngine.scoreWeek('2025-05-12', 'London', events, []);

      expect(result.score).toBe(600); // Consolidation bonus
    });
  });

  describe('detectConflicts', () => {
    it('should detect hard constraint conflict', () => {
      const events = [
        new Event({
          title: 'London Trip',
          type: 'division',
          location: 'London',
          startDate: '2025-07-14',
          endDate: '2025-07-18',
          isFixed: true
        })
      ];

      const constraints = [
        new Constraint({
          title: 'Summer Vacation',
          type: 'vacation',
          startDate: '2025-07-14',
          endDate: '2025-07-18'
        })
      ];

      const conflicts = ScoringEngine.detectConflicts(events, constraints);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('hard-constraint');
      expect(conflicts[0].message).toContain('London Trip');
      expect(conflicts[0].message).toContain('Summer Vacation');
      expect(conflicts[0].event).toBe(events[0]);
      expect(conflicts[0].constraint).toBe(constraints[0]);
    });

    it('should detect double-booking conflict', () => {
      const events = [
        new Event({
          title: 'London Trip',
          type: 'division',
          location: 'London',
          startDate: '2025-05-12',
          endDate: '2025-05-16',
          isFixed: true
        }),
        new Event({
          title: 'Paris other',
          type: 'other',
          location: 'Paris',
          startDate: '2025-05-14',
          endDate: '2025-05-16',
          isFixed: true
        })
      ];

      const conflicts = ScoringEngine.detectConflicts(events, []);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('double-booking');
      expect(conflicts[0].message).toContain('Double-booked');
      expect(conflicts[0].message).toContain('London Trip');
      expect(conflicts[0].message).toContain('Paris other');
    });

    it('should not report duplicate double-booking', () => {
      const events = [
        new Event({
          id: 'event-1',
          title: 'Trip A',
          type: 'division',
          location: 'London',
          startDate: '2025-05-12',
          isFixed: true
        }),
        new Event({
          id: 'event-2',
          title: 'Trip B',
          type: 'division',
          location: 'Paris',
          startDate: '2025-05-12',
          isFixed: true
        })
      ];

      const conflicts = ScoringEngine.detectConflicts(events, []);

      expect(conflicts).toHaveLength(1); // Only one conflict, not two
    });

    it('should detect partial overlap conflicts', () => {
      const events = [
        new Event({
          title: 'Week 1',
          type: 'division',
          location: 'London',
          startDate: '2025-05-12',
          endDate: '2025-05-15',
          isFixed: true
        }),
        new Event({
          title: 'Week 2',
          type: 'other',
          location: 'Paris',
          startDate: '2025-05-14', // Overlaps by 2 days
          endDate: '2025-05-18',
          isFixed: true
        })
      ];

      const conflicts = ScoringEngine.detectConflicts(events, []);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('double-booking');
    });

    it('should not detect conflict for consecutive weeks', () => {
      const events = [
        new Event({
          title: 'Week 1',
          type: 'division',
          location: 'London',
          startDate: '2025-05-12',
          endDate: '2025-05-16',
          isFixed: true
        }),
        new Event({
          title: 'Week 2',
          type: 'other',
          location: 'Paris',
          startDate: '2025-05-19', // Next Monday, no overlap
          endDate: '2025-05-23',
          isFixed: true
        })
      ];

      const conflicts = ScoringEngine.detectConflicts(events, []);

      expect(conflicts).toHaveLength(0);
    });

    it('should detect multiple constraint conflicts', () => {
      const events = [
        new Event({
          title: 'Trip',
          type: 'division',
          location: 'London',
          startDate: '2025-07-14',
          endDate: '2025-07-18',
          isFixed: true
        })
      ];

      const constraints = [
        new Constraint({
          title: 'Vacation',
          type: 'vacation',
          startDate: '2025-07-14',
          endDate: '2025-07-18'
        }),
        new Constraint({
          title: 'Holiday',
          type: 'holiday',
          startDate: '2025-07-17'
        })
      ];

      const conflicts = ScoringEngine.detectConflicts(events, constraints);

      expect(conflicts).toHaveLength(2); // One for each constraint
      expect(conflicts.every(c => c.type === 'hard-constraint')).toBe(true);
    });

    it('should handle flexible trips (no endDate)', () => {
      const events = [
        new Event({
          title: 'Flexible Trip',
          type: 'division',
          location: 'London',
          startDate: '2025-05-12', // Monday only
          isFixed: false
        })
      ];

      const constraints = [
        new Constraint({
          title: 'Holiday',
          type: 'holiday',
          startDate: '2025-05-12'
        })
      ];

      const conflicts = ScoringEngine.detectConflicts(events, constraints);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('hard-constraint');
    });

    it('should ignore soft constraints in conflict detection', () => {
      const events = [
        new Event({
          title: 'Trip',
          type: 'division',
          location: 'London',
          startDate: '2025-06-16',
          endDate: '2025-06-20',
          isFixed: true
        })
      ];

      const constraints = [
        new Constraint({
          title: 'Kids Camp',
          type: 'preference', // Soft constraint
          startDate: '2025-06-16',
          endDate: '2025-06-20'
        })
      ];

      const conflicts = ScoringEngine.detectConflicts(events, constraints);

      expect(conflicts).toHaveLength(0); // Soft constraints don't create conflicts
    });
  });

  describe('getSuggestionsForQuarter', () => {
    it('should return top 3 weeks for Q1', () => {
      const suggestions = ScoringEngine.getSuggestionsForQuarter(1, 2025, 'London', [], []);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.length).toBeLessThanOrEqual(3);
      expect(suggestions[0]).toHaveProperty('iso');
      expect(suggestions[0]).toHaveProperty('score');
      expect(suggestions[0].score).toBeGreaterThan(-500);
    });

    it('should return top 3 weeks for Q2', () => {
      const suggestions = ScoringEngine.getSuggestionsForQuarter(2, 2025, 'Austin', [], []);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should sort suggestions by score descending', () => {
      const suggestions = ScoringEngine.getSuggestionsForQuarter(1, 2025, 'Paris', [], []);

      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].score).toBeGreaterThanOrEqual(suggestions[i].score);
      }
    });

    it('should exclude weeks with hard constraints', () => {
      const constraints = [
        new Constraint({
          title: 'Vacation',
          type: 'vacation',
          startDate: '2025-06-16',
          endDate: '2025-06-20'
        })
      ];

      const suggestions = ScoringEngine.getSuggestionsForQuarter(2, 2025, 'Austin', [], constraints);

      // No suggestion should be for the vacation week (Jun 16 is a Monday)
      const vacationWeek = suggestions.find(s => s.iso === '2025-06-16');
      expect(vacationWeek).toBeUndefined();
    });

    it('should prioritize consolidation opportunities', () => {
      const events = [
        new Event({
          title: 'Existing London Trip',
          type: 'pi',
          location: 'London',
          startDate: '2025-04-14', // Monday in Q2
          endDate: '2025-04-18',
          isFixed: true
        })
      ];

      const suggestions = ScoringEngine.getSuggestionsForQuarter(2, 2025, 'London', events, []);

      // The week with existing London trip should have high score
      const consolidationWeek = suggestions.find(s => s.iso === '2025-04-14');
      if (consolidationWeek) {
        expect(consolidationWeek.score).toBe(600); // 100 + 500 consolidation bonus
        expect(consolidationWeek.action).toBe('consolidate');
      }
    });

    it('should filter out weeks below -500 score', () => {
      const constraints = [
        // Block all of Q3 with hard constraints
        new Constraint({ title: 'July', type: 'vacation', startDate: '2025-07-01', endDate: '2025-07-31' }),
        new Constraint({ title: 'August', type: 'vacation', startDate: '2025-08-01', endDate: '2025-08-31' }),
        new Constraint({ title: 'September', type: 'vacation', startDate: '2025-09-01', endDate: '2025-09-30' })
      ];

      const suggestions = ScoringEngine.getSuggestionsForQuarter(3, 2025, 'London', [], constraints);

      // Should return empty or very few suggestions (all weeks blocked)
      expect(suggestions.every(s => s.score > -500)).toBe(true);
    });

    it('should throw error for invalid quarter ID', () => {
      expect(() => {
        ScoringEngine.getSuggestionsForQuarter(5, 2025, 'London', [], []);
      }).toThrow('Invalid quarter ID: 5');
    });

    it('should include date, iso, score, reasons, and action', () => {
      const suggestions = ScoringEngine.getSuggestionsForQuarter(1, 2025, 'Berlin', [], []);

      suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('date');
        expect(suggestion).toHaveProperty('iso');
        expect(suggestion).toHaveProperty('score');
        expect(suggestion).toHaveProperty('reasons');
        expect(suggestion).toHaveProperty('action');
        expect(typeof suggestion.iso).toBe('string');
        expect(typeof suggestion.score).toBe('number');
        expect(Array.isArray(suggestion.reasons)).toBe(true);
      });
    });
  });

  describe('findConsolidationOpportunities', () => {
    it('should find weeks with same-location events', () => {
      const events = [
        new Event({
          title: 'London Division',
          type: 'division',
          location: 'London',
          startDate: '2025-03-17',
          isFixed: false
        }),
        new Event({
          title: 'London GTS',
          type: 'gts',
          location: 'London',
          startDate: '2025-03-17',
          isFixed: false
        })
      ];

      const opportunities = ScoringEngine.findConsolidationOpportunities(events);

      expect(opportunities).toHaveLength(1);
      expect(opportunities[0].week).toBe('2025-03-17');
      expect(opportunities[0].location).toBe('London');
      expect(opportunities[0].events).toHaveLength(2);
    });

    it('should not find opportunities for different locations', () => {
      const events = [
        new Event({
          title: 'London Trip',
          type: 'division',
          location: 'London',
          startDate: '2025-03-17',
          isFixed: false
        }),
        new Event({
          title: 'Paris Trip',
          type: 'other',
          location: 'Paris',
          startDate: '2025-03-17',
          isFixed: false
        })
      ];

      const opportunities = ScoringEngine.findConsolidationOpportunities(events);

      expect(opportunities).toHaveLength(0);
    });

    it('should handle weeks with single event', () => {
      const events = [
        new Event({
          title: 'Lone Trip',
          type: 'division',
          location: 'Berlin',
          startDate: '2025-05-12',
          isFixed: false
        })
      ];

      const opportunities = ScoringEngine.findConsolidationOpportunities(events);

      expect(opportunities).toHaveLength(0);
    });

    it('should handle empty events array', () => {
      const opportunities = ScoringEngine.findConsolidationOpportunities([]);
      expect(opportunities).toHaveLength(0);
    });

    it('should match locations case-insensitively', () => {
      const events = [
        new Event({
          title: 'Trip 1',
          type: 'division',
          location: 'LONDON',
          startDate: '2025-04-14',
          isFixed: false
        }),
        new Event({
          title: 'Trip 2',
          type: 'gts',
          location: 'london',
          startDate: '2025-04-14',
          isFixed: false
        })
      ];

      const opportunities = ScoringEngine.findConsolidationOpportunities(events);

      expect(opportunities).toHaveLength(1);
    });

    it('should handle multiple weeks with opportunities', () => {
      const events = [
        new Event({
          title: 'Week 1 London A',
          type: 'division',
          location: 'London',
          startDate: '2025-03-17',
          isFixed: false
        }),
        new Event({
          title: 'Week 1 London B',
          type: 'gts',
          location: 'London',
          startDate: '2025-03-17',
          isFixed: false
        }),
        new Event({
          title: 'Week 2 Paris A',
          type: 'other',
          location: 'Paris',
          startDate: '2025-04-14',
          isFixed: false
        }),
        new Event({
          title: 'Week 2 Paris B',
          type: 'division',
          location: 'Paris',
          startDate: '2025-04-14',
          isFixed: false
        })
      ];

      const opportunities = ScoringEngine.findConsolidationOpportunities(events);

      expect(opportunities).toHaveLength(2);
    });
  });
});
