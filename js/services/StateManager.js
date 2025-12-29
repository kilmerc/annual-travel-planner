/**
 * StateManager - Centralized state management with localStorage persistence
 *
 * Single source of truth for application state.
 * Emits events via EventBus when state changes.
 */

import EventBus from '../utils/EventBus.js';
import { Event } from '../models/Event.js';
import { Constraint } from '../models/Constraint.js';
import { DEFAULT_EVENT_TYPE_CONFIGS, DEFAULT_CONSTRAINT_TYPE_CONFIGS } from '../config/calendarConfig.js';
import ToastService from './ToastService.js';

class StateManager {
    #state = {
        year: 2025,
        events: [],
        constraints: [],
        eventTypeConfigs: { ...DEFAULT_EVENT_TYPE_CONFIGS },
        constraintTypeConfigs: { ...DEFAULT_CONSTRAINT_TYPE_CONFIGS },
        customLocations: [] // Array of custom location strings
    };

    #storageKey = 'travelPlannerState';

    constructor() {
        this.load();
    }

    /**
     * Get current state (immutable copy)
     * @returns {object} State object
     */
    getState() {
        return {
            year: this.#state.year,
            events: this.#state.events.map(e => e.toJSON ? e.toJSON() : e),
            constraints: this.#state.constraints.map(c => c.toJSON ? c.toJSON() : c),
            eventTypeConfigs: { ...this.#state.eventTypeConfigs },
            constraintTypeConfigs: { ...this.#state.constraintTypeConfigs },
            customLocations: [...this.#state.customLocations]
        };
    }

    /**
     * Get year
     * @returns {number} Calendar year
     */
    getYear() {
        return this.#state.year;
    }

    /**
     * Set year
     * @param {number} year - Calendar year
     */
    setYear(year) {
        this.#state.year = year;
        this.#persist();
        EventBus.emit('state:changed', this.getState());
        EventBus.emit('year:changed', year);
    }

    /**
     * Get all events
     * @returns {Array} Events array
     */
    getEvents() {
        return this.#state.events.map(e => e.toJSON ? e.toJSON() : e);
    }

    /**
     * Get event by ID
     * @param {string} id - Event ID
     * @returns {object|null} Event or null
     */
    getEvent(id) {
        const event = this.#state.events.find(e => e.id === id);
        return event ? (event.toJSON ? event.toJSON() : event) : null;
    }

    /**
     * Add event
     * @param {object|Event} eventData - Event data or Event instance
     */
    addEvent(eventData) {
        const event = eventData instanceof Event ? eventData : new Event(eventData);
        this.#state.events.push(event);
        this.#persist();
        EventBus.emit('event:added', event.toJSON());
        EventBus.emit('state:changed', this.getState());
    }

    /**
     * Update event
     * @param {string} id - Event ID
     * @param {object} updates - Event updates
     */
    updateEvent(id, updates) {
        const index = this.#state.events.findIndex(e => e.id === id);
        if (index === -1) {
            throw new Error(`Event not found: ${id}`);
        }

        const oldEvent = this.#state.events[index];
        const newEventData = { ...oldEvent.toJSON(), ...updates, id };
        this.#state.events[index] = new Event(newEventData);

        this.#persist();
        EventBus.emit('event:updated', { id, updates });
        EventBus.emit('state:changed', this.getState());
    }

    /**
     * Delete event
     * @param {string} id - Event ID
     */
    deleteEvent(id) {
        const index = this.#state.events.findIndex(e => e.id === id);
        if (index === -1) {
            console.warn(`Event not found: ${id}`);
            return;
        }

        this.#state.events.splice(index, 1);
        this.#persist();
        EventBus.emit('event:deleted', id);
        EventBus.emit('state:changed', this.getState());
    }

    /**
     * Get all constraints
     * @returns {Array} Constraints array
     */
    getConstraints() {
        return this.#state.constraints.map(c => c.toJSON ? c.toJSON() : c);
    }

    /**
     * Get constraint by ID
     * @param {string} id - Constraint ID
     * @returns {object|null} Constraint or null
     */
    getConstraint(id) {
        const constraint = this.#state.constraints.find(c => c.id === id);
        return constraint ? (constraint.toJSON ? constraint.toJSON() : constraint) : null;
    }

    /**
     * Add constraint
     * @param {object|Constraint} constraintData - Constraint data or Constraint instance
     */
    addConstraint(constraintData) {
        const constraint = constraintData instanceof Constraint ? constraintData : new Constraint(constraintData);
        this.#state.constraints.push(constraint);
        this.#persist();
        EventBus.emit('constraint:added', constraint.toJSON());
        EventBus.emit('state:changed', this.getState());
    }

    /**
     * Update constraint
     * @param {string} id - Constraint ID
     * @param {object} updates - Constraint updates
     */
    updateConstraint(id, updates) {
        const index = this.#state.constraints.findIndex(c => c.id === id);
        if (index === -1) {
            throw new Error(`Constraint not found: ${id}`);
        }

        const oldConstraint = this.#state.constraints[index];
        const newConstraintData = { ...oldConstraint.toJSON(), ...updates, id };
        this.#state.constraints[index] = new Constraint(newConstraintData);

        this.#persist();
        EventBus.emit('constraint:updated', { id, updates });
        EventBus.emit('state:changed', this.getState());
    }

    /**
     * Delete constraint
     * @param {string} id - Constraint ID
     */
    deleteConstraint(id) {
        const index = this.#state.constraints.findIndex(c => c.id === id);
        if (index === -1) {
            console.warn(`Constraint not found: ${id}`);
            return;
        }

        this.#state.constraints.splice(index, 1);
        this.#persist();
        EventBus.emit('constraint:deleted', id);
        EventBus.emit('state:changed', this.getState());
    }

    /**
     * Import state from JSON
     * @param {object} data - State data
     */
    importState(data) {
        this.#state.year = data.year || 2025;

        this.#state.events = (data.events || []).map(e => new Event(e));
        this.#state.constraints = (data.constraints || []).map(c => new Constraint(c));
        this.#state.eventTypeConfigs = data.eventTypeConfigs || { ...DEFAULT_EVENT_TYPE_CONFIGS };
        this.#state.constraintTypeConfigs = data.constraintTypeConfigs || { ...DEFAULT_CONSTRAINT_TYPE_CONFIGS };
        this.#state.customLocations = data.customLocations || [];

        this.#persist();
        EventBus.emit('state:imported', this.getState());
        EventBus.emit('state:changed', this.getState());
    }

    /**
     * Clear all data
     */
    clearAll() {
        this.#state.events = [];
        this.#state.constraints = [];
        this.#state.eventTypeConfigs = { ...DEFAULT_EVENT_TYPE_CONFIGS };
        this.#state.constraintTypeConfigs = { ...DEFAULT_CONSTRAINT_TYPE_CONFIGS };
        this.#state.customLocations = [];
        this.#persist();
        EventBus.emit('state:cleared');
        EventBus.emit('state:changed', this.getState());
    }

    /**
     * Load state from localStorage
     */
    load() {
        try {
            const stored = localStorage.getItem(this.#storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                this.#state.year = data.year || 2025;

                // Convert plain objects to model instances
                this.#state.events = (data.events || []).map(e =>
                    e instanceof Event ? e : new Event(e)
                );
                this.#state.constraints = (data.constraints || []).map(c =>
                    c instanceof Constraint ? c : new Constraint(c)
                );

                // Load type configurations
                this.#state.eventTypeConfigs = data.eventTypeConfigs || { ...DEFAULT_EVENT_TYPE_CONFIGS };
                this.#state.constraintTypeConfigs = data.constraintTypeConfigs || { ...DEFAULT_CONSTRAINT_TYPE_CONFIGS };
                this.#state.customLocations = data.customLocations || [];
            }
        } catch (error) {
            console.error('Error loading state from localStorage:', error);
            // Keep default state
        }
    }

    /**
     * Get event type configuration
     * @param {string} typeId - Type ID
     * @returns {object|null} Type config or null
     */
    getEventTypeConfig(typeId) {
        return this.#state.eventTypeConfigs[typeId] || null;
    }

    /**
     * Get all event type configurations
     * @returns {object} All event type configs
     */
    getAllEventTypeConfigs() {
        return { ...this.#state.eventTypeConfigs };
    }

    /**
     * Add or update event type configuration
     * @param {string} typeId - Type ID
     * @param {object} config - Type configuration (label, color, colorDark, isHardStop)
     */
    setEventTypeConfig(typeId, config) {
        this.#state.eventTypeConfigs[typeId] = {
            ...config,
            isBuiltIn: this.#state.eventTypeConfigs[typeId]?.isBuiltIn || false
        };
        this.#persist();
        EventBus.emit('type:updated', { kind: 'event', typeId, config });
        EventBus.emit('state:changed', this.getState());
    }

    /**
     * Delete event type and handle events with that type
     * @param {string} typeId - Type ID
     * @param {string} action - 'archive' or 'delete'
     */
    deleteEventType(typeId, action = 'archive') {
        // Check if this is a built-in type
        if (this.#state.eventTypeConfigs[typeId]?.isBuiltIn) {
            throw new Error('Cannot delete built-in event types');
        }

        // Find all events with this type
        const eventsWithType = this.#state.events.filter(e => e.type === typeId);

        if (action === 'archive') {
            // Archive all events with this type
            eventsWithType.forEach(event => {
                event.archived = true;
            });
        } else if (action === 'delete') {
            // Delete all events with this type
            this.#state.events = this.#state.events.filter(e => e.type !== typeId);
        }

        // Delete the type configuration
        delete this.#state.eventTypeConfigs[typeId];

        this.#persist();
        EventBus.emit('type:deleted', { kind: 'event', typeId, action });
        EventBus.emit('state:changed', this.getState());
    }

    /**
     * Get constraint type configuration
     * @param {string} typeId - Type ID
     * @returns {object|null} Type config or null
     */
    getConstraintTypeConfig(typeId) {
        return this.#state.constraintTypeConfigs[typeId] || null;
    }

    /**
     * Get all constraint type configurations
     * @returns {object} All constraint type configs
     */
    getAllConstraintTypeConfigs() {
        return { ...this.#state.constraintTypeConfigs };
    }

    /**
     * Add or update constraint type configuration
     * @param {string} typeId - Type ID
     * @param {object} config - Type configuration (label, color, colorDark, isHardStop)
     */
    setConstraintTypeConfig(typeId, config) {
        this.#state.constraintTypeConfigs[typeId] = {
            ...config,
            isBuiltIn: this.#state.constraintTypeConfigs[typeId]?.isBuiltIn || false
        };
        this.#persist();
        EventBus.emit('type:updated', { kind: 'constraint', typeId, config });
        EventBus.emit('state:changed', this.getState());
    }

    /**
     * Delete constraint type
     * @param {string} typeId - Type ID
     */
    deleteConstraintType(typeId) {
        // Check if this is a built-in type
        if (this.#state.constraintTypeConfigs[typeId]?.isBuiltIn) {
            throw new Error('Cannot delete built-in constraint types');
        }

        // Delete all constraints with this type
        this.#state.constraints = this.#state.constraints.filter(c => c.type !== typeId);

        // Delete the type configuration
        delete this.#state.constraintTypeConfigs[typeId];

        this.#persist();
        EventBus.emit('type:deleted', { kind: 'constraint', typeId });
        EventBus.emit('state:changed', this.getState());
    }

    /**
     * Get all locations (built-in + custom)
     * @returns {Array} All locations
     */
    getAllLocations() {
        return [...this.#state.customLocations];
    }

    /**
     * Add custom location
     * @param {string} location - Location name
     */
    addCustomLocation(location) {
        const trimmed = location.trim();
        if (trimmed && !this.#state.customLocations.includes(trimmed)) {
            this.#state.customLocations.push(trimmed);
            this.#state.customLocations.sort();
            this.#persist();
            EventBus.emit('location:added', trimmed);
            EventBus.emit('state:changed', this.getState());
        }
    }

    /**
     * Delete custom location
     * @param {string} location - Location name
     */
    deleteCustomLocation(location) {
        const index = this.#state.customLocations.indexOf(location);
        if (index > -1) {
            this.#state.customLocations.splice(index, 1);
            this.#persist();
            EventBus.emit('location:deleted', location);
            EventBus.emit('state:changed', this.getState());
        }
    }

    /**
     * Archive events by ID
     * @param {Array<string>} eventIds - Array of event IDs to archive
     */
    archiveEvents(eventIds) {
        eventIds.forEach(id => {
            const event = this.#state.events.find(e => e.id === id);
            if (event) {
                event.archived = true;
            }
        });
        this.#persist();
        EventBus.emit('events:archived', eventIds);
        EventBus.emit('state:changed', this.getState());
    }

    /**
     * Persist state to localStorage
     * @private
     */
    #persist() {
        try {
            const data = this.getState();
            localStorage.setItem(this.#storageKey, JSON.stringify(data));
            ToastService.info('Saved', 1000);
        } catch (error) {
            console.error('Error saving state to localStorage:', error);
            ToastService.error('Failed to save', 2000);
        }
    }
}

// Export singleton instance
export default new StateManager();
