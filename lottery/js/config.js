/**
 * Configuration constants for the Lottery Generator
 */
const CONFIG = {
    // Lottery settings
    VERSION: 'v1.4.0',
    TOTAL_NUMBERS: 45,
    MAIN_NUMBERS_COUNT: 6,
    BONUS_COUNT: 1,
    TOTAL_DRAW_COUNT: 7,

    // Animation settings
    ANIMATION_INTERVAL: 800,
    DISPLAY_INTERVAL: 200,

    // Simulation settings
    SIM_EXTRACTION_INTERVAL: 2000,
    SIM_CANVAS_WIDTH: 600,
    SIM_CANVAS_HEIGHT: 400,
    SIM_DRUM_RADIUS: 180,
    SIM_SUCTION_RADIUS: 30,

    // Algorithm settings
    ADAPTIVE_DECAY_RATE: 0.96,
    ADAPTIVE_REWARD: 1.0,
    WEIGHTED_POWER: 1,
    ADAPTIVE_POWER: 10,

    // Ball ranges for color coding
    RANGES: [
        { max: 10, class: 'range-1', color: '#fbc531' },
        { max: 20, class: 'range-2', color: '#0984e3' },
        { max: 30, class: 'range-3', color: '#e84118' },
        { max: 40, class: 'range-4', color: '#7f8fa6' },
        { max: 45, class: 'range-5', color: '#4cd137' }
    ]
};

// Make CONFIG available globally
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
