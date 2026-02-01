/**
 * Chart rendering for the Lottery Generator
 */

/**
 * Render the frequency chart
 * @param {Array} winningNumbers - Historical winning numbers
 * @param {Array} bonusNumbers - Historical bonus numbers
 * @param {Array} simulationData - Optional simulated data for comparison
 */
function renderChart(winningNumbers = [], bonusNumbers = [], simulationData = []) {
    const ctx = document.getElementById('frequencyChart');
    if (!ctx) return;

    // Calculate frequency
    const frequency = Array(CONFIG.TOTAL_NUMBERS + 1).fill(0); // Index 0 unused
    const bonusFrequency = Array(CONFIG.TOTAL_NUMBERS + 1).fill(0);
    const firstNumFrequency = Array(CONFIG.TOTAL_NUMBERS + 1).fill(0);
    const simFirstNumFrequency = Array(CONFIG.TOTAL_NUMBERS + 1).fill(0);

    winningNumbers.forEach(draw => {
        if (Array.isArray(draw) && draw.length > 0) {
            // Main Frequency
            draw.forEach(num => {
                if (num >= 1 && num <= CONFIG.TOTAL_NUMBERS) {
                    frequency[num]++;
                }
            });

            // First Number Frequency (Start Number)
            const firstNum = draw[0];
            if (firstNum >= 1 && firstNum <= CONFIG.TOTAL_NUMBERS) {
                firstNumFrequency[firstNum]++;
            }
        }
    });

    bonusNumbers.forEach(num => {
        if (num >= 1 && num <= CONFIG.TOTAL_NUMBERS) {
            bonusFrequency[num]++;
        }
    });

    // Process Simulation Data
    if (simulationData && simulationData.length > 0) {
        simulationData.forEach(draw => {
            if (Array.isArray(draw) && draw.length > 0) {
                // The headless sim returns `selected` which is pushed in order of extraction.
                // We must NOT sort it, as we want the actual first drawn number (Start Number).
                const first = draw[0];
                if (first >= 1 && first <= CONFIG.TOTAL_NUMBERS) {
                    simFirstNumFrequency[first]++;
                }
            }
        });
    }

    // Prepare data for Chart.js
    const labels = [];
    const data = [];
    const bonusData = [];
    const firstNumData = [];
    const simFirstNumData = [];
    const backgroundColors = [];
    const borderColors = [];

    for (let i = 1; i <= CONFIG.TOTAL_NUMBERS; i++) {
        labels.push(i);
        data.push(frequency[i]);
        bonusData.push(bonusFrequency[i]);
        firstNumData.push(firstNumFrequency[i]);
        simFirstNumData.push(simFirstNumFrequency[i]);

        // Color based on range
        const range = CONFIG.RANGES.find(r => i <= r.max);
        if (range) {
            const color = range.color;
            // Convert hex to rgba
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            backgroundColors.push(`rgba(${r}, ${g}, ${b}, 0.6)`);
            borderColors.push(`rgba(${r}, ${g}, ${b}, 1)`);
        } else {
            backgroundColors.push('rgba(76, 209, 55, 0.6)');
            borderColors.push('rgba(76, 209, 55, 1)');
        }
    }

    // Destroy existing chart if it exists to prevent memory leaks/glitches
    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }

    new Chart(ctx, {
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Main Numbers',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1,
                    order: 4,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Bonus Numbers',
                    data: bonusData,
                    backgroundColor: 'rgba(45, 52, 54, 0.2)',
                    borderColor: 'rgba(45, 52, 54, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(45, 52, 54, 1)',
                    pointRadius: 2,
                    tension: 0.4,
                    order: 3,
                    yAxisID: 'y1'
                },
                {
                    type: 'line',
                    label: 'Official Start Freq',
                    data: firstNumData,
                    backgroundColor: 'rgba(155, 89, 182, 0.2)', // Purple
                    borderColor: 'rgba(155, 89, 182, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(155, 89, 182, 1)',
                    pointRadius: 3,
                    tension: 0.4,
                    order: 2,
                    yAxisID: 'y1'
                },
                {
                    type: 'line',
                    label: 'Sim Start Freq (AI Data)',
                    data: simFirstNumData,
                    backgroundColor: 'rgba(230, 126, 34, 0.2)', // Orange
                    borderColor: 'rgba(230, 126, 34, 1)',
                    borderWidth: 2,
                    borderDash: [5, 5], // Dashed line to distinguish
                    pointBackgroundColor: 'rgba(230, 126, 34, 1)',
                    pointRadius: 3,
                    tension: 0.4,
                    order: 1,
                    yAxisID: 'y1' // Use same secondary axis
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Main Frequency'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    grid: {
                        drawOnChartArea: false, // only want the grid lines for one axis to show up
                    },
                    title: {
                        display: true,
                        text: 'Bonus / Start Frequency'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Number'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Winning Number Frequency (Main vs Bonus vs Start)'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
}

// Make chart function available globally
window.renderChart = renderChart;
