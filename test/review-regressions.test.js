'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {Model} = require('../dist');

test('clear and destroy empty state even when validation requires fields', () => {
    const model = new Model({token: 'synthetic'}, data => typeof data.token === 'string');
    const changes = [];
    model.on('change', data => changes.push(data));
    assert.equal(model.clear(), true);
    assert.deepEqual(model.get(), {});
    assert.equal(changes.length, 1);
    model.set({token: 'synthetic'}, true);
    model.destroy();
    assert.deepEqual(model.get(), {});
    assert.equal(changes.length, 1);
    assert.deepEqual(model.eventNames(), []);
});

test('large, sparse and self appends preserve array identity and one notification', () => {
    const model = new Model([1]);
    const backing = model.get();
    let changes = 0;
    model.on('change', () => changes++);
    model.push(new Array(250000).fill(2));
    assert.equal(model.get(), backing);
    assert.equal(backing.length, 250001);
    assert.equal(changes, 1);
    const self = new Model([1, 2]);
    self.push(self.get());
    assert.deepEqual(self.get(), [1, 2, 1, 2]);
    self.push(new Array(2));
    assert.deepEqual(self.get().slice(-2), [undefined, undefined]);
});

test('collection-shaped models support falsey values and Map keys', () => {
    const array = new Model([0, false, '', null]);
    assert.equal(array.get(0), 0);
    assert.equal(array.update(0, false), true);
    assert.equal(array.update(1, 0), true);
    assert.equal(array.update(2, ''), true);
    assert.equal(array.delete(0), true);
    assert.deepEqual(array.get(), [0, '', null]);

    const map = new Model(new Map([[0, false], ['', 0]]));
    assert.equal(map.get(0), false);
    assert.equal(map.get(''), 0);
    assert.equal(map.update(0, 0), true);
    assert.equal(map.push(false, ''), true);
    assert.equal(map.get(false), '');
    assert.equal(map.delete(''), true);
    assert.equal(map.delete(false), true);
});

test('push uses explicit signatures and rejects legacy placeholders', () => {
    const array = new Model([]);
    assert.equal(array.push(0), true);
    assert.equal(array.push(null), true);
    assert.equal(array.push(['legacy'], false, true), false);
    assert.equal(array.push(['a', 'b'], true), true);
    assert.equal(array.push('key', 'value'), false);
    assert.deepEqual(array.get(), [0, null, 'a', 'b']);

    const map = new Model(new Map());
    assert.equal(map.push(0, false), true);
    assert.equal(map.push(new Map([['legacy', 9]]), false, true), false);
    assert.equal(map.push(new Map([['a', 1], ['b', 2]]), true), true);
    assert.equal(map.push('value-only'), false);
});

test('array update and delete reject invalid indexes without mutation', () => {
    const model = new Model(['first', 'second']);
    const original = model.get();
    for (const index of ['0', -1, 0.5, NaN, Infinity, 2]) {
        assert.equal(model.update(index, 'changed'), false);
        assert.equal(model.delete(index), false);
        assert.deepEqual(model.get(), ['first', 'second']);
        assert.equal(model.get(), original);
    }
});
