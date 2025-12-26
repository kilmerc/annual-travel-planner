# **Requirements Scope and Specification: Smart Business Travel Planner**

## **1. Executive Summary**

A browser-based web application to assist business executives in planning annual travel. This decision-support system optimizes travel schedules by analyzing constraints (blackout dates, existing commitments), preferences (soft constraints), and opportunities for consolidation (avoiding redundant trips to the same location).

## **2. Core Functional Requirements**

### **2.1. Calendar Year Configuration**

The application uses standard calendar year with traditional quarters:

* **Calendar Year:** January 1 - December 31
* **Q1:** January, February, March
* **Q2:** April, May, June
* **Q3:** July, August, September
* **Q4:** October, November, December

The view engine renders grids based on these calendar-year groupings.

### **2.2. Week Definition**

**Work Week:** Monday through Friday (5-day week)
* Visual highlighting in calendar view only applies to weekdays
* Algorithm operates at the week level: if an event/constraint falls within any Mon-Fri period, the entire week is considered blocked
* Weekends (Sat-Sun) are not highlighted but are included in week-level blocking logic

### **2.3. Event Types & Data Taxonomy**

The system distinguishes between "Fixed" events (dates set by others) and "Flexible" events (dates to be determined by the optimizer).

**A. Travel Reasons (Categories):**

1. **Division Visits:** Usually flexible, specific location required
2. **GTS All-Hands:** Usually fixed dates
3. **PI Planning:** Fixed dates, can be Physical or Virtual
4. **BP Team Meetings:** Fixed or Flexible
5. **Other Business:** Ad-hoc

**B. Event Attributes:**

* `id`: Unique identifier (timestamp-based string)
* `title`: Descriptive name
* `location`: City/Division Office (Critical for optimization matching)
* `startDate`: ISO Date string (YYYY-MM-DD)
  * For **Flexible trips**: Normalized to the Monday of that week
  * For **Fixed trips**: Actual start date selected by user
* `endDate`: ISO Date string (YYYY-MM-DD), optional
  * Only used for **Fixed trips** with specific date ranges
  * For **Flexible trips**: null (week-based)
* `type`: One of the categories above
* `duration`: Number of weeks (default: 1)
* `isFixed`: Boolean indicating if date is flexible

### **2.4. Constraints & Preferences Engine**

Core logic component that scores specific weeks:

**A. Constraint Attributes:**

* `id`: Unique identifier (timestamp-based string)
* `title`: Descriptive name
* `type`: vacation | holiday | blackout | preference
* `startDate`: ISO Date string (YYYY-MM-DD) - actual start date of constraint
* `endDate`: ISO Date string (YYYY-MM-DD) - actual end date of constraint
* **Week-Level Blocking:** If a constraint overlaps with any Mon-Fri week, the entire week is blocked for scheduling purposes

**B. Constraint Types:**

1. **Hard Constraints (Must Not Travel):**
   * **Vacation:** Personal time off
   * **Company Holidays:** Corporate non-working weeks
   * **Blackout Weeks:** Critical business periods requiring home-office presence
   * *Effect:* Optimizer prevents scheduling

2. **Soft Constraints (Prefer Not to Travel):**
   * **Preference:** Date ranges marked as "Low Preference" (e.g., Kids' camps)
   * *Effect:* Optimizer penalizes these weeks but allows them if necessary

**C. Location Consolidation (The "Optimization" Logic):**
   * *Logic:* If user is attending a "PI Planning" meeting in London in Week 12, system detects this existing presence
   * *Effect:* Heavily incentivizes scheduling other "London" tasks during same week to consolidate travel

### **2.5. The Suggestion Algorithm (Scoring Model)**

When creating a "Flexible Trip" (e.g., "Visit London in Q2"), system scans all weeks in target quarter and assigns scores:

* **Base Score:** 100 points
* **Hard Constraint Violation:** -1000 points (Disqualified)
* **Soft Constraint Violation:** -20 points (Discouraged)
* **Location Conflict:** -1000 points (If already traveling to a *different* city)
* **Consolidation Opportunity:** +500 points (If already traveling to the *same* city)
* **Output:** Top 3 weeks with highest scores

## **3. User Interface (UI) Requirements**

### **3.1. Dashboard Header**

* **Year Control:** Buttons to navigate between calendar years (e.g., 2025, 2026)
* **View Toggles:** Switch between "Calendar", "Quarters", and "Timeline" modes
* **Metrics Bar:** Real-time counters for "Weeks Traveling," "Weeks Home," and "Conflicts"
* **Settings Button:** Access to application settings and data management

### **3.2. View Mode A: Calendar (Year-at-a-Glance)**

* **Layout:** Grid of 12 month calendars (January through December)
* **Visualization:**
  * Color-coded days indicating events and constraints
  * Legend showing color meanings for each event/constraint type
  * Interactive days that open quick-add modal when clicked
* **Event Types Colors:**
  * Division Visit: Blue
  * GTS All-Hands: Purple
  * PI Planning: Orange
  * BP Team Meeting: Green
  * Other Business: Gray
* **Constraint Type Colors:**
  * Vacation: Red
  * Holiday: Pink
  * Blackout: Dark Rose
  * Preference: Yellow

### **3.3. View Mode B: Quarterly Grid (Vertical List)**

* **Layout:** Four columns representing Q1–Q4
* **Structure:** Vertical stack of weeks
* **Visualization:**
  * Weeks explicitly labeled (e.g., "Week of 12th")
  * Constraints render as colored background rows (Red for hard, Yellow for soft)
  * Events render as colored cards inside the week slot
  * Quick add buttons on hover

### **3.4. View Mode C: Timeline (Gantt Style)**

* **Layout:** Horizontal scrolling timeline
* **Structure:** One continuous row of weeks grouped by Month headers
* **Visualization:**
  * **Constraints:** Rendered as hatched background patterns behind the grid
  * **Events:** Rendered as compact, colored bars floating over the week columns
  * **Interaction:** Hovering over empty slots reveals a "Quick Add" button

### **3.5. Input Panel (Modal)**

* **Tabbed Interface:** "Plan Trip" vs. "Add Constraint"
* **Smart Forms:**
  * **Trip Mode Toggle:** "Fixed Date" vs. "Flexible/Suggest"
    * **Flexible Mode:** Shows quarter selector and "Find Best Weeks" button with suggestion results
    * **Fixed Mode:** Shows start date and end date inputs for specific date ranges
  * **Constraint Form:** Start date and end date inputs for specifying constraint duration
  * Dynamic suggestions area that appears when "Find Best Weeks" is clicked
  * Dark mode compatible inputs and styling
* **Edit Functionality:**
  * Click on any event or constraint to open pre-filled edit modal
  * Edit button (pencil icon) appears on all events and constraints
  * Save updates existing record instead of creating new one
  * All fields are editable including dates, title, type, and location

### **3.6. Settings Panel**

* **Appearance:** Dark/Light mode toggle
* **Data Management:**
  * Load sample data for testing
  * Export data to JSON file
  * Import data from JSON file
  * Clear all data
* **Statistics:** Current data overview (event count, constraint count)

## **4. Technical Architecture**

### **4.1. Stack**

* **Language:** HTML5, Vanilla JavaScript (ES6+ with Modules)
* **Styling:** Tailwind CSS (via CDN) with dark mode support
* **Icons:** FontAwesome (via CDN)
* **Architecture:** Modular ES6 modules with no build step required
* **Module System:** Native browser ES6 module loading

### **4.2. Project Structure**

```
TravelPlanner/
├── index.html                    # Main HTML entry point
├── styles/
│   └── custom.css               # Custom styles
├── js/
│   ├── app.js                   # Application bootstrap
│   ├── config/
│   │   └── fiscalCalendar.js   # Calendar configuration
│   ├── models/
│   │   ├── Event.js            # Event data model
│   │   └── Constraint.js       # Constraint data model
│   ├── services/
│   │   ├── StateManager.js     # State management + localStorage
│   │   ├── DateService.js      # Date utilities
│   │   ├── ScoringEngine.js    # Optimization algorithm
│   │   └── DataService.js      # JSON import/export
│   ├── ui/
│   │   ├── ViewManager.js      # View orchestration
│   │   ├── CalendarView.js     # Calendar rendering
│   │   ├── QuartersView.js     # Quarterly grid rendering
│   │   ├── TimelineView.js     # Gantt timeline rendering
│   │   ├── MetricsBar.js       # Statistics display
│   │   ├── ModalManager.js     # Modal dialogs
│   │   └── SettingsView.js     # Settings panel
│   └── utils/
│       └── EventBus.js         # Simple pub/sub pattern
└── data/
    └── SampleData2026.json     # Test data
```

### **4.3. Data Persistence & Schema**

* **Primary Storage:** Browser localStorage
* **Portable Storage:** JSON Export/Import
* **Schema Structure:**

```json
{
  "year": 2026,
  "viewMode": "calendar",
  "events": [
    {
      "id": "...",
      "title": "...",
      "type": "division|gts|pi|bp|other",
      "location": "...",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",  // Only for fixed trips with date ranges, null for flexible
      "duration": 1,
      "isFixed": true
    }
  ],
  "constraints": [
    {
      "id": "...",
      "title": "...",
      "type": "vacation|holiday|blackout|preference",
      "startDate": "YYYY-MM-DD",  // Actual start date of constraint
      "endDate": "YYYY-MM-DD"     // Actual end date of constraint
    }
  ]
}
```

### **4.4. Dark Mode Implementation**

* Uses Tailwind CSS class-based dark mode (`dark:` prefix)
* Theme preference stored in localStorage
* System preference detection on first load
* All UI components have dark mode variants

### **4.5. Module Communication Pattern**

**State Flow (Unidirectional):**
```
User Action → UI Component → StateManager → localStorage
                                    ↓
                                EventBus.emit('state:changed')
                                    ↓
                            All UI Components Re-render
```

## **5. Development Status**

* **Phase 1 (Foundation):** Complete. Modular architecture with ES6 modules
* **Phase 2 (Logic):** Complete. Scoring algorithm handles constraints and consolidation
* **Phase 3 (Visualization):** Complete. Calendar, Quarterly, and Timeline views operational
* **Phase 4 (I/O):** Complete. JSON Export/Import, Sample data loading
* **Phase 5 (Settings & Dark Mode):** Complete. Settings panel with dark/light theme toggle
* **Phase 6 (Calendar Year Migration):** Complete. Migrated from fiscal year to standard calendar year
* **Phase 7 (Enhanced Date Handling & Editing):** Complete. Features include:
  * Week definition changed to Mon-Fri (5-day work week)
  * Fixed trips now support specific date ranges (start and end dates)
  * Constraints now support specific date ranges instead of just week blocking
  * Calendar view only highlights weekdays (Mon-Fri), not weekends
  * Edit functionality for both events and constraints
  * Fixed timezone issues preventing date shifting/persistence problems
  * Week-level overlap detection for algorithm while displaying actual dates visually

## **6. Key Technical Decisions**

### **6.1. ES6 Module Loading**
Native browser modules (no transpilation):
```html
<script type="module" src="./js/app.js"></script>
```

### **6.2. State Management Pattern**
- StateManager uses private fields (`#state`)
- Immutable state updates
- EventBus for decoupled communication
- localStorage auto-sync on every state change

### **6.3. Date Handling**
- **Flexible Trips:** Dates normalized to Monday of the week for week-based scheduling
- **Fixed Trips:** Actual start and end dates preserved for specific date ranges
- **Constraints:** Actual start and end dates preserved for precise blocking
- Timezone-aware date conversion (local time, not UTC) to prevent date shifting
- ISO format (YYYY-MM-DD) for storage and interchange
- Week overlap detection: If a constraint/trip falls within any Mon-Fri week, the entire week is blocked for algorithmic purposes

## **7. Running the Application**

1. Start HTTP server (required for ES6 modules):
   ```bash
   python -m http.server 8000
   ```

2. Open browser to `http://localhost:8000`

3. Load sample data via Settings → Load Sample Data

**Note:** File protocol (`file://`) will not work due to CORS restrictions on ES6 modules.
