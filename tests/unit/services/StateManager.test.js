import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Event } from '../../../js/models/Event.js';
import { Constraint } from '../../../js/models/Constraint.js';

describe('StateManager', () => {
  let StateManager;
  let EventBus;

  beforeEach(async () => {
    vi.resetModules(); // Clear module cache to get fresh singleton
    global.localStorage.clear();

    // Import fresh instances
    const smModule = await import('../../../js/services/StateManager.js');
    const ebModule = await import('../../../js/utils/EventBus.js');

    StateManager = smModule.default;
    EventBus = ebModule.default;
  });

  describe('Initialization', () => {
    it('should have default state', () => {
      const state = StateManager.getState();

      // Note: year is not persisted - it's UI navigation state only
      expect(state.events).toEqual([]);
      expect(state.constraints).toEqual([]);
    });

    it('should load from localStorage if exists', async () => {
      const savedState = {
        events: [{
          id: 'test-1',
          title: 'Test Event',
          type: 'division',
          location: 'London',
          startDate: '2026-03-16',
          endDate: null,
          duration: 1,
          isFixed: false
        }],
        constraints: [{
          id: 'test-c1',
          title: 'Test Constraint',
          type: 'vacation',
          startDate: '2026-07-01',
          endDate: '2026-07-05'
        }],
        eventTypeConfigs: {
          division: {
            label: 'Division',
            color: '#3b82f6',
            colorDark: '#60a5fa',
            isHardStop: false
          }
        },
        constraintTypeConfigs: {
          vacation: {
            label: 'Vacation',
            color: '#ef4444',
            colorDark: '#f87171',
            isHardStop: true
          }
        },
        customLocations: []
      };

      global.localStorage.setItem('travelPlannerState', JSON.stringify(savedState));

      // Re-import to trigger load()
      vi.resetModules();
      const module = await import('../../../js/services/StateManager.js');
      const SM = module.default;

      const state = SM.getState();
      expect(state.events).toHaveLength(1);
      expect(state.events[0].title).toBe('Test Event');
      expect(state.constraints).toHaveLength(1);
      expect(state.constraints[0].title).toBe('Test Constraint');
    });

    it('should handle corrupted localStorage gracefully', async () => {
      global.localStorage.setItem('travelPlannerState', 'invalid JSON{{{');

      // Should not throw, should use default state
      vi.resetModules();
      const module = await import('../../../js/services/StateManager.js');
      const SM = module.default;

      const state = SM.getState();
      expect(state.events).toEqual([]);
    });

    it('should handle missing localStorage data', () => {
      const state = StateManager.getState();

      expect(state.events).toEqual([]);
      expect(state.constraints).toEqual([]);
    });
  });

  describe('Year Management', () => {
    it('should get year', () => {
      expect(StateManager.getYear()).toBe(2025);
    });

    it('should set year', () => {
      StateManager.setYear(2026);
      expect(StateManager.getYear()).toBe(2026);
    });

    it('should NOT persist year to localStorage (UI state only)', () => {
      StateManager.setYear(2027);

      const storedData = global.localStorage.getItem('travelPlannerState');
      if (storedData) {
        const stored = JSON.parse(storedData);
        expect(stored.year).toBeUndefined();
      }
      // If no data in localStorage yet, that's fine - year doesn't trigger persist
    });

    it('should emit year:changed event when year changes', () => {
      const yearChangedCallback = vi.fn();

      EventBus.on('year:changed', yearChangedCallback);

      StateManager.setYear(2028);

      expect(yearChangedCallback).toHaveBeenCalledWith(2028);
    });
  });

  describe('Event Management', () => {
    it('should add event and persist to localStorage', () => {
      const eventData = {
        title: 'New Event',
        type: 'division',
        location: 'Paris',
        startDate: '2025-05-12',
        isFixed: false
      };

      StateManager.addEvent(eventData);

      const state = StateManager.getState();
      expect(state.events).toHaveLength(1);
      expect(state.events[0].title).toBe('New Event');

      // Check localStorage
      const stored = JSON.parse(global.localStorage.getItem('travelPlannerState'));
      expect(stored.events).toHaveLength(1);
    });

    it('should accept Event instance', () => {
      const event = new Event({
        title: 'Event Instance',
        type: 'gts',
        location: 'Austin',
        startDate: '2025-06-02',
        isFixed: false
      });

      StateManager.addEvent(event);

      const events = StateManager.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('Event Instance');
    });

    it('should emit events when adding event', () => {
      const eventAddedCallback = vi.fn();
      const stateChangedCallback = vi.fn();

      EventBus.on('event:added', eventAddedCallback);
      EventBus.on('state:changed', stateChangedCallback);

      const eventData = {
        title: 'Test Event',
        type: 'division',
        location: 'London',
        startDate: '2025-07-14',
        isFixed: false
      };

      StateManager.addEvent(eventData);

      expect(eventAddedCallback).toHaveBeenCalledTimes(1);
      expect(eventAddedCallback).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Test Event' })
      );
      expect(stateChangedCallback).toHaveBeenCalledTimes(1);
    });

    it('should get all events', () => {
      StateManager.addEvent({
        title: 'Event 1',
        type: 'division',
        location: 'London',
        startDate: '2025-05-12',
        isFixed: false
      });

      StateManager.addEvent({
        title: 'Event 2',
        type: 'gts',
        location: 'Austin',
        startDate: '2025-06-02',
        isFixed: false
      });

      const events = StateManager.getEvents();
      expect(events).toHaveLength(2);
      expect(events[0].title).toBe('Event 1');
      expect(events[1].title).toBe('Event 2');
    });

    it('should get event by ID', () => {
      const event = new Event({
        title: 'Find Me',
        type: 'division',
        location: 'Berlin',
        startDate: '2025-08-11',
        isFixed: false
      });

      StateManager.addEvent(event);

      const found = StateManager.getEvent(event.id);
      expect(found).not.toBeNull();
      expect(found.title).toBe('Find Me');
      expect(found.id).toBe(event.id);
    });

    it('should return null for non-existent event ID', () => {
      const found = StateManager.getEvent('non-existent-id');
      expect(found).toBeNull();
    });

    it('should update event', () => {
      const event = new Event({
        title: 'Original',
        type: 'division',
        location: 'London',
        startDate: '2025-05-12',
        isFixed: false
      });

      StateManager.addEvent(event);
      const id = event.id;

      StateManager.updateEvent(id, { title: 'Updated', location: 'Paris' });

      const updated = StateManager.getEvent(id);
      expect(updated.title).toBe('Updated');
      expect(updated.location).toBe('Paris');
      expect(updated.type).toBe('division'); // Unchanged
    });

    it('should emit events when updating event', () => {
      const eventUpdatedCallback = vi.fn();
      const stateChangedCallback = vi.fn();

      EventBus.on('event:updated', eventUpdatedCallback);
      EventBus.on('state:changed', stateChangedCallback);

      const event = new Event({
        title: 'Test',
        type: 'division',
        location: 'Tokyo',
        startDate: '2025-09-08',
        isFixed: false
      });

      StateManager.addEvent(event);

      // Clear previous calls from addEvent
      eventUpdatedCallback.mockClear();
      stateChangedCallback.mockClear();

      StateManager.updateEvent(event.id, { title: 'Modified' });

      expect(eventUpdatedCallback).toHaveBeenCalledTimes(1);
      expect(eventUpdatedCallback).toHaveBeenCalledWith(
        expect.objectContaining({ id: event.id })
      );
      expect(stateChangedCallback).toHaveBeenCalledTimes(1);
    });

    it('should throw error when updating non-existent event', () => {
      expect(() => {
        StateManager.updateEvent('fake-id', { title: 'New' });
      }).toThrow('Event not found: fake-id');
    });

    it('should delete event', () => {
      const event = new Event({
        title: 'To Delete',
        type: 'division',
        location: 'Berlin',
        startDate: '2025-08-11',
        isFixed: false
      });

      StateManager.addEvent(event);
      const id = event.id;

      StateManager.deleteEvent(id);

      const state = StateManager.getState();
      expect(state.events).toHaveLength(0);
      expect(StateManager.getEvent(id)).toBeNull();
    });

    it('should emit events when deleting event', () => {
      const eventDeletedCallback = vi.fn();
      const stateChangedCallback = vi.fn();

      EventBus.on('event:deleted', eventDeletedCallback);
      EventBus.on('state:changed', stateChangedCallback);

      const event = new Event({
        title: 'Delete Me',
        type: 'division',
        location: 'NYC',
        startDate: '2025-10-06',
        isFixed: false
      });

      StateManager.addEvent(event);

      // Clear previous calls from addEvent
      eventDeletedCallback.mockClear();
      stateChangedCallback.mockClear();

      StateManager.deleteEvent(event.id);

      expect(eventDeletedCallback).toHaveBeenCalledWith(event.id);
      expect(stateChangedCallback).toHaveBeenCalledTimes(1);
    });

    it('should handle delete of non-existent event gracefully', () => {
      // Should not throw
      expect(() => {
        StateManager.deleteEvent('non-existent-id');
      }).not.toThrow();
    });
  });

  describe('Constraint Management', () => {
    it('should add constraint and persist to localStorage', () => {
      const constraintData = {
        title: 'Summer Vacation',
        type: 'vacation',
        startDate: '2025-07-14',
        endDate: '2025-07-18'
      };

      StateManager.addConstraint(constraintData);

      const state = StateManager.getState();
      expect(state.constraints).toHaveLength(1);
      expect(state.constraints[0].title).toBe('Summer Vacation');

      // Check localStorage
      const stored = JSON.parse(global.localStorage.getItem('travelPlannerState'));
      expect(stored.constraints).toHaveLength(1);
    });

    it('should accept Constraint instance', () => {
      const constraint = new Constraint({
        title: 'Holiday',
        type: 'holiday',
        startDate: '2025-12-25'
      });

      StateManager.addConstraint(constraint);

      const constraints = StateManager.getConstraints();
      expect(constraints).toHaveLength(1);
      expect(constraints[0].title).toBe('Holiday');
    });

    it('should emit events when adding constraint', () => {
      const constraintAddedCallback = vi.fn();
      const stateChangedCallback = vi.fn();

      EventBus.on('constraint:added', constraintAddedCallback);
      EventBus.on('state:changed', stateChangedCallback);

      const constraintData = {
        title: 'Test Constraint',
        type: 'preference',
        startDate: '2025-09-01',
        endDate: '2025-09-05'
      };

      StateManager.addConstraint(constraintData);

      expect(constraintAddedCallback).toHaveBeenCalledTimes(1);
      expect(constraintAddedCallback).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Test Constraint' })
      );
      expect(stateChangedCallback).toHaveBeenCalledTimes(1);
    });

    it('should get all constraints', () => {
      StateManager.addConstraint({
        title: 'Vacation',
        type: 'vacation',
        startDate: '2025-07-14',
        endDate: '2025-07-18'
      });

      StateManager.addConstraint({
        title: 'Holiday',
        type: 'holiday',
        startDate: '2025-12-25'
      });

      const constraints = StateManager.getConstraints();
      expect(constraints).toHaveLength(2);
      expect(constraints[0].title).toBe('Vacation');
      expect(constraints[1].title).toBe('Holiday');
    });

    it('should get constraint by ID', () => {
      const constraint = new Constraint({
        title: 'Find Me',
        type: 'blackout',
        startDate: '2025-12-24',
        endDate: '2025-12-31'
      });

      StateManager.addConstraint(constraint);

      const found = StateManager.getConstraint(constraint.id);
      expect(found).not.toBeNull();
      expect(found.title).toBe('Find Me');
      expect(found.id).toBe(constraint.id);
    });

    it('should return null for non-existent constraint ID', () => {
      const found = StateManager.getConstraint('non-existent-id');
      expect(found).toBeNull();
    });

    it('should update constraint', () => {
      const constraint = new Constraint({
        title: 'Original',
        type: 'vacation',
        startDate: '2025-08-01',
        endDate: '2025-08-05'
      });

      StateManager.addConstraint(constraint);
      const id = constraint.id;

      StateManager.updateConstraint(id, { title: 'Updated' });

      const updated = StateManager.getConstraint(id);
      expect(updated.title).toBe('Updated');
      expect(updated.type).toBe('vacation'); // Unchanged
    });

    it('should emit events when updating constraint', () => {
      const constraintUpdatedCallback = vi.fn();
      const stateChangedCallback = vi.fn();

      EventBus.on('constraint:updated', constraintUpdatedCallback);
      EventBus.on('state:changed', stateChangedCallback);

      const constraint = new Constraint({
        title: 'Test',
        type: 'preference',
        startDate: '2025-11-03'
      });

      StateManager.addConstraint(constraint);

      // Clear previous calls from addConstraint
      constraintUpdatedCallback.mockClear();
      stateChangedCallback.mockClear();

      StateManager.updateConstraint(constraint.id, { title: 'Modified' });

      expect(constraintUpdatedCallback).toHaveBeenCalledTimes(1);
      expect(stateChangedCallback).toHaveBeenCalledTimes(1);
    });

    it('should throw error when updating non-existent constraint', () => {
      expect(() => {
        StateManager.updateConstraint('fake-id', { title: 'New' });
      }).toThrow('Constraint not found: fake-id');
    });

    it('should delete constraint', () => {
      const constraint = new Constraint({
        title: 'To Delete',
        type: 'vacation',
        startDate: '2025-06-01',
        endDate: '2025-06-05'
      });

      StateManager.addConstraint(constraint);
      const id = constraint.id;

      StateManager.deleteConstraint(id);

      const state = StateManager.getState();
      expect(state.constraints).toHaveLength(0);
      expect(StateManager.getConstraint(id)).toBeNull();
    });

    it('should emit events when deleting constraint', () => {
      const constraintDeletedCallback = vi.fn();
      const stateChangedCallback = vi.fn();

      EventBus.on('constraint:deleted', constraintDeletedCallback);
      EventBus.on('state:changed', stateChangedCallback);

      const constraint = new Constraint({
        title: 'Delete Me',
        type: 'holiday',
        startDate: '2025-07-04'
      });

      StateManager.addConstraint(constraint);

      // Clear previous calls from addConstraint
      constraintDeletedCallback.mockClear();
      stateChangedCallback.mockClear();

      StateManager.deleteConstraint(constraint.id);

      expect(constraintDeletedCallback).toHaveBeenCalledWith(constraint.id);
      expect(stateChangedCallback).toHaveBeenCalledTimes(1);
    });

    it('should handle delete of non-existent constraint gracefully', () => {
      // Should not throw
      expect(() => {
        StateManager.deleteConstraint('non-existent-id');
      }).not.toThrow();
    });
  });

  describe('Bulk Operations', () => {
    it('should import state', () => {
      const importData = {
        events: [
          {
            title: 'Imported Event',
            type: 'division',
            location: 'London',
            startDate: '2026-03-16',
            isFixed: false
          }
        ],
        constraints: [
          {
            title: 'Imported Constraint',
            type: 'vacation',
            startDate: '2026-07-01',
            endDate: '2026-07-05'
          }
        ],
        eventTypeConfigs: {},
        constraintTypeConfigs: {},
        customLocations: []
      };

      StateManager.importState(importData);

      const state = StateManager.getState();
      expect(state.events).toHaveLength(1);
      expect(state.events[0].title).toBe('Imported Event');
      expect(state.constraints).toHaveLength(1);
      expect(state.constraints[0].title).toBe('Imported Constraint');
    });

    it('should emit events when importing state', () => {
      const stateImportedCallback = vi.fn();
      const stateChangedCallback = vi.fn();

      EventBus.on('state:imported', stateImportedCallback);
      EventBus.on('state:changed', stateChangedCallback);

      StateManager.importState({
        events: [],
        constraints: [],
        eventTypeConfigs: {},
        constraintTypeConfigs: {},
        customLocations: []
      });

      expect(stateImportedCallback).toHaveBeenCalledTimes(1);
      expect(stateChangedCallback).toHaveBeenCalledTimes(1);
    });

    it('should handle partial import data', () => {
      StateManager.importState({
        events: [],
        constraints: []
        // type configs and locations omitted - should use defaults
      });

      const state = StateManager.getState();
      expect(state.events).toEqual([]);
      expect(state.constraints).toEqual([]);
    });

    it('should clear all data', () => {
      // Add some data first
      StateManager.addEvent({
        title: 'Event',
        type: 'division',
        location: 'London',
        startDate: '2025-05-12',
        isFixed: false
      });

      StateManager.addConstraint({
        title: 'Constraint',
        type: 'vacation',
        startDate: '2025-07-14',
        endDate: '2025-07-18'
      });

      StateManager.clearAll();

      const state = StateManager.getState();
      expect(state.events).toEqual([]);
      expect(state.constraints).toEqual([]);
    });

    it('should emit events when clearing all', () => {
      const stateClearedCallback = vi.fn();
      const stateChangedCallback = vi.fn();

      EventBus.on('state:cleared', stateClearedCallback);
      EventBus.on('state:changed', stateChangedCallback);

      StateManager.clearAll();

      expect(stateClearedCallback).toHaveBeenCalledTimes(1);
      expect(stateChangedCallback).toHaveBeenCalledTimes(1);
    });

    it('should persist cleared state to localStorage', () => {
      StateManager.addEvent({
        title: 'Event',
        type: 'division',
        location: 'Paris',
        startDate: '2025-05-12',
        isFixed: false
      });

      StateManager.clearAll();

      const stored = JSON.parse(global.localStorage.getItem('travelPlannerState'));
      expect(stored.events).toEqual([]);
      expect(stored.constraints).toEqual([]);
    });
  });

  describe('State Immutability', () => {
    it('should return immutable copy from getState', () => {
      StateManager.addEvent({
        title: 'Original',
        type: 'division',
        location: 'London',
        startDate: '2025-05-12',
        isFixed: false
      });

      const state1 = StateManager.getState();
      const state2 = StateManager.getState();

      expect(state1).not.toBe(state2); // Different objects
      expect(state1).toEqual(state2); // But same content
    });

    it('should not allow direct mutation of state', () => {
      const state = StateManager.getState();
      state.events.push({ title: 'Hacked' });

      const freshState = StateManager.getState();
      expect(freshState.events).toHaveLength(0); // Original state unchanged
    });
  });
});
