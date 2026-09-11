'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const WhiteLabelModel = require('../dist/index');

test('model updates preserve normal data', function() {
    const model = new WhiteLabelModel.Model({
        name: 'red'
    });

    assert.equal(model.update({
        name: 'blue',
        primary: true
    }), true);
    assert.deepEqual(model.get(), {
        name: 'blue',
        primary: true
    });
});

test('model validation rejects invalid initial, replacement, and merged data', function() {
    const valid = value => Boolean(value && typeof value.name === 'string');
    const model = new WhiteLabelModel.Model({name: 'Ada'}, valid);
    assert.equal(model.set({name: 42}), false);
    assert.equal(model.update({name: 42}), false);
    assert.deepEqual(model.get(), {name: 'Ada'});
    assert.deepEqual(new WhiteLabelModel.Model({name: 42}, valid).get(), {});
});

test('model updates reject prototype-pollution keys', function() {
    const model = new WhiteLabelModel.Model({
        name: 'safe'
    });
    const maliciousUpdate = JSON.parse(
        '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"prototype":{"polluted":true}}'
    );

    assert.equal(model.update(maliciousUpdate), true);
    assert.equal({}.polluted, undefined);
    assert.equal(Object.prototype.hasOwnProperty.call(model.get(), '__proto__'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(model.get(), 'constructor'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(model.get(), 'prototype'), false);
    assert.equal(model.get().name, 'safe');
});

test('collection object updates reject prototype-pollution keys', function() {
    const collection = new WhiteLabelModel.Collection([{
        name: 'safe'
    }]);
    const maliciousUpdate = JSON.parse('{"__proto__":{"polluted":true}}');

    assert.equal(collection.update(0, maliciousUpdate), true);
    assert.equal({}.polluted, undefined);
    assert.equal(Object.prototype.hasOwnProperty.call(collection.get(0), '__proto__'), false);
    assert.equal(collection.get(0).name, 'safe');
});

test('collection appends single values and arrays without replacing its backing array', function() {
    const collection = new WhiteLabelModel.Collection(['red']);
    const originalData = collection.get();

    assert.equal(collection.push('green', true), true);
    assert.equal(collection.push(['blue', 'yellow'], true), true);
    assert.equal(collection.get(), originalData);
    assert.deepEqual(collection.get(), ['red', 'green', 'blue', 'yellow']);
});

test('collection deletion updates the backing array in place', function() {
    const collection = new WhiteLabelModel.Collection(['red', 'green', 'blue']);
    const originalData = collection.get();

    assert.equal(collection.delete(1, true), true);
    assert.equal(collection.get(), originalData);
    assert.deepEqual(collection.get(), ['red', 'blue']);
});
