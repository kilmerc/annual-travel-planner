/**
 * ToastService - Toast notification system
 *
 * Provides user feedback through toast messages
 * Types: success, error, warning, info
 */

class ToastService {
    #container = null;
    #toastQueue = [];
    #maxToasts = 5;

    constructor() {
        this.#init();
    }

    /**
     * Initialize toast container
     * @private
     */
    #init() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
            container.setAttribute('role', 'region');
            container.setAttribute('aria-label', 'Notifications');
            document.body.appendChild(container);
        }
        this.#container = document.getElementById('toast-container');
    }

    /**
     * Show a toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {number} duration - Duration in milliseconds (0 = no auto-dismiss)
     */
    show(message, type = 'info', duration = 3000) {
        const toast = this.#createToast(message, type);

        // Limit number of toasts
        if (this.#toastQueue.length >= this.#maxToasts) {
            const oldest = this.#toastQueue.shift();
            this.#removeToast(oldest, false);
        }

        this.#toastQueue.push(toast);
        this.#container.appendChild(toast);

        // Trigger animation
        setTimeout(() => {
            toast.classList.add('toast-enter');
        }, 10);

        // Auto-dismiss if duration > 0
        if (duration > 0) {
            setTimeout(() => {
                this.#removeToast(toast);
            }, duration);
        }

        return toast;
    }

    /**
     * Show success toast
     * @param {string} message - Toast message
     * @param {number} duration - Duration in milliseconds
     */
    success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }

    /**
     * Show error toast
     * @param {string} message - Toast message
     * @param {number} duration - Duration in milliseconds (default: 5s for errors)
     */
    error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }

    /**
     * Show warning toast
     * @param {string} message - Toast message
     * @param {number} duration - Duration in milliseconds
     */
    warning(message, duration = 4000) {
        return this.show(message, 'warning', duration);
    }

    /**
     * Show info toast
     * @param {string} message - Toast message
     * @param {number} duration - Duration in milliseconds
     */
    info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }

    /**
     * Create toast element
     * @private
     * @param {string} message - Toast message
     * @param {string} type - Toast type
     * @returns {HTMLElement} Toast element
     */
    #createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = 'toast pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-lg backdrop-blur-sm transform translate-x-full opacity-0 transition-all duration-300 max-w-md';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');

        // Type-specific styling
        const styles = {
            success: {
                bg: 'bg-green-500/90 dark:bg-green-600/90',
                icon: 'fa-check-circle',
                color: 'text-white'
            },
            error: {
                bg: 'bg-red-500/90 dark:bg-red-600/90',
                icon: 'fa-times-circle',
                color: 'text-white'
            },
            warning: {
                bg: 'bg-yellow-500/90 dark:bg-yellow-600/90',
                icon: 'fa-exclamation-triangle',
                color: 'text-white'
            },
            info: {
                bg: 'bg-blue-500/90 dark:bg-blue-600/90',
                icon: 'fa-info-circle',
                color: 'text-white'
            }
        };

        const style = styles[type] || styles.info;
        toast.classList.add(style.bg, style.color);

        toast.innerHTML = `
            <i class="fas ${style.icon} text-xl flex-shrink-0 mt-0.5"></i>
            <div class="flex-1 text-sm font-medium leading-relaxed">${message}</div>
            <button class="toast-close flex-shrink-0 hover:opacity-70 transition-opacity" aria-label="Close notification">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add close button handler
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.#removeToast(toast);
        });

        return toast;
    }

    /**
     * Remove toast with animation
     * @private
     * @param {HTMLElement} toast - Toast element
     * @param {boolean} animate - Whether to animate removal
     */
    #removeToast(toast, animate = true) {
        if (!toast || !toast.parentNode) return;

        // Remove from queue
        const index = this.#toastQueue.indexOf(toast);
        if (index > -1) {
            this.#toastQueue.splice(index, 1);
        }

        if (animate) {
            toast.classList.remove('toast-enter');
            toast.classList.add('toast-exit');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        } else {
            toast.remove();
        }
    }

    /**
     * Clear all toasts
     */
    clearAll() {
        this.#toastQueue.forEach(toast => this.#removeToast(toast));
        this.#toastQueue = [];
    }
}

// Export singleton instance
const toastService = new ToastService();
export default toastService;
