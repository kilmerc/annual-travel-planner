/**
 * Google Drive API Configuration
 *
 * PUBLIC CONFIGURATION:
 * This Client ID is PUBLIC and safe to commit to version control.
 * It identifies the Travel Optimizer app, not individual users.
 *
 * Each user who connects will sign in with THEIR Google account,
 * and their data will sync to THEIR Google Drive, not the app developer's.
 *
 * HOW IT WORKS:
 * - Client ID = App identity (public, shared by all users)
 * - Access Token = User identity (private, generated on sign-in)
 * - User's data stays in their own Google Drive
 */

export const GOOGLE_DRIVE_CONFIG = {
  // OAuth 2.0 Client ID for Travel Optimizer app
  CLIENT_ID: '760079255436-3ebahue6l9ldbpq7q5ot1t1cml0f435u.apps.googleusercontent.com',

  // API Configuration
  API_KEY: '',
  DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
  SCOPES: 'https://www.googleapis.com/auth/drive.file',

  // App Folder Settings
  APP_FOLDER_NAME: 'Travel Optimizer',

  // File Settings
  FILE_PREFIX: 'travel-plan-',
  FILE_EXTENSION: '.json',
  MIME_TYPE: 'application/json',

  // Sync Settings
  DEBOUNCE_DELAY: 3000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
};

export default GOOGLE_DRIVE_CONFIG;
