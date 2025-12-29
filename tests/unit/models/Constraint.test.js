import { describe, it, expect } from 'vitest';
import { Constraint } from '../../../js/models/Constraint.js';

describe('Constraint Model', () => {
  const validConstraintData = {
    title: 'Summer Vacation',
    type: 'vacation',
    startDate: '2025-07-14',
    endDate: '2025-07-18'
  };

  describe('Constructor & Validation', () => {
    it('should create constraint with valid data', () => {
      const constraint = new Constraint(validConstraintData);

      expect(constraint.title).toBe('Summer Vacation');
      expect(constraint.type).toBe('vacation');
      expect(constraint.startDate).toBe('2025-07-14');
      expect(constraint.endDate).toBe('2025-07-18');
      expect(constraint.id).toBeTruthy();
    });

    it('should generate unique ID if not provided', () => {
      const constraint1 = new Constraint(validConstraintData);
      const constraint2 = new Constraint(validConstraintData);

      expect(constraint1.id).toBeTruthy();
      expect(constraint2.id).toBeTruthy();
      expect(constraint1.id).not.toBe(constraint2.id);
    });

    it('should use provided ID if given', () => {
      const constraint = new Constraint({ ...validConstraintData, id: 'custom-id-456' });
      expect(constraint.id).toBe('custom-id-456');
    });

    it('should throw error for missing title', () => {
      const data = { ...validConstraintData, title: '' };
      expect(() => new Constraint(data)).toThrow('Constraint title is required');
    });

    it('should throw error for whitespace-only title', () => {
      const data = { ...validConstraintData, title: '   ' };
      expect(() => new Constraint(data)).toThrow('Constraint title is required');
    });

    it('should throw error for missing type', () => {
      const data = { ...validConstraintData, type: undefined };
      expect(() => new Constraint(data)).toThrow('Constraint type is required');
    });

    it('should throw error for invalid type', () => {
      const data = { ...validConstraintData, type: 'invalid-type' };
      expect(() => new Constraint(data)).toThrow('Invalid constraint type: invalid-type');
    });

    it('should throw error for missing start date', () => {
      const data = { ...validConstraintData, startDate: null };
      expect(() => new Constraint(data)).toThrow('Constraint start date is required');
    });

    it('should accept all valid constraint types', () => {
      const validTypes = ['vacation', 'holiday', 'blackout', 'preference', 'preference'];

      validTypes.forEach(type => {
        const constraint = new Constraint({ ...validConstraintData, type });
        expect(constraint.type).toBe(type);
      });
    });

    it('should default endDate to startDate if not provided', () => {
      const data = {
        title: 'Single Day Holiday',
        type: 'holiday',
        startDate: '2025-12-25'
        // endDate omitted
      };

      const constraint = new Constraint(data);

      expect(constraint.startDate).toBe('2025-12-25');
      expect(constraint.endDate).toBe('2025-12-25'); // Same as startDate
    });

    it('should handle null endDate as startDate', () => {
      const data = {
        title: 'Single Day',
        type: 'holiday',
        startDate: '2025-12-25',
        endDate: null
      };

      const constraint = new Constraint(data);

      expect(constraint.endDate).toBe('2025-12-25');
    });
  });

  describe('Hard Constraints', () => {
    it('should identify vacation as hard constraint', () => {
      const constraint = new Constraint({
        title: 'Vacation',
        type: 'vacation',
        startDate: '2025-07-14',
        endDate: '2025-07-18'
      });

      expect(constraint.isHard()).toBe(true);
      expect(constraint.isSoft()).toBe(false);
    });

    it('should identify holiday as hard constraint', () => {
      const constraint = new Constraint({
        title: 'Christmas',
        type: 'holiday',
        startDate: '2025-12-25'
      });

      expect(constraint.isHard()).toBe(true);
      expect(constraint.isSoft()).toBe(false);
    });

    it('should identify blackout as hard constraint', () => {
      const constraint = new Constraint({
        title: 'Company Shutdown',
        type: 'blackout',
        startDate: '2025-12-24',
        endDate: '2025-12-31'
      });

      expect(constraint.isHard()).toBe(true);
      expect(constraint.isSoft()).toBe(false);
    });
  });

  describe('Soft Constraints', () => {
    it('should identify preference as soft constraint', () => {
      const constraint = new Constraint({
        title: 'Quarterly Review',
        type: 'preference',
        startDate: '2025-03-31'
      });

      expect(constraint.isSoft()).toBe(true);
      expect(constraint.isHard()).toBe(false);
    });

    it('should identify preference as soft constraint', () => {
      const constraint = new Constraint({
        title: 'Kids Summer Camp',
        type: 'preference',
        startDate: '2025-06-16',
        endDate: '2025-06-20'
      });

      expect(constraint.isSoft()).toBe(true);
      expect(constraint.isHard()).toBe(false);
    });
  });

  describe('Date Handling', () => {
    it('should handle ISO date string input', () => {
      const data = {
        title: 'ISO Test',
        type: 'vacation',
        startDate: '2025-08-04',
        endDate: '2025-08-08'
      };

      const constraint = new Constraint(data);

      expect(constraint.startDate).toBe('2025-08-04');
      expect(constraint.endDate).toBe('2025-08-08');
    });

    it('should handle Date object input', () => {
      const data = {
        title: 'Date Object Test',
        type: 'holiday',
        startDate: new Date(2025, 11, 25), // Dec 25, 2025
        endDate: new Date(2025, 11, 26)    // Dec 26, 2025
      };

      const constraint = new Constraint(data);

      expect(constraint.startDate).toBe('2025-12-25');
      expect(constraint.endDate).toBe('2025-12-26');
    });

    it('should handle mixed Date and string inputs', () => {
      const data = {
        title: 'Mixed Input',
        type: 'vacation',
        startDate: new Date(2025, 6, 14), // Date object
        endDate: '2025-07-18'             // ISO string
      };

      const constraint = new Constraint(data);

      expect(constraint.startDate).toBe('2025-07-14');
      expect(constraint.endDate).toBe('2025-07-18');
    });

    it('should handle single-day constraint', () => {
      const data = {
        title: 'Memorial Day',
        type: 'holiday',
        startDate: '2025-05-26',
        endDate: '2025-05-26'
      };

      const constraint = new Constraint(data);

      expect(constraint.startDate).toBe('2025-05-26');
      expect(constraint.endDate).toBe('2025-05-26');
    });

    it('should handle multi-day constraint', () => {
      const data = {
        title: 'Thanksgiving Week',
        type: 'holiday',
        startDate: '2025-11-24',
        endDate: '2025-11-28'
      };

      const constraint = new Constraint(data);

      expect(constraint.startDate).toBe('2025-11-24');
      expect(constraint.endDate).toBe('2025-11-28');
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      const constraint = new Constraint(validConstraintData);
      const json = constraint.toJSON();

      expect(json).toEqual({
        id: expect.any(String),
        title: 'Summer Vacation',
        type: 'vacation',
        startDate: '2025-07-14',
        endDate: '2025-07-18'
      });
    });

    it('should include all properties in JSON', () => {
      const constraint = new Constraint({
        id: 'test-789',
        title: 'Test Constraint',
        type: 'preference',
        startDate: '2025-09-01',
        endDate: '2025-09-05'
      });

      const json = constraint.toJSON();

      expect(json.id).toBe('test-789');
      expect(json.title).toBe('Test Constraint');
      expect(json.type).toBe('preference');
      expect(json.startDate).toBe('2025-09-01');
      expect(json.endDate).toBe('2025-09-05');
    });

    it('should deserialize from JSON', () => {
      const json = {
        id: '99999',
        title: 'Restored Constraint',
        type: 'blackout',
        startDate: '2025-12-20',
        endDate: '2025-12-31'
      };

      const constraint = Constraint.fromJSON(json);

      expect(constraint.id).toBe('99999');
      expect(constraint.title).toBe('Restored Constraint');
      expect(constraint.type).toBe('blackout');
      expect(constraint.startDate).toBe('2025-12-20');
      expect(constraint.endDate).toBe('2025-12-31');
      expect(constraint.isHard()).toBe(true);
    });

    it('should round-trip through JSON correctly', () => {
      const original = new Constraint(validConstraintData);
      const json = original.toJSON();
      const restored = Constraint.fromJSON(json);

      expect(restored.toJSON()).toEqual(json);
    });

    it('should clone correctly', () => {
      const constraint = new Constraint(validConstraintData);
      const clone = constraint.clone();

      expect(clone).toBeInstanceOf(Constraint);
      expect(clone).not.toBe(constraint); // Different instance
      expect(clone.toJSON()).toEqual(constraint.toJSON());
    });

    it('should create independent clone', () => {
      const constraint = new Constraint(validConstraintData);
      const clone = constraint.clone();

      // Modify original (via new instance)
      const updatedConstraint = new Constraint({ ...constraint.toJSON(), title: 'Modified' });

      // Clone should remain unchanged
      expect(clone.title).toBe('Summer Vacation');
      expect(updatedConstraint.title).toBe('Modified');
    });
  });

  describe('Edge Cases', () => {
    it('should handle year boundaries', () => {
      const data = {
        title: 'New Year Holiday',
        type: 'holiday',
        startDate: '2024-12-31',
        endDate: '2025-01-01'
      };

      const constraint = new Constraint(data);

      expect(constraint.startDate).toBe('2024-12-31');
      expect(constraint.endDate).toBe('2025-01-01');
    });

    it('should handle February 29 in leap year', () => {
      const data = {
        title: 'Leap Day',
        type: 'holiday',
        startDate: '2024-02-29',
        endDate: '2024-02-29'
      };

      const constraint = new Constraint(data);

      expect(constraint.startDate).toBe('2024-02-29');
      expect(constraint.endDate).toBe('2024-02-29');
    });

    it('should handle very long constraint periods', () => {
      const data = {
        title: 'Extended Leave',
        type: 'vacation',
        startDate: '2025-01-01',
        endDate: '2025-03-31' // 3 months
      };

      const constraint = new Constraint(data);

      expect(constraint.startDate).toBe('2025-01-01');
      expect(constraint.endDate).toBe('2025-03-31');
    });

    it('should handle constraints with only startDate', () => {
      const data = {
        title: 'Single Day Event',
        type: 'holiday',
        startDate: '2025-07-04'
        // No endDate provided
      };

      const constraint = new Constraint(data);

      expect(constraint.startDate).toBe('2025-07-04');
      expect(constraint.endDate).toBe('2025-07-04'); // Defaults to startDate
    });

    it('should preserve different hard constraint types', () => {
      const vacation = new Constraint({ title: 'V', type: 'vacation', startDate: '2025-01-01' });
      const holiday = new Constraint({ title: 'H', type: 'holiday', startDate: '2025-01-01' });
      const blackout = new Constraint({ title: 'B', type: 'blackout', startDate: '2025-01-01' });

      expect(vacation.isHard()).toBe(true);
      expect(holiday.isHard()).toBe(true);
      expect(blackout.isHard()).toBe(true);

      expect(vacation.type).toBe('vacation');
      expect(holiday.type).toBe('holiday');
      expect(blackout.type).toBe('blackout');
    });

    it('should preserve different soft constraint types', () => {
      const businessSoft = new Constraint({ title: 'BS', type: 'preference', startDate: '2025-01-01' });
      const preference = new Constraint({ title: 'P', type: 'preference', startDate: '2025-01-01' });

      expect(businessSoft.isSoft()).toBe(true);
      expect(preference.isSoft()).toBe(true);

      expect(businessSoft.type).toBe('preference');
      expect(preference.type).toBe('preference');
    });
  });

  describe('Type Classification', () => {
    it('should correctly classify all hard constraint types', () => {
      const hardTypes = ['vacation', 'holiday', 'blackout'];

      hardTypes.forEach(type => {
        const constraint = new Constraint({
          title: `Test ${type}`,
          type,
          startDate: '2025-01-01'
        });

        expect(constraint.isHard()).toBe(true);
        expect(constraint.isSoft()).toBe(false);
      });
    });

    it('should correctly classify all soft constraint types', () => {
      const softTypes = ['preference', 'preference'];

      softTypes.forEach(type => {
        const constraint = new Constraint({
          title: `Test ${type}`,
          type,
          startDate: '2025-01-01'
        });

        expect(constraint.isSoft()).toBe(true);
        expect(constraint.isHard()).toBe(false);
      });
    });

    it('should have mutually exclusive hard/soft classification', () => {
      const allTypes = ['vacation', 'holiday', 'blackout', 'preference', 'preference'];

      allTypes.forEach(type => {
        const constraint = new Constraint({
          title: `Test ${type}`,
          type,
          startDate: '2025-01-01'
        });

        // Constraint must be either hard OR soft, not both
        expect(constraint.isHard() !== constraint.isSoft()).toBe(true);
      });
    });
  });
});
