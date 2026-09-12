'use strict';

const {performance} = require('node:perf_hooks');
const {Model} = require('../dist/index.js');

const rounds = 5;

function median(values) {
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[Math.floor(sorted.length / 2)];
}

function measure(operation, iterations, callback) {
    const results = [];
    for (let round = 0; round < rounds; round += 1) {
        const start = performance.now();
        callback(iterations);
        results.push(performance.now() - start);
    }
    return {operation, iterations, milliseconds: Number(median(results).toFixed(2))};
}

const rows = [];

rows.push(measure('construct nested object', 50_000, iterations => {
    for (let index = 0; index < iterations; index += 1) {
        new Model({profile: {name: 'Ada', active: true}});
    }
}));

const readModel = new Model({profile: {name: 'Ada', active: true}});
rows.push(measure('nested proxy read', 1_000_000, iterations => {
    let value;
    for (let index = 0; index < iterations; index += 1) {
        value = readModel.get().profile.name;
    }
    if (value !== 'Ada') {throw new Error('Unexpected benchmark state');}
}));

const mutationModel = new Model({profile: {active: true}});
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
