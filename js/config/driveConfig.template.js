/**
 * Google Drive API Configuration Template
 *
 * ⚠️ NOTE: This is a BACKUP/REFERENCE file only!
 * The actual configuration is in driveConfig.js (which IS committed to git).
 *
 * FOR APP DEVELOPERS (Creating a Fork):
 * ======================================
 * If you're forking this project and want to use your own Google Cloud project:
 *
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project (e.g., "My Travel Optimizer Fork")
 * 3. Enable the Google Drive API:
 *    - Navigate to "APIs & Services" > "Library"
 *    - Search for "Google Drive API"
 *    - Click "Enable"
 * 4. Create OAuth 2.0 credentials:
 *    - Go to "APIs & Services" > "Credentials"
 *    - Click "Create Credentials" > "OAuth client ID"
 *    - Application type: "Web application"
 *    - Name: "Travel Optimizer"
 *    - Add authorized JavaScript origins:
 *      - http://localhost:8000 (for local development)
 *      - https://yourdomain.com (for production, if applicable)
 *    - Copy the Client ID (looks like: 123456-abc123.apps.googleusercontent.com)
 * 5. Update driveConfig.js with your new Client ID
 * 6. Commit the change to your fork
 *
 * IMPORTANT NOTES:
 * ================
 * - Client ID is PUBLIC and safe to commit (it's not a secret!)
 * - Client ID identifies YOUR APP, not individual users
 * - Users sign in with THEIR Google accounts
 * - Each user's data goes to THEIR Google Drive, not yours
 * - No Client Secret is needed for client-side OAuth
 *
 * FOR END USERS:
 * ==============
 * You don't need to do anything! Just use the app and sign in when prompted.
 * The Client ID is already configured by the app developer.
 */

export const GOOGLE_DRIVE_CONFIG = {
  // This is a template - see driveConfig.js for the actual configuration
  CLIENT_ID: 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com',

  // API Configuration (do not modify)
  API_KEY: '', // Not needed for drive.file scope
  DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
  SCOPES: 'https://www.googleapis.com/auth/drive.file', // App-specific files only (most secure)

  // App Folder Settings
  APP_FOLDER_NAME: 'Travel Optimizer',

  // File Settings
  FILE_PREFIX: 'travel-plan-',
  FILE_EXTENSION: '.json',
  MIME_TYPE: 'application/json',

  // Sync Settings
  DEBOUNCE_DELAY: 3000, // 3 seconds - wait for user to stop making changes
  MAX_RETRIES: 3,       // Number of retry attempts for failed requests
  RETRY_DELAY: 2000,    // 2 seconds - initial delay between retries
};

export default GOOGLE_DRIVE_CONFIG;
