'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {Model, Collection} = require('../dist');
const Utilities = require('../dist/utilities');
test('service extension hooks resolve empty data without making network requests', async () => {
    for (const instance of [new Model(), new Collection()]) {
        for (const method of ['serviceGet', 'servicePatch', 'servicePost', 'servicePut']) {
            assert.deepEqual(await instance[method](), {});
        }
    }
});
test('safe merges tolerate absent sources and falsey notifications do not emit', () => {
    const utilities = new Utilities();
    assert.deepEqual(utilities.extend(null, {a: 1}), {a: 1});
    assert.deepEqual(utilities.extend({b: 2}, null), {b: 2});
    let emitted = false;
    utilities.on('change', () => {emitted = true;});
    assert.equal(utilities.message(['change'], null), false);
    assert.equal(emitted, false);
});
test('collection replaces Map values and rejects unsupported falsey updates', () => {
    const collection = new Collection(new Map([['item', 1]]));
    assert.equal(collection.update('item', 'updated'), true);
    assert.equal(collection.get('item'), 'updated');
    assert.equal(collection.update('item', false), false);
    assert.equal(collection.get('item'), 'updated');
});
