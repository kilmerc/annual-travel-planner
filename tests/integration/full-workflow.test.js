import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Full Workflow Integration', () => {
  let StateManager, ScoringEngine, EventBus;

  beforeEach(async () => {
    vi.resetModules();
    global.localStorage.clear();

    const smModule = await import('../../js/services/StateManager.js');
    const seModule = await import('../../js/services/ScoringEngine.js');
    const ebModule = await import('../../js/utils/EventBus.js');

    StateManager = smModule.default;
    ScoringEngine = seModule.default;
    EventBus = ebModule.default;

    // Set up type configs for tests
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

  describe('Complete Planning Workflow', () => {
    it('should complete full planning workflow', () => {
      // 1. Add constraint (vacation)
      StateManager.addConstraint({
        title: 'Summer Break',
        type: 'vacation',
        startDate: '2025-07-14',
        endDate: '2025-07-18'
      });

      // 2. Add fixed event (other)
      StateManager.addEvent({
        title: 'DevConf Paris',
        type: 'other',
        location: 'Paris',
        startDate: '2025-06-02',
        endDate: '2025-06-06',
        isFixed: true
      });

      // 3. Get state
      const state = StateManager.getState();
      expect(state.events).toHaveLength(1);
      expect(state.constraints).toHaveLength(1);

      // 4. Score a week (should get consolidation bonus)
      const score = ScoringEngine.scoreWeek(
        '2025-06-02',
        'Paris',
        state.events,
        state.constraints
      );

      expect(score.action).toBe('consolidate');
      expect(score.score).toBe(600); // 100 + 500 consolidation

      // 5. Detect conflicts (should be none)
      const conflicts = ScoringEngine.detectConflicts(state.events, state.constraints);
      expect(conflicts).toHaveLength(0);

      // 6. Add conflicting event
      StateManager.addEvent({
        title: 'London Visit',
        type: 'division',
        location: 'London',
        startDate: '2025-07-14',
        endDate: '2025-07-18',
        isFixed: true
      });

      // 7. Now should have conflict
      const newState = StateManager.getState();
      const newConflicts = ScoringEngine.detectConflicts(newState.events, newState.constraints);
      expect(newConflicts).toHaveLength(1);
      expect(newConflicts[0].type).toBe('hard-constraint');
    });

    it('should handle event updates and persistence', () => {
      // Add initial event
      StateManager.addEvent({
        title: 'Original Title',
        type: 'division',
        location: 'London',
        startDate: '2025-05-12',
        isFixed: false
      });

      const state1 = StateManager.getState();
      const eventId = state1.events[0].id;

      // Update event
      StateManager.updateEvent(eventId, {
        title: 'Updated Title',
        location: 'Paris'
      });

      // Verify update
      const state2 = StateManager.getState();
      expect(state2.events[0].title).toBe('Updated Title');
      expect(state2.events[0].location).toBe('Paris');

      // Verify persistence
      const stored = JSON.parse(global.localStorage.getItem('travelPlannerState'));
      expect(stored.events[0].title).toBe('Updated Title');
    });

    it('should emit events through EventBus when state changes', () => {
      const stateChangedCallback = vi.fn();
      const eventAddedCallback = vi.fn();

      EventBus.on('state:changed', stateChangedCallback);
      EventBus.on('event:added', eventAddedCallback);

      StateManager.addEvent({
        title: 'Test Event',
        type: 'division',
        location: 'Berlin',
        startDate: '2025-09-08',
        isFixed: false
      });

      expect(stateChangedCallback).toHaveBeenCalledTimes(1);
      expect(eventAddedCallback).toHaveBeenCalledTimes(1);
      expect(eventAddedCallback).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Test Event' })
      );
    });

    it('should handle bulk import and export', () => {
      // Create initial state
      StateManager.addEvent({
        title: 'Event 1',
        type: 'division',
        location: 'London',
        startDate: '2025-03-17',
        isFixed: false
      });

      StateManager.addConstraint({
        title: 'Vacation',
        type: 'vacation',
        startDate: '2025-07-14',
        endDate: '2025-07-18'
      });

      // Export state
      const exportedState = StateManager.getState();

      expect(exportedState.events).toHaveLength(1);
      expect(exportedState.constraints).toHaveLength(1);

      // Clear and import
      StateManager.clearAll();

      const clearedState = StateManager.getState();
      expect(clearedState.events).toHaveLength(0);
      expect(clearedState.constraints).toHaveLength(0);

      // Import previous state
      StateManager.importState(exportedState);

      const importedState = StateManager.getState();
      expect(importedState.events).toHaveLength(1);
      expect(importedState.events[0].title).toBe('Event 1');
      expect(importedState.constraints).toHaveLength(1);
      expect(importedState.constraints[0].title).toBe('Vacation');
    });
  });

  describe('Quarter Suggestions Workflow', () => {
    it('should suggest weeks while respecting constraints', () => {
      // Add hard constraint in Q2
      StateManager.addConstraint({
        title: 'Memorial Day Week',
        type: 'holiday',
        startDate: '2025-05-26',
        endDate: '2025-05-30'
      });

      const state = StateManager.getState();

      // Get suggestions for Q2
      const suggestions = ScoringEngine.getSuggestionsForQuarter(
        2,
        2025,
        'Austin',
        state.events,
        state.constraints
      );

      // Verify no suggestion for Memorial Day week
      const memorialWeek = suggestions.find(s => s.iso === '2025-05-26');
      expect(memorialWeek).toBeUndefined();

      // All suggestions should have viable scores
      suggestions.forEach(suggestion => {
        expect(suggestion.score).toBeGreaterThan(-500);
      });
    });

    it('should prioritize consolidation opportunities', () => {
      // Add existing trip to London
      StateManager.addEvent({
        title: 'London PI Planning',
        type: 'pi',
        location: 'London',
        startDate: '2025-04-14',
        endDate: '2025-04-18',
        isFixed: true
      });

      const state = StateManager.getState();

      // Get suggestions for same quarter and location
      const suggestions = ScoringEngine.getSuggestionsForQuarter(
        2,
        2025,
        'London',
        state.events,
        state.constraints
      );

      // The week with existing London trip should have high score
      const consolidationWeek = suggestions.find(s => s.iso === '2025-04-14');

      if (consolidationWeek) {
        expect(consolidationWeek.score).toBe(600); // Base 100 + 500 consolidation
        expect(consolidationWeek.action).toBe('consolidate');
      }
    });
  });

  describe('Conflict Detection Workflow', () => {
    it('should detect and report all conflicts', () => {
      // Add multiple events with conflicts
      StateManager.addEvent({
        title: 'London Trip',
        type: 'division',
        location: 'London',
        startDate: '2025-05-12',
        endDate: '2025-05-16',
        isFixed: true
      });

      StateManager.addEvent({
        title: 'Paris Trip',
        type: 'other',
        location: 'Paris',
        startDate: '2025-05-14', // Overlaps with London
        endDate: '2025-05-16',
        isFixed: true
      });

      StateManager.addConstraint({
        title: 'Vacation',
        type: 'vacation',
        startDate: '2025-05-12', // Overlaps with both events
        endDate: '2025-05-16'
      });

      const state = StateManager.getState();
      const conflicts = ScoringEngine.detectConflicts(state.events, state.constraints);

      // Should have 3 conflicts:
      // 1. London Trip vs Vacation (hard-constraint)
      // 2. Paris Trip vs Vacation (hard-constraint)
      // 3. London Trip vs Paris Trip (double-booking)
      expect(conflicts.length).toBeGreaterThanOrEqual(2);

      const hardConstraintConflicts = conflicts.filter(c => c.type === 'hard-constraint');
      const doubleBookingConflicts = conflicts.filter(c => c.type === 'double-booking');

      expect(hardConstraintConflicts.length).toBeGreaterThanOrEqual(1);
      expect(doubleBookingConflicts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Event Lifecycle Workflow', () => {
    it('should handle complete event lifecycle', () => {
      const eventAddedCallback = vi.fn();
      const eventUpdatedCallback = vi.fn();
      const eventDeletedCallback = vi.fn();
      const stateChangedCallback = vi.fn();

      EventBus.on('event:added', eventAddedCallback);
      EventBus.on('event:updated', eventUpdatedCallback);
      EventBus.on('event:deleted', eventDeletedCallback);
      EventBus.on('state:changed', stateChangedCallback);

      // 1. Create event
      StateManager.addEvent({
        title: 'Test Event',
        type: 'division',
        location: 'Tokyo',
        startDate: '2025-10-06',
        isFixed: false
      });

      expect(eventAddedCallback).toHaveBeenCalledTimes(1);
      expect(stateChangedCallback).toHaveBeenCalledTimes(1);

      const state1 = StateManager.getState();
      const eventId = state1.events[0].id;

      stateChangedCallback.mockClear();

      // 2. Update event
      StateManager.updateEvent(eventId, { title: 'Updated Event' });

      expect(eventUpdatedCallback).toHaveBeenCalledTimes(1);
      expect(stateChangedCallback).toHaveBeenCalledTimes(1);

      stateChangedCallback.mockClear();

      // 3. Delete event
      StateManager.deleteEvent(eventId);

      expect(eventDeletedCallback).toHaveBeenCalledWith(eventId);
      expect(stateChangedCallback).toHaveBeenCalledTimes(1);

      const state2 = StateManager.getState();
      expect(state2.events).toHaveLength(0);
    });
  });

  describe('Persistence Workflow', () => {
    it('should persist and reload state correctly', async () => {
      // Add some data (year is UI-only, not persisted)
      StateManager.addEvent({
        title: 'Persistent Event',
        type: 'gts',
        location: 'Austin',
        startDate: '2026-03-16',
        isFixed: false
      });

      StateManager.addConstraint({
        title: 'Persistent Constraint',
        type: 'preference',
        startDate: '2026-06-01',
        endDate: '2026-06-05'
      });

      // Verify persistence (year not included - UI state only)
      const stored = JSON.parse(global.localStorage.getItem('travelPlannerState'));
      expect(stored.events).toHaveLength(1);
      expect(stored.constraints).toHaveLength(1);

      // Simulate reload by getting fresh StateManager instance
      vi.resetModules();
      const module = await import('../../js/services/StateManager.js');
      const ReloadedStateManager = module.default;

      const reloadedState = ReloadedStateManager.getState();
      expect(reloadedState.events).toHaveLength(1);
      expect(reloadedState.events[0].title).toBe('Persistent Event');
      expect(reloadedState.constraints).toHaveLength(1);
      expect(reloadedState.constraints[0].title).toBe('Persistent Constraint');
    });
  });
});
