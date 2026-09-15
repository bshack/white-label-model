'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {Model} = require('../dist');

test('Model 7 does not expose legacy service or utility compatibility methods', () => {
    const instance = new Model();
    for (const method of ['serviceGet', 'servicePatch', 'servicePost', 'servicePut', 'isFinite', 'pullAt', 'extend', 'message']) {
        assert.equal(method in instance, false, `${method} should not be public`);
    }
});

test('detached proxies cannot emit changes for a replacement root', () => {
    const model = new Model({nested: {value: 1}});
    const detached = model.get().nested;
    let changes = 0;
    model.addEventListener('change', () => {changes += 1;});

    assert.equal(model.set({nested: {value: 2}}, true), true);
    detached.value = 3;
    assert.equal(model.get().nested.value, 2);
    assert.equal(changes, 0);

    const detachedAfterSet = model.get().nested;
    model.clear(true);
    detachedAfterSet.value = 4;
    assert.deepEqual(model.get(), {});
    assert.equal(changes, 0);
});

test('Map-shaped Model replaces values including supported falsey updates', () => {
    const model = new Model(new Map([['item', 1]]));
    assert.equal(model.update('item', 'updated'), true);
    assert.equal(model.get('item'), 'updated');
    assert.equal(model.update('item', false), true);
    assert.equal(model.get('item'), false);
});
