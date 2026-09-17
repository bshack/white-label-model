'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {Model} = require('../dist/index');

test('plain-object reads do not traverse inherited prototype properties', function() {
    const model = new Model({nested: {safe: true}});

    assert.equal(model.get('__proto__'), undefined);
    assert.equal(model.get('constructor'), undefined);
    assert.equal(model.get().prototype, undefined);
    assert.equal(model.get().toString, undefined);
    assert.equal(model.get().nested.__proto__, undefined);
    assert.equal(model.get().nested.constructor, undefined);
    assert.equal({}.wlmSecurityProbe, undefined);
});

test('own prototype-named JSON properties remain readable while array methods still work', function() {
    const ownData = JSON.parse(
        '{"__proto__":{"local":true},"constructor":{"prototype":{"local":true}},"prototype":{"local":true}}'
    );
    const model = new Model(ownData);
    const array = new Model([]);

    assert.equal(model.get('__proto__').local, true);
    assert.equal(model.get('constructor').prototype.local, true);
    assert.equal(model.get('prototype').local, true);
    assert.equal(typeof array.get().push, 'function');
    assert.equal(array.get().constructor, undefined);
});

test('object deletion validates the exact remaining state', function() {
    const valid = data => data.mode === 'draft' || !Object.hasOwn(data, 'constructor');
    const model = new Model(
        JSON.parse('{"mode":"draft","constructor":{"restricted":true}}'),
        valid
    );

    assert.equal(model.delete('mode'), false);
    assert.equal(model.get('mode'), 'draft');
    assert.equal(Object.hasOwn(model.get(), 'constructor'), true);
    assert.equal(valid(model.get()), true);
});

test('object deletion preserves non-enumerable state during validation', function() {
    const state = {mode: 'draft'};
    Object.defineProperty(state, 'restricted', {
        configurable: true,
        enumerable: false,
        value: true
    });
    const valid = data => data.mode === 'draft' || !Object.hasOwn(data, 'restricted');
    const model = new Model(state, valid);

    assert.equal(model.delete('mode'), false);
    assert.equal(model.get('mode'), 'draft');
    assert.equal(Object.hasOwn(model.get(), 'restricted'), true);
});

test('object deletion reports failure when the property cannot be deleted', function() {
    const validatedState = {};
    Object.defineProperty(validatedState, 'locked', {
        configurable: false,
        enumerable: true,
        value: true
    });
    const validatedModel = new Model(validatedState, () => true);

    assert.equal(validatedModel.delete('locked'), false);
    assert.equal(Object.hasOwn(validatedModel.get(), 'locked'), true);

    const directState = {};
    Object.defineProperty(directState, 'locked', {
        configurable: false,
        enumerable: true,
        value: true
    });
    const directModel = new Model(directState);

    assert.equal(directModel.delete('locked'), false);
    assert.equal(Object.hasOwn(directModel.get(), 'locked'), true);
});

test('explicit Map deletion releases the observed value cache', function() {
    const value = {id: 1};
    const model = new Model(new Map([['item', value]]));
    const firstObserved = model.get('item');

    assert.equal(model.delete('item', true), true);
    assert.equal(model.push('item', value, true), true);

    const secondObserved = model.get('item');
    assert.notEqual(secondObserved, firstObserved);
    assert.deepEqual(secondObserved, value);
});

test('aliased Map views refresh observed values after proxy replacement', function() {
    const shared = new Map([['item', {id: 1}]]);
    const model = new Model({first: shared, second: shared});
    const firstMap = model.get().first;
    const secondMap = model.get().second;
    const firstObserved = firstMap.get('item');
    const secondObserved = secondMap.get('item');

    firstMap.set('item', {id: 2});

    assert.notEqual(firstMap.get('item'), firstObserved);
    assert.notEqual(secondMap.get('item'), secondObserved);
    assert.deepEqual(secondMap.get('item'), {id: 2});
});

test('explicit Map deletion does not report success when the raw delete fails', function() {
    const raw = new Map([['item', {id: 1}]]);
    Object.defineProperty(raw, 'delete', {
        configurable: true,
        value: () => false
    });
    const model = new Model(raw);

    assert.equal(model.delete('item'), false);
    assert.equal(model.get().has('item'), true);
});
