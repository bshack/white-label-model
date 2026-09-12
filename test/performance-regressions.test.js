'use strict';

const assert = require('node:assert/strict');
const {performance} = require('node:perf_hooks');
const {test} = require('node:test');
const {Model} = require('../dist');

function measure(callback) {
    const start = performance.now();
    callback();
    return performance.now() - start;
}

test('unvalidated Map point mutations stay effectively independent of collection size', () => {
    const entries = Array.from({length: 20000}, (_, index) => [index, index]);
    const model = new Model(new Map(entries));

    const elapsed = measure(() => {
        for (let index = 0; index < 1000; index += 1) {
            assert.equal(model.update(index, index + 1, true), true);
        }
        for (let index = 20000; index < 21000; index += 1) {
            assert.equal(model.push(index, index, true), true);
        }
        for (let index = 0; index < 1000; index += 1) {
            assert.equal(model.delete(index, true), true);
        }
    });

    assert.ok(elapsed < 1500, `3000 point mutations on a 20k-entry Map took ${elapsed.toFixed(1)}ms`);
});

test('unvalidated array point updates avoid whole-array copying', () => {
    const model = new Model(new Array(100000).fill(0));

    const elapsed = measure(() => {
        for (let index = 0; index < 2000; index += 1) {
            assert.equal(model.update(index, index, true), true);
        }
    });

    assert.ok(elapsed < 1000, `2000 point updates on a 100k-item array took ${elapsed.toFixed(1)}ms`);
});
