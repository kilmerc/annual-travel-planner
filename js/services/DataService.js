/**
 * DataService - Import/Export functionality for JSON data
 */

export class DataService {
    /**
     * Export state to JSON string
     * @param {object} state - State object
     * @returns {string} JSON string
     */
    exportToJSON(state) {
        return JSON.stringify(state, null, 2);
    }

    /**
     * Import state from JSON string
     * @param {string} jsonString - JSON string
     * @returns {object} Parsed state object
     * @throws {Error} If JSON is invalid
     */
    importFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);

            // Validate structure
            if (typeof data !== 'object' || data === null) {
                throw new Error('Invalid data format');
            }

            // Ensure required fields exist with defaults
            return {
                year: data.year || new Date().getFullYear(),
                events: Array.isArray(data.events) ? data.events : [],
                constraints: Array.isArray(data.constraints) ? data.constraints : [],
                // Include all state fields for proper serialization
                eventTypeConfigs: data.eventTypeConfigs || {},
                constraintTypeConfigs: data.constraintTypeConfigs || {},
                customLocations: Array.isArray(data.customLocations) ? data.customLocations : []
            };
        } catch (error) {
            throw new Error(`Failed to import JSON: ${error.message}`);
        }
    }

    /**
     * Download JSON data as file
     * @param {object} state - State object
     * @param {string} filename - Filename (default: travel-plan-YYYY-MM-DD.json)
     */
    downloadJSON(state, filename = null) {
        const json = this.exportToJSON(state);
        const blob = new Blob([json], { type: 'application/json' });

        // Generate filename with date
        if (!filename) {
            const date = new Date().toISOString().split('T')[0];
            filename = `travel-plan-${date}.json`;
        }

        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Read file from file input
     * @param {File} file - File object
     * @returns {Promise<string>} File contents
     */
    async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                resolve(e.target.result);
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }
}

// Export singleton instance
export default new DataService();
