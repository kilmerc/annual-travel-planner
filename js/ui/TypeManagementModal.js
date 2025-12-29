/**
 * TypeManagementModal - Modal for managing event and constraint types
 *
 * Lists all types with options to:
 * - Add new types (opens TypeConfigModal)
 * - Edit existing types (opens TypeConfigModal)
 * - Delete types (opens TypeDeletionModal if conflicts exist)
 */

import EventBus from '../utils/EventBus.js';
import StateManager from '../services/StateManager.js';
import ConfirmDialog from '../services/ConfirmDialog.js';

export class TypeManagementModal {
    #modalId = 'typeManagementModal';

    /**
     * Initialize modal
     */
    init() {
        this.#createModal();
        this.#setupEventListeners();

        // Listen for type management requests
        EventBus.on('manage-types:open', () => this.open());

        // Listen for type updates to refresh the list
        EventBus.on('type:configured', () => this.#refreshList());
        EventBus.on('type:deleted', () => this.#refreshList());
        EventBus.on('type:deletion-handled', () => this.#refreshList());
    }

    /**
     * Create modal HTML
     * @private
     */
    #createModal() {
        const modalHTML = `
            <div id="${this.#modalId}" class="modal fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center opacity-0 pointer-events-none">
                <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
                    <div class="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <h3 class="font-bold text-lg text-slate-700 dark:text-slate-200">
                            <i class="fas fa-palette mr-2"></i>
                            <span>Manage Event Types</span>
                        </h3>
                        <button data-modal-close="${this.#modalId}" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
                        <!-- Trip Types Section -->
                        <div class="mb-6">
                            <div class="flex justify-between items-center mb-2">
                                <h4 class="font-semibold text-md text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                    <i class="fas fa-plane text-blue-600 dark:text-blue-400"></i>
                                    Trip Types
                                </h4>
                                <button id="btnAddEventType" class="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition">
                                    <i class="fas fa-plus"></i>
                                    Add Trip Type
                                </button>
                            </div>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">Trip types represent business travel events like division visits, conferences, or team meetings. These are what you're trying to schedule.</p>
                            <div id="eventTypesList" class="space-y-2">
                                <!-- Populated dynamically -->
                            </div>
                        </div>

                        <!-- Constraint Types Section -->
                        <div>
                            <div class="flex justify-between items-center mb-2">
                                <h4 class="font-semibold text-md text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                    <i class="fas fa-ban text-red-600 dark:text-red-400"></i>
                                    Constraint Types
                                </h4>
                                <button id="btnAddConstraintType" class="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition">
                                    <i class="fas fa-plus"></i>
                                    Add Constraint Type
                                </button>
                            </div>
                            <p class="text-xs text-slate-500 dark:text-slate-400 mb-3">Constraint types represent periods when travel should be avoided like vacations, holidays, or blackout dates. These affect trip scheduling.</p>
                            <div id="constraintTypesList" class="space-y-2">
                                <!-- Populated dynamically -->
                            </div>
                        </div>
                    </div>

                    <div class="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end items-center">
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
        // Add new event type button
        document.getElementById('btnAddEventType')?.addEventListener('click', () => {
            EventBus.emit('type-config:open', { kind: 'event', typeId: null });
        });

        // Add new constraint type button
        document.getElementById('btnAddConstraintType')?.addEventListener('click', () => {
            EventBus.emit('type-config:open', { kind: 'constraint', typeId: null });
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
     * Open modal for managing types
     */
    open() {
        // Render both lists
        this.#refreshList();

        // Open modal
        this.#openModal();
    }

    /**
     * Refresh the type lists
     * @private
     */
    #refreshList() {
        // Refresh event types
        const eventListEl = document.getElementById('eventTypesList');
        if (eventListEl) {
            const eventConfigs = StateManager.getAllEventTypeConfigs();
            eventListEl.innerHTML = '';

            if (Object.keys(eventConfigs).length === 0) {
                eventListEl.innerHTML = `
                    <div class="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
                        <p>No trip types defined.</p>
                        <p class="mt-1">Click "Add Trip Type" to create one.</p>
                    </div>
                `;
            } else {
                Object.entries(eventConfigs).forEach(([typeId, config]) => {
                    const typeItem = this.#createTypeItem(typeId, config, 'event');
                    eventListEl.appendChild(typeItem);
                });
            }
        }

        // Refresh constraint types
        const constraintListEl = document.getElementById('constraintTypesList');
        if (constraintListEl) {
            const constraintConfigs = StateManager.getAllConstraintTypeConfigs();
            constraintListEl.innerHTML = '';

            if (Object.keys(constraintConfigs).length === 0) {
                constraintListEl.innerHTML = `
                    <div class="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
                        <p>No constraint types defined.</p>
                        <p class="mt-1">Click "Add Constraint Type" to create one.</p>
                    </div>
                `;
            } else {
                Object.entries(constraintConfigs).forEach(([typeId, config]) => {
                    const typeItem = this.#createTypeItem(typeId, config, 'constraint');
                    constraintListEl.appendChild(typeItem);
                });
            }
        }
    }

    /**
     * Create a type list item
     * @private
     * @param {string} typeId - Type ID
     * @param {object} config - Type configuration
     * @param {string} kind - 'event' or 'constraint'
     */
    #createTypeItem(typeId, config, kind) {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-600';

        const isDarkMode = document.documentElement.classList.contains('dark');
        const color = isDarkMode ? config.colorDark : config.color;

        // Check if this is the 'archived' type (should not be editable)
        const isArchived = typeId === 'archived';
        const canEdit = !isArchived;
        const canDelete = !config.isBuiltIn && !isArchived;

        item.innerHTML = `
            <div class="flex items-center gap-3 flex-1">
                <div class="w-8 h-8 rounded flex-shrink-0" style="background-color: ${color}"></div>
                <div class="flex-1">
                    <div class="font-medium text-slate-700 dark:text-slate-200">${config.label}</div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">
                        <span class="inline-flex items-center gap-1">
                            <code class="bg-slate-200 dark:bg-slate-700 px-1 rounded">${typeId}</code>
                            ${config.isHardStop ? '<span class="text-red-600 dark:text-red-400">• Hard Stop</span>' : '<span class="text-blue-600 dark:text-blue-400">• Soft</span>'}
                            ${config.isBuiltIn ? '<span class="text-amber-600 dark:text-amber-400">• Built-in</span>' : ''}
                            ${isArchived ? '<span class="text-slate-600 dark:text-slate-400">• System</span>' : ''}
                        </span>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2">
                ${canEdit ? `
                    <button class="btn-edit-type p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300" data-type-id="${typeId}" data-kind="${kind}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                ` : ''}
                ${canDelete ? `
                    <button class="btn-delete-type p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" data-type-id="${typeId}" data-kind="${kind}" title="Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                ` : ''}
            </div>
        `;

        // Edit button
        item.querySelector('.btn-edit-type')?.addEventListener('click', (e) => {
            e.stopPropagation();
            EventBus.emit('type-config:open', { kind, typeId });
        });

        // Delete button
        item.querySelector('.btn-delete-type')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#handleDelete(typeId, config.label, kind);
        });

        return item;
    }

    /**
     * Handle type deletion
     * @private
     * @param {string} typeId - Type ID
     * @param {string} typeLabel - Type label
     * @param {string} kind - 'event' or 'constraint'
     */
    async #handleDelete(typeId, typeLabel, kind) {
        // Check if there are events/constraints using this type
        const state = StateManager.getState();

        if (kind === 'event') {
            const eventsWithType = state.events.filter(e => e.type === typeId);

            if (eventsWithType.length > 0) {
                // Open deletion conflict modal
                EventBus.emit('type-deletion:open-event', {
                    typeId,
                    typeLabel,
                    eventCount: eventsWithType.length
                });
            } else {
                // No conflicts, delete directly
                const confirmed = await ConfirmDialog.show({
                    title: 'Delete Trip Type',
                    message: `Are you sure you want to delete "${typeLabel}"? This cannot be undone.`,
                    confirmText: 'Delete',
                    isDangerous: true
                });
                if (confirmed) {
                    StateManager.deleteEventType(typeId, 'delete');
                }
            }
        } else {
            const constraintsWithType = state.constraints.filter(c => c.type === typeId);

            if (constraintsWithType.length > 0) {
                // Open deletion conflict modal
                EventBus.emit('type-deletion:open-constraint', {
                    typeId,
                    typeLabel,
                    constraintCount: constraintsWithType.length
                });
            } else {
                // No conflicts, delete directly
                const confirmed = await ConfirmDialog.show({
                    title: 'Delete Constraint Type',
                    message: `Are you sure you want to delete "${typeLabel}"? This cannot be undone.`,
                    confirmText: 'Delete',
                    isDangerous: true
                });
                if (confirmed) {
                    StateManager.deleteConstraintType(typeId);
                }
            }
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

export default TypeManagementModal;
