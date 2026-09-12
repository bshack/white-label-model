'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {Model} = require('../dist/index');

test('object updates preserve normal data', function() {
    const model = new Model({name: 'red'});
    assert.equal(model.update({name: 'blue', primary: true}), true);
    assert.deepEqual(model.get(), {name: 'blue', primary: true});
});

test('validation rejects invalid initial, replacement, and merged data', function() {
    const valid = value => Boolean(value && typeof value.name === 'string');
    assert.throws(() => new Model({name: 42}, valid), TypeError);
    const model = new Model({name: 'Ada'}, valid);
    assert.equal(model.set({name: 42}), false);
    assert.equal(model.update({name: 42}), false);
    assert.deepEqual(model.get(), {name: 'Ada'});
});

test('object updates reject prototype-pollution keys', function() {
    const model = new Model({name: 'safe'});
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

test('array-member object updates reject prototype-pollution keys', function() {
    const model = new Model([{name: 'safe'}]);
    const maliciousUpdate = JSON.parse('{"__proto__":{"polluted":true}}');
    assert.equal(model.update(0, maliciousUpdate), true);
    assert.equal({}.polluted, undefined);
    assert.equal(Object.prototype.hasOwnProperty.call(model.get(0), '__proto__'), false);
    assert.equal(model.get(0).name, 'safe');
});

test('direct observable writes reject prototype-pollution properties', function() {
    const model = new Model({name: 'safe'});
    assert.throws(() => { model.get().__proto__ = {polluted: true}; }, TypeError);
    assert.throws(() => { model.get().constructor = {polluted: true}; }, TypeError);
    assert.throws(() => { model.get().prototype = {polluted: true}; }, TypeError);
    assert.equal({}.polluted, undefined);
});
