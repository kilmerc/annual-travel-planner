/**
 * ConfirmDialog - Custom confirmation dialog service
 *
 * Provides a better UX than browser confirm() with:
 * - Customizable messages and button labels
 * - Async/await support via Promises
 * - Consistent styling with the app
 * - Support for dangerous actions (delete, clear, etc.)
 */

class ConfirmDialog {
    #container = null;
    #currentDialog = null;
    #resolveCallback = null;

    constructor() {
        this.#init();
    }

    /**
     * Initialize confirm dialog container
     * @private
     */
    #init() {
        // Skip if not in browser environment
        if (typeof document === 'undefined' || !document.body) {
            return;
        }

        // Create container if it doesn't exist
        if (!document.getElementById('confirm-dialog-container')) {
            const container = document.createElement('div');
            container.id = 'confirm-dialog-container';
            document.body.appendChild(container);
        }
        this.#container = document.getElementById('confirm-dialog-container');
    }

    /**
     * Show a confirmation dialog
     * @param {object} options - Dialog options
     * @param {string} options.title - Dialog title
     * @param {string} options.message - Dialog message
     * @param {string} options.confirmText - Confirm button text (default: "Confirm")
     * @param {string} options.cancelText - Cancel button text (default: "Cancel")
     * @param {boolean} options.isDangerous - Use danger styling for confirm button (default: false)
     * @returns {Promise<boolean>} True if confirmed, false if cancelled
     */
    async show({
        title = 'Confirm',
        message = 'Are you sure?',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        isDangerous = false
    } = {}) {
        // Skip if not in browser environment
        if (!this.#container) {
            return Promise.resolve(true); // Default to confirm in non-browser environments
        }

        // Remove any existing dialog
        if (this.#currentDialog) {
            this.#removeDialog(false);
        }

        return new Promise((resolve) => {
            this.#resolveCallback = resolve;
            this.#createDialog({ title, message, confirmText, cancelText, isDangerous });
        });
    }

    /**
     * Create and display the dialog
     * @private
     */
    #createDialog({ title, message, confirmText, cancelText, isDangerous }) {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center opacity-0 transition-opacity duration-200';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'confirm-dialog-title');

        const confirmBtnClass = isDangerous
            ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';

        overlay.innerHTML = `
            <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4 transform scale-95 transition-transform duration-200">
                <div class="p-6">
                    <h3 id="confirm-dialog-title" class="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3">
                        <i class="fas ${isDangerous ? 'fa-exclamation-triangle text-red-600' : 'fa-question-circle text-blue-600'} mr-2"></i>
                        ${title}
                    </h3>
                    <p class="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">${message}</p>
                    <div class="flex gap-3 justify-end">
                        <button class="confirm-cancel px-4 py-2 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400">
                            ${cancelText}
                        </button>
                        <button class="confirm-accept px-4 py-2 ${confirmBtnClass} text-white rounded-lg font-medium transition focus:outline-none focus:ring-2">
                            ${confirmText}
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.#container.appendChild(overlay);
        this.#currentDialog = overlay;

        // Trigger animation
        setTimeout(() => {
            overlay.classList.add('opacity-100');
            overlay.querySelector('.bg-white, .dark\\:bg-slate-800').classList.remove('scale-95');
            overlay.querySelector('.bg-white, .dark\\:bg-slate-800').classList.add('scale-100');
        }, 10);

        // Event listeners
        overlay.querySelector('.confirm-accept').addEventListener('click', () => this.#handleConfirm(true));
        overlay.querySelector('.confirm-cancel').addEventListener('click', () => this.#handleConfirm(false));

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.#handleConfirm(false);
            }
        });

        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.#handleConfirm(false);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Focus the confirm button for keyboard accessibility
        setTimeout(() => {
            overlay.querySelector('.confirm-accept').focus();
        }, 50);
    }

    /**
     * Handle confirm or cancel action
     * @private
     */
    #handleConfirm(confirmed) {
        this.#removeDialog(true);
        if (this.#resolveCallback) {
            this.#resolveCallback(confirmed);
            this.#resolveCallback = null;
        }
    }

    /**
     * Remove dialog with animation
     * @private
     */
    #removeDialog(animate = true) {
        if (!this.#currentDialog) return;

        const dialog = this.#currentDialog;

        if (animate) {
            dialog.classList.remove('opacity-100');
            dialog.querySelector('.bg-white, .dark\\:bg-slate-800').classList.remove('scale-100');
            dialog.querySelector('.bg-white, .dark\\:bg-slate-800').classList.add('scale-95');
            setTimeout(() => {
                if (dialog.parentNode) {
                    dialog.remove();
                }
            }, 200);
        } else {
            dialog.remove();
        }

        this.#currentDialog = null;
    }
}

// Export singleton instance
const confirmDialog = new ConfirmDialog();
export default confirmDialog;
