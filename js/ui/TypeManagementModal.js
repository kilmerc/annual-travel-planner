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
    #currentKind = null; // 'event' or 'constraint'

    /**
     * Initialize modal
     */
    init() {
        this.#createModal();
        this.#setupEventListeners();

        // Listen for type management requests
        EventBus.on('manage-types:open', (data) => this.open(data.kind));

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
                <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                    <div class="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <h3 class="font-bold text-lg text-slate-700 dark:text-slate-200">
                            <i id="typeManagementIcon" class="fas fa-palette mr-2"></i>
                            <span id="typeManagementTitle">Manage Types</span>
                        </h3>
                        <button data-modal-close="${this.#modalId}" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
                        <div id="typeManagementList" class="space-y-2">
                            <!-- Populated dynamically -->
                        </div>
                    </div>

                    <div class="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <button id="btnAddType" class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition">
                            <i class="fas fa-plus"></i>
                            <span>Add New Type</span>
                        </button>
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
        // Add new type button
        document.getElementById('btnAddType')?.addEventListener('click', () => {
            EventBus.emit('type-config:open', { kind: this.#currentKind, typeId: null });
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
     * @param {string} kind - 'event' or 'constraint'
     */
    open(kind) {
        this.#currentKind = kind;

        // Update title and icon
        const titleEl = document.getElementById('typeManagementTitle');
        const iconEl = document.getElementById('typeManagementIcon');

        if (kind === 'event') {
            titleEl.textContent = 'Manage Event Types';
            iconEl.className = 'fas fa-palette mr-2';
        } else {
            titleEl.textContent = 'Manage Constraint Types';
            iconEl.className = 'fas fa-ban mr-2';
        }

        // Render list
        this.#refreshList();

        // Open modal
        this.#openModal();
    }

    /**
     * Refresh the type list
     * @private
     */
    #refreshList() {
        const listEl = document.getElementById('typeManagementList');
        if (!listEl || !this.#currentKind) return;

        const configs = this.#currentKind === 'event'
            ? StateManager.getAllEventTypeConfigs()
            : StateManager.getAllConstraintTypeConfigs();

        listEl.innerHTML = '';

        // Check if list is empty
        if (Object.keys(configs).length === 0) {
            listEl.innerHTML = `
                <div class="text-center py-8 text-slate-500 dark:text-slate-400">
                    <i class="fas fa-inbox text-4xl mb-3"></i>
                    <p>No types defined yet.</p>
                    <p class="text-sm mt-1">Click "Add New Type" to create one.</p>
                </div>
            `;
            return;
        }

        // Render each type
        Object.entries(configs).forEach(([typeId, config]) => {
            const typeItem = this.#createTypeItem(typeId, config);
            listEl.appendChild(typeItem);
        });
    }

    /**
     * Create a type list item
     * @private
     */
    #createTypeItem(typeId, config) {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-600';

        const isDarkMode = document.documentElement.classList.contains('dark');
        const color = isDarkMode ? config.colorDark : config.color;

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
                        </span>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button class="btn-edit-type p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300" data-type-id="${typeId}" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                ${!config.isBuiltIn ? `
                    <button class="btn-delete-type p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" data-type-id="${typeId}" title="Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                ` : ''}
            </div>
        `;

        // Edit button
        item.querySelector('.btn-edit-type')?.addEventListener('click', (e) => {
            e.stopPropagation();
            EventBus.emit('type-config:open', { kind: this.#currentKind, typeId });
        });

        // Delete button
        item.querySelector('.btn-delete-type')?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.#handleDelete(typeId, config.label);
        });

        return item;
    }

    /**
     * Handle type deletion
     * @private
     */
    async #handleDelete(typeId, typeLabel) {
        // Check if there are events/constraints using this type
        const state = StateManager.getState();

        if (this.#currentKind === 'event') {
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

        this.#currentKind = null;
    }
}

export default TypeManagementModal;
