/**
 * GoogleDriveService - Google Drive API wrapper using Google Identity Services (GIS)
 *
 * Updated to use the new Google Identity Services OAuth 2.0 library
 * instead of the deprecated gapi.auth2 library.
 *
 * Handles:
 * - OAuth 2.0 authentication (using GIS)
 * - File operations (upload, download, list, delete)
 * - Folder management
 * - Error handling with retry logic
 *
 * Singleton service.
 */

import { GOOGLE_DRIVE_CONFIG } from '../config/driveConfig.js';
import ToastService from './ToastService.js';
import EventBus from '../utils/EventBus.js';

class GoogleDriveService {
    #isInitialized = false;
    #isSignedIn = false;
    #appFolderId = null;
    #tokenClient = null;
    #accessToken = null;
    #tokenExpiry = null;
    // Use sessionStorage for better security - tokens cleared when browser closes
    #STORAGE_KEY = 'googleDriveToken';

    /**
     * Initialize Google API client
     * Must be called before any other methods
     */
    async init() {
        if (this.#isInitialized) {
            return;
        }

        try {
            // Wait for Google APIs to load
            await this.#loadGoogleAPIs();

            // Initialize gapi client (for Drive API calls)
            await new Promise((resolve, reject) => {
                gapi.load('client', { callback: resolve, onerror: reject });
            });

            // Initialize the Drive API client
            await gapi.client.init({
                apiKey: GOOGLE_DRIVE_CONFIG.API_KEY,
                discoveryDocs: GOOGLE_DRIVE_CONFIG.DISCOVERY_DOCS
            });

            // Initialize the OAuth 2.0 token client (GIS)
            this.#tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_DRIVE_CONFIG.CLIENT_ID,
                scope: GOOGLE_DRIVE_CONFIG.SCOPES,
                callback: (response) => {
                    if (response.error) {
                        console.error('Token response error:', response);
                        this.#isSignedIn = false;
                        EventBus.emit('drive:auth-changed', { isSignedIn: false });

                        // Handle specific error cases
                        if (response.error === 'access_denied') {
                            // User denied access or is not authorized (not on test user list)
                            ToastService.error(
                                'Access denied. You need to be added as a test user. Please contact the developer with your Gmail address.',
                                8000 // 8 seconds
                            );
                        } else {
                            ToastService.error(`Authentication failed: ${response.error}`);
                        }
                        return;
                    }

                    // Store the access token
                    this.#accessToken = response.access_token;
                    this.#isSignedIn = true;

                    // Calculate expiry time (tokens typically expire in 1 hour)
                    const expiresIn = response.expires_in || 3600; // Default 1 hour
                    this.#tokenExpiry = Date.now() + (expiresIn * 1000);

                    // Persist token to localStorage
                    this.#saveToken();

                    // Set token for gapi client
                    gapi.client.setToken({
                        access_token: response.access_token
                    });

                    console.log('Successfully authenticated with Google Drive');
                    EventBus.emit('drive:auth-changed', { isSignedIn: true });
                    EventBus.emit('drive:connected');
                }
            });

            this.#isInitialized = true;
            console.log('GoogleDriveService initialized (using GIS)');

            // Try to restore token from localStorage
            this.#restoreToken();

        } catch (error) {
            console.error('Failed to initialize Google Drive Service:', error);
            throw new Error('Google Drive Service initialization failed');
        }
    }

    /**
     * Wait for Google APIs to load
     * @private
     */
    async #loadGoogleAPIs() {
        // Check if gapi is already loaded
        if (typeof gapi !== 'undefined' && typeof google !== 'undefined' && google.accounts) {
            return;
        }

        // Wait for scripts to load (with timeout)
        const timeout = 10000; // 10 seconds
        const startTime = Date.now();

        while (typeof gapi === 'undefined' || typeof google === 'undefined' || !google.accounts) {
            if (Date.now() - startTime > timeout) {
                throw new Error('Google API scripts failed to load');
            }
            await this.#sleep(100);
        }
    }

    /**
     * Check if user is signed in
     * @returns {boolean} True if signed in
     */
    isSignedIn() {
        return this.#isSignedIn;
    }

    /**
     * Get current user's email
     * Note: With GIS OAuth, we don't automatically get user info
     * We'd need to make a separate API call to get it
     * @returns {string|null} User email or null
     */
    getUserEmail() {
        // With token-based OAuth, we don't have user info by default
        // Would need to call userinfo API separately
        return null; // TODO: Implement if needed
    }

    /**
     * Sign in to Google Drive
     * Opens OAuth popup using GIS
     */
    async signIn() {
        if (!this.#isInitialized) {
            throw new Error('GoogleDriveService not initialized');
        }

        try {
            // Request an access token
            // This will open a popup for user consent
            this.#tokenClient.requestAccessToken({ prompt: 'consent' });

            // Note: The callback will be called when auth completes
            // Return true to indicate request was initiated
            return true;
        } catch (error) {
            console.error('Sign in failed:', error);
            throw error;
        }
    }

    /**
     * Sign out from Google Drive
     */
    async signOut() {
        if (!this.#isInitialized) {
            return;
        }

        try {
            // Revoke the access token
            if (this.#accessToken) {
                google.accounts.oauth2.revoke(this.#accessToken, () => {
                    console.log('Access token revoked');
                });
            }

            // Clear client token
            gapi.client.setToken(null);

            this.#isSignedIn = false;
            this.#appFolderId = null;
            this.#accessToken = null;
            this.#tokenExpiry = null;

            // Clear persisted token
            this.#clearToken();

            EventBus.emit('drive:disconnected');
        } catch (error) {
            console.error('Sign out failed:', error);
            throw error;
        }
    }

    /**
     * Ensure app folder exists, create if not
     * @returns {Promise<string>} Folder ID
     */
    async ensureAppFolder() {
        if (this.#appFolderId) {
            return this.#appFolderId;
        }

        try {
            // Search for existing folder
            const response = await gapi.client.drive.files.list({
                q: `name='${GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id, name)',
                spaces: 'drive'
            });

            if (response.result.files && response.result.files.length > 0) {
                // Folder exists
                this.#appFolderId = response.result.files[0].id;
                return this.#appFolderId;
            }

            // Create folder
            const createResponse = await gapi.client.drive.files.create({
                resource: {
                    name: GOOGLE_DRIVE_CONFIG.APP_FOLDER_NAME,
                    mimeType: 'application/vnd.google-apps.folder'
                },
                fields: 'id'
            });

            this.#appFolderId = createResponse.result.id;
            console.log(`Created app folder: ${this.#appFolderId}`);
            return this.#appFolderId;

        } catch (error) {
            console.error('Failed to ensure app folder:', error);
            throw error;
        }
    }

    /**
     * Upload file to Google Drive
     * @param {string} filename - Filename (e.g., travel-plan-2025-12-29.json)
     * @param {string} content - JSON string content
     * @param {number} retryCount - Current retry attempt
     * @returns {Promise<object>} File metadata
     */
    async uploadFile(filename, content, retryCount = 0) {
        if (!this.#isSignedIn) {
            throw new Error('Not signed in to Google Drive');
        }

        try {
            const folderId = await this.ensureAppFolder();

            // Check if file already exists
            const existingFile = await this.#findFile(filename);

            if (existingFile) {
                // Update existing file
                const response = await gapi.client.request({
                    path: `/upload/drive/v3/files/${existingFile.id}`,
                    method: 'PATCH',
                    params: {
                        uploadType: 'media'
                    },
                    body: content
                });

                return response.result;
            } else {
                // Create new file
                const metadata = {
                    name: filename,
                    mimeType: GOOGLE_DRIVE_CONFIG.MIME_TYPE,
                    parents: [folderId]
                };

                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                form.append('file', new Blob([content], { type: GOOGLE_DRIVE_CONFIG.MIME_TYPE }));

                const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime', {
                    method: 'POST',
                    headers: new Headers({ 'Authorization': 'Bearer ' + this.#accessToken }),
                    body: form
                });

                if (!response.ok) {
                    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
                }

                return await response.json();
            }

        } catch (error) {
            console.error('Upload file failed:', error);

            // Retry logic
            if (retryCount < GOOGLE_DRIVE_CONFIG.MAX_RETRIES && this.#isRetriableError(error)) {
                const delay = GOOGLE_DRIVE_CONFIG.RETRY_DELAY * (retryCount + 1);
                console.log(`Retrying upload in ${delay}ms (attempt ${retryCount + 1}/${GOOGLE_DRIVE_CONFIG.MAX_RETRIES})`);
                await this.#sleep(delay);
                return this.uploadFile(filename, content, retryCount + 1);
            }

            throw error;
        }
    }

    /**
     * Download file from Google Drive
     * @param {string} fileId - File ID
     * @returns {Promise<string>} File content (JSON string)
     */
    async downloadFile(fileId) {
        if (!this.#isSignedIn) {
            throw new Error('Not signed in to Google Drive');
        }

        try {
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });

            return JSON.stringify(response.result);

        } catch (error) {
            console.error('Download file failed:', error);
            throw error;
        }
    }

    /**
     * List files in app folder
     * @param {string} query - Additional query parameters
     * @returns {Promise<Array>} List of files
     */
    async listFiles(query = '') {
        if (!this.#isSignedIn) {
            throw new Error('Not signed in to Google Drive');
        }

        try {
            const folderId = await this.ensureAppFolder();

            let q = `'${folderId}' in parents and trashed=false`;
            if (query) {
                q += ` and ${query}`;
            }

            const response = await gapi.client.drive.files.list({
                q: q,
                fields: 'files(id, name, modifiedTime, size)',
                spaces: 'drive',
                orderBy: 'modifiedTime desc'
            });

            return response.result.files || [];

        } catch (error) {
            console.error('List files failed:', error);
            throw error;
        }
    }

    /**
     * Find file by name
     * @param {string} filename - Filename to search for
     * @returns {Promise<object|null>} File metadata or null
     * @private
     */
    async #findFile(filename) {
        try {
            const folderId = await this.ensureAppFolder();

            const response = await gapi.client.drive.files.list({
                q: `'${folderId}' in parents and name='${filename}' and trashed=false`,
                fields: 'files(id, name, modifiedTime)',
                spaces: 'drive'
            });

            if (response.result.files && response.result.files.length > 0) {
                return response.result.files[0];
            }

            return null;

        } catch (error) {
            console.error('Find file failed:', error);
            return null;
        }
    }

    /**
     * Get file metadata
     * @param {string} fileId - File ID
     * @returns {Promise<object>} File metadata
     */
    async getFileMetadata(fileId) {
        if (!this.#isSignedIn) {
            throw new Error('Not signed in to Google Drive');
        }

        try {
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                fields: 'id, name, modifiedTime, size'
            });

            return response.result;

        } catch (error) {
            console.error('Get file metadata failed:', error);
            throw error;
        }
    }

    /**
     * Delete file
     * @param {string} fileId - File ID
     */
    async deleteFile(fileId) {
        if (!this.#isSignedIn) {
            throw new Error('Not signed in to Google Drive');
        }

        try {
            await gapi.client.drive.files.delete({
                fileId: fileId
            });

        } catch (error) {
            console.error('Delete file failed:', error);
            throw error;
        }
    }

    /**
     * Check if error is retriable
     * @param {Error} error - Error object
     * @returns {boolean} True if should retry
     * @private
     */
    #isRetriableError(error) {
        // Retry on network errors, rate limits, and server errors
        if (!navigator.onLine) {
            return true;
        }

        if (error.status) {
            return [429, 500, 503].includes(error.status);
        }

        return false;
    }

    /**
     * Sleep helper
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise}
     * @private
     */
    #sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Save token to sessionStorage (cleared on browser close for enhanced security)
     * @private
     */
    #saveToken() {
        try {
            const tokenData = {
                accessToken: this.#accessToken,
                expiry: this.#tokenExpiry
            };
            sessionStorage.setItem(this.#STORAGE_KEY, JSON.stringify(tokenData));
            console.log('Token saved to sessionStorage');
        } catch (error) {
            console.error('Failed to save token:', error);
        }
    }

    /**
     * Restore token from sessionStorage (valid only for current browser session)
     * @private
     */
    #restoreToken() {
        try {
            const stored = sessionStorage.getItem(this.#STORAGE_KEY);
            if (!stored) {
                console.log('No stored token found');
                return;
            }

            const tokenData = JSON.parse(stored);
            const now = Date.now();

            // Check if token is expired (with 5 minute buffer)
            if (tokenData.expiry && tokenData.expiry - now < 5 * 60 * 1000) {
                console.log('Stored token is expired or expiring soon');
                this.#clearToken();
                return;
            }

            // Token is valid - restore it
            this.#accessToken = tokenData.accessToken;
            this.#tokenExpiry = tokenData.expiry;
            this.#isSignedIn = true;

            // Set token for gapi client
            gapi.client.setToken({
                access_token: this.#accessToken
            });

            console.log('Token restored from sessionStorage');
            EventBus.emit('drive:auth-changed', { isSignedIn: true });
            EventBus.emit('drive:connected');

        } catch (error) {
            console.error('Failed to restore token:', error);
            this.#clearToken();
        }
    }

    /**
     * Clear token from sessionStorage
     * @private
     */
    #clearToken() {
        try {
            sessionStorage.removeItem(this.#STORAGE_KEY);
            console.log('Token cleared from sessionStorage');
        } catch (error) {
            console.error('Failed to clear token:', error);
        }
    }
}

// Export singleton instance
export default new GoogleDriveService();
