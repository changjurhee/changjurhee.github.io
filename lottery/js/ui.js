/**
 * UI components for the Lottery Generator
 */

// Audio Context
let audioCtx = null;

/**
 * Initialize audio context
 */
function initAudio() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    } catch (e) {
        console.warn("AudioContext not supported or failed:", e);
    }
}

/**
 * Play a pop sound when a ball appears
 */
function playPopSound() {
    if (!audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
        console.warn("Audio play failed:", e);
    }
}

/**
 * Toggle sidebar visibility
 * @param {HTMLElement} sidebar - The sidebar element
 * @param {HTMLElement} sidebarOpen - The open button element
 */
function toggleSidebar(sidebar, sidebarOpen) {
    sidebar.classList.toggle('collapsed');

    if (sidebar.classList.contains('collapsed')) {
        if (sidebarOpen) sidebarOpen.classList.remove('hidden');
    } else {
        if (sidebarOpen) sidebarOpen.classList.add('hidden');
    }

    // Resize chart if needed
    const chartInstance = Chart.getChart("frequencyChart");
    if (chartInstance) {
        setTimeout(() => chartInstance.resize(), 300);
    }
}

/**
 * Initialize tab navigation
 */
function initTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to clicked button
            btn.classList.add('active');

            // Show corresponding content
            const tabId = btn.getAttribute('data-tab');
            const content = document.getElementById(tabId);
            if (content) {
                content.classList.add('active');

                // Resize chart if switching to main view
                if (tabId === 'main-view') {
                    const chartInstance = Chart.getChart("frequencyChart");
                    if (chartInstance) {
                        setTimeout(() => chartInstance.resize(), 100);
                    }
                }

                // Render winning history if switching to that tab
                if (tabId === 'winning-history-view') {
                    renderWinningHistory();
                }
            }
        });
    });
}

/**
 * Save history to localStorage
 */
function saveHistory() {
    const historyContainer = document.getElementById('history-log');
    if (!historyContainer) return;

    const historyData = [];
    const items = historyContainer.querySelectorAll('.history-item');
    items.forEach(item => {
        const date = item.querySelector('.history-date').textContent;
        const info = item.querySelector('.history-info').textContent;
        const balls = Array.from(item.querySelectorAll('.ball')).map(b => parseInt(b.textContent));
        historyData.push({ date, info, balls });
    });

    localStorage.setItem('lottoHistory', JSON.stringify(historyData));
}

/**
 * Load history from localStorage
 */
function loadHistory() {
    const historyContainer = document.getElementById('history-log');
    if (!historyContainer) return;

    const savedHistory = localStorage.getItem('lottoHistory');
    if (savedHistory) {
        const historyData = JSON.parse(savedHistory);
        // Clear current list to avoid duplicates if any (though usually empty on load)
        historyContainer.innerHTML = '';

        historyData.forEach(data => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'history-item';

            let ballsHtml = '';
            data.balls.forEach(num => {
                ballsHtml += `<div class="ball ${getBallRangeClass(num)}">${num}</div>`;
            });

            itemDiv.innerHTML = `
                <div class="history-header">
                    <span class="history-date">${data.date}</span>
                    <span class="history-info">${data.info}</span>
                </div>
                <div class="history-balls">
                    ${ballsHtml}
                </div>
            `;
            historyContainer.appendChild(itemDiv);
        });
    }
}

/**
 * Add a new entry to history
 * @param {number[]} numbers - Array of 7 numbers (6 main + 1 bonus)
 * @param {string} algoName - Name of the algorithm used
 * @param {string} rngName - Name of the RNG source used
 */
function addToHistory(numbers, algoName, rngName) {
    const historyContainer = document.getElementById('history-log');
    if (!historyContainer) return;

    // Remove placeholder if it exists
    const placeholder = historyContainer.querySelector('.history-placeholder');
    if (placeholder) placeholder.remove();

    const itemDiv = document.createElement('div');
    itemDiv.className = 'history-item';

    const now = new Date();
    const dateStr = now.toLocaleString();

    // Separate Main and Bonus
    let mainNumbers = numbers.slice(0, CONFIG.MAIN_NUMBERS_COUNT);

    // Only sort if NOT sequential
    if (!algoName.includes('Sequential')) {
        mainNumbers.sort((a, b) => a - b);
    }
    const bonusNumber = numbers[CONFIG.MAIN_NUMBERS_COUNT];

    const ballsHtml = generateBallsHTML(mainNumbers, bonusNumber);

    itemDiv.innerHTML = `
        <div class="history-header">
            <span class="history-date">${dateStr}</span>
            <span class="history-info">${algoName} | ${rngName}</span>
        </div>
        <div class="history-balls">
            ${ballsHtml}
        </div>
    `;

    if (historyContainer.firstChild) {
        historyContainer.insertBefore(itemDiv, historyContainer.firstChild);
    } else {
        historyContainer.appendChild(itemDiv);
    }

    saveHistory();
}

// Removed generateBallsHTML (using utils.js)

// Removed getBallRangeClass (using utils.js)

// Removed createBallElement (using utils.js)

/**
 * Create a ball and add it to the container
 * @param {number} number - The ball number
 * @param {HTMLElement} container - The container element
 */
function createBall(number, container) {
    if (!container) return;
    const ball = createBallElement(number);
    container.appendChild(ball);
}

// Removed createPlusSign (using utils.js)

/**
 * Display numbers with animation
 * @param {number[]} numbers - Array of 7 numbers
 * @param {HTMLElement} container - The ball container element
 * @param {boolean} shouldSort - Whether to sort the main numbers (default: true)
 */
function displayNumbers(numbers, container, shouldSort = true) {
    if (!container) return;
    container.innerHTML = '';

    // Separate Main (6) and Bonus (1)
    let mainNumbers = numbers.slice(0, CONFIG.MAIN_NUMBERS_COUNT);

    if (shouldSort) {
        mainNumbers.sort((a, b) => a - b);
    }
    const bonusNumber = numbers[CONFIG.MAIN_NUMBERS_COUNT];

    mainNumbers.forEach((num, index) => {
        setTimeout(() => {
            const ball = createBallElement(num);
            container.appendChild(ball);
            playPopSound();
        }, index * CONFIG.DISPLAY_INTERVAL);
    });

    // Display Bonus Number
    setTimeout(() => {
        container.appendChild(createPlusSign());

        const bonusBall = createBallElement(bonusNumber, true);
        container.appendChild(bonusBall);
        playPopSound();
    }, CONFIG.MAIN_NUMBERS_COUNT * CONFIG.DISPLAY_INTERVAL);
}

/**
 * Reset the game state
 * @param {HTMLElement} ballContainer - The ball container element
 * @param {HTMLElement} startBtn - The start button element
 * @param {HTMLElement} resetBtn - The reset button element
 */
function resetGame(ballContainer, startBtn, resetBtn) {
    if (ballContainer) ballContainer.innerHTML = '';
    if (startBtn) {
        startBtn.classList.remove('hidden');
        startBtn.disabled = false;
    }
}

// Pagination State
let currentHistoryIndex = 0;
const PAGE_SIZE = 20;

/**
 * Initialize History Navigation
 */
function initHistoryNavigation() {
    const firstBtn = document.getElementById('history-first');
    const prevBtn = document.getElementById('history-prev');
    const nextBtn = document.getElementById('history-next');
    const lastBtn = document.getElementById('history-last');

    if (firstBtn) {
        firstBtn.addEventListener('click', () => {
            if (currentHistoryIndex > 0) {
                currentHistoryIndex = 0;
                renderHistoryPage();
            }
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentHistoryIndex > 0) {
                currentHistoryIndex = Math.max(0, currentHistoryIndex - PAGE_SIZE);
                renderHistoryPage();
            }
        });
    }

    if (nextBtn) {
        if (typeof allWinningNumbers !== 'undefined') { // Check if data is loaded before attaching listener
            nextBtn.addEventListener('click', () => {
                if (currentHistoryIndex + PAGE_SIZE < allWinningNumbers.length) {
                    currentHistoryIndex += PAGE_SIZE;
                    renderHistoryPage();
                }
            });
        }
    }

    if (lastBtn) {
        if (typeof allWinningNumbers !== 'undefined') {
            lastBtn.addEventListener('click', () => {
                const total = allWinningNumbers.length;
                if (currentHistoryIndex + PAGE_SIZE < total) {
                    // Calculate index of the last page
                    // Example: total 100, size 20. Last page starts at 80.
                    // Math.floor((total - 1) / PAGE_SIZE) * PAGE_SIZE
                    currentHistoryIndex = Math.floor((total - 1) / PAGE_SIZE) * PAGE_SIZE;
                    renderHistoryPage();
                }
            });
        }
    }
}

/**
 * Render official winning history (Entry Point)
 */
function renderWinningHistory() {
    const container = document.getElementById('winning-history-log');
    if (!container) return;

    // Initialize nav listeners if needed (idempotent)
    // We can call this safely here or in main.js
    initHistoryNavigation();

    // 1. Cache Check: If already populated, do nothing (Instant switch)
    if (container.querySelector('.history-item')) {
        return;
    }

    // 2. Show Loading State
    container.innerHTML = '<div class="history-placeholder">Loading official history... ⏳</div>';

    if (typeof allWinningNumbers === 'undefined' || typeof allBonusNumbers === 'undefined') {
        container.innerHTML = '<div class="history-placeholder">No official data loaded.</div>';
        return;
    }

    // 3. Async Render
    setTimeout(() => {
        currentHistoryIndex = 0; // Reset to first page
        renderHistoryPage();
    }, 50);
}

/**
 * Render the current page of history items
 */
function renderHistoryPage() {
    const container = document.getElementById('winning-history-log');
    if (!container) return;

    const totalRounds = allWinningNumbers.length;
    const dates = typeof allWinningDates !== 'undefined' ? allWinningDates : [];

    // Calculate end index
    const endIndex = Math.min(currentHistoryIndex + PAGE_SIZE, totalRounds);

    // Clear container (Page Navigation style)
    container.innerHTML = '';

    // Use fragment
    const fragment = document.createDocumentFragment();

    for (let i = currentHistoryIndex; i < endIndex; i++) {
        const mainNumbers = allWinningNumbers[i];
        const bonus = allBonusNumbers[i];
        const round = totalRounds - i;
        const date = dates[i] || '';

        const itemDiv = document.createElement('div');
        itemDiv.className = 'history-item';

        const sortedMain = [...mainNumbers].sort((a, b) => a - b);
        const ballsHtml = generateBallsHTML(sortedMain, bonus);

        itemDiv.innerHTML = `
            <div class="history-header">
                <span class="history-date">Round ${round} <small style="color: #aaa; margin-left: 5px;">(${date})</small></span>
                <span class="history-info">Official Result 🏆</span>
            </div>
            <div class="history-balls">
                ${ballsHtml}
            </div>
        `;
        fragment.appendChild(itemDiv);
    }

    container.appendChild(fragment);

    // Update Navigation Buttons Visibility
    updateNavButtons(totalRounds);
}

/**
 * Update visibility of navigation buttons
 */
function updateNavButtons(total) {
    const firstBtn = document.getElementById('history-first');
    const prevBtn = document.getElementById('history-prev');
    const nextBtn = document.getElementById('history-next');
    const lastBtn = document.getElementById('history-last');

    // First & Prev buttons
    if (currentHistoryIndex <= 0) {
        if (firstBtn) firstBtn.classList.add('hidden');
        if (prevBtn) prevBtn.classList.add('hidden');
    } else {
        if (firstBtn) firstBtn.classList.remove('hidden');
        if (prevBtn) prevBtn.classList.remove('hidden');
    }

    // Next & Last buttons
    if (currentHistoryIndex + PAGE_SIZE >= total) {
        if (nextBtn) nextBtn.classList.add('hidden');
        if (lastBtn) lastBtn.classList.add('hidden');
    } else {
        if (nextBtn) nextBtn.classList.remove('hidden');
        if (lastBtn) lastBtn.classList.remove('hidden');
    }
}

/**
 * Set the state of a button (loading, disabled, etc.)
 * @param {HTMLElement} btn - The button element
 * @param {string} state - 'loading', 'disabled', 'normal', 'success'
 * @param {string} text - Optional text to set
 */
function setButtonState(btn, state, text = '') {
    if (!btn) return;

    switch (state) {
        case 'loading':
            btn.disabled = true;
            if (text) btn.innerText = text;
            btn.classList.add('disabled-look');
            break;
        case 'disabled':
            btn.disabled = true;
            if (text) btn.innerText = text;
            break;
        case 'success':
            btn.disabled = false;
            if (text) btn.innerText = text;
            btn.style.background = "#55efc4";
            btn.style.color = "#2d3436";
            break;
        case 'normal':
        default:
            btn.disabled = false;
            if (text) btn.innerText = text;
            btn.classList.remove('disabled-look');
            btn.classList.remove('hidden');
            btn.style.background = "";
            btn.style.color = "";
            break;
    }
}

// Make UI functions available globally
window.initAudio = initAudio;
window.playPopSound = playPopSound;
window.toggleSidebar = toggleSidebar;
window.initTabNavigation = initTabNavigation;
window.saveHistory = saveHistory;
window.loadHistory = loadHistory;
window.addToHistory = addToHistory;
window.createBall = createBall;
window.displayNumbers = displayNumbers;
window.resetGame = resetGame;
window.renderWinningHistory = renderWinningHistory;
window.setButtonState = setButtonState;
// window.createBallElement = createBallElement; // Removed
// window.getBallRangeClass = getBallRangeClass; // Removed
// window.generateBallsHTML = generateBallsHTML; // Removed
// window.createPlusSign = createPlusSign; // Removed


