/**
 * GoogleDriveSyncManager - Sync orchestration for Google Drive
 *
 * Handles:
 * - Auto-sync with debouncing
 * - Conflict resolution (timestamp-based)
 * - Sync state tracking
 * - Integration with StateManager via EventBus
 *
 * Singleton service.
 */

import GoogleDriveService from './GoogleDriveService.js';
import StateManager from './StateManager.js';
import DataService from './DataService.js';
import ToastService from './ToastService.js';
import EventBus from '../utils/EventBus.js';
import { GOOGLE_DRIVE_CONFIG } from '../config/driveConfig.js';

class GoogleDriveSyncManager {
    #syncDebounceTimer = null;
    #isSyncing = false;
    #lastSyncTime = null;
    #syncEnabled = false;
    #autoSyncEnabled = true; // Can be toggled by user

    /**
     * Initialize sync manager
     */
    init() {
        // Load auto-sync preference
        const autoSyncPref = localStorage.getItem('googleDriveAutoSync');
        if (autoSyncPref !== null) {
            this.#autoSyncEnabled = autoSyncPref === 'true';
        }

        // Listen for Drive connection events
        EventBus.on('drive:connected', () => {
            this.enableAutoSync();
            // Trigger immediate sync after connection to load data from Drive
            this.syncNow();
        });

        EventBus.on('drive:disconnected', () => {
            this.disableAutoSync();
        });

        // Enable auto-sync if already signed in
        if (GoogleDriveService.isSignedIn()) {
            this.enableAutoSync();
        }

        console.log('GoogleDriveSyncManager initialized');
    }

    /**
     * Enable auto-sync
     * Starts listening to state changes
     */
    enableAutoSync() {
        if (this.#syncEnabled) {
            return;
        }

        this.#syncEnabled = true;
        this.#setupStateListeners();
        console.log('Auto-sync enabled');
    }

    /**
     * Disable auto-sync
     * Stops listening to state changes
     */
    disableAutoSync() {
        if (!this.#syncEnabled) {
            return;
        }

        this.#syncEnabled = false;

        // Clear any pending sync
        if (this.#syncDebounceTimer) {
            clearTimeout(this.#syncDebounceTimer);
            this.#syncDebounceTimer = null;
        }

        console.log('Auto-sync disabled');
    }

    /**
     * Set auto-sync preference
     * @param {boolean} enabled - Whether auto-sync is enabled
     */
    setAutoSyncEnabled(enabled) {
        this.#autoSyncEnabled = enabled;
        localStorage.setItem('googleDriveAutoSync', enabled.toString());

        if (enabled && GoogleDriveService.isSignedIn()) {
            this.enableAutoSync();
        } else {
            this.disableAutoSync();
        }

        EventBus.emit('sync:auto-sync-changed', { enabled });
    }

    /**
     * Get auto-sync enabled state
     * @returns {boolean} True if auto-sync is enabled
     */
    isAutoSyncEnabled() {
        return this.#autoSyncEnabled;
    }

    /**
     * Get last sync time
     * @returns {number|null} Timestamp of last sync or null
     */
    getLastSyncTime() {
        return this.#lastSyncTime;
    }

    /**
     * Check if currently syncing
     * @returns {boolean} True if syncing
     */
    isSyncing() {
        return this.#isSyncing;
    }

    /**
     * Manual sync trigger
     * Immediately syncs without debouncing
     */
    async syncNow() {
        // Cancel any pending debounced sync
        if (this.#syncDebounceTimer) {
            clearTimeout(this.#syncDebounceTimer);
            this.#syncDebounceTimer = null;
        }

        await this.#performSync(true); // true = manual sync
    }

    /**
     * Setup state change listeners
     * @private
     */
    #setupStateListeners() {
        // Listen to state changes for auto-sync
        EventBus.on('state:changed', () => {
            if (!this.#autoSyncEnabled || !GoogleDriveService.isSignedIn()) {
                return;
            }

            this.#debouncedSync();
        });
    }

    /**
     * Debounced sync trigger
     * Waits for user to stop making changes before syncing
     * @private
     */
    #debouncedSync() {
        // Clear existing timer
        if (this.#syncDebounceTimer) {
            clearTimeout(this.#syncDebounceTimer);
        }

        // Set new timer
        this.#syncDebounceTimer = setTimeout(() => {
            this.#syncDebounceTimer = null;
            this.#performSync(false); // false = auto sync
        }, GOOGLE_DRIVE_CONFIG.DEBOUNCE_DELAY);
    }

    /**
     * Perform sync operation
     * @param {boolean} isManual - Whether this is a manual sync
     * @private
     */
    async #performSync(isManual = false) {
        // Check if already syncing
        if (this.#isSyncing) {
            console.log('Sync already in progress, skipping');
            return;
        }

        // Check if signed in
        if (!GoogleDriveService.isSignedIn()) {
            console.log('Not signed in, skipping sync');
            return;
        }

        // Check network connectivity
        if (!navigator.onLine) {
            console.log('Offline, skipping sync');
            return;
        }

        this.#isSyncing = true;

        try {
            // Show syncing indicator for manual syncs
            if (isManual) {
                ToastService.info('Syncing with Google Drive...', 2000);
            }

            // Emit sync started event
            EventBus.emit('sync:started');

            // Get current state
            const localState = StateManager.getState();

            // Get today's filename for upload
            const todayFilename = this.#getTodayFilename();

            // CRITICAL: Download most recent file from Drive (not just today's)
            // This ensures we don't overwrite existing data on first sync from new device
            const remoteState = await this.#downloadMostRecentFile();

            if (remoteState) {
                // Conflict resolution: compare timestamps and data presence
                const resolution = await this.#resolveConflict(localState, remoteState);

                if (resolution === 'remote') {
                    // Remote is newer/has data, import it
                    StateManager.importState(remoteState);
                    this.#lastSyncTime = Date.now();
                    EventBus.emit('sync:completed', {
                        source: 'remote',
                        timestamp: this.#lastSyncTime
                    });

                    if (isManual) {
                        const hasData = (remoteState.events?.length > 0) || (remoteState.constraints?.length > 0);
                        if (hasData) {
                            ToastService.success('Connected to Google Drive and loaded your data');
                        } else {
                            ToastService.success('Connected to Google Drive');
                        }
                    }
                    return;
                }
            }

            // Upload local state to today's file (either no remote file or local is newer)
            await this.#uploadToDrive(localState, todayFilename);

            this.#lastSyncTime = Date.now();
            EventBus.emit('sync:completed', {
                source: 'local',
                timestamp: this.#lastSyncTime
            });

            if (isManual) {
                ToastService.success('Connected to Google Drive and backed up your data');
            }

        } catch (error) {
            console.error('Sync failed:', error);
            this.#handleSyncError(error, isManual);
        } finally {
            this.#isSyncing = false;
        }
    }

    /**
     * Download state from Google Drive
     * @param {string} filename - Filename to download
     * @returns {Promise<object|null>} State object or null if not found
     * @private
     */
    async #downloadFromDrive(filename) {
        try {
            // Find file by name
            const files = await GoogleDriveService.listFiles(`name='${filename}'`);

            if (!files || files.length === 0) {
                return null;
            }

            const fileMetadata = files[0];

            // Download file content
            const content = await GoogleDriveService.downloadFile(fileMetadata.id);

            // Parse and validate JSON
            const data = DataService.importFromJSON(content);

            // Add file ID to state
            data.syncedFileId = fileMetadata.id;

            // CRITICAL: If the remote file doesn't have lastModified (old format),
            // use the Google Drive file's actual modification time
            if (!data.lastModified && fileMetadata.modifiedTime) {
                // Convert Google Drive's RFC 3339 timestamp to Unix timestamp
                data.lastModified = new Date(fileMetadata.modifiedTime).getTime();
                console.log(`Remote file missing lastModified, using Drive modifiedTime: ${data.lastModified}`);
            }

            return data;

        } catch (error) {
            console.error('Download from Drive failed:', error);
            return null;
        }
    }

    /**
     * Download most recent file from Google Drive
     * This is used to ensure we load existing data on first sync from new device
     * @returns {Promise<object|null>} State object or null if no files found
     * @private
     */
    async #downloadMostRecentFile() {
        try {
            // List all travel plan files, sorted by modified time (newest first)
            const files = await GoogleDriveService.listFiles();

            if (!files || files.length === 0) {
                console.log('No files found in Google Drive');
                return null;
            }

            // listFiles() already sorts by modifiedTime desc, so first file is most recent
            const mostRecentFile = files[0];
            console.log(`Found most recent file: ${mostRecentFile.name} (modified: ${mostRecentFile.modifiedTime})`);

            // Download file content
            const content = await GoogleDriveService.downloadFile(mostRecentFile.id);

            // Parse and validate JSON
            const data = DataService.importFromJSON(content);

            // Add file ID to state
            data.syncedFileId = mostRecentFile.id;

            // CRITICAL: If the remote file doesn't have lastModified (old format),
            // use the Google Drive file's actual modification time
            if (!data.lastModified && mostRecentFile.modifiedTime) {
                // Convert Google Drive's RFC 3339 timestamp to Unix timestamp
                data.lastModified = new Date(mostRecentFile.modifiedTime).getTime();
                console.log(`Remote file missing lastModified, using Drive modifiedTime: ${data.lastModified}`);
            }

            return data;

        } catch (error) {
            console.error('Download most recent file from Drive failed:', error);
            return null;
        }
    }

    /**
     * Upload state to Google Drive
     * @param {object} state - State object
     * @param {string} filename - Filename
     * @private
     */
    async #uploadToDrive(state, filename) {
        try {
            // Export state to JSON
            const content = DataService.exportToJSON(state);

            // Upload to Drive
            const result = await GoogleDriveService.uploadFile(filename, content);

            // Update synced file ID in state
            StateManager.setSyncedFileId(result.id);

            console.log(`Uploaded to Drive: ${filename}`);

        } catch (error) {
            console.error('Upload to Drive failed:', error);
            throw error;
        }
    }

    /**
     * Resolve conflict between local and remote state
     * @param {object} localState - Local state
     * @param {object} remoteState - Remote state
     * @returns {Promise<string>} 'local' or 'remote'
     * @private
     */
    async #resolveConflict(localState, remoteState) {
        // Get timestamps - use current time if missing
        const localTime = localState.lastModified || Date.now();
        const remoteTime = remoteState.lastModified || Date.now();

        // Check if local is essentially empty (new user)
        const localHasData = (localState.events && localState.events.length > 0) ||
                            (localState.constraints && localState.constraints.length > 0);
        const remoteHasData = (remoteState.events && remoteState.events.length > 0) ||
                             (remoteState.constraints && remoteState.constraints.length > 0);

        console.log(`Conflict resolution: local=${localTime}, remote=${remoteTime}, localHasData=${localHasData}, remoteHasData=${remoteHasData}`);

        // Special case: If local is empty but remote has data, always prefer remote
        // This handles the case of first-time sync with existing Drive data
        if (!localHasData && remoteHasData) {
            console.log('Local is empty but remote has data - using remote');
            return 'remote';
        }

        // Special case: If remote is empty but local has data, prefer local
        if (localHasData && !remoteHasData) {
            console.log('Remote is empty but local has data - using local');
            return 'local';
        }

        // Otherwise, use timestamps
        if (remoteTime > localTime) {
            console.log('Remote is newer by timestamp');
            return 'remote';
        } else {
            console.log('Local is newer or equal by timestamp');
            return 'local';
        }
    }

    /**
     * Get today's filename
     * @returns {string} Filename for today
     * @private
     */
    #getTodayFilename() {
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        return `${GOOGLE_DRIVE_CONFIG.FILE_PREFIX}${date}${GOOGLE_DRIVE_CONFIG.FILE_EXTENSION}`;
    }

    /**
     * Handle sync errors
     * @param {Error} error - Error object
     * @param {boolean} isManual - Whether this was a manual sync
     * @private
     */
    #handleSyncError(error, isManual) {
        EventBus.emit('sync:failed', { error: error.message });

        if (error.message && error.message.includes('Not signed in')) {
            // Auth expired
            this.disableAutoSync();
            ToastService.error('Google Drive disconnected. Please reconnect.');
            EventBus.emit('drive:auth-expired');
            return;
        }

        if (error.status === 403) {
            // Quota exceeded
            ToastService.error('Google Drive quota exceeded');
            return;
        }

        if (error.status === 429) {
            // Rate limit - don't show error for auto-sync
            console.log('Rate limited - will retry later');
            if (isManual) {
                ToastService.warning('Rate limited. Please try again in a moment.');
            }
            return;
        }

        // Generic error
        if (isManual) {
            ToastService.error('Sync failed. Please try again.');
        } else {
            ToastService.warning('Auto-sync failed - will retry');
        }
    }
}

// Export singleton instance
export default new GoogleDriveSyncManager();
