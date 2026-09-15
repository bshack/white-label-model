'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {Model} = require('../dist');
const Utilities = require('../dist/utilities');

test('service extension hooks resolve empty data without making network requests', async () => {
    const instance = new Model();
    for (const method of ['serviceGet', 'servicePatch', 'servicePost', 'servicePut']) {
        assert.deepEqual(await instance[method](), {});
    }
});

test('safe merges tolerate absent sources and falsey notifications do not dispatch', () => {
    const utilities = new Utilities();
    assert.deepEqual(utilities.extend(null, {a: 1}), {a: 1});
    assert.deepEqual(utilities.extend({b: 2}, null), {b: 2});
    let dispatched = false;
    utilities.addEventListener('change', () => {dispatched = true;});
    assert.equal(utilities.message(['change'], null), false);
    assert.equal(dispatched, false);
});

test('Map-shaped Model replaces values including supported falsey updates', () => {
    const model = new Model(new Map([['item', 1]]));
    assert.equal(model.update('item', 'updated'), true);
    assert.equal(model.get('item'), 'updated');
    assert.equal(model.update('item', false), true);
    assert.equal(model.get('item'), false);
});
