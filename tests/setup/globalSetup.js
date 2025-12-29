/**
 * Global test setup
 * Configures test environment and resets state between tests
 */

import { beforeEach, afterEach, vi } from 'vitest';
import { LocalStorageMock, FileReaderMock, BlobMock, URLMock, documentMock } from './browserMocks.js';

// Inject browser API mocks into global scope
global.localStorage = new LocalStorageMock();
global.FileReader = FileReaderMock;
global.Blob = BlobMock;
global.URL = URLMock;

// Mock document for DataService tests
if (typeof document === 'undefined') {
  global.document = documentMock;
}

// Reset state between tests
beforeEach(() => {
  // Clear localStorage before each test
  global.localStorage.clear();

  // Reset all mocks
  vi.clearAllMocks();
});

// Reset module cache after each test to ensure fresh singleton instances
afterEach(() => {
  vi.resetModules();
});
