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
