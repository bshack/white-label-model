'use strict';

// `npm run benchmark` prints full timings. `npm run bench:ci` (`--ci`) runs a reduced set and fails when an
// operation is more than `tolerance` times slower than benchmark/baseline.json or an event counter differs.
// Refresh the baseline with `node --run build && node benchmark/model.bench.js --ci --update-baseline`.
const fs = require('node:fs');
const path = require('node:path');
const {performance} = require('node:perf_hooks');
const {Model} = require('../dist/index.js');

const ci = process.argv.includes('--ci');
const updateBaseline = process.argv.includes('--update-baseline');
const baselinePath = path.join(__dirname, 'baseline.json');
const rounds = 5;

/** Full-run iterations, divided by this in CI mode to keep the run short. */
const ciDivisor = 2;

function median(values) {
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[Math.floor(sorted.length / 2)];
}

function measure(operation, iterations, callback) {
    const scaled = ci ? iterations / ciDivisor : iterations;
    const results = [];
    for (let round = 0; round < rounds; round += 1) {
        const start = performance.now();
        callback(scaled);
        results.push(performance.now() - start);
    }
    return {operation, iterations: scaled, milliseconds: Number(median(results).toFixed(2))};
}

/** Count events of one type on a model, so CI can check that every mutation still dispatches. */
function countEvents(model, type) {
    const counter = {count: 0};
    if (ci) {model.addEventListener(type, () => {counter.count += 1;});}
    return counter;
}

const rows = [];

if (!ci) {
    rows.push(measure('construct nested object', 50_000, iterations => {
        for (let index = 0; index < iterations; index += 1) {
            new Model({profile: {name: 'Ada', active: true}});
        }
    }));
}

const readModel = new Model({profile: {name: 'Ada', active: true}});
rows.push(measure('nested proxy read', 1_000_000, iterations => {
    let value;
    for (let index = 0; index < iterations; index += 1) {
        value = readModel.get().profile.name;
    }
    if (value !== 'Ada') {throw new Error('Unexpected benchmark state');}
}));

const mutationModel = new Model({profile: {active: true}});
const mutationEvents = countEvents(mutationModel, 'mutate');
rows.push(measure('nested proxy mutation', 100_000, iterations => {
    for (let index = 0; index < iterations; index += 1) {
        mutationModel.get().profile.active = Boolean(index & 1);
    }
}));

const updateModel = new Model({name: 'Ada', active: true});
rows.push(measure('object update', 50_000, iterations => {
    for (let index = 0; index < iterations; index += 1) {
        updateModel.update({active: Boolean(index & 1)}, true);
    }
}));

const arrayModel = new Model([{active: true}]);
rows.push(measure('array member update', 50_000, iterations => {
    for (let index = 0; index < iterations; index += 1) {
        arrayModel.update(0, {active: Boolean(index & 1)}, true);
    }
}));

const mapModel = new Model(new Map([['profile', {active: true}]]));
rows.push(measure('Map member update', 50_000, iterations => {
    for (let index = 0; index < iterations; index += 1) {
        mapModel.update('profile', {active: Boolean(index & 1)}, true);
    }
}));

console.table(rows);

if (ci) {
    // Each iteration flips the value, so every write is a real change and dispatches exactly one event.
    const counters = {'nested proxy mutation events': mutationEvents.count};
    if (updateBaseline) {
        const baseline = {
            tolerance: 3,
            recordedWith: `Node.js ${process.version}`,
            operations: Object.fromEntries(rows.map(row => [row.operation, row.milliseconds])),
            counters,
        };
        fs.writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
        console.log(`Wrote ${path.relative(process.cwd(), baselinePath)}`);
    } else {
        const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
        const failures = [];
        for (const row of rows) {
            const limit = baseline.operations[row.operation] * baseline.tolerance;
            if (!(row.milliseconds <= limit)) {
                failures.push(`${row.operation}: ${row.milliseconds} ms exceeds ${limit.toFixed(2)} ms`);
            }
        }
        for (const [name, value] of Object.entries(baseline.counters)) {
            if (counters[name] !== value) {failures.push(`${name}: expected ${value}, got ${counters[name]}`);}
        }
        if (failures.length > 0) {
            console.error(`Benchmark regression (tolerance ${baseline.tolerance}x):\n  ${failures.join('\n  ')}`);
            process.exitCode = 1;
        } else {
            console.log(`All operations within ${baseline.tolerance}x of benchmark/baseline.json; counters match.`);
        }
    }
}
