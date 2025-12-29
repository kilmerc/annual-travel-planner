/**
 * HelpModal - Comprehensive guide modal
 *
 * Explains how the application works including:
 * - Trips and constraints
 * - Scheduling algorithms
 * - Hard and soft stops
 * - Conflicts and optimization
 */

import EventBus from '../utils/EventBus.js';

export class HelpModal {
    #modalId = 'helpModal';

    /**
     * Initialize modal
     */
    init() {
        this.#createModal();
        this.#setupEventListeners();

        // Listen for help requests
        EventBus.on('help:open', () => this.open());
    }

    /**
     * Create modal HTML
     * @private
     */
    #createModal() {
        const modalHTML = `
            <div id="${this.#modalId}" class="modal fixed inset-0 bg-black/50 z-50 hidden flex items-center justify-center opacity-0 pointer-events-none">
                <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                    <div class="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 border-b border-blue-700 flex justify-between items-center sticky top-0">
                        <div class="flex items-center gap-3">
                            <i class="fas fa-book-open text-white text-2xl"></i>
                            <div>
                                <h3 class="font-bold text-xl text-white">How It Works</h3>
                                <p class="text-xs text-blue-100">Comprehensive Guide to Travel Optimizer</p>
                            </div>
                        </div>
                        <button data-modal-close="${this.#modalId}" class="text-white hover:text-blue-200 transition">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>

                    <div class="p-6 overflow-y-auto max-h-[calc(90vh-120px)] prose prose-slate dark:prose-invert max-w-none">
                        <!-- Overview Section -->
                        <section class="mb-8">
                            <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <i class="fas fa-compass text-blue-600 dark:text-blue-400"></i>
                                Overview
                            </h2>
                            <p class="text-slate-600 dark:text-slate-400 leading-relaxed">
                                The <strong>Smart Business Travel Planner</strong> helps you optimize your annual business travel schedule.
                                It uses intelligent algorithms to find the best weeks for travel while respecting your constraints
                                and preferences, helping you minimize conflicts and maximize efficiency.
                            </p>
                        </section>

                        <!-- Core Concepts Section -->
                        <section class="mb-8">
                            <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <i class="fas fa-lightbulb text-amber-600 dark:text-amber-400"></i>
                                Core Concepts
                            </h2>

                            <div class="space-y-6">
                                <!-- Trips -->
                                <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 border-l-4 border-blue-600">
                                    <h3 class="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
                                        <i class="fas fa-plane"></i>
                                        Trips (Events)
                                    </h3>
                                    <p class="text-slate-700 dark:text-slate-300 mb-3">
                                        Trips are your business travel events that you need to schedule. They can be:
                                    </p>
                                    <ul class="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400 ml-4">
                                        <li><strong>Fixed Trips:</strong> Travel with specific dates already determined (e.g., attending a conference on March 15-17)</li>
                                        <li><strong>Flexible Trips:</strong> Travel that can happen anytime within a planning range - the algorithm will suggest optimal weeks</li>
                                    </ul>
                                    <div class="mt-3 text-sm text-slate-600 dark:text-slate-400">
                                        <strong>Trip Types:</strong> Division Visits, GTS All-Hands, PI Planning, BP Team Meetings, Conferences, and custom types you create
                                    </div>
                                </div>

                                <!-- Constraints -->
                                <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-5 border-l-4 border-red-600">
                                    <h3 class="text-lg font-semibold text-red-900 dark:text-red-200 mb-2 flex items-center gap-2">
                                        <i class="fas fa-ban"></i>
                                        Constraints
                                    </h3>
                                    <p class="text-slate-700 dark:text-slate-300 mb-3">
                                        Constraints represent periods when travel should be avoided or discouraged. They affect how the algorithm schedules flexible trips.
                                    </p>
                                    <div class="space-y-3">
                                        <div>
                                            <strong class="text-red-700 dark:text-red-300">Hard Constraints (Blocking):</strong>
                                            <ul class="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 ml-4 mt-1">
                                                <li>Personal Vacation - completely blocks scheduling</li>
                                                <li>Company Holidays - no travel will be scheduled</li>
                                                <li>Blackout Periods - designated off-limits times</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <strong class="text-amber-700 dark:text-amber-300">Soft Constraints (Discouraged):</strong>
                                            <ul class="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 ml-4 mt-1">
                                                <li>Business-Soft - travel is possible but discouraged</li>
                                                <li>Preferences - times you'd prefer to avoid but can if needed</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <!-- Conflicts -->
                                <div class="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-5 border-l-4 border-orange-600">
                                    <h3 class="text-lg font-semibold text-orange-900 dark:text-orange-200 mb-2 flex items-center gap-2">
                                        <i class="fas fa-exclamation-triangle"></i>
                                        Conflicts
                                    </h3>
                                    <p class="text-slate-700 dark:text-slate-300 mb-2">
                                        Conflicts occur when trips overlap with constraints or other trips. The app helps you identify and resolve them:
                                    </p>
                                    <ul class="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 ml-4">
                                        <li><strong>Hard Constraint Conflicts:</strong> Trip overlaps with vacation, holiday, or blackout period</li>
                                        <li><strong>Double-Booking:</strong> Multiple trips scheduled in the same location-week</li>
                                        <li><strong>Location Conflicts:</strong> Multiple trips in different locations during the same week</li>
                                    </ul>
                                    <p class="text-sm text-slate-600 dark:text-slate-400 mt-3">
                                        💡 <strong>Tip:</strong> Click on the "Conflicts" metric in the metrics bar to highlight all conflict days on the calendar.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <!-- Scheduling Algorithms Section -->
                        <section class="mb-8">
                            <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <i class="fas fa-robot text-purple-600 dark:text-purple-400"></i>
                                Scheduling Algorithms
                            </h2>

                            <div class="space-y-6">
                                <!-- Week-Level Scheduling -->
                                <div class="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-5">
                                    <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Week-Level Scheduling</h3>
                                    <p class="text-slate-600 dark:text-slate-400 mb-3">
                                        The algorithm operates at the <strong>Monday-Friday week level</strong>. This means:
                                    </p>
                                    <ul class="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400 ml-4">
                                        <li>If ANY day within a Mon-Fri week has a hard constraint, the <strong>entire week</strong> is blocked from new trip suggestions</li>
                                        <li>Example: A Friday vacation blocks the whole week for flexible trip scheduling</li>
                                        <li>Visual display shows events only on their actual dates, but scheduling logic considers full weeks</li>
                                    </ul>
                                </div>

                                <!-- Scoring System -->
                                <div class="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-5">
                                    <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Intelligent Scoring System</h3>
                                    <p class="text-slate-600 dark:text-slate-400 mb-3">
                                        When suggesting weeks for flexible trips, each week receives a score:
                                    </p>
                                    <div class="space-y-2 text-sm">
                                        <div class="flex items-center gap-2">
                                            <span class="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 px-2 py-1 rounded font-mono">+100</span>
                                            <span class="text-slate-600 dark:text-slate-400">Base score for available week</span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-2 py-1 rounded font-mono">+500</span>
                                            <span class="text-slate-600 dark:text-slate-400">Location consolidation bonus (same city as another trip)</span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded font-mono">-20</span>
                                            <span class="text-slate-600 dark:text-slate-400">Soft constraint penalty</span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 px-2 py-1 rounded font-mono">-1000</span>
                                            <span class="text-slate-600 dark:text-slate-400">Hard constraint violation OR location conflict (different city)</span>
                                        </div>
                                    </div>
                                    <p class="text-slate-600 dark:text-slate-400 mt-4">
                                        The algorithm returns the top 3 weeks with scores above -500, sorted by highest score first.
                                    </p>
                                </div>

                                <!-- Batch Planning -->
                                <div class="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-5 border-l-4 border-indigo-600">
                                    <h3 class="text-lg font-semibold text-indigo-900 dark:text-indigo-200 mb-2 flex items-center gap-2">
                                        <i class="fas fa-layer-group"></i>
                                        Batch Planning
                                    </h3>
                                    <p class="text-slate-700 dark:text-slate-300 mb-3">
                                        Plan multiple trips simultaneously with intelligent optimization:
                                    </p>
                                    <ul class="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400 ml-4">
                                        <li>Add multiple trips with preferred seasons (Winter, Spring, Summer, Fall)</li>
                                        <li>Get top 3 week suggestions for each trip</li>
                                        <li>Select one week per trip via radio buttons</li>
                                        <li>Real-time validation prevents double-booking across trips</li>
                                        <li>Option to consolidate trips (algorithm favors same-location weeks)</li>
                                        <li>Add all selected trips with a single click</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <!-- Key Features Section -->
                        <section class="mb-8">
                            <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <i class="fas fa-star text-yellow-600 dark:text-yellow-400"></i>
                                Key Features
                            </h2>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div class="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                                    <h4 class="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                                        <i class="fas fa-calendar-alt text-blue-600"></i>
                                        Time Range Planning
                                    </h4>
                                    <p class="text-sm text-slate-600 dark:text-slate-400">
                                        Choose from Current Year, Current Quarter, Next 3/6/12 Months for flexible scheduling range
                                    </p>
                                </div>

                                <div class="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                                    <h4 class="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                                        <i class="fas fa-mouse-pointer text-green-600"></i>
                                        Clickable Metrics
                                    </h4>
                                    <p class="text-sm text-slate-600 dark:text-slate-400">
                                        Click metrics to highlight: Weeks Traveling (blue), Weeks Home (green), Conflicts (red) - Mon-Fri only
                                    </p>
                                </div>

                                <div class="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                                    <h4 class="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                                        <i class="fas fa-palette text-purple-600"></i>
                                        Custom Types
                                    </h4>
                                    <p class="text-sm text-slate-600 dark:text-slate-400">
                                        Create custom trip and constraint types with colors, labels, and hard/soft stop behavior
                                    </p>
                                </div>

                                <div class="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                                    <h4 class="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                                        <i class="fas fa-map-marker-alt text-cyan-600"></i>
                                        Location Management
                                    </h4>
                                    <p class="text-sm text-slate-600 dark:text-slate-400">
                                        Built-in division codes plus custom locations with archiving when deleted
                                    </p>
                                </div>

                                <div class="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                                    <h4 class="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                                        <i class="fas fa-archive text-amber-600"></i>
                                        Archiving
                                    </h4>
                                    <p class="text-sm text-slate-600 dark:text-slate-400">
                                        Archive events to exclude from algorithm while preserving data - greyed out with archive icon
                                    </p>
                                </div>

                                <div class="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
                                    <h4 class="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                                        <i class="fas fa-download text-indigo-600"></i>
                                        Data Portability
                                    </h4>
                                    <p class="text-sm text-slate-600 dark:text-slate-400">
                                        Export/import your entire schedule as JSON for backup or sharing
                                    </p>
                                </div>
                            </div>
                        </section>

                        <!-- Hard vs Soft Stops Section -->
                        <section class="mb-8">
                            <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <i class="fas fa-shield-alt text-red-600 dark:text-red-400"></i>
                                Hard Stops vs. Soft Stops
                            </h2>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-5 border-2 border-red-300 dark:border-red-700">
                                    <h3 class="text-lg font-semibold text-red-900 dark:text-red-200 mb-3 flex items-center gap-2">
                                        <i class="fas fa-stop-circle"></i>
                                        Hard Stops
                                    </h3>
                                    <p class="text-slate-700 dark:text-slate-300 mb-3">
                                        <strong>Absolute blocking constraints</strong> that prevent trip scheduling in overlapping weeks.
                                    </p>
                                    <div class="space-y-2 text-sm">
                                        <div class="flex items-start gap-2">
                                            <i class="fas fa-check text-red-600 mt-1"></i>
                                            <span class="text-slate-600 dark:text-slate-400">Algorithm will <strong>never</strong> suggest these weeks</span>
                                        </div>
                                        <div class="flex items-start gap-2">
                                            <i class="fas fa-check text-red-600 mt-1"></i>
                                            <span class="text-slate-600 dark:text-slate-400">Score penalty: -1000 points</span>
                                        </div>
                                        <div class="flex items-start gap-2">
                                            <i class="fas fa-check text-red-600 mt-1"></i>
                                            <span class="text-slate-600 dark:text-slate-400">Examples: Vacation, Holiday, Blackout</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-5 border-2 border-yellow-300 dark:border-yellow-700">
                                    <h3 class="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-3 flex items-center gap-2">
                                        <i class="fas fa-hand-paper"></i>
                                        Soft Stops
                                    </h3>
                                    <p class="text-slate-700 dark:text-slate-300 mb-3">
                                        <strong>Discouraged but not blocked</strong> - algorithm penalizes but allows scheduling if needed.
                                    </p>
                                    <div class="space-y-2 text-sm">
                                        <div class="flex items-start gap-2">
                                            <i class="fas fa-check text-yellow-600 mt-1"></i>
                                            <span class="text-slate-600 dark:text-slate-400">Algorithm will suggest if better options unavailable</span>
                                        </div>
                                        <div class="flex items-start gap-2">
                                            <i class="fas fa-check text-yellow-600 mt-1"></i>
                                            <span class="text-slate-600 dark:text-slate-400">Score penalty: -20 points</span>
                                        </div>
                                        <div class="flex items-start gap-2">
                                            <i class="fas fa-check text-yellow-600 mt-1"></i>
                                            <span class="text-slate-600 dark:text-slate-400">Examples: Business-Soft, Preference</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-l-4 border-blue-600">
                                <p class="text-sm text-slate-700 dark:text-slate-300">
                                    <i class="fas fa-info-circle text-blue-600 dark:text-blue-400 mr-2"></i>
                                    <strong>When creating custom types:</strong> Choose "Hard Stop" if the constraint should absolutely prevent scheduling,
                                    or leave it unchecked for "Soft" if it should just discourage scheduling.
                                </p>
                            </div>
                        </section>

                        <!-- Tips Section -->
                        <section class="mb-4">
                            <h2 class="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <i class="fas fa-magic text-teal-600 dark:text-teal-400"></i>
                                Pro Tips
                            </h2>

                            <div class="space-y-3">
                                <div class="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4 border-l-4 border-teal-600">
                                    <p class="text-slate-700 dark:text-slate-300 text-sm">
                                        <strong>💡 Location Consolidation:</strong> The algorithm gives +500 bonus points when multiple trips
                                        can be scheduled in the same city during the same week, helping minimize travel frequency.
                                    </p>
                                </div>

                                <div class="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4 border-l-4 border-teal-600">
                                    <p class="text-slate-700 dark:text-slate-300 text-sm">
                                        <strong>💡 Multi-Add Mode:</strong> When adding fixed trips or constraints, enable "Multi-Add Mode"
                                        to add multiple date ranges for the same event with a single save.
                                    </p>
                                </div>

                                <div class="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4 border-l-4 border-teal-600">
                                    <p class="text-slate-700 dark:text-slate-300 text-sm">
                                        <strong>💡 Edit by Clicking:</strong> Click any event or constraint on the calendar to quickly edit or delete it.
                                    </p>
                                </div>

                                <div class="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4 border-l-4 border-teal-600">
                                    <p class="text-slate-700 dark:text-slate-300 text-sm">
                                        <strong>💡 Dark Mode:</strong> Toggle between light and dark mode in Settings → Appearance for comfortable viewing in any environment.
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div class="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end items-center">
                        <button data-modal-close="${this.#modalId}" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition shadow-sm">
                            Got It!
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    /**
     * Setup event listeners
     * @private
     */
    #setupEventListeners() {
        // Modal close buttons
        document.addEventListener('click', (e) => {
            const closeBtn = e.target.closest(`[data-modal-close="${this.#modalId}"]`);
            if (closeBtn) {
                this.close();
            }
        });
    }

    /**
     * Open modal
     */
    open() {
        this.#openModal();
    }

    /**
     * Open modal with animation
     * @private
     */
    #openModal() {
        const modal = document.getElementById(this.#modalId);
        if (!modal) return;

        modal.classList.remove('hidden', 'pointer-events-none');

        setTimeout(() => {
            modal.classList.remove('opacity-0');
            modal.classList.add('opacity-100', 'pointer-events-auto');
        }, 10);
    }

    /**
     * Close modal with animation
     */
    close() {
        const modal = document.getElementById(this.#modalId);
        if (!modal) return;

        modal.classList.remove('opacity-100', 'pointer-events-auto');
        modal.classList.add('opacity-0', 'pointer-events-none');

        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

export default HelpModal;
