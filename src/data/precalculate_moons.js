import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const phrasesPath = path.join(__dirname, 'mutashabihat_phrases.json');
const outputPath = path.join(__dirname, 'moons_layout_config.json');

const phrases = JSON.parse(fs.readFileSync(phrasesPath, 'utf8'));

// Screen Reference Dimensions
const W = 1366;
const H = 768;

// Satellite Dimensions
const R = 87.5; // clamp(120, 13vw, 175) -> max radius is 87.5px at 1366px width
const Buffer = 15; // 15px extra breathing room buffer
const Reff = R + Buffer; // 102.5px effective radius

// Unsafe rectangular regions (coordinates at 1366x768 reference resolution)
const topBar = { x1: 0, y1: 0, x2: W, y2: 75 }; // Topbar area
const bottomBar = { x1: 408, y1: 688, x2: 958, y2: H }; // Bottombar area
const centralCard = { x1: 375.65, y1: 184.32, x2: 990.35, y2: 583.68 }; // Central card
const leftArrow = { x1: 325.65, y1: 363, x2: 367.65, y2: 405 }; // Left navigation arrow
const rightArrow = { x1: 998.35, y1: 363, x2: 1040.35, y2: 405 }; // Right navigation arrow

const unsafeBoxes = [topBar, bottomBar, centralCard, leftArrow, rightArrow];

// Distance from point (x, y) to rectangle box
function distanceToRect(x, y, box) {
    const dx = Math.max(box.x1 - x, 0, x - box.x2);
    const dy = Math.max(box.y1 - y, 0, y - box.y2);
    return Math.sqrt(dx * dx + dy * dy);
}

// Check if a point (x, y) is completely safe for a satellite center
function isSafe(x, y) {
    // 1. Keep satellite fully within screen boundaries (with safety margins)
    if (x < Reff + 25 || x > W - Reff - 25) return false;
    if (y < Reff + 15 || y > H - Reff - 15) return false;

    // 2. Check collision with all unsafe elements
    for (const box of unsafeBoxes) {
        if (distanceToRect(x, y, box) < Reff) {
            return false;
        }
    }
    return true;
}

// Generate the complete pool of safe coordinate points across the screen
const safePool = {
    topRight: [],
    bottomRight: [],
    bottomLeft: [],
    topLeft: [],
    leftCenter: []
};

// Scan the screen pixel-by-pixel with a 2px step (highly precise search grid)
for (let x = 2; x < W; x += 2) {
    for (let y = 2; y < H; y += 2) {
        if (isSafe(x, y)) {
            // Assign point to appropriate sectors
            if (x >= W / 2 && y <= H / 2) safePool.topRight.push({ x, y });
            if (x >= W / 2 && y > H / 2) safePool.bottomRight.push({ x, y });
            if (x < W / 2 && y > H / 2) safePool.bottomLeft.push({ x, y });
            if (x < W / 2 && y <= H / 2) safePool.topLeft.push({ x, y });
            
            if (x < W / 2 && y >= H / 3 && y <= (2 * H) / 3) {
                safePool.leftCenter.push({ x, y });
            }
        }
    }
}

console.log(`🔍 Scan complete. Safe points found per quadrant:`);
console.log(`   - Top-Right: ${safePool.topRight.length}`);
console.log(`   - Bottom-Right: ${safePool.bottomRight.length}`);
console.log(`   - Bottom-Left: ${safePool.bottomLeft.length}`);
console.log(`   - Top-Left: ${safePool.topLeft.length}`);
console.log(`   - Left-Center: ${safePool.leftCenter.length}`);

// Seeded random generator for deterministic layout selection
function seededRandom(seedStr) {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
        hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    return function() {
        hash = (hash * 9301 + 49297) % 233280;
        return hash / 233280;
    };
}

// Get the sectors for a given satellite count
function getSectorsForCount(count) {
    if (count === 3) {
        return [safePool.topRight, safePool.bottomRight, safePool.leftCenter];
    } else if (count === 5) {
        return [safePool.topRight, safePool.bottomRight, safePool.bottomLeft, safePool.topLeft, safePool.leftCenter];
    } else {
        // Default to 4
        return [safePool.topRight, safePool.bottomRight, safePool.bottomLeft, safePool.topLeft];
    }
}

const config = {};

Object.keys(phrases).forEach(topicId => {
    const rand = seededRandom(topicId);
    config[topicId] = {};
    
    [3, 4, 5].forEach(count => {
        const sectors = getSectorsForCount(count);
        const moons = [];
        
        for (let i = 0; i < count; i++) {
            const pool = sectors[i];
            if (!pool || pool.length === 0) {
                // Fallback coordinates if no safe points are found (which shouldn't happen)
                const fallbackPct = [
                    { top: '23%', left: '88%' },
                    { top: '72%', left: '88%' },
                    { top: '72%', left: '12%' },
                    { top: '23%', left: '12%' },
                    { top: '48%', left: '12%' }
                ];
                moons.push({
                    moon_id: `moon-${i}`,
                    top: fallbackPct[i]?.top || '50%',
                    left: fallbackPct[i]?.left || '50%'
                });
                continue;
            }
            
            // Pick a truly random safe point from the pool
            const idx = Math.floor(rand() * pool.length);
            const pt = pool[idx];
            
            // Convert exact pixel coordinate to percentage
            const topPct = ((pt.y / H) * 100).toFixed(2);
            const leftPct = ((pt.x / W) * 100).toFixed(2);
            
            moons.push({
                moon_id: `moon-${i}`,
                top: `${topPct}%`,
                left: `${leftPct}%`
            });
        }
        config[topicId][count] = moons;
    });
});

fs.writeFileSync(outputPath, JSON.stringify(config, null, 2), 'utf8');
console.log(`✅ Precalculated layout written to: ${outputPath}`);
