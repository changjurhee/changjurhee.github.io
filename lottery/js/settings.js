/**
 * Settings and Data Management
 */

function initSettings() {
    const settingsBtn = document.getElementById('settings-btn');
    const modal = document.getElementById('settings-modal');
    const closeBtn = document.getElementById('settings-close');
    const defaultDataBtn = document.getElementById('use-default-data');
    const uploadBtn = document.getElementById('upload-excel-btn');
    const fileInput = document.getElementById('excel-upload');
    const statusMsg = document.getElementById('upload-status');

    if (!settingsBtn || !modal) return;

    // Open Modal
    settingsBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        if (statusMsg) statusMsg.innerText = '';
    });

    // Close Modal
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    // Close on click outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    // Option 1: Default Data
    if (defaultDataBtn) {
        defaultDataBtn.addEventListener('click', () => {
            if (confirm("Reset to default server data?")) {
                location.reload();
            }
        });
    }

    // Option 2: Upload Excel
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            handleFileUpload(file, statusMsg);
        });
    }
}

/**
 * Handle File Upload and Parsing
 */
function handleFileUpload(file, statusEl) {
    const reader = new FileReader();

    statusEl.innerText = "Reading file...";
    statusEl.className = "status-msg";

    reader.onload = (e) => {
        try {
            const content = e.target.result;
            const parsedData = parseExcelHTML(content);

            if (parsedData.winning.length > 0) {
                // Update Globals
                window.allWinningNumbers = parsedData.winning;
                window.allBonusNumbers = parsedData.bonus;
                window.allWinningDates = parsedData.dates; // If we parsed dates

                // Refresh UI
                console.log(`Loaded ${parsedData.winning.length} rounds from file.`);

                // Re-render Chart
                if (window.renderChart) {
                    window.renderChart(window.allWinningNumbers, window.allBonusNumbers);
                }

                // Re-render History
                const historyContainer = document.getElementById('winning-history-log');
                if (historyContainer) {
                    historyContainer.innerHTML = ''; // Clear cache
                    if (window.renderWinningHistory) {
                        // Reset index
                        // We need to access the internal state of ui.js or just force re-render
                        // Since ui.js state is private, we might need to reload the tab or expose a reset function.
                        // For now, clearing innerHTML will trigger a re-render when tab is clicked.
                        // If tab is active, we should call it.
                        const activeTab = document.querySelector('.tab-btn.active');
                        if (activeTab && activeTab.dataset.tab === 'winning-history-view') {
                            window.renderWinningHistory();
                        }
                    }
                }

                statusEl.innerText = `Success! Loaded ${parsedData.winning.length} rounds.`;
                statusEl.className = "status-msg status-success";
            } else {
                throw new Error("No valid data found in file.");
            }
        } catch (err) {
            console.error(err);
            statusEl.innerText = "Error parsing file. Is it a valid Donghang Lottery XLS?";
            statusEl.className = "status-msg status-error";
        }
    };

    reader.readAsText(file, 'euc-kr'); // Try Korean encoding first
}

/**
 * Parse HTML content from the "Excel" file
 * Logic adapted from extract_numbers.py
 */
function parseExcelHTML(htmlContent) {
    const allData = [];

    // Simple regex parsing to avoid heavy DOM parsing if possible, 
    // but DOMParser is safer in browser.
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const rows = doc.querySelectorAll('tr');

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return;

        // Clean text
        const cellTexts = Array.from(cells).map(td => td.innerText.trim().replace(/,/g, ''));

        // Find date pattern YYYY.MM.DD
        let dateIndex = -1;
        for (let i = 0; i < Math.min(cellTexts.length, 5); i++) {
            if (/^\d{4}\.\d{2}\.\d{2}$/.test(cellTexts[i])) {
                dateIndex = i;
                break;
            }
        }

        if (dateIndex !== -1) {
            try {
                const roundNum = parseInt(cellTexts[dateIndex - 1]);
                const date = cellTexts[dateIndex];

                // Numbers are usually the last 7 columns (6 main + 1 bonus)
                // But let's be safe and take from end
                const len = cellTexts.length;
                const potentialNums = cellTexts.slice(len - 7, len);
                const nums = potentialNums.map(n => parseInt(n));

                if (nums.every(n => !isNaN(n) && n >= 1 && n <= 45)) {
                    allData.push({
                        round: roundNum,
                        date: date,
                        main: nums.slice(0, 6),
                        bonus: nums[6]
                    });
                }
            } catch (e) {
                // Ignore malformed rows
            }
        }
    });

    // Sort descending by round
    allData.sort((a, b) => b.round - a.round);

    return {
        winning: allData.map(d => d.main),
        bonus: allData.map(d => d.bonus),
        dates: allData.map(d => d.date)
    };
}

// Export
window.initSettings = initSettings;
