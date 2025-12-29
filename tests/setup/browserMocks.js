/**
 * Browser API mocks for testing
 * Provides mock implementations for localStorage, FileReader, Blob, URL, and document
 */

export class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }

  clear() {
    this.store = {};
  }

  get length() {
    return Object.keys(this.store).length;
  }

  key(index) {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }
}

export class FileReaderMock {
  constructor() {
    this.result = null;
    this.error = null;
    this.onload = null;
    this.onerror = null;
  }

  readAsText(blob) {
    setTimeout(() => {
      try {
        this.result = blob.text || blob;
        if (this.onload) {
          this.onload({ target: this });
        }
      } catch (error) {
        this.error = error;
        if (this.onerror) {
          this.onerror({ target: this });
        }
      }
    }, 0);
  }
}

export class BlobMock {
  constructor(parts = [], options = {}) {
    this.parts = parts;
    this.type = options.type || '';
    this.text = parts.join('');
  }

  async text() {
    return this.text;
  }

  get size() {
    return this.text.length;
  }
}

export const URLMock = {
  createObjectURL: (blob) => `blob:mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  revokeObjectURL: (url) => {
    // No-op for testing
  }
};

export const documentMock = {
  createElement: (tag) => {
    const element = {
      tagName: tag.toUpperCase(),
      href: '',
      download: '',
      style: {},
      setAttribute: function(name, value) {
        this[name] = value;
      },
      getAttribute: function(name) {
        return this[name];
      },
      click: () => {
        // No-op for testing
      }
    };
    return element;
  },
  body: {
    appendChild: () => {},
    removeChild: () => {}
  },
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => []
};
