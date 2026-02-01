/**
 * Main entry point for the Lottery Generator
 */

// Error handling - use console.error instead of alert for production
window.onerror = function (msg, url, line, col, error) {
    console.error("Error:", msg, "\nLine:", line, "\nCol:", col, "\nError:", error);
    return false;
};

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const ballContainer = document.getElementById('ball-container');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebarOpen = document.getElementById('sidebar-open');
    const sidebar = document.querySelector('.sidebar');

    // Load Data
    const recentWinningNumbers = typeof allWinningNumbers !== 'undefined' ? allWinningNumbers : [];
    const recentBonusNumbers = typeof allBonusNumbers !== 'undefined' ? allBonusNumbers : [];
    console.log(`Loaded ${recentWinningNumbers.length} past draws.`);

    // Set Version
    const versionEl = document.getElementById('app-version');
    if (versionEl) versionEl.innerText = CONFIG.VERSION;

    // Event Listeners
    if (startBtn) startBtn.addEventListener('click', generateNumbers);
    if (resetBtn) resetBtn.addEventListener('click', () => resetGame(ballContainer, startBtn, resetBtn));

    // Sidebar toggle
    if (sidebarClose) {
        sidebarClose.addEventListener('click', () => toggleSidebar(sidebar, sidebarOpen));
    }
    if (sidebarOpen) {
        sidebarOpen.addEventListener('click', () => toggleSidebar(sidebar, sidebarOpen));
    }
    if (sidebarOpen) {
        sidebarOpen.addEventListener('click', () => toggleSidebar(sidebar, sidebarOpen));
    }

    // AI UI Toggle
    const algoRadios = document.querySelectorAll('input[name="algorithm"]');
    const aiPanel = document.getElementById('ai-training-panel');
    const trainBtn = document.getElementById('train-ai-btn');
    const progressDiv = document.getElementById('training-progress');
    const lossSpan = document.getElementById('ai-loss');
    const epochSpan = document.getElementById('ai-epoch');
    const barDiv = document.getElementById('ai-bar');

    algoRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'sequential') {
                aiPanel.classList.remove('hidden');
            } else {
                aiPanel.classList.add('hidden');
            }
        });
    });

    if (trainBtn) {
        trainBtn.addEventListener('click', async () => {
            setButtonState(trainBtn, 'loading');
            progressDiv.classList.remove('hidden');

            await trainAIModel((epoch, loss) => {
                epochSpan.innerText = epoch;
                lossSpan.innerText = loss.toFixed(4);
                barDiv.style.width = `${(epoch / 20) * 100}%`;
            });

            setButtonState(trainBtn, 'success', "Model Trained ✅");
            setTimeout(() => {
                setButtonState(trainBtn, 'normal', "Retrain Model 🧠");
                trainBtn.style.color = "#d63031"; // Keep specific style if needed, or move to CSS
            }, 3000);
        });
    }

    const simTrainBtn = document.getElementById('sim-train-btn');
    const countInput = document.getElementById('sim-count-input');

    if (simTrainBtn && countInput) {
        // Update button text when input changes
        const updateButtonText = () => {
            const val = parseInt(countInput.value) || 2000;
            simTrainBtn.innerText = `Simulate & Train (${val}x) 🌪️`;
        };

        countInput.addEventListener('input', updateButtonText);
        countInput.addEventListener('change', updateButtonText);

        // Initialize text
        updateButtonText();

        simTrainBtn.addEventListener('click', async () => {
            if (simTrainBtn.disabled) return;

            // Get Sim Count from Settings
            let simCount = parseInt(countInput.value) || 2000;

            setButtonState(simTrainBtn, 'loading', `Simulating (${simCount})... 0%`);
            progressDiv.classList.remove('hidden');

            // 1. Run Batch Simulation
            const simData = await batchRunSimulations(simCount, (percent) => {
                simTrainBtn.innerText = `Simulating (${simCount})... ${percent}%`;
                barDiv.style.width = `${percent}%`;
            });

            // Update Chart with Sim Data
            renderChart(recentWinningNumbers, recentBonusNumbers, simData);

            simTrainBtn.innerText = "Training AI... 🧠";

            // 2. Train Model with Sim Data
            await trainAIModel((epoch, loss) => {
                epochSpan.innerText = epoch;
                lossSpan.innerText = loss.toFixed(4);
                barDiv.style.width = `${(epoch / 20) * 100}%`;
            }, simData);

            setButtonState(simTrainBtn, 'success', "Done! ✅");
            setTimeout(() => {
                setButtonState(simTrainBtn, 'normal');
                updateButtonText();
            }, 3000);
        });
    }
    // Initialize components
    initSettings();
    initTabNavigation();
    loadHistory();
    initSimulationCanvas();
    renderChart(recentWinningNumbers, recentBonusNumbers);

    /**
     * Generate lottery numbers based on selected algorithm and RNG
     */
    async function generateNumbers() {
        initAudio();

        // 1. Immediate UI Feedback
        const originalBtnText = startBtn ? 'Generate Numbers' : 'Generate'; // Default text
        if (startBtn) {
            setButtonState(startBtn, 'loading', "Generating... ⏳");
        }
        if (resetBtn) resetBtn.classList.add('hidden');
        if (ballContainer) ballContainer.innerHTML = '';

        // 2. Yield to browser to allow UI repaint (Spinner/Text update)
        // This prevents the "frozen" feeling
        setTimeout(async () => {
            const selectedAlgoInput = document.querySelector('input[name="algorithm"]:checked');
            const selectedAlgo = selectedAlgoInput ? selectedAlgoInput.value : 'random';

            const selectedRngInput = document.querySelector('input[name="rng"]:checked');
            const selectedRngType = selectedRngInput ? selectedRngInput.value : 'prng';

            console.log(`Generating numbers using Algo: ${selectedAlgo}, RNG: ${selectedRngType}`);

            // Refresh data to catch any updates (e.g. from Settings)
            const currentWinningNumbers = typeof allWinningNumbers !== 'undefined' ? allWinningNumbers : [];

            let numbers = [];
            try {
                // Get RNG function (might be async for blockchain/vrf)
                const rngFunc = await getRNG(selectedRngType);

                if (selectedAlgo === 'weighted') {
                    numbers = await getWeightedNumbers(rngFunc, currentWinningNumbers);
                } else if (selectedAlgo === 'adaptive') {
                    numbers = await getAdaptiveNumbers(rngFunc, currentWinningNumbers);
                } else if (selectedAlgo === 'non-frequency') {
                    numbers = await getNonFrequencyNumbers(rngFunc, currentWinningNumbers);
                } else if (selectedAlgo === 'sequential') {
                    // Use Deep Learning if available, otherwise fallback to simple Sequential
                    if (window.getDeepLearningNumbers && window.model) { // Check if model is trained
                        numbers = await window.getDeepLearningNumbers(rngFunc);
                    } else {
                        numbers = await getSequentialNumbers(rngFunc);
                    }
                } else {
                    numbers = await getRandomNumbers(rngFunc);
                }
            } catch (e) {
                console.error("Generation error:", e);
                numbers = await getRandomNumbers(() => Math.random()); // Fallback
            }

            try {
                if (!numbers || numbers.length < CONFIG.MAIN_NUMBERS_COUNT + CONFIG.BONUS_COUNT) {
                    throw new Error("Generated numbers are invalid or insufficient.");
                }

                let mainNumbers = numbers.slice(0, CONFIG.MAIN_NUMBERS_COUNT);

                // Only sort if NOT sequential (Sequential mode should show prediction order)
                if (selectedAlgo !== 'sequential') {
                    mainNumbers.sort((a, b) => a - b);
                }
                const bonusNumber = numbers[CONFIG.MAIN_NUMBERS_COUNT];

                console.log("Main:", mainNumbers, "Bonus:", bonusNumber);

                // 4. Display
                // User requested NO sorting for the main display animation (extraction order)
                const shouldSort = false;
                displayNumbers(numbers, ballContainer, shouldSort);
                addToHistory(numbers, getAlgoName(selectedAlgo), getRngName(selectedRngType));

                // Re-enable UI after animation starts (or estimate end)
                // For simplicity, we re-enable immediately after scheduling timeouts,
                // but ideally we wait for the last one.
                const uiResetDelay = (CONFIG.MAIN_NUMBERS_COUNT + 1) * CONFIG.DISPLAY_INTERVAL + 500;
                setTimeout(() => {
                    if (resetBtn) resetBtn.classList.remove('hidden');
                    if (startBtn) {
                        setButtonState(startBtn, 'normal', originalBtnText);
                    }
                }, uiResetDelay);

            } catch (displayError) {
                console.error("Display error:", displayError);
                alert("An error occurred while displaying numbers. Please check the console.");

                // Ensure UI is reset even on error
                if (startBtn) {
                    setButtonState(startBtn, 'normal', originalBtnText);
                }
            }
        }, 50); // Short delay to ensure repaint
    }
});
