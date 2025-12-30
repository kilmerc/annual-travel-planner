/**
 * FirstSyncModal - First-time sync direction chooser
 *
 * Shows when user first connects Google Drive
 * Asks user to choose sync direction: pull from Drive or push to Drive
 * Prevents data loss by giving user explicit control
 */

import GoogleDriveSyncManager from '../services/GoogleDriveSyncManager.js';
import StateManager from '../services/StateManager.js';
import ToastService from '../services/ToastService.js';
import EventBus from '../utils/EventBus.js';

export class FirstSyncModal {
    #modalId = 'firstSyncModal';

    /**
     * Initialize modal
     */
    init() {
        this.#createModal();
        this.#setupEventListeners();

        // Listen for first sync required event
        EventBus.on('drive:first-sync-required', () => {
            this.open();
        });

        console.log('FirstSyncModal initialized');
    }

    /**
     * Create modal HTML
     * @private
     */
    #createModal() {
        const modalHTML = `
            <div id="${this.#modalId}" class="modal fixed inset-0 bg-black/60 z-[60] hidden flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-300">
                <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                    <!-- Header -->
                    <div class="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 px-6 py-4">
                        <div class="flex items-center gap-3">
                            <i class="fab fa-google-drive text-white text-2xl"></i>
                            <h3 class="font-bold text-xl text-white">Choose Sync Direction</h3>
                        </div>
                    </div>

                    <!-- Content -->
                    <div class="p-6 space-y-4">
                        <div class="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 rounded">
                            <div class="flex items-start gap-3">
                                <i class="fas fa-exclamation-triangle text-yellow-600 dark:text-yellow-400 text-xl mt-0.5"></i>
                                <div>
                                    <p class="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">First Time Setup</p>
                                    <p class="text-sm text-yellow-800 dark:text-yellow-300">
                                        You're connecting Google Drive for the first time on this device. Choose which data to keep:
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Data Summary -->
                        <div class="grid grid-cols-2 gap-4">
                            <!-- Local Data -->
                            <div class="border border-slate-200 dark:border-slate-600 rounded-lg p-4">
                                <div class="flex items-center gap-2 mb-2">
                                    <i class="fas fa-laptop text-slate-600 dark:text-slate-400"></i>
                                    <h4 class="font-semibold text-slate-800 dark:text-slate-200">This Device</h4>
                                </div>
                                <div id="localDataSummary" class="text-sm text-slate-600 dark:text-slate-400">
                                    <div id="localEventsCount">• 0 trips</div>
                                    <div id="localConstraintsCount">• 0 constraints</div>
                                </div>
                            </div>

                            <!-- Remote Data -->
                            <div class="border border-slate-200 dark:border-slate-600 rounded-lg p-4">
                                <div class="flex items-center gap-2 mb-2">
                                    <i class="fab fa-google-drive text-slate-600 dark:text-slate-400"></i>
                                    <h4 class="font-semibold text-slate-800 dark:text-slate-200">Google Drive</h4>
                                </div>
                                <div id="remoteDataSummary" class="text-sm text-slate-600 dark:text-slate-400">
                                    <div id="remoteEventsCount">• Checking...</div>
                                    <div id="remoteConstraintsCount"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="space-y-3">
                            <button id="btnPullFromDrive" class="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-3 group">
                                <i class="fas fa-cloud-download-alt text-xl group-hover:scale-110 transition-transform"></i>
                                <div class="text-left">
                                    <div class="font-semibold">Pull from Google Drive</div>
                                    <div class="text-xs opacity-90">Use data from Google Drive (recommended if synced from another device)</div>
                                </div>
                            </button>

                            <button id="btnPushToDrive" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-3 group">
                                <i class="fas fa-cloud-upload-alt text-xl group-hover:scale-110 transition-transform"></i>
                                <div class="text-left">
                                    <div class="font-semibold">Push to Google Drive</div>
                                    <div class="text-xs opacity-90">Use data from this device (overwrites Google Drive)</div>
                                </div>
                            </button>
                        </div>

                        <p class="text-xs text-slate-500 dark:text-slate-400 text-center">
                            <i class="fas fa-info-circle mr-1"></i>
                            This choice only affects the initial sync. Auto-sync will work normally after this.
                        </p>
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
        // Pull from Drive button
        const pullBtn = document.getElementById('btnPullFromDrive');
        if (pullBtn) {
            pullBtn.addEventListener('click', () => this.#handlePullFromDrive());
        }

        // Push to Drive button
        const pushBtn = document.getElementById('btnPushToDrive');
        if (pushBtn) {
            pushBtn.addEventListener('click', () => this.#handlePushToDrive());
        }
    }

    /**
     * Open modal and check remote data
     */
    async open() {
        const modal = document.getElementById(this.#modalId);
        if (!modal) {
            console.error('First sync modal element not found!');
            return;
        }

        // Update local data summary
        this.#updateLocalDataSummary();

        // Check remote data
        await this.#checkRemoteData();

        // Show modal
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
     * Update local data summary
     * @private
     */
    #updateLocalDataSummary() {
        const state = StateManager.getState();
        const eventsCount = state.events?.length || 0;
        const constraintsCount = state.constraints?.length || 0;

        const eventsEl = document.getElementById('localEventsCount');
        const constraintsEl = document.getElementById('localConstraintsCount');

        if (eventsEl) {
            eventsEl.textContent = `• ${eventsCount} trip${eventsCount !== 1 ? 's' : ''}`;
        }
        if (constraintsEl) {
            constraintsEl.textContent = `• ${constraintsCount} constraint${constraintsCount !== 1 ? 's' : ''}`;
        }
    }

    /**
     * Check remote data from Google Drive
     * @private
     */
    async #checkRemoteData() {
        const eventsEl = document.getElementById('remoteEventsCount');
        const constraintsEl = document.getElementById('remoteConstraintsCount');

        try {
            // Import GoogleDriveService dynamically to avoid circular dependency
            const GoogleDriveService = (await import('../services/GoogleDriveService.js')).default;
            const DataService = (await import('../services/DataService.js')).default;

            // List files from Drive
            const files = await GoogleDriveService.listFiles();

            if (!files || files.length === 0) {
                if (eventsEl) eventsEl.textContent = '• No data found';
                if (constraintsEl) constraintsEl.textContent = '';
                return;
            }

            // Get most recent file
            const mostRecentFile = files[0];
            const content = await GoogleDriveService.downloadFile(mostRecentFile.id);
            const data = DataService.importFromJSON(content);

            const eventsCount = data.events?.length || 0;
            const constraintsCount = data.constraints?.length || 0;

            if (eventsEl) {
                eventsEl.textContent = `• ${eventsCount} trip${eventsCount !== 1 ? 's' : ''}`;
            }
            if (constraintsEl) {
                constraintsEl.textContent = `• ${constraintsCount} constraint${constraintsCount !== 1 ? 's' : ''}`;
            }

        } catch (error) {
            console.error('Failed to check remote data:', error);
            if (eventsEl) eventsEl.textContent = '• Unable to check';
            if (constraintsEl) constraintsEl.textContent = '';
        }
    }

    /**
     * Handle pull from Drive
     * @private
     */
    async #handlePullFromDrive() {
        const btn = document.getElementById('btnPullFromDrive');
        if (!btn) return;

        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Pulling from Google Drive...';

        try {
            await GoogleDriveSyncManager.performFirstSync('pull');
            this.close();
        } catch (error) {
            console.error('Pull from Drive failed:', error);
            ToastService.error('Failed to pull data from Drive');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    }

    /**
     * Handle push to Drive
     * @private
     */
    async #handlePushToDrive() {
        const btn = document.getElementById('btnPushToDrive');
        if (!btn) return;

        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Pushing to Google Drive...';

        try {
            await GoogleDriveSyncManager.performFirstSync('push');
            this.close();
        } catch (error) {
            console.error('Push to Drive failed:', error);
            ToastService.error('Failed to push data to Drive');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    }
}

export default FirstSyncModal;
