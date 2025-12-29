/**
 * LocationManagementModal - Modal for managing custom locations
 *
 * Lists all locations with options to:
 * - Add new custom locations
 * - Delete custom locations (built-in locations are protected)
 */

import EventBus from '../utils/EventBus.js';
import StateManager from '../services/StateManager.js';
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
            alert('Please enter a location name');
            return;
        }

        // Check if it's a built-in location
        if (BUILT_IN_LOCATIONS.includes(location.toUpperCase())) {
            alert('This location is already a built-in division code');
            input.value = '';
            return;
        }

        // Check if it already exists in custom locations
        const customLocations = StateManager.getAllLocations();
        if (customLocations.includes(location)) {
            alert('This location already exists');
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
    #handleDeleteLocation(location) {
        if (confirm(`Delete location "${location}"? This cannot be undone.`)) {
            StateManager.deleteCustomLocation(location);
        }
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
