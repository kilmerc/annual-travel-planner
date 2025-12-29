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
5. **Conference:** Professional conferences and events
6. **Other Business:** Ad-hoc

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
   * **Business Soft:** Business commitments that can be attended virtually (e.g., virtual meetings that can be joined from trip location)
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
* **Metrics Bar:** Real-time counters for "Weeks Traveling," "Weeks Home," and "Conflicts"
  * **Clickable Metrics:** All metrics are clickable and use consistent highlighting behavior
    * **Conflicts:** Highlights conflict days in red on calendar (Mon-Fri only, toggle on/off)
    * **Weeks Traveling:** Highlights all travel weeks in blue on calendar (Mon-Fri only, toggle on/off)
    * **Weeks Home:** Highlights all non-travel weeks in green on calendar (Mon-Fri only, toggle on/off)
  * **Highlighting Behavior:**
    * Click any metric to highlight corresponding days
    * Click again to toggle highlighting off
    * Only Mon-Fri are highlighted (weekends excluded for cleaner visual)
    * Consistent visual treatment across all three metrics
* **Settings Button:** Access to application settings and data management
* **Add Plan Button:** Opens modal for adding trips or constraints

### **3.2. Calendar View (Year-at-a-Glance)**

The application uses a single, unified calendar view displaying all 12 months of the year.

* **Layout:** Grid of 12 month calendars (January through December) in a responsive layout
* **Day Cell Structure:**
  * Day number displayed at top of cell
  * Colored bars for each constraint that occurs on that specific date
  * Colored bars for each event that occurs on that specific date
  * Multiple items can appear on the same day as separate bars
  * Only weekdays (Mon-Fri) display colored bars; weekends remain plain

* **Visual Display Rules:**
  * **Events and constraints appear ONLY on their actual dates**
  * A 1-day constraint shows as a bar only on that 1 day
  * A 3-day trip shows as bars on those 3 specific days
  * Flexible trips (week-based) show bars on all 5 weekdays of their week
  * If many items exist on one day, the cell becomes scrollable

* **Interaction:**
  * Click on a colored bar → Opens edit modal for that specific event/constraint
  * Click on empty day space → Opens add modal with that date pre-filled
  * Hover over bars → Shows tooltip with full details

* **Event Type Colors:**
  * Division Visit: Blue
  * GTS All-Hands: Purple
  * PI Planning: Orange
  * BP Team Meeting: Green
  * Conference: Teal
  * Other Business: Gray

* **Constraint Type Colors:**
  * Vacation: Red
  * Holiday: Pink
  * Blackout: Dark Rose
  * Business Soft: Light Orange
  * Preference: Yellow

### **3.3. Input Panel (Modal)**

* **Tabbed Interface:** "Plan Trip", "Add Constraint", and "Batch Plan"
* **Smart Forms:**
  * **Trip Mode Toggle:** "Fixed Date" vs. "Flexible/Suggest"
    * **Flexible Mode:** Shows quarter selector and "Find Best Weeks" button with suggestion results
    * **Fixed Mode:** Shows start date and end date inputs for specific date ranges
  * **Location Selection:**
    * **Division Dropdown:** Pre-populated alphabetical list of division codes (DAL, VAL, VCE, VCW, VER, VIN, VNE, VNY, VSC, VTX, VUT)
    * **Custom Location Option:** Select "Other Location (Custom)" to enter any city/location
    * Ensures accurate location entry and reduces typing errors for common destinations
  * **Multi-Add Mode:**
    * Optional checkbox to enable adding multiple date ranges for the same trip type or constraint
    * "Add Another Date Range" button appears when multi-add is enabled
    * Each additional date range can be removed individually
    * All date ranges are saved with the same title and type in a single save operation
    * Useful for recurring events like monthly PI planning sessions
  * **Constraint Form:** Start date and end date inputs for specifying constraint duration
  * Dynamic suggestions area that appears when "Find Best Weeks" is clicked
  * Dark mode compatible inputs and styling
* **Edit Functionality:**
  * Click on any event or constraint to open pre-filled edit modal
  * Edit button (pencil icon) appears on all events and constraints
  * Save updates existing record instead of creating new one
  * All fields are editable including dates, title, type, and location
  * **Cross-Type Editing:** When editing a constraint and switching to the trip tab (or vice versa), the system properly converts the item by deleting the original and creating the new type, preventing duplicate entries
* **Delete Functionality:**
  * Delete button appears in modal when editing events or constraints
  * Separate delete buttons for fixed trips, flexible trips, and constraints
  * Confirmation dialog before deletion to prevent accidental data loss
  * Modal closes automatically after successful deletion
* **Batch Planning Tab:**
  * Add multiple trips with complete trip details:
    - Title input field
    - Type dropdown (Division, GTS, PI, BP, Conference, Other)
    - Location dropdown matching main trip form (division codes + custom location)
    - Multi-select seasons: Winter (Dec-Feb), Spring (Mar-May), Summer (Jun-Aug), Fall (Sep-Nov)
    - Per-trip consolidation checkbox
  * Generate optimal plan showing top 3 week suggestions for each trip
  * Radio button selection - choose one week per trip
  * Real-time double-booking prevention:
    - When a week is selected for one trip, it's automatically disabled for other trips
    - Visual feedback (opacity) for disabled/unavailable weeks
    - Prevents accidental scheduling conflicts
  * Single "Add Selected Trips to Calendar" button adds all chosen trips at once
  * Dynamic trip row management - add/remove trips from batch as needed
  * Success confirmation after adding trips with option to close results

### **3.4. Settings Panel**

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
│   │   ├── ViewManager.js      # View orchestration (Calendar only)
│   │   ├── CalendarView.js     # Calendar rendering
│   │   ├── QuartersView.js     # [Deprecated - not in use]
│   │   ├── TimelineView.js     # [Deprecated - not in use]
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
      "type": "division|gts|pi|bp|conference|other",
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
      "type": "vacation|holiday|blackout|business-soft|preference",
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
* **Phase 8 (UI Simplification & Visual Precision):** Complete. Features include:
  * Removed Quarters and Timeline views - application now uses Calendar view exclusively
  * Removed view toggle buttons from header
  * **Visual precision:** Events and constraints now display ONLY on their actual dates
    * 1-day constraint shows on 1 day only (not full week)
    * 3-day trip shows on 3 days only (not full week)
    * Flexible trips still show on all 5 weekdays of their assigned week
  * **Algorithm unchanged:** Still operates at week level for scheduling logic
  * Clicking colored bars opens edit modal (not just delete)
  * Multiple overlapping events/constraints visible on same day as separate bars
  * Improved calendar layout - all weeks visible, scrollable day cells when needed
* **Phase 9 (Enhanced UX & Data Entry):** Complete. Features include:
  * **Division Location Dropdown:** Pre-populated alphabetical dropdown of 11 division codes with custom location fallback
  * **Multi-Add Mode:** Ability to add multiple date ranges for the same event type or constraint in a single operation
  * **Conference Trip Type:** Added "Conference" as a distinct trip type category
  * **Business Soft Constraint:** New soft constraint type for virtual/flexible business commitments
  * **Clickable Metrics:** Conflicts metric opens detailed modal showing all conflict information with categorization
  * **Cross-Type Edit Fix:** Proper handling when converting constraints to trips (or vice versa) during edit operations
* **Phase 10 (Calendar Year Migration & Feature Enhancements):** Complete. Features include:
  * **Fiscal Year Removal:** Complete removal of fiscal year concept - app now exclusively uses calendar year (Jan-Dec)
  * **File Renaming:** `fiscalCalendar.js` renamed to `calendarConfig.js` for clarity
  * **Delete Functionality:** Delete buttons added to event/constraint edit modals with confirmation dialogs
  * **Clickable Metrics for Highlighting:** Weeks Traveling and Weeks Home metrics now clickable to highlight corresponding weeks in calendar (blue for traveling, green for home)
  * **Batch Planning Mode:** New tab in modal for planning multiple trips simultaneously with:
    - Add multiple trips with locations
    - Multi-select season preferences (Winter: Dec-Feb, Spring: Mar-May, Summer: Jun-Aug, Fall: Sep-Nov)
    - Per-trip consolidation toggle
    - Top 3 week suggestions for each trip based on constraints and season preferences
    - Quick-add buttons to add suggested trips to calendar
* **Phase 11 (UX Refinements & Highlighting Improvements):** Complete. Features include:
  * **Weekday-Only Highlighting:** All metric highlighting (Traveling, Home, Conflicts) now applies to Mon-Fri only, excluding weekends
  * **Batch Planning Enhancements:**
    - Added title and type fields to batch trip form
    - Added location dropdown matching main trip form (division codes + custom location)
    - Radio button selection (one week per trip) replaces individual Add buttons
    - Real-time validation prevents double-booking across trips
    - Selected weeks are automatically disabled for other trips in the batch
    - Single "Add Selected Trips to Calendar" button for batch add
    - Success confirmation after adding trips
  * **Conflicts Highlighting:** Conflicts metric now uses red highlighting instead of modal popup, providing consistent UX with other metrics

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

### **6.4. Visual vs. Algorithmic Behavior (Critical Distinction)**

The application maintains a clear separation between what users SEE and how the optimizer THINKS:

**Visual Layer (CalendarView):**
- Events and constraints display as colored bars **only on their actual dates**
- A 1-day vacation (e.g., Friday Jan 17) shows as a single red bar on Friday only
- A 3-day trip (e.g., Tue-Thu Jan 14-16) shows as three blue bars on those specific days
- Users see precise date information matching their input

**Algorithmic Layer (ScoringEngine):**
- Operates at the **Mon-Fri week level** for scheduling decisions
- If ANY date in a Mon-Fri week has a hard constraint, the ENTIRE week is blocked
- If a trip occurs Wed-Fri of Week 3, scheduling another trip in Week 3 checks for location conflicts
- Example: Friday vacation blocks the whole Mon-Fri week for new trip suggestions

**Why This Design:**
1. **Visual Precision:** Users need to see exact dates for planning (e.g., "I'm off Jan 17, not the whole week")
2. **Week-Level Logic:** Business travel typically happens in week-long chunks, so the optimizer thinks in weeks
3. **Best of Both:** Precise visual feedback + practical week-based scheduling recommendations

**Implementation:**
- `CalendarView.js` filters events/constraints by exact date range for display
- `ScoringEngine.js` uses `overlapsWithWeek()` function to check Mon-Fri week conflicts
- `Event` and `Constraint` models store precise dates without normalization (except flexible trips)

## **7. Running the Application**

1. Start HTTP server (required for ES6 modules):
   ```bash
   python -m http.server 8000
   ```

2. Open browser to `http://localhost:8000`

3. Load sample data via Settings → Load Sample Data

**Note:** File protocol (`file://`) will not work due to CORS restrictions on ES6 modules.
