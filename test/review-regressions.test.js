'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {Model, Collection} = require('../dist');

test('delete and destroy clear data even when validation requires fields', () => {
    const model = new Model({token: 'synthetic'}, data => typeof data.token === 'string');
    const changes = [];
    model.on('change', data => changes.push(data));
    assert.equal(model.delete(), true);
    assert.deepEqual(model.get(), {});
    assert.deepEqual(changes, [{}]);
    model.set({token: 'synthetic'}, true);
    model.destroy();
    assert.deepEqual(model.get(), {});
    assert.equal(changes.length, 1);
    assert.deepEqual(model.eventNames(), []);
});

test('nested updates notify once, respect silence, and propagate rejection', () => {
    const child = new Model({count: 0}, data => data.count >= 0);
    const collection = new Collection([child]);
    const calls = [];
    child.on('change', () => calls.push('child'));
    child.on('set', () => calls.push('set'));
    child.on('update', () => calls.push('update'));
    collection.on('change', () => calls.push('collection'));
    assert.equal(collection.update(0, {count: 1}), true);
    assert.deepEqual(calls, ['child', 'update', 'collection']);
    calls.length = 0;
    assert.equal(collection.update(0, {count: 2}, true), true);
    assert.equal(collection.update(0, {count: -1}), false);
    assert.deepEqual(calls, []);
    assert.equal(child.get().count, 2);
});

test('model-like setters must explicitly accept nested updates', () => {
    const accepted = {data: {count: 1}, get() {return this.data;}, set(data, silent) {assert.equal(silent, true); this.data = data; return true;}, message() {}};
    assert.equal(new Collection([accepted]).update(0, {count: 2}), true);
    assert.equal(accepted.data.count, 2);
    const legacyVoid = {data: {count: 1}, get() {return this.data;}, set() {}, message() {}};
    assert.equal(new Collection([legacyVoid]).update(0, {count: 2}), false);
    assert.equal(legacyVoid.data.count, 1);
});

test('large, sparse and self appends preserve array identity and one notification', () => {
    const backing = [1];
    const collection = new Collection(backing);
    let changes = 0;
    collection.on('change', () => changes++);
    collection.push(new Array(250000).fill(2));
    assert.equal(collection.get(), backing);
    assert.equal(backing.length, 250001);
    assert.equal(changes, 1);
    const self = new Collection([1, 2]);
    self.push(self.get());
    assert.deepEqual(self.get(), [1, 2, 1, 2]);
    self.push(new Array(2));
    assert.deepEqual(self.get().slice(-2), [undefined, undefined]);
});

test('collection mutations support falsey values and Map keys', () => {
    const array = new Collection([0, false, '', null]);
    assert.equal(array.get(0), 0);
    assert.equal(array.update(0, false), true);
    assert.equal(array.get(0), false);
    assert.equal(array.update(1, 0), true);
    assert.equal(array.get(1), 0);
    assert.equal(array.update(2, ''), true);
    assert.equal(array.delete(0), true);
    assert.deepEqual(array.get(), [0, '', null]);

    const map = new Collection(new Map([[0, false], ['', 0]]));
    assert.equal(map.get(0), false);
    assert.equal(map.get(''), 0);
    assert.equal(map.update(0, 0), true);
    assert.equal(map.push(false, ''), true);
    assert.equal(map.get(false), '');
    assert.equal(map.delete(''), true);
    assert.equal(map.get().has(''), false);
    assert.equal(map.delete(false), true);
    assert.equal(map.get().has(false), false);
});

test('push uses explicit current signatures and rejects legacy silent placeholders', () => {
    const array = new Collection([]);
    let arrayChanges = 0;
    array.on('change', () => arrayChanges++);
    assert.equal(array.push(0), true);
    assert.equal(array.push(null), true);
    assert.deepEqual(array.get(), [0, null]);
    assert.equal(array.push(['legacy'], false, true), false);
    assert.equal(array.push(['a', 'b'], true), true);
    assert.deepEqual(array.get(), [0, null, 'a', 'b']);
    assert.equal(arrayChanges, 2);
    assert.equal(array.push('key', 'value'), false);
    assert.deepEqual(array.get(), [0, null, 'a', 'b']);

    const map = new Collection(new Map());
    let mapChanges = 0;
    map.on('change', () => mapChanges++);
    assert.equal(map.push(0, false), true);
    assert.equal(map.get(0), false);
    assert.equal(map.push(new Map([['legacy', 9]]), false, true), false);
    assert.equal(map.push(new Map([['a', 1], ['b', 2]]), true), true);
    assert.deepEqual(Array.from(map.get().entries()), [[0, false], ['a', 1], ['b', 2]]);
    assert.equal(mapChanges, 1);
    assert.equal(map.push('value-only'), false);
});

test('array update and delete reject invalid indexes without mutation', () => {
    const collection = new Collection(['first', 'second']);
    const original = collection.get();
    for (const index of ['0', -1, 0.5, NaN, Infinity, 2]) {
        assert.equal(collection.update(index, 'changed'), false);
        assert.equal(collection.delete(index), false);
        assert.deepEqual(collection.get(), ['first', 'second']);
        assert.equal(collection.get(), original);
    }
});

test('delete fails safely if backing storage is externally corrupted', () => {
    const collection = new Collection(['item']);
    collection.collectionData = {};
    assert.equal(collection.delete(0), false);
    assert.deepEqual(collection.get(), {});
});
