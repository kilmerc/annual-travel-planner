/**
 * HTML Sanitizer Utility
 *
 * Provides functions to safely escape and sanitize user-controlled data
 * before rendering to prevent XSS attacks.
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for HTML insertion
 */
export function escapeHTML(str) {
    if (typeof str !== 'string') {
        return '';
    }

    const htmlEscapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    };

    return str.replace(/[&<>"'\/]/g, (char) => htmlEscapeMap[char]);
}

/**
 * Sanitize an attribute value for safe use in HTML attributes
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized attribute value
 */
export function sanitizeAttribute(str) {
    if (typeof str !== 'string') {
        return '';
    }

    // Remove any characters that could break out of attribute context
    return str.replace(/["'<>`]/g, '');
}

export default { escapeHTML, sanitizeAttribute };
