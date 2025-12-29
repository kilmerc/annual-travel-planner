import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup/globalSetup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'js/config/**/*.js',
        'js/models/**/*.js',
        'js/services/**/*.js',
        'js/utils/**/*.js',
        'js/ui/MetricsBar.js'
      ],
      exclude: [
        'js/ui/CalendarView.js',
        'js/ui/ModalManager.js',
        'js/ui/ViewManager.js',
        'js/ui/SettingsView.js',
        'js/services/TutorialService.js',
        'js/app.js',
        'tests/**',
        'node_modules/**'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      }
    }
  }
});
