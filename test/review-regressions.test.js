'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {Model} = require('../dist');

test('clear and destroy empty state even when validation requires fields', () => {
    const model = new Model({token: 'synthetic'}, data => typeof data.token === 'string');
    const changes = [];
    model.addEventListener('change', event => changes.push(event.detail));
    assert.equal(model.clear(), true);
    assert.deepEqual(model.get(), {});
    assert.equal(changes.length, 1);
    model.set({token: 'synthetic'}, true);
    model.destroy();
    assert.deepEqual(model.get(), {});
    assert.equal(changes.length, 1);
    model.dispatchEvent(new CustomEvent('change', {detail: model.get()}));
    assert.equal(changes.length, 1);
});

test('large, sparse and self appends preserve array identity and one notification', () => {
    const model = new Model([1]);
    const backing = model.get();
    let changes = 0;
    model.addEventListener('change', () => changes++);
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

test('assigning modelData directly bypasses validation and observation', () => {
    const model = new Model({name: 'Ada'}, data => typeof data.name === 'string');
    let changes = 0;
    model.addEventListener('change', () => changes++);
    const replacement = {name: 42};
    model.modelData = replacement;
    assert.equal(model.get(), replacement);
    model.get().name = 7;
    assert.equal(changes, 0);
    assert.equal(model.set({name: 'Grace'}), true);
    assert.equal(changes, 1);
});

test('array and Map member update merges into a new object without non-enumerable or own __proto__ keys', () => {
    const hidden = {a: 1};
    Object.defineProperty(hidden, 'hidden', {value: 'h', writable: true, configurable: true, enumerable: false});
    const parsed = JSON.parse('{"__proto__": {"x": 1}, "a": 1}');
    const list = new Model([hidden, parsed]);
    assert.equal(list.update(0, {a: 2}), true);
    assert.equal(list.update(1, {a: 2}), true);
    assert.equal(Object.getOwnPropertyDescriptor(list.get(0), 'hidden'), undefined);
    assert.equal(Object.hasOwn(list.get(1), '__proto__'), false);
    assert.equal(list.get(1).a, 2);

    const map = new Model(new Map([['item', hidden]]));
    assert.equal(map.update('item', {a: 3}), true);
    assert.equal(Object.getOwnPropertyDescriptor(map.get('item'), 'hidden'), undefined);

    const root = {a: 1};
    Object.defineProperty(root, 'hidden', {value: 'h', writable: true, configurable: true, enumerable: false});
    const object = new Model(root);
    assert.equal(object.update({a: 2}), true);
    assert.equal(Object.getOwnPropertyDescriptor(object.get(), 'hidden').value, 'h');
});

test('update with unchanged values still dispatches; a direct write of the stored value does not', () => {
    const object = new Model({name: 'Ada'});
    const events = [];
    object.addEventListener('change', () => events.push('change'));
    object.addEventListener('update', () => events.push('update'));
    object.get().name = 'Ada';
    assert.deepEqual(events, []);
    assert.equal(object.update({name: 'Ada'}), true);
    assert.deepEqual(events, ['change', 'update']);

    const list = new Model([{v: 1}]);
    const before = list.get(0);
    let changes = 0;
    list.addEventListener('change', () => changes++);
    assert.equal(list.update(0, {v: 1}), true);
    assert.equal(changes, 1);
    assert.notEqual(list.get(0), before);
});

test('the validator candidate is a shallow copy that shares nested objects with live state', () => {
    let calls = 0;
    const model = new Model({nested: {x: 1}}, data => {
        calls++;
        if (calls === 1) {return true;}
        data.nested.x = 999;
        return false;
    });
    let changes = 0;
    model.addEventListener('change', () => changes++);
    assert.equal(model.update({y: 1}), false);
    assert.equal(model.get().y, undefined);
    assert.equal(model.get().nested.x, 999);
    assert.equal(changes, 0);
});
