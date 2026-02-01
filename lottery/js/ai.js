/**
 * Deep Learning / RL Module using TensorFlow.js
 * Implements a Policy Network to learn extraction sequences.
 */

let model = null;
let isTraining = false;

/**
 * Prepare data for Policy Network (Sequence -> Next Number Probability)
 * Input: Sequence of N numbers (normalized)
 * Output: One-hot vector for the next number (Action)
 */
function prepareData(history, windowSize = 5) {
    const xs = [];
    const ys = [];

    // Iterate through each draw independently
    // We only want to learn the sequence WITHIN a draw, not across draws.
    history.forEach(draw => {
        if (!Array.isArray(draw) || draw.length < windowSize + 1) return;

        // Create sliding windows within this draw
        for (let i = 0; i <= draw.length - windowSize - 1; i++) {
            // Input: Sequence of 'windowSize' numbers
            const x = draw.slice(i, i + windowSize).map(n => n / 45);

            // Target: The next number (Action)
            const targetNum = draw[i + windowSize];

            // One-hot encode target (Index 0 is unused, 1-45 used)
            const y = Array(46).fill(0);
            if (targetNum >= 1 && targetNum <= 45) {
                y[targetNum] = 1;
            }

            xs.push(x);
            ys.push(y);
        }
    });

    return {
        xs: tf.tensor2d(xs, [xs.length, windowSize]),
        ys: tf.tensor2d(ys, [ys.length, 46]) // 46 classes (0-45)
    };
}

/**
 * Build and Train Policy Model
 */
async function trainAIModel(progressCallback, customData = null) {
    if (isTraining) return;
    isTraining = true;

    // STRICT RULE: Sequential Mode (AI) must ONLY use Simulation Data.
    let history = [];

    // Use custom data (Simulation Results) if provided
    if (customData && Array.isArray(customData) && customData.length > 0) {
        console.log(`Training Policy Network with ${customData.length} simulation records.`);
        history = customData;
    } else {
        alert("No simulation data found! Please run 'Simulate & Train' first.");
        isTraining = false;
        return;
    }

    if (history.length < 10) {
        alert("Not enough simulation data to train! (Need 10+)");
        isTraining = false;
        return;
    }

    // Define Policy Network
    // Input: Sequence of 5 numbers
    // Output: Probability distribution over 46 numbers (Softmax)
    model = tf.sequential();
    model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [5] }));
    model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 46, activation: 'softmax' })); // Output probabilities

    // Use Categorical Crossentropy (Standard for Policy Gradients / Classification)
    // This effectively maximizes the log-probability (Reward) of the correct action.
    model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy' });

    const { xs, ys } = prepareData(history);

    console.log("Starting Training...");

    await model.fit(xs, ys, {
        epochs: 20,
        batchSize: 32,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                // Log "Reward" (Accuracy/Loss inverse) for user feedback
                if (progressCallback) progressCallback(epoch + 1, logs.loss);
            }
        }
    });

    xs.dispose();
    ys.dispose();
    isTraining = false;
    console.log("AI Policy Training Complete");
}

/**
 * Generate numbers using the trained Policy Network
 */
async function getDeepLearningNumbers(rng) {
    if (!model) {
        console.warn("Model not trained, using Sequential fallback");
        return window.getSequentialNumbers(rng);
    }

    const result = [];

    // Start with a random seed sequence (Exploration)
    // Since we trained on simulation data, we should start with a simulated-like state.
    // Let's pick 5 random numbers to start the chain.
    let inputSeq = [];
    for (let i = 0; i < 5; i++) {
        const r = await rng();
        inputSeq.push(Math.floor(r * 45) + 1);
    }
    inputSeq = inputSeq.map(n => n / 45);

    while (result.length < 7) { // 6 main + 1 bonus
        // Predict Action Probabilities
        const input = tf.tensor2d([inputSeq], [1, 5]);
        const prediction = model.predict(input);
        const probabilities = await prediction.data(); // Float32Array of size 46

        input.dispose();
        prediction.dispose();

        // Sample from the distribution (Stochastic Policy)
        // This allows for diversity and respects the learned probabilities.
        let num = -1;
        const r = await rng();
        let cumulative = 0;

        // Normalize probabilities (just in case) and sample
        // Skip index 0
        let totalProb = 0;
        for (let i = 1; i <= 45; i++) totalProb += probabilities[i];

        const randomVal = r * totalProb;

        for (let i = 1; i <= 45; i++) {
            cumulative += probabilities[i];
            if (randomVal <= cumulative) {
                num = i;
                break;
            }
        }

        // Fallback
        if (num === -1) num = Math.floor(r * 45) + 1;

        // Prevent duplicates (Constraint)
        if (result.includes(num)) {
            // If duplicate, try to pick the next most likely, or just random available
            // Simple retry with random available for robustness
            const available = [];
            for (let i = 1; i <= 45; i++) {
                if (!result.includes(i)) available.push(i);
            }
            const r2 = await rng();
            num = available[Math.floor(r2 * available.length)];
        }

        result.push(num);

        // Update sequence
        inputSeq.shift();
        inputSeq.push(num / 45);
    }

    return result;
}

// Export
window.trainAIModel = trainAIModel;
window.getDeepLearningNumbers = getDeepLearningNumbers;
