/**
 * Random Number Generator implementations
 */

/**
 * Get a random number generator based on the specified type
 * @param {string} type - The RNG type ('prng', 'secure', 'vrf', 'blockchain')
 * @returns {Promise<Function>} An async or sync function that returns a random number between 0 and 1
 */
async function getRNG(type) {
    switch (type) {
        case 'secure':
            return () => {
                const array = new Uint32Array(1);
                window.crypto.getRandomValues(array);
                return array[0] / (0xFFFFFFFF + 1);
            };
        case 'vrf':
            // Simulated VRF: Hash(Seed + Counter)
            // In a real app, this would verify a proof from a VRF provider.
            const seed = Date.now().toString();
            let counter = 0;
            return async () => {
                counter++;
                const msg = seed + counter;
                const msgBuffer = new TextEncoder().encode(msg);
                const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                // Use first 4 bytes for randomness
                const value = (hashArray[0] << 24) | (hashArray[1] << 16) | (hashArray[2] << 8) | hashArray[3];
                return (value >>> 0) / (0xFFFFFFFF + 1);
            };
        case 'blockchain':
            try {
                // Fetch latest Bitcoin block hash
                const response = await fetch('https://blockchain.info/q/latesthash?cors=true');
                if (!response.ok) throw new Error('Blockchain API failed');
                const hash = await response.text();
                console.log("Using Bitcoin Block Hash:", hash);

                // Simple seeded RNG (Mulberry32) using the hash
                let seedVal = 0;
                for (let i = 0; i < hash.length; i++) {
                    seedVal = ((seedVal << 5) - seedVal) + hash.charCodeAt(i);
                    seedVal |= 0;
                }
                // Mix in timestamp to ensure different results per click even within the same block time
                seedVal += Date.now();

                return () => {
                    let t = seedVal += 0x6D2B79F5;
                    t = Math.imul(t ^ (t >>> 15), t | 1);
                    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                };
            } catch (e) {
                console.warn("Blockchain RNG failed, falling back to Secure RNG:", e);
                return getRNG('secure');
            }
        case 'prng':
        default:
            return () => Math.random();
    }
}

/**
 * Generate random unique numbers using the provided RNG
 * @param {Function} rng - Random number generator function
 * @param {number} count - Number of unique numbers to generate
 * @param {number} max - Maximum number value (default: 45)
 * @returns {Promise<number[]>} Array of unique random numbers
 */
async function getRandomNumbers(rng, count = CONFIG.TOTAL_DRAW_COUNT, max = CONFIG.TOTAL_NUMBERS) {
    const numbers = [];
    while (numbers.length < count) {
        const randomVal = await rng();
        const num = Math.floor(randomVal * max) + 1;
        if (!numbers.includes(num)) {
            numbers.push(num);
        }
    }
    return numbers;
}

// Make RNG functions available globally
window.getRNG = getRNG;
window.getRandomNumbers = getRandomNumbers;
