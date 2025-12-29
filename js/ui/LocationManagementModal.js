/**
 * LocationManagementModal - Modal for managing custom locations
 *
 * Lists all locations with options to:
 * - Add new custom locations
 * - Delete custom locations (built-in locations are protected)
 */

import EventBus from '../utils/EventBus.js';
import StateManager from '../services/StateManager.js';
import ToastService from '../services/ToastService.js';
import ConfirmDialog from '../services/ConfirmDialog.js';
import { BUILT_IN_LOCATIONS } from '../config/calendarConfig.js';

export class LocationManagementModal {
    #modalId = 'locationManagementModal';

    /**
     * Initialize modal
     */
    init() {
        this.#createModal();
        this.#setupEventListeners();

        // Listen for location management requests
        EventBus.on('manage-locations:open', () => this.open());

        // Listen for location updates to refresh the list
        EventBus.on('location:added', () => this.#refreshList());
        EventBus.on('location:deleted', () => this.#refreshList());
    }

    /**
     * Create modal HTML
     * @private
     */
    #createModal() {
        const modalHTML = `
            <div id="${this.#modalId}" class="modal fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center opacity-0 pointer-events-none">
                <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                    <div class="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <h3 class="font-bold text-lg text-slate-700 dark:text-slate-200">
                            <i class="fas fa-map-marker-alt mr-2"></i>
                            <span>Manage Locations</span>
                        </h3>
                        <button data-modal-close="${this.#modalId}" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="p-6">
                        <!-- Add Location Form -->
                        <div class="mb-6">
                            <label class="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Add New Location</label>
                            <div class="flex gap-2">
                                <input type="text" id="newLocationInput" class="flex-1 border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-200" placeholder="e.g. London, Singapore, Austin">
                                <button id="btnAddLocation" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition">
                                    <i class="fas fa-plus mr-2"></i>Add
                                </button>
                            </div>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Enter a city or location name</p>
                        </div>

                        <!-- Locations List -->
                        <div>
                            <label class="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Locations</label>
                            <div id="locationsList" class="space-y-2 max-h-96 overflow-y-auto">
                                <!-- Populated dynamically -->
                            </div>
                        </div>
                    </div>

                    <div class="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                        <button data-modal-close="${this.#modalId}" class="px-4 py-2 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 rounded font-medium transition">
                            Done
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    /**
     * Setup event listeners
     * @private
     */
    #setupEventListeners() {
        // Add location button
        document.getElementById('btnAddLocation')?.addEventListener('click', () => {
            this.#handleAddLocation();
        });

        // Enter key in input
        document.getElementById('newLocationInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.#handleAddLocation();
            }
        });

        // Modal close buttons
        document.addEventListener('click', (e) => {
            const closeBtn = e.target.closest(`[data-modal-close="${this.#modalId}"]`);
            if (closeBtn) {
                this.close();
            }
        });
    }

    /**
     * Handle adding a new location
     * @private
     */
    #handleAddLocation() {
        const input = document.getElementById('newLocationInput');
        const location = input.value.trim();

        if (!location) {
            ToastService.warning('Please enter a location name');
            return;
        }

        // Check if it's a built-in location
        if (BUILT_IN_LOCATIONS.includes(location.toUpperCase())) {
            ToastService.warning('This location is already a built-in division code');
            input.value = '';
            return;
        }

        // Check if it already exists in custom locations
        const customLocations = StateManager.getAllLocations();
        if (customLocations.includes(location)) {
            ToastService.warning('This location already exists');
            input.value = '';
            return;
        }

        // Add location
        StateManager.addCustomLocation(location);
        input.value = '';
        input.focus();
    }

    /**
     * Open modal
     */
    open() {
        this.#refreshList();
        this.#openModal();
    }

    /**
     * Refresh the locations list
     * @private
     */
    #refreshList() {
        const listEl = document.getElementById('locationsList');
        if (!listEl) return;

        listEl.innerHTML = '';

        // Get all locations
        const builtInLocations = Array.from(BUILT_IN_LOCATIONS);
        const customLocations = StateManager.getAllLocations();

        // Combine and sort
        const allLocations = [
            ...builtInLocations.map(loc => ({ value: loc, isBuiltIn: true })),
            ...customLocations.map(loc => ({ value: loc, isBuiltIn: false }))
        ].sort((a, b) => a.value.localeCompare(b.value));

        // Check if empty
        if (allLocations.length === 0) {
            listEl.innerHTML = `
                <div class="text-center py-8 text-slate-500 dark:text-slate-400">
                    <i class="fas fa-inbox text-4xl mb-3"></i>
                    <p>No locations defined yet.</p>
                    <p class="text-sm mt-1">Add your first location above.</p>
                </div>
            `;
            return;
        }

        // Render each location
        allLocations.forEach(location => {
            const item = this.#createLocationItem(location.value, location.isBuiltIn);
            listEl.appendChild(item);
        });
    }

    /**
     * Create a location list item
     * @private
     */
    #createLocationItem(location, isBuiltIn) {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-600';

        item.innerHTML = `
            <div class="flex items-center gap-3">
                <i class="fas fa-map-marker-alt text-slate-400"></i>
                <div>
                    <div class="font-medium text-slate-700 dark:text-slate-200">${location}</div>
                    ${isBuiltIn ? '<div class="text-xs text-amber-600 dark:text-amber-400">Built-in Division Code</div>' : ''}
                </div>
            </div>
            ${!isBuiltIn ? `
                <button class="btn-delete-location p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" data-location="${location}" title="Delete">
                    <i class="fas fa-trash-alt"></i>
                </button>
            ` : ''}
        `;

        // Delete button for custom locations
        const deleteBtn = item.querySelector('.btn-delete-location');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.#handleDeleteLocation(location);
            });
        }

        return item;
    }

    /**
     * Handle location deletion
     * @private
     */
    async #handleDeleteLocation(location) {
        // Check if there are events using this location
        const state = StateManager.getState();
        const eventsWithLocation = state.events.filter(e => e.location === location);

        if (eventsWithLocation.length > 0) {
            // Show conflict modal with options
            const result = await this.#showDeletionConflictModal(location, eventsWithLocation.length);

            if (result === 'archive') {
                // Archive all events with this location
                const eventIds = eventsWithLocation.map(e => e.id);
                StateManager.archiveEvents(eventIds);
                StateManager.deleteCustomLocation(location);
                ToastService.success(`Location "${location}" deleted and ${eventsWithLocation.length} event(s) archived`);
            } else if (result === 'delete') {
                // Delete all events with this location
                eventsWithLocation.forEach(event => {
                    StateManager.deleteEvent(event.id);
                });
                StateManager.deleteCustomLocation(location);
                ToastService.success(`Location "${location}" and ${eventsWithLocation.length} event(s) deleted`);
            }
            // If result is null/undefined, user cancelled
        } else {
            // No conflicts, delete directly
            const confirmed = await ConfirmDialog.show({
                title: 'Delete Location',
                message: `Are you sure you want to delete "${location}"? This cannot be undone.`,
                confirmText: 'Delete',
                isDangerous: true
            });
            if (confirmed) {
                StateManager.deleteCustomLocation(location);
                ToastService.success(`Location "${location}" deleted`);
            }
        }
    }

    /**
     * Show deletion conflict modal
     * @private
     */
    async #showDeletionConflictModal(location, eventCount) {
        return new Promise((resolve) => {
            const modalId = 'locationDeletionConflictModal';

            // Create temporary modal
            const modalHTML = `
                <div id="${modalId}" class="modal fixed inset-0 bg-black/50 z-[70] flex items-center justify-center">
                    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div class="bg-rose-50 dark:bg-rose-900/20 px-6 py-4 border-b border-rose-200 dark:border-rose-700 flex items-center gap-3">
                            <i class="fas fa-exclamation-triangle text-rose-600 dark:text-rose-400 text-xl"></i>
                            <h3 class="font-bold text-lg text-rose-700 dark:text-rose-300">
                                Location Deletion Conflict
                            </h3>
                        </div>

                        <div class="p-6">
                            <div class="text-sm text-slate-600 dark:text-slate-400 mb-6">
                                <p class="font-semibold mb-2">You are deleting the location "${location}".</p>
                                <p>There ${eventCount === 1 ? 'is' : 'are'} <strong>${eventCount}</strong> event${eventCount === 1 ? '' : 's'} using this location.</p>
                                <p class="mt-2">What would you like to do?</p>
                            </div>

                            <div class="space-y-3">
                                <!-- Archive Option -->
                                <button class="btn-archive-events w-full flex items-start gap-3 p-4 border-2 border-slate-300 dark:border-slate-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition group">
                                    <div class="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-800/60">
                                        <i class="fas fa-archive text-blue-600 dark:text-blue-400"></i>
                                    </div>
                                    <div class="text-left flex-1">
                                        <div class="font-semibold text-sm text-slate-700 dark:text-slate-200">Archive Events</div>
                                        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            Keep events but exclude from algorithm. Events will be greyed out and marked with an archive icon.
                                        </div>
                                    </div>
                                </button>

                                <!-- Delete All Option -->
                                <button class="btn-delete-all w-full flex items-start gap-3 p-4 border-2 border-slate-300 dark:border-slate-600 rounded-lg hover:border-red-500 dark:hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition group">
                                    <div class="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-800/60">
                                        <i class="fas fa-trash-alt text-red-600 dark:text-red-400"></i>
                                    </div>
                                    <div class="text-left flex-1">
                                        <div class="font-semibold text-sm text-slate-700 dark:text-slate-200">Delete All</div>
                                        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            Permanently delete the location and all associated events. This cannot be undone.
                                        </div>
                                    </div>
                                </button>

                                <!-- Cancel Option -->
                                <button class="btn-cancel w-full flex items-start gap-3 p-4 border-2 border-slate-300 dark:border-slate-600 rounded-lg hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition group">
                                    <div class="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-600">
                                        <i class="fas fa-times text-slate-600 dark:text-slate-400"></i>
                                    </div>
                                    <div class="text-left flex-1">
                                        <div class="font-semibold text-sm text-slate-700 dark:text-slate-200">Cancel</div>
                                        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            Keep the location and all events unchanged.
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
            const modal = document.getElementById(modalId);

            const cleanup = () => {
                modal.remove();
            };

            modal.querySelector('.btn-archive-events')?.addEventListener('click', () => {
                cleanup();
                resolve('archive');
            });

            modal.querySelector('.btn-delete-all')?.addEventListener('click', () => {
                cleanup();
                resolve('delete');
            });

            modal.querySelector('.btn-cancel')?.addEventListener('click', () => {
                cleanup();
                resolve(null);
            });
        });
    }

    /**
     * Open modal with animation
     * @private
     */
    #openModal() {
        const modal = document.getElementById(this.#modalId);
        if (!modal) return;

        modal.classList.remove('hidden', 'pointer-events-none');

        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.classList.add('opacity-100', 'pointer-events-auto');
        }, 10);
    }

    /**
     * Close modal with animation
     */
    close() {
        const modal = document.getElementById(this.#modalId);
        if (!modal) return;

        modal.classList.remove('opacity-100', 'pointer-events-auto');
        modal.classList.add('opacity-0', 'pointer-events-none');

        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

export default LocationManagementModal;
