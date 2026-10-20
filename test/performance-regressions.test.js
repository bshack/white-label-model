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

/**
 * Count whole-collection reads on one raw container. Wall-clock thresholds alone cannot
 * catch a copy that is fast on the current machine, so these counters make the
 * "no whole-collection copy" contract deterministic.
 */
function countCollectionReads(raw, methods) {
    const counter = {count: 0};
    for (const method of methods) {
        const original = Object.getPrototypeOf(raw)[method];
        Object.defineProperty(raw, method, {
            configurable: true,
            value(...args) {
                counter.count += 1;
                return original.apply(this, args);
            }
        });
    }
    return counter;
}

const mapReads = [Symbol.iterator, 'entries', 'keys', 'values', 'forEach'];
const arrayReads = [Symbol.iterator, 'entries', 'keys', 'values', 'forEach', 'slice', 'concat', 'map', 'filter'];

test('unvalidated Map point mutations stay effectively independent of collection size', () => {
    const raw = new Map(Array.from({length: 20000}, (_, index) => [index, index]));
    const reads = countCollectionReads(raw, mapReads);
    const model = new Model(raw);

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

    assert.equal(reads.count, 0, 'unvalidated Map point mutations must not copy or iterate the collection');
    assert.ok(elapsed < 1500, `3000 point mutations on a 20k-entry Map took ${elapsed.toFixed(1)}ms`);

    // Positive control: validated mutations build a whole-state candidate, so the counter must see it.
    const validatedRaw = new Map([[0, 0]]);
    const validatedReads = countCollectionReads(validatedRaw, mapReads);
    assert.equal(new Model(validatedRaw, () => true).update(0, 1), true);
    assert.ok(validatedReads.count > 0);
});

test('unvalidated array point updates avoid whole-array copying', () => {
    const raw = new Array(100000).fill(0);
    const reads = countCollectionReads(raw, arrayReads);
    const model = new Model(raw);

    const elapsed = measure(() => {
        for (let index = 0; index < 2000; index += 1) {
            assert.equal(model.update(index, index, true), true);
        }
    });
    assert.equal(model.push(1, true), true);

    assert.equal(reads.count, 0, 'unvalidated array point updates must not copy or iterate the collection');
    assert.ok(elapsed < 1000, `2000 point updates on a 100k-item array took ${elapsed.toFixed(1)}ms`);

    // Positive control: validated updates copy the array into a candidate, so the counter must see it.
    const validatedRaw = [0];
    const validatedReads = countCollectionReads(validatedRaw, arrayReads);
    assert.equal(new Model(validatedRaw, () => true).update(0, 1), true);
    assert.ok(validatedReads.count > 0);
});
