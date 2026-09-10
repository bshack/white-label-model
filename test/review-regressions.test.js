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

test('void-returning model-like setters remain accepted and receive silence', () => {
    const child = {data: {count: 1}, get() {return this.data;}, set(data, silent) {assert.equal(silent, true); this.data = data;}, message() {}};
    assert.equal(new Collection([child]).update(0, {count: 2}), true);
    assert.equal(child.data.count, 2);
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
