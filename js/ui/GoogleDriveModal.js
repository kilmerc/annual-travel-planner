/**
 * GoogleDriveModal - Google Drive integration UI
 *
 * Features:
 * - Sign in/out from Google Drive
 * - Display connection status
 * - Manual sync button
 * - Auto-sync toggle
 * - Last sync time display
 */

import GoogleDriveService from '../services/GoogleDriveService.js';
import GoogleDriveSyncManager from '../services/GoogleDriveSyncManager.js';
import ToastService from '../services/ToastService.js';
import EventBus from '../utils/EventBus.js';

export class GoogleDriveModal {
    #modalId = 'googleDriveModal';

    /**
     * Initialize modal
     */
    init() {
        console.log('GoogleDriveModal init() called');
        this.#createModal();
        this.#setupEventListeners();

        // Listen for modal open requests
        EventBus.on('google-drive:open', () => {
            console.log('GoogleDriveModal received google-drive:open event');
            this.open();
        });

        // Listen for auth state changes
        EventBus.on('drive:connected', () => this.#updateUI());
        EventBus.on('drive:disconnected', () => this.#updateUI());
        EventBus.on('drive:auth-changed', () => this.#updateUI());

        // Listen for sync events
        EventBus.on('sync:completed', (data) => this.#onSyncCompleted(data));
        EventBus.on('sync:started', () => this.#onSyncStarted());
        EventBus.on('sync:failed', () => this.#onSyncFailed());
    }

    /**
     * Create modal HTML
     * @private
     */
    #createModal() {
        const modalHTML = `
            <div id="${this.#modalId}" class="modal fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-300">
                <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                    <!-- Header -->
                    <div class="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <div class="flex items-center gap-3">
                            <i class="fab fa-google-drive text-blue-600 dark:text-blue-400 text-xl"></i>
                            <h3 class="font-bold text-lg text-slate-700 dark:text-slate-200">Google Drive Sync</h3>
                        </div>
                        <button data-modal-close="${this.#modalId}" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <!-- Content -->
                    <div class="p-6">
                        <!-- Signed Out View -->
                        <div id="driveSignedOutView" class="space-y-4">
                            <p class="text-slate-600 dark:text-slate-400">
                                Connect your Google account to automatically sync your travel plans across devices and maintain automatic backups.
                            </p>
                            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <h4 class="font-semibold text-blue-900 dark:text-blue-200 mb-2">Features:</h4>
                                <ul class="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                                    <li><i class="fas fa-check mr-2"></i>Automatic sync after changes</li>
                                    <li><i class="fas fa-check mr-2"></i>Daily backups with history</li>
                                    <li><i class="fas fa-check mr-2"></i>Access from any device</li>
                                    <li><i class="fas fa-check mr-2"></i>Conflict resolution</li>
                                </ul>
                            </div>
                            <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                                <p class="text-xs text-yellow-800 dark:text-yellow-300">
                                    <i class="fas fa-info-circle mr-1"></i>
                                    <strong>Note:</strong> This app is currently in testing mode. If you get an "Access denied" error, please contact the developer with your Gmail address to be added as a test user.
                                </p>
                            </div>
                            <button id="btnSignInDrive" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2">
                                <i class="fab fa-google"></i>
                                Connect Google Drive
                            </button>
                        </div>

                        <!-- Signed In View -->
                        <div id="driveSignedInView" class="space-y-4 hidden">
                            <div class="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                <i class="fas fa-check-circle text-green-600 dark:text-green-400 text-xl"></i>
                                <div class="flex-1">
                                    <p class="text-sm font-medium text-green-900 dark:text-green-200">Connected</p>
                                    <p id="driveUserEmail" class="text-xs text-green-700 dark:text-green-300">user@example.com</p>
                                </div>
                            </div>

                            <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-2">
                                <div class="flex items-center justify-between text-sm">
                                    <span class="text-slate-600 dark:text-slate-400">Last sync:</span>
                                    <span id="lastSyncTime" class="font-medium text-slate-800 dark:text-slate-200">Never</span>
                                </div>
                                <div class="flex items-center justify-between text-sm">
                                    <span class="text-slate-600 dark:text-slate-400">Auto-sync:</span>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" id="autoSyncToggle" class="sr-only peer" checked>
                                        <div class="w-11 h-6 bg-slate-300 peer-focus:ring-2 peer-focus:ring-blue-500 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>

                            <button id="btnSyncNow" class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2">
                                <i id="syncIcon" class="fas fa-sync"></i>
                                <span id="syncText">Sync Now</span>
                            </button>

                            <button id="btnDisconnectDrive" class="w-full bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-medium transition">
                                Disconnect
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
        // Close button
        const closeBtn = document.querySelector(`[data-modal-close="${this.#modalId}"]`);
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Sign in button
        const signInBtn = document.getElementById('btnSignInDrive');
        if (signInBtn) {
            signInBtn.addEventListener('click', () => this.#handleSignIn());
        }

        // Sign out button
        const disconnectBtn = document.getElementById('btnDisconnectDrive');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => this.#handleDisconnect());
        }

        // Sync now button
        const syncBtn = document.getElementById('btnSyncNow');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.#handleSyncNow());
        }

        // Auto-sync toggle
        const autoSyncToggle = document.getElementById('autoSyncToggle');
        if (autoSyncToggle) {
            autoSyncToggle.addEventListener('change', (e) => {
                GoogleDriveSyncManager.setAutoSyncEnabled(e.target.checked);
            });
        }

        // Close on backdrop click
        const modal = document.getElementById(this.#modalId);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.close();
                }
            });
        }
    }

    /**
     * Open modal
     */
    open() {
        console.log('GoogleDriveModal open() called');
        const modal = document.getElementById(this.#modalId);
        console.log('Modal element found:', !!modal);
        if (!modal) {
            console.error('Google Drive modal element not found!');
            return;
        }

        // Update UI before showing
        this.#updateUI();

        modal.classList.remove('hidden', 'pointer-events-none');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.classList.add('opacity-100', 'pointer-events-auto');
        }, 10);
    }

    /**
     * Close modal
     */
    close() {
        const modal = document.getElementById(this.#modalId);
        if (!modal) return;

        modal.classList.remove('opacity-100', 'pointer-events-auto');
        modal.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }

    /**
     * Update UI based on sign-in state
     * @private
     */
    #updateUI() {
        const isSignedIn = GoogleDriveService.isSignedIn();
        const signedOutView = document.getElementById('driveSignedOutView');
        const signedInView = document.getElementById('driveSignedInView');

        if (isSignedIn) {
            // Show signed in view
            signedOutView?.classList.add('hidden');
            signedInView?.classList.remove('hidden');

            // Update user email
            const email = GoogleDriveService.getUserEmail();
            const emailEl = document.getElementById('driveUserEmail');
            if (emailEl && email) {
                emailEl.textContent = email;
            }

            // Update last sync time
            this.#updateLastSyncTime();

            // Update auto-sync toggle
            const autoSyncToggle = document.getElementById('autoSyncToggle');
            if (autoSyncToggle) {
                autoSyncToggle.checked = GoogleDriveSyncManager.isAutoSyncEnabled();
            }

        } else {
            // Show signed out view
            signedOutView?.classList.remove('hidden');
            signedInView?.classList.add('hidden');
        }
    }

    /**
     * Update last sync time display
     * @private
     */
    #updateLastSyncTime() {
        const lastSyncTimeEl = document.getElementById('lastSyncTime');
        if (!lastSyncTimeEl) return;

        const lastSyncTime = GoogleDriveSyncManager.getLastSyncTime();
        if (lastSyncTime) {
            const elapsed = Date.now() - lastSyncTime;
            lastSyncTimeEl.textContent = this.#formatElapsedTime(elapsed);
        } else {
            lastSyncTimeEl.textContent = 'Never';
        }
    }

    /**
     * Format elapsed time
     * @param {number} ms - Milliseconds
     * @returns {string} Formatted time
     * @private
     */
    #formatElapsedTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (seconds > 10) return `${seconds} seconds ago`;
        return 'Just now';
    }

    /**
     * Handle sign in
     * @private
     */
    async #handleSignIn() {
        const btn = document.getElementById('btnSignInDrive');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Connecting...';
        }

        try {
            console.log('Attempting to sign in to Google Drive...');
            const result = await GoogleDriveService.signIn();
            console.log('Sign in result:', result);
            // Success toast will be shown after sync completes
            // (see sync:completed event handler + drive:connected logic in GoogleDriveSyncManager)
        } catch (error) {
            console.error('Sign in failed:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                error: error
            });
            ToastService.error('Failed to connect. Check console for details.');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fab fa-google mr-2"></i>Connect Google Drive';
            }
        }
    }

    /**
     * Handle disconnect
     * @private
     */
    async #handleDisconnect() {
        try {
            await GoogleDriveService.signOut();
            ToastService.info('Disconnected from Google Drive');
        } catch (error) {
            console.error('Disconnect failed:', error);
            ToastService.error('Failed to disconnect');
        }
    }

    /**
     * Handle sync now
     * @private
     */
    async #handleSyncNow() {
        const btn = document.getElementById('btnSyncNow');
        const icon = document.getElementById('syncIcon');
        const text = document.getElementById('syncText');

        if (btn && btn.disabled) {
            return; // Already syncing
        }

        if (btn) btn.disabled = true;
        if (icon) icon.classList.add('fa-spin');
        if (text) text.textContent = 'Syncing...';

        try {
            await GoogleDriveSyncManager.syncNow();
            // Success handled by sync:completed event
        } catch (error) {
            console.error('Manual sync failed:', error);
        } finally {
            if (btn) btn.disabled = false;
            if (icon) icon.classList.remove('fa-spin');
            if (text) text.textContent = 'Sync Now';
        }
    }

    /**
     * Handle sync started event
     * @private
     */
    #onSyncStarted() {
        // Update UI to show syncing state
        const icon = document.getElementById('syncIcon');
        if (icon) {
            icon.classList.add('fa-spin');
        }
    }

    /**
     * Handle sync completed event
     * @param {object} data - Event data
     * @private
     */
    #onSyncCompleted(data) {
        // Update last sync time
        this.#updateLastSyncTime();

        // Stop spinning icon
        const icon = document.getElementById('syncIcon');
        if (icon) {
            icon.classList.remove('fa-spin');
        }
    }

    /**
     * Handle sync failed event
     * @private
     */
    #onSyncFailed() {
        // Stop spinning icon
        const icon = document.getElementById('syncIcon');
        if (icon) {
            icon.classList.remove('fa-spin');
        }
    }
}

export default GoogleDriveModal;
