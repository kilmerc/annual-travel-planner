/**
 * TutorialService - Interactive guided tour using driver.js
 *
 * Provides first-time walkthrough and on-demand help
 */

import EventBus from '../utils/EventBus.js';

class TutorialService {
    #driver = null;
    #hasCompletedTutorial = false;
    #hasCompletedModalTutorial = false;
    #shouldShowModalTutorialNext = false;

    constructor() {
        // Check if tutorials have been completed
        this.#hasCompletedTutorial = localStorage.getItem('tutorialCompleted') === 'true';
        this.#hasCompletedModalTutorial = localStorage.getItem('modalTutorialCompleted') === 'true';
    }

    /**
     * Initialize the driver.js instance
     * @private
     */
    #initDriver() {
        if (this.#driver) {
            return; // Already initialized
        }

        // Use driver.js from global scope (loaded via CDN)
        // Access via window.driver.js.driver per driver.js CDN API
        const driverConstructor = window.driver?.js?.driver;
        if (!driverConstructor) {
            console.error('driver.js library not loaded');
            return;
        }

        this.#driver = driverConstructor({
            animate: true,
            opacity: 0.75,
            padding: 10,
            allowClose: true,
            overlayClickNext: false,
            showButtons: ['next', 'previous', 'close'],
            doneBtnText: 'Done',
            closeBtnText: 'Skip',
            nextBtnText: 'Next →',
            prevBtnText: '← Back',
            onDestroyed: () => {
                this.#markAsCompleted();
            }
        });
    }

    /**
     * Check if this is the user's first time and show tutorial
     */
    checkFirstTime() {
        console.log('Checking first time tutorial...', { hasCompletedTutorial: this.#hasCompletedTutorial });
        if (!this.#hasCompletedTutorial) {
            console.log('First time detected - will start tutorial in 1 second');
            // Delay to let the UI fully render (calendar, metrics, etc.)
            setTimeout(() => {
                this.start();
            }, 1000);
        }
    }

    /**
     * Start the tutorial
     */
    start() {
        console.log('Starting tutorial...');
        this.#initDriver();
        if (!this.#driver) {
            console.error('Failed to initialize driver.js - tutorial cannot start');
            return;
        }
        this.#driver.setSteps(this.#getSteps());
        this.#driver.drive();
    }

    /**
     * Reset tutorial (for testing or user request)
     */
    reset() {
        localStorage.removeItem('tutorialCompleted');
        localStorage.removeItem('modalTutorialCompleted');
        this.#hasCompletedTutorial = false;
        this.#hasCompletedModalTutorial = false;
        this.#shouldShowModalTutorialNext = true; // Flag to show modal tutorial on next modal open
        this.start();
    }

    /**
     * Check if modal tutorial should be shown and trigger it
     * Call this when the modal is opened
     * @returns {boolean} True if modal tutorial was started
     */
    checkAndShowModalTutorial() {
        if (!this.#hasCompletedModalTutorial || this.#shouldShowModalTutorialNext) {
            // Small delay to let modal render
            setTimeout(() => {
                this.startModalTutorial();
            }, 300);
            return true;
        }
        return false;
    }

    /**
     * Start the modal-specific tutorial
     */
    startModalTutorial() {
        this.#initDriver();
        this.#driver.setSteps(this.#getModalSteps());
        this.#driver.drive();
        this.#shouldShowModalTutorialNext = false;
    }

    /**
     * Mark tutorial as completed
     * @private
     */
    #markAsCompleted() {
        localStorage.setItem('tutorialCompleted', 'true');
        this.#hasCompletedTutorial = true;
    }

    /**
     * Mark modal tutorial as completed
     * @private
     */
    #markModalTutorialAsCompleted() {
        localStorage.setItem('modalTutorialCompleted', 'true');
        this.#hasCompletedModalTutorial = true;
    }

    /**
     * Get tutorial steps
     * @private
     */
    #getSteps() {
        return [
            {
                element: 'header',
                popover: {
                    title: 'Welcome to Travel Optimizer! ✈️',
                    description: 'This app helps you plan your annual business travel efficiently. Let\'s take a quick tour to get you started.',
                    position: 'bottom'
                }
            },
            {
                element: '#displayYear',
                popover: {
                    title: 'Calendar Year',
                    description: 'You\'re planning for this calendar year. Use the arrows to navigate between years.',
                    position: 'bottom'
                }
            },
            {
                element: '#metricsBar',
                popover: {
                    title: 'Your Travel Metrics',
                    description: 'These metrics show how much you\'re traveling and whether you have any conflicts. <strong>Click any metric to highlight corresponding weeks on the calendar!</strong>',
                    position: 'bottom'
                }
            },
            {
                element: '#btnAddPlan',
                popover: {
                    title: 'Plan Your Travel',
                    description: 'Click here to:<br>• Add business trips<br>• Add constraints (vacations, blackout dates)<br>• Use batch planning for multiple trips at once',
                    position: 'left'
                }
            },
            {
                element: '#mainContent',
                popover: {
                    title: 'Calendar View',
                    description: 'This is your year-at-a-glance calendar view. Each day shows colored bars for trips and constraints. <strong>Click any weekday to add a new trip for that week.</strong> You can see all 12 months at once to plan your entire year.',
                    position: 'top'
                }
            },
            {
                element: '#btnHelp',
                popover: {
                    title: 'Need Help Later?',
                    description: 'Click this help button anytime to restart this tutorial. You can also restart it from Settings.',
                    position: 'bottom'
                }
            },
            {
                element: '#btnSettings',
                popover: {
                    title: 'Settings & Data Management',
                    description: 'Access settings to:<br>• Toggle dark mode<br>• Load sample data<br>• Export/import your travel plan<br>• Restart this tutorial',
                    position: 'bottom'
                }
            },
            {
                popover: {
                    title: 'You\'re All Set! 🎉',
                    description: 'Start planning your travel by clicking the "Plan Travel / Constraint" button. Happy travels!',
                    position: 'center'
                }
            }
        ];
    }

    /**
     * Get modal tutorial steps
     * @private
     */
    #getModalSteps() {
        return [
            {
                element: '.tab-btn[data-tab="trip"]',
                popover: {
                    title: 'Plan Trip Tab',
                    description: 'Use this tab to add business trips. You can plan trips in two ways:<br><strong>Flexible:</strong> Get AI-suggested optimal weeks based on constraints<br><strong>Fixed:</strong> Schedule trips for specific dates you already know',
                    position: 'bottom'
                }
            },
            {
                element: '#tripTimeRange',
                popover: {
                    title: 'Planning Range',
                    description: 'Choose the timeframe to search for optimal travel weeks. Options include Current Year, Current Quarter, or rolling windows like Next 3/6/12 Months.',
                    position: 'bottom'
                }
            },
            {
                element: '#tripLocationContainer',
                popover: {
                    title: 'Location',
                    description: 'Enter the trip location. The optimizer uses this to consolidate trips to the same city and avoid conflicting locations on the same week.',
                    position: 'bottom'
                }
            },
            {
                element: '#tripMode',
                popover: {
                    title: 'Trip Mode',
                    description: '<strong>Flexible mode:</strong> Click "Find Best Weeks" to get AI suggestions<br><strong>Fixed mode:</strong> Pick exact dates when you already know your schedule',
                    position: 'bottom'
                }
            },
            {
                element: '.tab-btn[data-tab="constraint"]',
                popover: {
                    title: 'Add Constraint Tab',
                    description: 'Use this tab to block out times when you cannot or prefer not to travel:<br>• <strong>Hard constraints:</strong> Vacations, holidays, blackout dates (completely blocks weeks)<br>• <strong>Soft constraints:</strong> Preferences (discourages but allows travel)',
                    position: 'bottom'
                }
            },
            {
                element: '.tab-btn[data-tab="batch"]',
                popover: {
                    title: 'Batch Plan Tab',
                    description: 'Planning multiple trips at once? Use this tab to:<br>1. Set a Planning Range for all trips<br>2. Add multiple trips with titles, types, and locations<br>3. Get optimized week suggestions for each trip<br>4. Add all selected trips at once with no double-booking!',
                    position: 'bottom'
                }
            },
            {
                popover: {
                    title: 'You\'re Ready to Plan! 🚀',
                    description: 'Start by adding your first trip or constraint. The calendar will update automatically as you add items.',
                    position: 'center',
                    onNextClick: () => {
                        this.#markModalTutorialAsCompleted();
                        this.#driver.destroy();
                    }
                }
            }
        ];
    }

    /**
     * Check if tutorial has been completed
     */
    hasCompleted() {
        return this.#hasCompletedTutorial;
    }

    /**
     * Check if modal tutorial has been completed
     */
    hasCompletedModalTutorial() {
        return this.#hasCompletedModalTutorial;
    }
}

// Export singleton instance
const tutorialService = new TutorialService();
export default tutorialService;
