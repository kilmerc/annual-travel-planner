/**
 * TutorialService - Interactive guided tour using driver.js
 *
 * Provides first-time walkthrough and on-demand help
 */

import EventBus from '../utils/EventBus.js';

class TutorialService {
    #driver = null;
    #hasCompletedTutorial = false;

    constructor() {
        // Check if tutorial has been completed
        this.#hasCompletedTutorial = localStorage.getItem('tutorialCompleted') === 'true';
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
        if (!this.#hasCompletedTutorial) {
            // Small delay to let the UI fully render
            setTimeout(() => {
                this.start();
            }, 500);
        }
    }

    /**
     * Start the tutorial
     */
    start() {
        this.#initDriver();
        this.#driver.setSteps(this.#getSteps());
        this.#driver.drive();
    }

    /**
     * Reset tutorial (for testing or user request)
     */
    reset() {
        localStorage.removeItem('tutorialCompleted');
        this.#hasCompletedTutorial = false;
        this.start();
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
                    description: 'This is your year-at-a-glance view. Each day shows colored bars for trips and constraints. <strong>Click any weekday to add a new trip for that week.</strong>',
                    position: 'top',
                    onNextClick: () => {
                        // Switch to Quarters view before next step
                        EventBus.emit('view:switch', { view: 'quarters' });
                        this.#driver.moveNext();
                    }
                }
            },
            {
                element: '#mainContent',
                popover: {
                    title: 'Quarters View',
                    description: 'This view organizes your year into 4 quarters. It shows all trips and constraints in a card layout, making it easy to see what\'s planned for each quarter.',
                    position: 'top',
                    onNextClick: () => {
                        // Switch to Timeline view before next step
                        EventBus.emit('view:switch', { view: 'timeline' });
                        this.#driver.moveNext();
                    },
                    onPrevClick: () => {
                        // Switch back to Calendar view
                        EventBus.emit('view:switch', { view: 'calendar' });
                        this.#driver.movePrevious();
                    }
                }
            },
            {
                element: '#mainContent',
                popover: {
                    title: 'Timeline View',
                    description: 'This horizontal timeline shows the entire year week-by-week. Great for spotting gaps and patterns in your travel schedule.',
                    position: 'top',
                    onPrevClick: () => {
                        // Switch back to Quarters view
                        EventBus.emit('view:switch', { view: 'quarters' });
                        this.#driver.movePrevious();
                    }
                }
            },
            {
                element: '#btnHelp',
                popover: {
                    title: 'Need Help Later?',
                    description: 'Click this help button anytime to restart this tutorial. You can also restart it from Settings.',
                    position: 'bottom',
                    onNextClick: () => {
                        // Switch back to calendar view for the end
                        EventBus.emit('view:switch', { view: 'calendar' });
                        this.#driver.moveNext();
                    }
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
     * Check if tutorial has been completed
     */
    hasCompleted() {
        return this.#hasCompletedTutorial;
    }
}

// Export singleton instance
const tutorialService = new TutorialService();
export default tutorialService;
