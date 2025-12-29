# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart Business Travel Planner - A browser-based web application for optimizing annual business travel schedules. Uses vanilla JavaScript ES6 modules with no build tools required.

**Recent Updates (Phase 10 & 11):**
- Fiscal year removed - now uses calendar year only (Jan-Dec)
- Delete functionality added to event/constraint modals
- Clickable metrics to highlight traveling/home/conflict weeks (Mon-Fri)
- Batch planning with titles, types, and location dropdowns
- Radio button selection with real-time double-booking prevention
- Conflicts now use highlighting instead of modal popup

## Development Commands

**Start Development Server:**
```bash
python -m http.server 8000
```
Then open `http://localhost:8000` in browser.

**Note:** The application MUST be served via HTTP server (not `file://` protocol) due to ES6 module CORS restrictions.

## Core Architecture

### Module System
- **Native ES6 modules** loaded directly by browser (no transpilation/bundling)
- Entry point: `index.html` → `<script type="module" src="./js/app.js">`
- All imports use `.js` extension explicitly

### State Management Pattern
```
User Action → UI Component → StateManager → localStorage
                                   ↓
                         EventBus.emit('state:changed')
                                   ↓
                       All UI Components Re-render
```

**StateManager** (singleton):
- Private state using `#state` field
- Immutable state updates
- Auto-syncs to localStorage on every change
- EventBus for decoupled component communication

### Module Organization

```
js/
├── app.js                   # Bootstrap entry point
├── config/
│   └── calendarConfig.js   # Calendar constants, quarters, constraint types
├── models/
│   ├── Event.js            # Event data model with toJSON/fromJSON
│   └── Constraint.js       # Constraint data model
├── services/
│   ├── StateManager.js     # State + localStorage (singleton)
│   ├── ScoringEngine.js    # Week optimization algorithm + batch planning
│   ├── DateService.js      # Date utilities (timezone-aware)
│   └── DataService.js      # JSON import/export
├── ui/
│   ├── ViewManager.js      # View orchestration
│   ├── CalendarView.js     # Calendar rendering + week highlighting
│   ├── MetricsBar.js       # Statistics display + clickable metrics
│   ├── ModalManager.js     # Add/Edit/Delete modals + batch planning
│   └── SettingsView.js     # Settings panel
└── utils/
    └── EventBus.js         # Pub/sub pattern
```

**Deprecated Files:** `QuartersView.js` and `TimelineView.js` exist but are not used (app uses Calendar view only).

## Critical Design Concepts

### Date Handling (Timezone-Aware)
- **Storage Format:** ISO strings (`YYYY-MM-DD`) in **local time** (not UTC)
- **Flexible Trips:** Dates normalized to Monday of week for week-based scheduling
- **Fixed Trips:** Preserve actual start/end dates for specific date ranges
- **Constraints:** Preserve actual start/end dates for precise blocking
- Week definition: **Monday-Friday** (5-day work week)

### Visual vs. Algorithmic Behavior

**CRITICAL DISTINCTION:**

**Visual Layer (CalendarView.js):**
- Events/constraints display ONLY on their actual dates
- 1-day vacation → shows 1 bar on that day
- 3-day trip → shows 3 bars on those days
- Users see precise date information

**Algorithmic Layer (ScoringEngine.js):**
- Operates at **Mon-Fri week level** for scheduling
- If ANY date in Mon-Fri week has hard constraint → entire week blocked
- Uses `overlapsWithWeek()` function for week-level conflict detection
- Example: Friday vacation blocks whole week for new trip suggestions

### Scoring Algorithm Logic

When suggesting weeks for flexible trips:
- Base score: 100 points
- Hard constraint violation: -1000 (vacation/holiday/blackout)
- Soft constraint violation: -20 (business-soft/preference)
- Location consolidation (same city): +500
- Location conflict (different city): -1000
- Filter: score > -500, return top 3 descending

### Event & Constraint Types

**Events (Travel):**
- `division` - Division Visits (Blue)
- `gts` - GTS All-Hands (Purple)
- `pi` - PI Planning (Orange)
- `bp` - BP Team Meeting (Green)
- `conference` - Conference (Teal)
- `other` - Other Business (Gray)

**Constraints:**
- Hard: `vacation` (Red), `holiday` (Pink), `blackout` (Dark Rose)
- Soft: `business-soft` (Light Orange), `preference` (Yellow)

## Data Schema

LocalStorage key: `travelPlannerState`

```json
{
  "year": 2026,
  "viewMode": "calendar",
  "events": [
    {
      "id": "timestamp-string",
      "title": "London Team Visit",
      "type": "division",
      "location": "London",
      "startDate": "2026-03-16",
      "endDate": "2026-03-18",
      "duration": 1,
      "isFixed": true
    }
  ],
  "constraints": [
    {
      "id": "timestamp-string",
      "title": "Summer Vacation",
      "type": "vacation",
      "startDate": "2026-07-13",
      "endDate": "2026-07-17"
    }
  ]
}
```

## Key Features

### Modal Tabs
The main modal has 3 tabs:
- **Plan Trip**: Add individual trips (fixed or flexible dates)
- **Add Constraint**: Add constraints (vacation, holidays, blackouts, preferences)
- **Batch Plan**: Plan multiple trips at once with season preferences

### Clickable Metrics
- Click "Weeks Traveling" to highlight all travel weeks in blue (Mon-Fri only)
- Click "Weeks Home" to highlight all non-travel weeks in green (Mon-Fri only)
- Click "Conflicts" to highlight conflict days in red (Mon-Fri only)
- Click again to toggle highlighting off
- All metrics use consistent highlighting behavior

### Batch Planning
- Add multiple trips with titles, types, locations, and season preferences
- Location dropdown matching main trip form (division codes + custom)
- Multi-select seasons (Winter: Dec-Feb, Spring: Mar-May, Summer: Jun-Aug, Fall: Sep-Nov)
- Per-trip consolidation toggle
- Get top 3 week suggestions for each trip
- Radio button selection (one week per trip)
- Real-time validation prevents double-booking across trips
- Single "Add Selected Trips" button adds all at once

### Delete Functionality
- Edit any event or constraint by clicking it in the calendar
- Delete button appears in modal when editing
- Confirmation dialog before deletion

## Common Development Tasks

### Adding New Event/Constraint Type
1. Add type constant to `js/config/calendarConfig.js`
2. Update color mapping in `CalendarView.js` (`getEventTypeColor()` or `getConstraintTypeColor()`)
3. Add option to HTML select in `index.html` (trip or constraint form)
4. If hard constraint: add to `HARD_CONSTRAINT_TYPES` array

### Modifying Scoring Logic
Edit `js/services/ScoringEngine.js` → `scoreWeek()` method

### Adding UI Component
1. Create module in `js/ui/`
2. Import in `js/app.js`
3. Initialize in `TravelPlannerApp.init()`
4. Subscribe to EventBus if needs state updates

### Testing with Sample Data
Settings → Load Sample Data (loads `data/SampleData2026.json`)

## Key Technical Notes

- **Dark Mode:** Tailwind class-based (`dark:` prefix), preference stored in localStorage
- **Calendar Year:** Standard Jan 1 - Dec 31 (Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec)
- **Division Codes:** 11 pre-populated options (DAL, VAL, VCE, VCW, VER, VIN, VNE, VNY, VSC, VTX, VUT) + custom
- **Multi-Add Mode:** Feature allowing multiple date ranges for same event/constraint in single operation
- **Conflict Detection:** Clickable metrics bar shows hard constraint conflicts and double-booking conflicts

## State Flow Example

When user adds a trip:
```
ModalManager.saveTripHandler()
  → StateManager.addEvent(event)
    → localStorage.setItem()
    → EventBus.emit('state:changed')
      → CalendarView renders
      → MetricsBar updates
```

## Important Constraints

- Week-level blocking applies to algorithm, NOT visual display
- All dates stored in local timezone (DateService handles conversion)
- Flexible trips MUST normalize to Monday (use `getMonday()` from DateService)
- Fixed trips preserve exact dates
- Only weekdays (Mon-Fri) display colored bars in calendar
