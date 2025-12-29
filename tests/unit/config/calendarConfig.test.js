import { describe, it, expect } from 'vitest';
import {
  QUARTERS,
  MONTH_NAMES,
  MONTH_NAMES_FULL,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  CONSTRAINT_TYPES,
  CONSTRAINT_TYPE_LABELS,
  HARD_CONSTRAINT_TYPES,
  getQuarterForMonth
} from '../../../js/config/calendarConfig.js';

describe('calendarConfig', () => {
  describe('QUARTERS', () => {
    it('should have 4 quarters', () => {
      expect(QUARTERS).toHaveLength(4);
    });

    it('should have correct quarter structure', () => {
      QUARTERS.forEach(quarter => {
        expect(quarter).toHaveProperty('id');
        expect(quarter).toHaveProperty('name');
        expect(quarter).toHaveProperty('months');
        expect(quarter).toHaveProperty('label');
      });
    });

    it('should have sequential quarter IDs', () => {
      expect(QUARTERS[0].id).toBe(1);
      expect(QUARTERS[1].id).toBe(2);
      expect(QUARTERS[2].id).toBe(3);
      expect(QUARTERS[3].id).toBe(4);
    });

    it('should have correct quarter names', () => {
      expect(QUARTERS[0].name).toBe('Q1');
      expect(QUARTERS[1].name).toBe('Q2');
      expect(QUARTERS[2].name).toBe('Q3');
      expect(QUARTERS[3].name).toBe('Q4');
    });

    it('should have correct months for Q1', () => {
      expect(QUARTERS[0].months).toEqual([0, 1, 2]); // Jan, Feb, Mar
      expect(QUARTERS[0].label).toBe('Jan - Mar');
    });

    it('should have correct months for Q2', () => {
      expect(QUARTERS[1].months).toEqual([3, 4, 5]); // Apr, May, Jun
      expect(QUARTERS[1].label).toBe('Apr - Jun');
    });

    it('should have correct months for Q3', () => {
      expect(QUARTERS[2].months).toEqual([6, 7, 8]); // Jul, Aug, Sep
      expect(QUARTERS[2].label).toBe('Jul - Sep');
    });

    it('should have correct months for Q4', () => {
      expect(QUARTERS[3].months).toEqual([9, 10, 11]); // Oct, Nov, Dec
      expect(QUARTERS[3].label).toBe('Oct - Dec');
    });

    it('should cover all 12 months', () => {
      const allMonths = QUARTERS.flatMap(q => q.months).sort((a, b) => a - b);
      expect(allMonths).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(QUARTERS)).toBe(true);
    });
  });

  describe('MONTH_NAMES', () => {
    it('should have 12 months', () => {
      expect(MONTH_NAMES).toHaveLength(12);
    });

    it('should have correct short month names', () => {
      expect(MONTH_NAMES[0]).toBe('Jan');
      expect(MONTH_NAMES[1]).toBe('Feb');
      expect(MONTH_NAMES[2]).toBe('Mar');
      expect(MONTH_NAMES[3]).toBe('Apr');
      expect(MONTH_NAMES[4]).toBe('May');
      expect(MONTH_NAMES[5]).toBe('Jun');
      expect(MONTH_NAMES[6]).toBe('Jul');
      expect(MONTH_NAMES[7]).toBe('Aug');
      expect(MONTH_NAMES[8]).toBe('Sep');
      expect(MONTH_NAMES[9]).toBe('Oct');
      expect(MONTH_NAMES[10]).toBe('Nov');
      expect(MONTH_NAMES[11]).toBe('Dec');
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(MONTH_NAMES)).toBe(true);
    });
  });

  describe('MONTH_NAMES_FULL', () => {
    it('should have 12 months', () => {
      expect(MONTH_NAMES_FULL).toHaveLength(12);
    });

    it('should have correct full month names', () => {
      expect(MONTH_NAMES_FULL[0]).toBe('January');
      expect(MONTH_NAMES_FULL[1]).toBe('February');
      expect(MONTH_NAMES_FULL[2]).toBe('March');
      expect(MONTH_NAMES_FULL[3]).toBe('April');
      expect(MONTH_NAMES_FULL[4]).toBe('May');
      expect(MONTH_NAMES_FULL[5]).toBe('June');
      expect(MONTH_NAMES_FULL[6]).toBe('July');
      expect(MONTH_NAMES_FULL[7]).toBe('August');
      expect(MONTH_NAMES_FULL[8]).toBe('September');
      expect(MONTH_NAMES_FULL[9]).toBe('October');
      expect(MONTH_NAMES_FULL[10]).toBe('November');
      expect(MONTH_NAMES_FULL[11]).toBe('December');
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(MONTH_NAMES_FULL)).toBe(true);
    });
  });

  describe('EVENT_TYPES', () => {
    it('should have all event types', () => {
      expect(EVENT_TYPES.DIVISION).toBe('division');
      expect(EVENT_TYPES.GTS).toBe('gts');
      expect(EVENT_TYPES.PI).toBe('pi');
      expect(EVENT_TYPES.BP).toBe('bp');
      expect(EVENT_TYPES.OTHER).toBe('other');
    });

    it('should have 5 event types', () => {
      const keys = Object.keys(EVENT_TYPES);
      expect(keys).toHaveLength(5);
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(EVENT_TYPES)).toBe(true);
    });
  });

  describe('EVENT_TYPE_LABELS', () => {
    it('should have labels for all event types', () => {
      expect(EVENT_TYPE_LABELS.division).toBe('Division Visit');
      expect(EVENT_TYPE_LABELS.gts).toBe('GTS All-Hands');
      expect(EVENT_TYPE_LABELS.pi).toBe('PI Planning');
      expect(EVENT_TYPE_LABELS.bp).toBe('BP Team Meeting');
      expect(EVENT_TYPE_LABELS.other).toBe('Other Business');
    });

    it('should have matching keys with EVENT_TYPES values', () => {
      Object.values(EVENT_TYPES).forEach(type => {
        expect(EVENT_TYPE_LABELS).toHaveProperty(type);
      });
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(EVENT_TYPE_LABELS)).toBe(true);
    });
  });

  describe('CONSTRAINT_TYPES', () => {
    it('should have all constraint types', () => {
      expect(CONSTRAINT_TYPES.VACATION).toBe('vacation');
      expect(CONSTRAINT_TYPES.HOLIDAY).toBe('holiday');
      expect(CONSTRAINT_TYPES.BLACKOUT).toBe('blackout');
      expect(CONSTRAINT_TYPES.PREFERENCE).toBe('preference');
    });

    it('should have 4 constraint types', () => {
      const keys = Object.keys(CONSTRAINT_TYPES);
      expect(keys).toHaveLength(4);
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(CONSTRAINT_TYPES)).toBe(true);
    });
  });

  describe('CONSTRAINT_TYPE_LABELS', () => {
    it('should have labels for all constraint types', () => {
      expect(CONSTRAINT_TYPE_LABELS.vacation).toBe('Personal Vacation (Hard Stop)');
      expect(CONSTRAINT_TYPE_LABELS.holiday).toBe('Company Holiday (Hard Stop)');
      expect(CONSTRAINT_TYPE_LABELS.blackout).toBe('Business Blackout (Hard Stop)');
      expect(CONSTRAINT_TYPE_LABELS.preference).toBe('Prefer No Travel (Soft)');
    });

    it('should have matching keys with CONSTRAINT_TYPES values', () => {
      Object.values(CONSTRAINT_TYPES).forEach(type => {
        expect(CONSTRAINT_TYPE_LABELS).toHaveProperty(type);
      });
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(CONSTRAINT_TYPE_LABELS)).toBe(true);
    });
  });

  describe('HARD_CONSTRAINT_TYPES', () => {
    it('should contain vacation, holiday, and blackout', () => {
      expect(HARD_CONSTRAINT_TYPES).toContain('vacation');
      expect(HARD_CONSTRAINT_TYPES).toContain('holiday');
      expect(HARD_CONSTRAINT_TYPES).toContain('blackout');
    });

    it('should have exactly 3 hard constraint types', () => {
      expect(HARD_CONSTRAINT_TYPES).toHaveLength(3);
    });

    it('should not contain preference (soft constraint)', () => {
      expect(HARD_CONSTRAINT_TYPES).not.toContain('preference');
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(HARD_CONSTRAINT_TYPES)).toBe(true);
    });
  });

  describe('getQuarterForMonth', () => {
    it('should return Q1 for January (0)', () => {
      const quarter = getQuarterForMonth(0);
      expect(quarter.id).toBe(1);
      expect(quarter.name).toBe('Q1');
    });

    it('should return Q1 for February (1)', () => {
      const quarter = getQuarterForMonth(1);
      expect(quarter.id).toBe(1);
    });

    it('should return Q1 for March (2)', () => {
      const quarter = getQuarterForMonth(2);
      expect(quarter.id).toBe(1);
    });

    it('should return Q2 for April (3)', () => {
      const quarter = getQuarterForMonth(3);
      expect(quarter.id).toBe(2);
      expect(quarter.name).toBe('Q2');
    });

    it('should return Q2 for May (4)', () => {
      const quarter = getQuarterForMonth(4);
      expect(quarter.id).toBe(2);
    });

    it('should return Q2 for June (5)', () => {
      const quarter = getQuarterForMonth(5);
      expect(quarter.id).toBe(2);
    });

    it('should return Q3 for July (6)', () => {
      const quarter = getQuarterForMonth(6);
      expect(quarter.id).toBe(3);
      expect(quarter.name).toBe('Q3');
    });

    it('should return Q3 for August (7)', () => {
      const quarter = getQuarterForMonth(7);
      expect(quarter.id).toBe(3);
    });

    it('should return Q3 for September (8)', () => {
      const quarter = getQuarterForMonth(8);
      expect(quarter.id).toBe(3);
    });

    it('should return Q4 for October (9)', () => {
      const quarter = getQuarterForMonth(9);
      expect(quarter.id).toBe(4);
      expect(quarter.name).toBe('Q4');
    });

    it('should return Q4 for November (10)', () => {
      const quarter = getQuarterForMonth(10);
      expect(quarter.id).toBe(4);
    });

    it('should return Q4 for December (11)', () => {
      const quarter = getQuarterForMonth(11);
      expect(quarter.id).toBe(4);
    });

    it('should return undefined for invalid month index', () => {
      expect(getQuarterForMonth(-1)).toBeUndefined();
      expect(getQuarterForMonth(12)).toBeUndefined();
      expect(getQuarterForMonth(99)).toBeUndefined();
    });

    it('should return complete quarter object', () => {
      const quarter = getQuarterForMonth(0);

      expect(quarter).toHaveProperty('id');
      expect(quarter).toHaveProperty('name');
      expect(quarter).toHaveProperty('months');
      expect(quarter).toHaveProperty('label');
    });
  });

  describe('Configuration Consistency', () => {
    it('should have consistent event type constants', () => {
      const typeKeys = Object.keys(EVENT_TYPES);
      const labelKeys = Object.keys(EVENT_TYPE_LABELS);

      // All EVENT_TYPES values should have corresponding labels
      Object.values(EVENT_TYPES).forEach(typeValue => {
        expect(labelKeys).toContain(typeValue);
      });
    });

    it('should have consistent constraint type constants', () => {
      const typeKeys = Object.keys(CONSTRAINT_TYPES);
      const labelKeys = Object.keys(CONSTRAINT_TYPE_LABELS);

      // All CONSTRAINT_TYPES values should have corresponding labels
      Object.values(CONSTRAINT_TYPES).forEach(typeValue => {
        expect(labelKeys).toContain(typeValue);
      });
    });

    it('should have hard constraints as subset of all constraints', () => {
      const allConstraintTypes = Object.values(CONSTRAINT_TYPES);

      HARD_CONSTRAINT_TYPES.forEach(hardType => {
        expect(allConstraintTypes).toContain(hardType);
      });
    });

    it('should have matching month names length', () => {
      expect(MONTH_NAMES.length).toBe(MONTH_NAMES_FULL.length);
      expect(MONTH_NAMES.length).toBe(12);
    });
  });
});
