/**
 * TypeConfigModal - Modal for configuring event and constraint types
 *
 * Allows users to:
 * - Add new event/constraint types
 * - Edit existing custom types
 * - Set type label, colors (light/dark mode), and algorithm behavior (hard/soft)
 */

import EventBus from '../utils/EventBus.js';
import StateManager from '../services/StateManager.js';
import ToastService from '../services/ToastService.js';

export class TypeConfigModal {
    #modalId = 'typeConfigModal';
    #editingType = null;
    #editingKind = null; // 'event' or 'constraint'

    /**
     * Initialize modal
     */
    init() {
        this.#createModal();
        this.#setupEventListeners();

        // Listen for type management requests
        EventBus.on('type-config:open', (data) => this.open(data.kind, data.typeId, data.suggestedId, data.suggestedLabel));
    }

    /**
     * Create modal HTML
     * @private
     */
    #createModal() {
        const modalHTML = `
            <div id="${this.#modalId}" class="modal fixed inset-0 bg-black/50 z-[70] hidden flex items-center justify-center opacity-0 pointer-events-none">
                <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                    <div class="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <h3 class="font-bold text-lg text-slate-700 dark:text-slate-200">
                            <i class="fas fa-palette mr-2"></i>
                            <span id="typeConfigTitle">Configure Type</span>
                        </h3>
                        <button data-modal-close="${this.#modalId}" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="p-6">
                        <form id="typeConfigForm" class="space-y-4">
                            <input type="hidden" id="typeConfigKind">
                            <input type="hidden" id="typeConfigTypeId">

                            <div>
                                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Type ID</label>
                                <input type="text" id="typeConfigId" class="w-full border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-200" placeholder="e.g. team-offsite" required>
                                <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Lowercase, no spaces (use hyphens)</p>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Display Label</label>
                                <input type="text" id="typeConfigLabel" class="w-full border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-200" placeholder="e.g. Team Offsite" required>
                            </div>

                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Color (Light Mode)</label>
                                    <div class="flex gap-2">
                                        <input type="color" id="typeConfigColor" class="w-12 h-10 border dark:border-slate-600 rounded cursor-pointer">
                                        <input type="text" id="typeConfigColorHex" class="flex-1 border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-200" placeholder="#3b82f6">
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Color (Dark Mode)</label>
                                    <div class="flex gap-2">
                                        <input type="color" id="typeConfigColorDark" class="w-12 h-10 border dark:border-slate-600 rounded cursor-pointer">
                                        <input type="text" id="typeConfigColorDarkHex" class="flex-1 border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-200" placeholder="#60a5fa">
                                    </div>
                                </div>
                            </div>

                            <div class="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                                <label class="flex items-start gap-3 cursor-pointer">
                                    <input type="checkbox" id="typeConfigHardStop" class="mt-1 w-4 h-4 text-blue-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 rounded">
                                    <div>
                                        <div class="font-medium text-sm text-slate-700 dark:text-slate-200">Hard Stop (Algorithm Constraint)</div>
                                        <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            <strong>When enabled (Hard Stop):</strong> The scheduling algorithm will treat this as a blocking constraint that prevents trip scheduling in overlapping weeks.
                                            <br><br>
                                            <strong>When disabled (Soft):</strong> The algorithm will penalize but not block trip scheduling, allowing flexibility while discouraging conflicts.
                                        </div>
                                    </div>
                                </label>
                            </div>

                            <div class="flex gap-2 pt-4">
                                <button type="button" data-modal-close="${this.#modalId}" class="flex-1 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 py-2 rounded text-sm font-medium text-slate-700 dark:text-slate-200">
                                    Cancel
                                </button>
                                <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-medium">
                                    <i class="fas fa-save mr-2"></i>Save Type
                                </button>
                            </div>
                        </form>
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
        // Form submit
        const form = document.getElementById('typeConfigForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.#saveType();
            });
        }

        // Color picker sync with hex input
        const colorInput = document.getElementById('typeConfigColor');
        const colorHexInput = document.getElementById('typeConfigColorHex');
        if (colorInput && colorHexInput) {
            colorInput.addEventListener('input', (e) => {
                colorHexInput.value = e.target.value;
            });
            colorHexInput.addEventListener('input', (e) => {
                if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                    colorInput.value = e.target.value;
                }
            });
        }

        const colorDarkInput = document.getElementById('typeConfigColorDark');
        const colorDarkHexInput = document.getElementById('typeConfigColorDarkHex');
        if (colorDarkInput && colorDarkHexInput) {
            colorDarkInput.addEventListener('input', (e) => {
                colorDarkHexInput.value = e.target.value;
            });
            colorDarkHexInput.addEventListener('input', (e) => {
                if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                    colorDarkInput.value = e.target.value;
                }
            });
        }

        // Modal close buttons
        document.addEventListener('click', (e) => {
            const closeBtn = e.target.closest(`[data-modal-close="${this.#modalId}"]`);
            if (closeBtn) {
                this.close();
            }
        });
    }

    /**
     * Open modal to add or edit type
     * @param {string} kind - 'event' or 'constraint'
     * @param {string|null} typeId - Type ID to edit, or null to create new
     * @param {string|null} suggestedId - Suggested ID for new type
     * @param {string|null} suggestedLabel - Suggested label for new type
     */
    open(kind, typeId = null, suggestedId = null, suggestedLabel = null) {
        this.#editingKind = kind;
        this.#editingType = typeId;

        const titleEl = document.getElementById('typeConfigTitle');
        const idInput = document.getElementById('typeConfigId');
        const labelInput = document.getElementById('typeConfigLabel');
        const colorInput = document.getElementById('typeConfigColor');
        const colorHexInput = document.getElementById('typeConfigColorHex');
        const colorDarkInput = document.getElementById('typeConfigColorDark');
        const colorDarkHexInput = document.getElementById('typeConfigColorDarkHex');
        const hardStopCheckbox = document.getElementById('typeConfigHardStop');

        if (typeId) {
            // Editing existing type
            const config = kind === 'event'
                ? StateManager.getEventTypeConfig(typeId)
                : StateManager.getConstraintTypeConfig(typeId);

            if (!config) {
                console.error('Type not found:', typeId);
                return;
            }

            titleEl.textContent = `Edit ${kind === 'event' ? 'Event' : 'Constraint'} Type`;
            idInput.value = typeId;
            idInput.disabled = true; // Cannot change ID of existing type
            labelInput.value = config.label;
            colorInput.value = config.color;
            colorHexInput.value = config.color;
            colorDarkInput.value = config.colorDark;
            colorDarkHexInput.value = config.colorDark;
            hardStopCheckbox.checked = config.isHardStop;
        } else {
            // Creating new type
            titleEl.textContent = `Add ${kind === 'event' ? 'Event' : 'Constraint'} Type`;

            // Use suggested values if provided, otherwise generate from existing types
            const suggestedColors = this.#getNextUniqueColor(kind);

            idInput.value = suggestedId ? suggestedId.toLowerCase().replace(/\s+/g, '-') : '';
            idInput.disabled = false;
            labelInput.value = suggestedLabel || '';
            colorInput.value = suggestedColors.color;
            colorHexInput.value = suggestedColors.color;
            colorDarkInput.value = suggestedColors.colorDark;
            colorDarkHexInput.value = suggestedColors.colorDark;
            hardStopCheckbox.checked = false;
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

    /**
     * Get next unique color for a new type
     * @private
     * @param {string} kind - 'event' or 'constraint'
     * @returns {object} Color object with color and colorDark properties
     */
    #getNextUniqueColor(kind) {
        // Color palette with light and dark mode variants
        const colorPalette = [
            { color: '#3b82f6', colorDark: '#60a5fa' }, // blue
            { color: '#a855f7', colorDark: '#c084fc' }, // purple
            { color: '#f97316', colorDark: '#fb923c' }, // orange
            { color: '#22c55e', colorDark: '#4ade80' }, // green
            { color: '#ef4444', colorDark: '#f87171' }, // red
            { color: '#ec4899', colorDark: '#f472b6' }, // pink
            { color: '#14b8a6', colorDark: '#2dd4bf' }, // teal
            { color: '#eab308', colorDark: '#facc15' }, // yellow
            { color: '#8b5cf6', colorDark: '#a78bfa' }, // violet
            { color: '#06b6d4', colorDark: '#22d3ee' }, // cyan
            { color: '#f59e0b', colorDark: '#fbbf24' }, // amber
            { color: '#10b981', colorDark: '#34d399' }, // emerald
            { color: '#6366f1', colorDark: '#818cf8' }, // indigo
            { color: '#84cc16', colorDark: '#a3e635' }, // lime
            { color: '#64748b', colorDark: '#94a3b8' }, // slate
        ];

        // Get existing colors
        const existingConfigs = kind === 'event'
            ? StateManager.getAllEventTypeConfigs()
            : StateManager.getAllConstraintTypeConfigs();

        const usedColors = new Set();
        Object.values(existingConfigs).forEach(config => {
            usedColors.add(config.color);
        });

        // Find first unused color
        for (const colorPair of colorPalette) {
            if (!usedColors.has(colorPair.color)) {
                return colorPair;
            }
        }

        // If all colors are used, return a random one
        return colorPalette[Math.floor(Math.random() * colorPalette.length)];
    }

    /**
     * Save type configuration
     * @private
     */
    #saveType() {
        const typeId = document.getElementById('typeConfigId').value.trim().toLowerCase();
        const label = document.getElementById('typeConfigLabel').value.trim();
        const color = document.getElementById('typeConfigColorHex').value.trim();
        const colorDark = document.getElementById('typeConfigColorDarkHex').value.trim();
        const isHardStop = document.getElementById('typeConfigHardStop').checked;

        // Validation
        if (!typeId || !label || !color || !colorDark) {
            ToastService.error('Please fill in all required fields');
            return;
        }

        if (!/^[a-z0-9-]+$/.test(typeId)) {
            ToastService.error('Type ID must be lowercase with hyphens only (no spaces)');
            return;
        }

        if (!/^#[0-9A-F]{6}$/i.test(color) || !/^#[0-9A-F]{6}$/i.test(colorDark)) {
            ToastService.error('Please enter valid hex colors (e.g. #3b82f6)');
            return;
        }

        const config = {
            label,
            color,
            colorDark,
            isHardStop,
            isBuiltIn: false
        };

        // Save to StateManager
        if (this.#editingKind === 'event') {
            StateManager.setEventTypeConfig(typeId, config);
        } else {
            StateManager.setConstraintTypeConfig(typeId, config);
        }

        this.close();

        // Emit event for UI updates
        EventBus.emit('type:configured', { kind: this.#editingKind, typeId, config });
    }
}

export default TypeConfigModal;
