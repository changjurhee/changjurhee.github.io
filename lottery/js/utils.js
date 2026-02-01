/**
 * Utility functions for the Lottery Generator
 */

/**
 * Get the CSS class for a ball based on its number range
 * @param {number} num - The ball number (1-45)
 * @returns {string} The CSS class name for the range
 */
function getBallRangeClass(num) {
    for (const range of CONFIG.RANGES) {
        if (num <= range.max) {
            return range.class;
        }
    }
    return 'range-5';
}

/**
 * Get the color for a ball based on its number range
 * @param {number} num - The ball number (1-45)
 * @returns {string} The hex color code
 */
function getBallColor(num) {
    for (const range of CONFIG.RANGES) {
        if (num <= range.max) {
            return range.color;
        }
    }
    return CONFIG.RANGES[CONFIG.RANGES.length - 1].color;
}

/**
 * Create a ball DOM element with appropriate styling
 * @param {number} num - The ball number
 * @param {boolean} isBonus - Whether this is a bonus ball
 * @returns {HTMLElement} The ball element
 */
function createBallElement(num, isBonus = false) {
    const ball = document.createElement('div');
    ball.classList.add('ball', getBallRangeClass(num));
    if (isBonus) {
        ball.classList.add('bonus-ball');
    }
    ball.textContent = num;
    return ball;
}

/**
 * Create a plus sign element for separating main and bonus balls
 * @param {boolean} small - Whether to use small styling
 * @returns {HTMLElement} The plus sign element
 */
function createPlusSign(small = false) {
    const plusSign = document.createElement('div');
    plusSign.className = small ? 'plus-sign-small' : 'plus-sign';
    plusSign.textContent = '+';
    return plusSign;
}

/**
 * Generate balls HTML for history display
 * @param {number[]} mainNumbers - The 6 main numbers
 * @param {number} bonusNumber - The bonus number
 * @returns {string} HTML string for the balls
 */
function generateBallsHTML(mainNumbers, bonusNumber) {
    let ballsHtml = '';

    mainNumbers.forEach(num => {
        ballsHtml += `<div class="ball ${getBallRangeClass(num)}">${num}</div>`;
    });

    ballsHtml += `<div class="plus-sign-small">+</div>`;
    ballsHtml += `<div class="ball ${getBallRangeClass(bonusNumber)} bonus-ball-small">${bonusNumber}</div>`;

    return ballsHtml;
}

/**
 * Get display name for algorithm
 * @param {string} algo - Algorithm code
 * @returns {string} Display name
 */
function getAlgoName(algo) {
    switch (algo) {
        case 'weighted': return 'Frequency (Weighted)';
        case 'adaptive': return 'Trend (Adaptive)';
        case 'non-frequency': return 'Non-Frequency (Cold)';
        case 'sequential': return 'Sequential (AI/RL)';
        case 'random':
        default: return 'Pure Random';
    }
}

/**
 * Get display name for RNG
 * @param {string} rng - RNG code
 * @returns {string} Display name
 */
function getRngName(rng) {
    switch (rng) {
        case 'secure': return 'Secure (Web Crypto)';
        case 'vrf': return 'VRF (Simulated)';
        case 'blockchain': return 'Blockchain (Bitcoin)';
        case 'prng':
        default: return 'Basic PRNG (Fast)';
    }
}

// Make utility functions available globally
window.getBallRangeClass = getBallRangeClass;
window.getBallColor = getBallColor;
window.createBallElement = createBallElement;
window.createPlusSign = createPlusSign;
window.generateBallsHTML = generateBallsHTML;
window.getAlgoName = getAlgoName;
window.getRngName = getRngName;
