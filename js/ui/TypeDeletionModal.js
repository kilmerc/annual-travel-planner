/**
 * TypeDeletionModal - Modal for handling type deletion conflicts
 *
 * When a type is deleted that has events/constraints using it,
 * this modal offers:
 * - Archive: Mark events as archived (excluded from algorithm, greyed out)
 * - Delete All: Permanently delete the type and all associated events/constraints
 * - Cancel: Cancel the deletion
 */

import EventBus from '../utils/EventBus.js';
import StateManager from '../services/StateManager.js';
import { escapeHTML } from '../utils/htmlSanitizer.js';

export class TypeDeletionModal {
    #modalId = 'typeDeletionModal';

    /**
     * Initialize modal
     */
    init() {
        this.#createModal();
        this.#setupEventListeners();

        // Listen for type deletion events
        EventBus.on('type-deletion:open-event', (data) => {
            this.openForEventType(data.typeId, data.typeLabel, data.eventCount);
        });

        EventBus.on('type-deletion:open-constraint', (data) => {
            this.openForConstraintType(data.typeId, data.typeLabel, data.constraintCount);
        });
    }

    /**
     * Create modal HTML
     * @private
     */
    #createModal() {
        const modalHTML = `
            <div id="${this.#modalId}" class="modal fixed inset-0 bg-black/50 z-[70] hidden flex items-center justify-center opacity-0 pointer-events-none">
                <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                    <div class="bg-rose-50 dark:bg-rose-900/20 px-6 py-4 border-b border-rose-200 dark:border-rose-700 flex items-center gap-3">
                        <i class="fas fa-exclamation-triangle text-rose-600 dark:text-rose-400 text-xl"></i>
                        <h3 class="font-bold text-lg text-rose-700 dark:text-rose-300">
                            Type Deletion Conflict
                        </h3>
                    </div>

                    <div class="p-6">
                        <div id="deletionMessage" class="text-sm text-slate-600 dark:text-slate-400 mb-6">
                            <!-- Populated dynamically -->
                        </div>

                        <div class="space-y-3">
                            <!-- Archive Option -->
                            <button id="btnArchiveEvents" class="w-full flex items-start gap-3 p-4 border-2 border-slate-300 dark:border-slate-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition group">
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
                            <button id="btnDeleteAll" class="w-full flex items-start gap-3 p-4 border-2 border-slate-300 dark:border-slate-600 rounded-lg hover:border-red-500 dark:hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition group">
                                <div class="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-800/60">
                                    <i class="fas fa-trash-alt text-red-600 dark:text-red-400"></i>
                                </div>
                                <div class="text-left flex-1">
                                    <div class="font-semibold text-sm text-slate-700 dark:text-slate-200">Delete All</div>
                                    <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Permanently delete the type and all associated events. This cannot be undone.
                                    </div>
                                </div>
                            </button>

                            <!-- Cancel Option -->
                            <button id="btnCancelDeletion" class="w-full flex items-start gap-3 p-4 border-2 border-slate-300 dark:border-slate-600 rounded-lg hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition group">
                                <div class="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-600">
                                    <i class="fas fa-times text-slate-600 dark:text-slate-400"></i>
                                </div>
                                <div class="text-left flex-1">
                                    <div class="font-semibold text-sm text-slate-700 dark:text-slate-200">Cancel</div>
                                    <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Keep the type and all events unchanged.
                                    </div>
                                </div>
                            </button>
                        </div>
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
        document.getElementById('btnArchiveEvents')?.addEventListener('click', () => {
            this.#handleArchive();
        });

        document.getElementById('btnDeleteAll')?.addEventListener('click', () => {
            this.#handleDeleteAll();
        });

        document.getElementById('btnCancelDeletion')?.addEventListener('click', () => {
            this.close();
        });
    }

    /**
     * Open modal for event type deletion
     * @param {string} typeId - Type ID to delete
     * @param {string} typeLabel - Type label for display
     * @param {number} eventCount - Number of events with this type
     */
    openForEventType(typeId, typeLabel, eventCount) {
        this.currentTypeId = typeId;
        this.currentKind = 'event';

        const messageEl = document.getElementById('deletionMessage');
        messageEl.innerHTML = `
            <p class="font-semibold mb-2">You are deleting the event type "${escapeHTML(typeLabel)}".</p>
            <p>There ${eventCount === 1 ? 'is' : 'are'} <strong>${eventCount}</strong> event${eventCount === 1 ? '' : 's'} using this type.</p>
            <p class="mt-2">What would you like to do?</p>
        `;

        this.#openModal();
    }

    /**
     * Open modal for constraint type deletion
     * @param {string} typeId - Type ID to delete
     * @param {string} typeLabel - Type label for display
     * @param {number} constraintCount - Number of constraints with this type
     */
    openForConstraintType(typeId, typeLabel, constraintCount) {
        this.currentTypeId = typeId;
        this.currentKind = 'constraint';

        const messageEl = document.getElementById('deletionMessage');
        messageEl.innerHTML = `
            <p class="font-semibold mb-2">You are deleting the constraint type "${escapeHTML(typeLabel)}".</p>
            <p>There ${constraintCount === 1 ? 'is' : 'are'} <strong>${constraintCount}</strong> constraint${constraintCount === 1 ? '' : 's'} using this type.</p>
            <p class="mt-2">Constraints cannot be archived. Choose to delete all or cancel.</p>
        `;

        // Hide archive option for constraints
        const archiveBtn = document.getElementById('btnArchiveEvents');
        if (archiveBtn) {
            archiveBtn.style.display = 'none';
        }

        this.#openModal();
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

        // Show archive button (might have been hidden for constraints)
        const archiveBtn = document.getElementById('btnArchiveEvents');
        if (archiveBtn && this.currentKind === 'event') {
            archiveBtn.style.display = 'flex';
        }
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

        this.currentTypeId = null;
        this.currentKind = null;
    }

    /**
     * Handle archive action
     * @private
     */
    #handleArchive() {
        if (!this.currentTypeId || this.currentKind !== 'event') return;

        StateManager.deleteEventType(this.currentTypeId, 'archive');
        this.close();
        EventBus.emit('type:deletion-handled', { typeId: this.currentTypeId, action: 'archive' });
    }

    /**
     * Handle delete all action
     * @private
     */
    #handleDeleteAll() {
        if (!this.currentTypeId) return;

        if (this.currentKind === 'event') {
            StateManager.deleteEventType(this.currentTypeId, 'delete');
        } else {
            StateManager.deleteConstraintType(this.currentTypeId);
        }

        this.close();
        EventBus.emit('type:deletion-handled', { typeId: this.currentTypeId, action: 'delete' });
    }
}

export default TypeDeletionModal;
