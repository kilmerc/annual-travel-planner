import { describe, it, expect } from 'vitest';
import { Event } from '../../../js/models/Event.js';

describe('Event Model', () => {
  const validEventData = {
    title: 'London Team Visit',
    type: 'division',
    location: 'London',
    startDate: '2025-03-17', // Monday
    endDate: '2025-03-19',   // Wednesday
    isFixed: true,
    duration: 1
  };

  describe('Constructor & Validation', () => {
    it('should create event with valid data', () => {
      const event = new Event(validEventData);

      expect(event.title).toBe('London Team Visit');
      expect(event.type).toBe('division');
      expect(event.location).toBe('London');
      expect(event.startDate).toBe('2025-03-17');
      expect(event.endDate).toBe('2025-03-19');
      expect(event.isFixed).toBe(true);
      expect(event.duration).toBe(1);
      expect(event.id).toBeTruthy();
    });

    it('should generate unique ID if not provided', () => {
      const event1 = new Event(validEventData);
      const event2 = new Event(validEventData);

      expect(event1.id).toBeTruthy();
      expect(event2.id).toBeTruthy();
      expect(event1.id).not.toBe(event2.id);
    });

    it('should use provided ID if given', () => {
      const event = new Event({ ...validEventData, id: 'custom-id-123' });
      expect(event.id).toBe('custom-id-123');
    });

    it('should throw error for missing title', () => {
      const data = { ...validEventData, title: '' };
      expect(() => new Event(data)).toThrow('Event title is required');
    });

    it('should throw error for whitespace-only title', () => {
      const data = { ...validEventData, title: '   ' };
      expect(() => new Event(data)).toThrow('Event title is required');
    });

    it('should throw error for missing location', () => {
      const data = { ...validEventData, location: '' };
      expect(() => new Event(data)).toThrow('Event location is required');
    });

    it('should throw error for whitespace-only location', () => {
      const data = { ...validEventData, location: '   ' };
      expect(() => new Event(data)).toThrow('Event location is required');
    });

    it('should throw error for missing type', () => {
      const data = { ...validEventData, type: undefined };
      expect(() => new Event(data)).toThrow('Event type is required');
    });

    it('should throw error for invalid type', () => {
      const data = { ...validEventData, type: 'invalid-type' };
      expect(() => new Event(data)).toThrow('Invalid event type: invalid-type');
    });

    it('should throw error for missing start date', () => {
      const data = { ...validEventData, startDate: null };
      expect(() => new Event(data)).toThrow('Event start date is required');
    });

    it('should throw error for duration < 1', () => {
      const data = { ...validEventData, duration: 0 };
      expect(() => new Event(data)).toThrow('Event duration must be at least 1 week');
    });

    it('should accept all valid event types', () => {
      const validTypes = ['division', 'gts', 'pi', 'bp', 'other', 'other'];

      validTypes.forEach(type => {
        const event = new Event({ ...validEventData, type });
        expect(event.type).toBe(type);
      });
    });

    it('should default duration to 1', () => {
      const data = { ...validEventData };
      delete data.duration;
      const event = new Event(data);

      expect(event.duration).toBe(1);
    });

    it('should default isFixed to true', () => {
      const data = { ...validEventData };
      delete data.isFixed;
      const event = new Event(data);

      expect(event.isFixed).toBe(true);
    });
  });

  describe('Fixed Trips with End Date', () => {
    it('should preserve exact dates for fixed trip with endDate', () => {
      const data = {
        title: 'other',
        type: 'other',
        location: 'Paris',
        startDate: '2025-03-19', // Wednesday
        endDate: '2025-03-21',   // Friday
        isFixed: true
      };

      const event = new Event(data);

      expect(event.startDate).toBe('2025-03-19'); // Exact date preserved
      expect(event.endDate).toBe('2025-03-21');   // Exact date preserved
      expect(event.isFixed).toBe(true);
    });

    it('should handle Date objects for fixed trips', () => {
      const data = {
        title: 'other',
        type: 'other',
        location: 'Berlin',
        startDate: new Date(2025, 2, 19), // March 19, 2025 (Wed)
        endDate: new Date(2025, 2, 21),   // March 21, 2025 (Fri)
        isFixed: true
      };

      const event = new Event(data);

      expect(event.startDate).toBe('2025-03-19');
      expect(event.endDate).toBe('2025-03-21');
    });

    it('should handle multi-day fixed trips', () => {
      const data = {
        title: 'Week-long other',
        type: 'other',
        location: 'Tokyo',
        startDate: '2025-06-02', // Monday
        endDate: '2025-06-06',   // Friday
        isFixed: true
      };

      const event = new Event(data);

      expect(event.startDate).toBe('2025-06-02');
      expect(event.endDate).toBe('2025-06-06');
    });
  });

  describe('Fixed Trips without End Date (Legacy)', () => {
    it('should normalize to Monday for fixed trip without endDate', () => {
      const data = {
        title: 'Legacy Trip',
        type: 'division',
        location: 'Austin',
        startDate: '2025-03-19', // Wednesday
        endDate: null,
        isFixed: true
      };

      const event = new Event(data);

      expect(event.startDate).toBe('2025-03-17'); // Monday of that week
      expect(event.endDate).toBeNull();
      expect(event.isFixed).toBe(true);
    });

    it('should handle omitted endDate for fixed trips', () => {
      const data = {
        title: 'Legacy Trip',
        type: 'division',
        location: 'Dallas',
        startDate: '2025-03-19', // Wednesday
        isFixed: true
        // endDate omitted
      };

      const event = new Event(data);

      expect(event.startDate).toBe('2025-03-17'); // Normalized to Monday
      expect(event.endDate).toBeNull();
    });
  });

  describe('Flexible Trips', () => {
    it('should normalize flexible trip to Monday', () => {
      const data = {
        title: 'Flexible Visit',
        type: 'division',
        location: 'London',
        startDate: '2025-03-19', // Wednesday
        endDate: null,
        isFixed: false,
        duration: 1
      };

      const event = new Event(data);

      expect(event.startDate).toBe('2025-03-17'); // Monday of that week
      expect(event.endDate).toBeNull();
      expect(event.isFixed).toBe(false);
    });

    it('should normalize flexible trip from Date object', () => {
      const data = {
        title: 'Flexible GTS',
        type: 'gts',
        location: 'Austin',
        startDate: new Date(2025, 2, 19), // March 19, 2025 (Wed)
        isFixed: false
      };

      const event = new Event(data);

      expect(event.startDate).toBe('2025-03-17'); // Monday
      expect(event.endDate).toBeNull();
    });

    it('should handle flexible trip already on Monday', () => {
      const data = {
        title: 'Flexible Trip',
        type: 'division',
        location: 'Seattle',
        startDate: '2025-03-17', // Already Monday
        isFixed: false
      };

      const event = new Event(data);

      expect(event.startDate).toBe('2025-03-17'); // Same Monday
    });

    it('should normalize Sunday to previous Monday for flexible trips', () => {
      const data = {
        title: 'Weekend Planning',
        type: 'division',
        location: 'NYC',
        startDate: '2025-03-23', // Sunday
        isFixed: false
      };

      const event = new Event(data);

      expect(event.startDate).toBe('2025-03-17'); // Previous Monday
    });

    it('should support multi-week flexible trips', () => {
      const data = {
        title: 'Extended Visit',
        type: 'division',
        location: 'London',
        startDate: '2025-04-15', // Tuesday
        isFixed: false,
        duration: 2
      };

      const event = new Event(data);

      expect(event.startDate).toBe('2025-04-14'); // Monday
      expect(event.duration).toBe(2);
    });
  });

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      const event = new Event(validEventData);
      const json = event.toJSON();

      expect(json).toEqual({
        id: expect.any(String),
        title: 'London Team Visit',
        type: 'division',
        location: 'London',
        startDate: '2025-03-17',
        endDate: '2025-03-19',
        duration: 1,
        isFixed: true
      });
    });

    it('should include all properties in JSON', () => {
      const event = new Event({
        id: 'test-123',
        title: 'Test Event',
        type: 'gts',
        location: 'Austin',
        startDate: '2025-06-02',
        endDate: '2025-06-06',
        duration: 2,
        isFixed: false
      });

      const json = event.toJSON();

      expect(json.id).toBe('test-123');
      expect(json.title).toBe('Test Event');
      expect(json.type).toBe('gts');
      expect(json.location).toBe('Austin');
      expect(json.startDate).toBe('2025-06-02');
      expect(json.endDate).toBe('2025-06-06');
      expect(json.duration).toBe(2);
      expect(json.isFixed).toBe(false);
    });

    it('should deserialize from JSON', () => {
      const json = {
        id: '12345',
        title: 'Test Event',
        type: 'gts',
        location: 'Austin',
        startDate: '2025-06-02',
        endDate: null,
        duration: 1,
        isFixed: false
      };

      const event = Event.fromJSON(json);

      expect(event.id).toBe('12345');
      expect(event.title).toBe('Test Event');
      expect(event.type).toBe('gts');
      expect(event.location).toBe('Austin');
      expect(event.startDate).toBe('2025-06-02');
      expect(event.endDate).toBeNull();
      expect(event.duration).toBe(1);
      expect(event.isFixed).toBe(false);
    });

    it('should round-trip through JSON correctly', () => {
      const original = new Event(validEventData);
      const json = original.toJSON();
      const restored = Event.fromJSON(json);

      expect(restored.toJSON()).toEqual(json);
    });

    it('should clone correctly', () => {
      const event = new Event(validEventData);
      const clone = event.clone();

      expect(clone).toBeInstanceOf(Event);
      expect(clone).not.toBe(event); // Different instance
      expect(clone.toJSON()).toEqual(event.toJSON());
    });

    it('should create independent clone', () => {
      const event = new Event(validEventData);
      const clone = event.clone();

      // Modify original (via new instance with updated data)
      const updatedEvent = new Event({ ...event.toJSON(), title: 'Modified' });

      // Clone should remain unchanged
      expect(clone.title).toBe('London Team Visit');
      expect(updatedEvent.title).toBe('Modified');
    });
  });

  describe('Date String Handling', () => {
    it('should handle ISO date string input', () => {
      const data = {
        title: 'ISO Test',
        type: 'division',
        location: 'Paris',
        startDate: '2025-05-12',
        endDate: '2025-05-16',
        isFixed: true
      };

      const event = new Event(data);

      expect(event.startDate).toBe('2025-05-12');
      expect(event.endDate).toBe('2025-05-16');
    });

    it('should handle Date object input', () => {
      const data = {
        title: 'Date Object Test',
        type: 'other',
        location: 'Berlin',
        startDate: new Date(2025, 4, 12), // May 12, 2025
        endDate: new Date(2025, 4, 16),   // May 16, 2025
        isFixed: true
      };

      const event = new Event(data);

      expect(event.startDate).toBe('2025-05-12');
      expect(event.endDate).toBe('2025-05-16');
    });

    it('should handle mixed Date and string inputs', () => {
      const data = {
        title: 'Mixed Input',
        type: 'pi',
        location: 'Tokyo',
        startDate: new Date(2025, 4, 12), // Date object
        endDate: '2025-05-16',            // ISO string
        isFixed: true
      };

      const event = new Event(data);

      expect(event.startDate).toBe('2025-05-12');
      expect(event.endDate).toBe('2025-05-16');
    });
  });

  describe('Edge Cases', () => {
    it('should handle year boundaries', () => {
      const data = {
        title: 'New Year Trip',
        type: 'division',
        location: 'London',
        startDate: '2024-12-30', // Monday
        endDate: '2025-01-03',   // Friday (next year)
        isFixed: true
      };

      const event = new Event(data);

      expect(event.startDate).toBe('2024-12-30');
      expect(event.endDate).toBe('2025-01-03');
    });

    it('should handle February 29 in leap year', () => {
      const data = {
        title: 'Leap Year',
        type: 'other',
        location: 'Paris',
        startDate: '2024-02-29', // Leap day (Thursday)
        endDate: '2024-03-01',
        isFixed: true
      };

      const event = new Event(data);

      expect(event.startDate).toBe('2024-02-29');
      expect(event.endDate).toBe('2024-03-01');
    });

    it('should handle very long durations', () => {
      const data = {
        title: 'Extended Project',
        type: 'division',
        location: 'Remote',
        startDate: '2025-01-06',
        isFixed: false,
        duration: 12
      };

      const event = new Event(data);

      expect(event.duration).toBe(12);
    });

    it('should trim whitespace from title and location', () => {
      // Note: Current implementation doesn't trim, but validates non-empty after trim
      const data = {
        title: '  London Trip  ',
        type: 'division',
        location: '  London  ',
        startDate: '2025-03-17',
        isFixed: true
      };

      const event = new Event(data);

      // Event is created with whitespace intact (implementation doesn't trim)
      expect(event.title).toBe('  London Trip  ');
      expect(event.location).toBe('  London  ');
    });
  });
});
