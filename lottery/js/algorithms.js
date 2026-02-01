/**
 * Number generation algorithms for the Lottery Generator
 */

/**
 * Create a weighted pool and pick numbers from it
 * @param {Object} weights - Object mapping numbers to their weights
 * @param {number} power - Power to apply to weights
 * @param {Function} rng - Random number generator function
 * @returns {Promise<number[]>} Array of selected numbers
 */
async function createPoolAndPick(weights, power, rng) {
    const pool = [];
    for (const [num, weight] of Object.entries(weights)) {
        const count = Math.round(Math.pow(weight, power) * 10);
        for (let k = 0; k < count; k++) {
            pool.push(parseInt(num));
        }
    }

    const result = [];
    while (result.length < CONFIG.TOTAL_DRAW_COUNT) {
        const randomVal = await rng();
        const index = Math.floor(randomVal * pool.length);
        const num = pool[index];
        if (!result.includes(num)) {
            result.push(num);
        }
    }
    return result;
}

/**
 * Generate numbers using frequency-weighted selection
 * Numbers that appear more often in history have higher weight
 * @param {Function} rng - Random number generator function
 * @param {Array} winningNumbers - Historical winning numbers
 * @returns {Promise<number[]>} Array of selected numbers
 */
async function getWeightedNumbers(rng, winningNumbers = []) {
    const frequency = {};
    for (let i = 1; i <= CONFIG.TOTAL_NUMBERS; i++) {
        frequency[i] = 1; // Base weight
    }

    winningNumbers.forEach(draw => {
        if (Array.isArray(draw)) {
            draw.forEach(num => {
                if (frequency[num]) {
                    frequency[num] += 1;
                }
            });
        }
    });

    return createPoolAndPick(frequency, CONFIG.WEIGHTED_POWER, rng);
}

/**
 * Generate numbers using adaptive/trend-based selection
 * Recent numbers have higher weight, with decay over time
 * @param {Function} rng - Random number generator function
 * @param {Array} winningNumbers - Historical winning numbers
 * @returns {Promise<number[]>} Array of selected numbers
 */
// Cache for adaptive weights to avoid recalculating on every click
let cachedAdaptiveWeights = null;
let cachedAdaptiveHistoryLength = 0;

async function getAdaptiveNumbers(rng, winningNumbers = []) {
    // Use cached weights if data hasn't changed
    if (cachedAdaptiveWeights && cachedAdaptiveHistoryLength === winningNumbers.length) {
        return createPoolAndPick(cachedAdaptiveWeights, CONFIG.ADAPTIVE_POWER, rng);
    }

    const weights = {};
    for (let i = 1; i <= CONFIG.TOTAL_NUMBERS; i++) {
        weights[i] = 1.0;
    }

    // Use only recent 100 draws for trend analysis (sufficient for trends + better performance)
    const RECENT_LIMIT = 100;
    const history = winningNumbers.slice(0, RECENT_LIMIT);

    for (let i = history.length - 1; i >= 0; i--) {
        const draw = history[i];
        if (!Array.isArray(draw)) continue;

        for (let w = 1; w <= CONFIG.TOTAL_NUMBERS; w++) {
            weights[w] *= CONFIG.ADAPTIVE_DECAY_RATE;
        }

        draw.forEach(num => {
            if (weights[num] !== undefined) {
                weights[num] += CONFIG.ADAPTIVE_REWARD;
            }
        });
    }

    // Cache the calculated weights
    cachedAdaptiveWeights = weights;
    cachedAdaptiveHistoryLength = winningNumbers.length;

    return createPoolAndPick(weights, CONFIG.ADAPTIVE_POWER, rng);
}

/**
 * Generate numbers using non-frequency (cold number) selection
 * Numbers that appear less often in history have higher weight
 * @param {Function} rng - Random number generator function
 * @param {Array} winningNumbers - Historical winning numbers
 * @returns {Promise<number[]>} Array of selected numbers
 */
async function getNonFrequencyNumbers(rng, winningNumbers = []) {
    const frequency = {};
    for (let i = 1; i <= CONFIG.TOTAL_NUMBERS; i++) {
        frequency[i] = 0;
    }

    winningNumbers.forEach(draw => {
        if (Array.isArray(draw)) {
            draw.forEach(num => {
                if (frequency[num] !== undefined) {
                    frequency[num]++;
                }
            });
        }
    });

    // Invert weights: Less frequent = Higher weight
    const weights = {};
    for (let i = 1; i <= CONFIG.TOTAL_NUMBERS; i++) {
        // Add 1 to avoid division by zero and ensure base weight
        // Use inverse: 100 / (freq + 1)
        weights[i] = 100 / (frequency[i] + 1);
    }

    return createPoolAndPick(weights, CONFIG.WEIGHTED_POWER, rng);
}

/**
 * Generate numbers using RL-based Sequential Analysis (Markov Chain)
 * Step 1: Pick first number using pure RNG (Exploration)
 * Step 2+: Pick subsequent numbers based on Transition Matrix (Exploitation)
 * @param {Function} rng - Random number generator function
 * @returns {Promise<number[]>} Array of selected numbers
 */
// Cache for transitions to avoid rebuilding on every click
let cachedTransitions = null;

async function getSequentialNumbers(rng) {
    // 1. Build Transition Matrix from History (Learning Phase)
    // Use cached version if available
    if (!cachedTransitions) {
        const transitions = {};
        const history = typeof allWinningNumbers !== 'undefined' ? allWinningNumbers : [];

        history.forEach(draw => {
            if (!Array.isArray(draw) || draw.length < 6) return;

            // Use a copy of the draw to avoid modifying original data
            // Shuffle the sequence to avoid learning "sorted" patterns from official history
            // This converts the Markov Chain into a "Co-occurrence" learner
            const sequence = [...draw];

            // Fisher-Yates Shuffle
            for (let i = sequence.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
            }

            // Record transitions (State -> Next State)
            for (let i = 0; i < sequence.length - 1; i++) {
                const current = sequence[i];
                const next = sequence[i + 1];

                if (!transitions[current]) transitions[current] = {};
                transitions[current][next] = (transitions[current][next] || 0) + 1;
            }
        });
        cachedTransitions = transitions;
    }

    const transitions = cachedTransitions;

    const result = [];

    // 2. Step 1: Random Start (Exploration)
    // Unlike the previous version which used frequency, we now use pure RNG 
    // to give the "AI" a random starting point.
    const r = await rng();
    const firstNum = Math.floor(r * CONFIG.TOTAL_NUMBERS) + 1;
    result.push(firstNum);

    // 3. Step 2+: Follow the Chain (Exploitation)
    let currentNum = firstNum;

    while (result.length < 6) {
        let nextNum;

        // Check if we have learned transitions for the current state
        if (transitions[currentNum]) {
            // Filter out numbers already picked to avoid duplicates
            const candidates = { ...transitions[currentNum] };
            result.forEach(picked => delete candidates[picked]);

            if (Object.keys(candidates).length > 0) {
                // Pick based on transition probability (Softmax-like selection)
                nextNum = await pickFromWeights(candidates, rng);
            }
        }

        // Fallback: If no learned path or dead end
        if (!nextNum) {
            // Pick a random available number (Exploration)
            const available = [];
            for (let i = 1; i <= CONFIG.TOTAL_NUMBERS; i++) {
                if (!result.includes(i)) available.push(i);
            }
            const r2 = await rng();
            nextNum = available[Math.floor(r2 * available.length)];
        }

        result.push(nextNum);
        currentNum = nextNum;
    }

    // 4. Pick Bonus Number (Randomly from remaining)
    const availableForBonus = [];
    for (let i = 1; i <= CONFIG.TOTAL_NUMBERS; i++) {
        if (!result.includes(i)) availableForBonus.push(i);
    }
    const r3 = await rng();
    const bonus = availableForBonus[Math.floor(r3 * availableForBonus.length)];
    result.push(bonus);

    return result;
}

/**
 * Helper to pick a key from a weight object
 */
async function pickFromWeights(weights, rng) {
    let totalWeight = 0;
    for (const w of Object.values(weights)) totalWeight += w;

    const r = await rng();
    let randomWeight = r * totalWeight;

    for (const [num, weight] of Object.entries(weights)) {
        randomWeight -= weight;
        if (randomWeight <= 0) return parseInt(num);
    }

    // Fallback (should rarely happen due to float precision)
    return parseInt(Object.keys(weights)[0]);
}

// Make algorithm functions available globally
if (typeof window !== 'undefined') {
    window.createPoolAndPick = createPoolAndPick;
    window.getWeightedNumbers = getWeightedNumbers;
    window.getAdaptiveNumbers = getAdaptiveNumbers;
    window.getNonFrequencyNumbers = getNonFrequencyNumbers;
    window.getSequentialNumbers = getSequentialNumbers;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createPoolAndPick,
        getWeightedNumbers,
        getAdaptiveNumbers,
        getNonFrequencyNumbers,
        getSequentialNumbers
    };
}
