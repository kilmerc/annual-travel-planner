# Gemini Context: Smart Business Travel Planner

## Project Overview
The **Smart Business Travel Planner** is a browser-based web application designed to help business executives optimize their annual travel schedules. It features a decision-support system that analyzes constraints, preferences, and consolidation opportunities.

*   **Type:** Web Application (SPA)
*   **Status:** Active Development (Phase 14 completed - User-Defined Types & Multi-Year Support)
*   **Data Persistence:** Browser `localStorage` with JSON export/import.

## Tech Stack
*   **Language:** JavaScript (ES6+ Modules), HTML5
*   **Styling:** Tailwind CSS (via CDN), Custom CSS (`styles/custom.css`)
*   **Icons:** FontAwesome
*   **Testing:** Vitest, jsdom, `@vitest/coverage-v8`
*   **Build:** None (Native ES6 modules)
*   **Server:** Requires a simple HTTP server (e.g., Python `http.server`) to avoid CORS issues with modules.

## Getting Started

### Prerequisites
*   Node.js (for testing)
*   Python (for local development server)

### Running the Application
Since the project uses ES6 modules, it must be served via HTTP, not `file://`.

```bash
# Start the development server
python -m http.server 8000
```

Access the application at: `http://localhost:8000`

### Testing
The project uses **Vitest** for unit and integration testing.

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Architecture

### Module Organization (`js/`)
The application is structured using native ES6 modules:

*   **`app.js`**: Entry point, initializes the application.
*   **`config/`**: Configuration constants (e.g., `calendarConfig.js`).
*   **`models/`**: Data models (`Event.js`, `Constraint.js`).
*   **`services/`**: Core logic and singletons.
    *   `StateManager.js`: Central state management, handles `localStorage` and data migration.
    *   `ScoringEngine.js`: Optimization algorithm for suggesting travel weeks.
    *   `DateService.js`: Timezone-aware date utilities.
    *   `DataService.js`: Import/Export functionality.
    *   `TutorialService.js`: Driver.js integration for user onboarding.
*   **`ui/`**: User Interface components.
    *   `CalendarView.js`: Main visualization (renders events/constraints).
    *   `ModalManager.js`: Handles Add/Edit/Delete interactions.
    *   `ViewManager.js`: Orchestrates view updates.
    *   `TypeManagementModal.js`, `LocationManagementModal.js`: Configuration UIs.
*   **`utils/`**: Utilities.
    *   `EventBus.js`: Pub/Sub pattern for component communication.

### State Management Pattern
Unidirectional data flow is enforced:
`User Action` -> `UI Component` -> `StateManager` -> `localStorage` -> `EventBus ('state:changed')` -> `UI Re-render`

### Key Design Concepts

1.  **Visual vs. Algorithmic Behavior**:
    *   **Visual (CalendarView):** Precise. A 3-day trip shows bars only on those 3 days.
    *   **Algorithmic (ScoringEngine):** Week-based. If *any* part of a Mon-Fri week is blocked, the *entire* week is considered unavailable for new flexible trips.

2.  **Date Handling**:
    *   Dates are stored as ISO strings (`YYYY-MM-DD`) in **Local Time**.
    *   **Flexible Trips:** Normalized to the Monday of the week.
    *   **Fixed Trips/Constraints:** Preserve exact start/end dates.

3.  **Type System**:
    *   **Built-in Types:** Protected (e.g., "Division Visit", "Vacation").
    *   **Custom Types:** User-defined via UI, fully configurable (colors, behavior).

## Directory Structure

```
TravelPlanner/
├── index.html              # Entry point
├── package.json            # NPM scripts and dev dependencies
├── js/                     # Source code
│   ├── app.js
│   ├── config/
│   ├── models/
│   ├── services/
│   ├── ui/
│   └── utils/
├── styles/                 # CSS
├── tests/                  # Vitest suite
│   ├── unit/
│   ├── integration/
│   └── setup/
├── data/                   # Sample data
└── .claude/                # Documentation
```

## Development Conventions

*   **Imports:** Always include the `.js` extension (e.g., `import X from './X.js'`) for native module support.
*   **Styling:** Prefer Tailwind utility classes. Use `styles/custom.css` sparingly for complex components.
*   **Testing:** Write unit tests for logic (services/models) and integration tests for workflows. Mock `localStorage` using the provided setup.
*   **Comments:** Use JSDoc for complex functions.
