/**
 * ComboBox - Adaptive combo-box control with CRUD functionality
 *
 * Features:
 * - Type to filter options
 * - Create new options by typing
 * - Select from existing options
 * - Delete custom options (built-in options cannot be deleted)
 */

import ConfirmDialog from '../services/ConfirmDialog.js';

export class ComboBox {
    #container = null;
    #input = null;
    #dropdown = null;
    #options = []; // Array of { value, label, isBuiltIn }
    #selectedValue = '';
    #onChange = null;
    #onAdd = null;
    #onDelete = null;
    #placeholder = 'Select or type...';
    #isOpen = false;

    /**
     * @param {object} config - Configuration
     * @param {Array} config.options - Array of { value, label, isBuiltIn }
     * @param {string} config.value - Initial selected value
     * @param {Function} config.onChange - Callback when value changes (value) => {}
     * @param {Function} config.onAdd - Callback when new option is added (value, label) => {}
     * @param {Function} config.onDelete - Callback when option is deleted (value) => {}
     * @param {string} config.placeholder - Placeholder text
     * @param {boolean} config.allowCreate - Allow creating new options
     * @param {boolean} config.allowDelete - Allow deleting custom options
     */
    constructor(config) {
        this.#options = config.options || [];
        this.#selectedValue = config.value || '';
        this.#onChange = config.onChange || (() => {});
        this.#onAdd = config.onAdd || (() => {});
        this.#onDelete = config.onDelete || (() => {});
        this.#placeholder = config.placeholder || 'Select or type...';
        this.allowCreate = config.allowCreate !== false; // Default true
        this.allowDelete = config.allowDelete !== false; // Default true
    }

    /**
     * Render the combo box
     * @param {HTMLElement} container - Container element
     * @returns {HTMLElement} The created input element
     */
    render(container) {
        this.#container = container;
        container.innerHTML = '';
        container.className = 'relative';

        // Create input
        this.#input = document.createElement('input');
        this.#input.type = 'text';
        this.#input.className = 'w-full border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-200';
        this.#input.placeholder = this.#placeholder;
        this.#input.autocomplete = 'off';

        // Set initial value
        const selectedOption = this.#options.find(opt => opt.value === this.#selectedValue);
        if (selectedOption) {
            this.#input.value = selectedOption.label;
        }

        // Create dropdown
        this.#dropdown = document.createElement('div');
        this.#dropdown.className = 'absolute z-50 w-full mt-1 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded shadow-lg max-h-60 overflow-y-auto hidden';

        container.appendChild(this.#input);
        container.appendChild(this.#dropdown);

        this.#attachEventListeners();

        return this.#input;
    }

    /**
     * Update options
     * @param {Array} options - New options array
     */
    updateOptions(options) {
        this.#options = options;
        this.#renderDropdown(this.#input.value);
    }

    /**
     * Get current value
     * @returns {string} Current value
     */
    getValue() {
        return this.#selectedValue;
    }

    /**
     * Set value
     * @param {string} value - New value
     */
    setValue(value) {
        this.#selectedValue = value;
        const selectedOption = this.#options.find(opt => opt.value === value);
        if (selectedOption && this.#input) {
            this.#input.value = selectedOption.label;
        }
    }

    /**
     * Attach event listeners
     * @private
     */
    #attachEventListeners() {
        // Input focus - show dropdown
        this.#input.addEventListener('focus', () => {
            this.#openDropdown();
            this.#renderDropdown(this.#input.value);
        });

        // Input typing - filter options
        this.#input.addEventListener('input', (e) => {
            this.#renderDropdown(e.target.value);
            this.#openDropdown();
        });

        // Input blur - close dropdown (with delay to allow click)
        this.#input.addEventListener('blur', () => {
            setTimeout(() => this.#closeDropdown(), 200);
        });

        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            if (!this.#container.contains(e.target)) {
                this.#closeDropdown();
            }
        });
    }

    /**
     * Open dropdown
     * @private
     */
    #openDropdown() {
        this.#dropdown.classList.remove('hidden');
        this.#isOpen = true;
    }

    /**
     * Close dropdown
     * @private
     */
    #closeDropdown() {
        this.#dropdown.classList.add('hidden');
        this.#isOpen = false;
    }

    /**
     * Render dropdown content
     * @private
     */
    #renderDropdown(filterText) {
        const text = filterText.trim().toLowerCase();
        this.#dropdown.innerHTML = '';

        // Filter options
        const filtered = this.#options.filter(opt =>
            opt.label.toLowerCase().includes(text) ||
            opt.value.toLowerCase().includes(text)
        );

        // Check if exact match exists
        const exactMatch = this.#options.find(opt =>
            opt.label.toLowerCase() === text ||
            opt.value.toLowerCase() === text
        );

        // Show "Create new" option if allowed and no exact match
        if (this.allowCreate && text && !exactMatch) {
            const createItem = this.#createDropdownItem({
                label: `Create "${filterText.trim()}"`,
                value: filterText.trim(),
                isCreate: true
            });
            this.#dropdown.appendChild(createItem);

            // Add separator
            const separator = document.createElement('div');
            separator.className = 'border-t dark:border-slate-600 my-1';
            this.#dropdown.appendChild(separator);
        }

        // Show filtered options
        if (filtered.length === 0 && !this.allowCreate) {
            const noResults = document.createElement('div');
            noResults.className = 'px-3 py-2 text-sm text-slate-500 dark:text-slate-400';
            noResults.textContent = 'No options found';
            this.#dropdown.appendChild(noResults);
        } else {
            filtered.forEach(opt => {
                const item = this.#createDropdownItem(opt);
                this.#dropdown.appendChild(item);
            });
        }

        // Show all options if no filter
        if (!text) {
            this.#options.forEach(opt => {
                const item = this.#createDropdownItem(opt);
                this.#dropdown.appendChild(item);
            });
        }
    }

    /**
     * Create dropdown item
     * @private
     */
    #createDropdownItem(opt) {
        const item = document.createElement('div');
        item.className = 'px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 flex justify-between items-center group';

        const label = document.createElement('span');
        label.textContent = opt.label;

        if (opt.isCreate) {
            label.className = 'text-blue-600 dark:text-blue-400 font-medium flex items-center gap-2';
            const icon = document.createElement('i');
            icon.className = 'fas fa-plus text-xs';
            label.prepend(icon);
        }

        item.appendChild(label);

        // Add delete button for custom options
        if (!opt.isCreate && !opt.isBuiltIn && this.allowDelete) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity';
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt text-xs"></i>';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.#handleDelete(opt.value);
            };
            item.appendChild(deleteBtn);
        }

        // Click to select
        item.addEventListener('click', () => {
            if (opt.isCreate) {
                this.#handleCreate(opt.value);
            } else {
                this.#handleSelect(opt.value, opt.label);
            }
        });

        return item;
    }

    /**
     * Handle option selection
     * @private
     */
    #handleSelect(value, label) {
        this.#selectedValue = value;
        this.#input.value = label;
        this.#closeDropdown();
        this.#onChange(value);
    }

    /**
     * Handle creating new option
     * @private
     */
    #handleCreate(value) {
        const label = value;
        const newOption = { value, label, isBuiltIn: false };

        // Add to options
        this.#options.push(newOption);

        // Call onCreate callback
        this.#onAdd(value, label);

        // Select the new option
        this.#handleSelect(value, label);
    }

    /**
     * Handle deleting option
     * @private
     */
    async #handleDelete(value) {
        const confirmed = await ConfirmDialog.show({
            title: 'Delete Option',
            message: `Are you sure you want to delete "${value}"? This cannot be undone.`,
            confirmText: 'Delete',
            isDangerous: true
        });

        if (confirmed) {
            // Remove from options
            this.#options = this.#options.filter(opt => opt.value !== value);

            // Call onDelete callback
            this.#onDelete(value);

            // Clear selection if this was selected
            if (this.#selectedValue === value) {
                this.#selectedValue = '';
                this.#input.value = '';
                this.#onChange('');
            }

            // Re-render dropdown
            this.#renderDropdown(this.#input.value);
        }
    }
}

export default ComboBox;
