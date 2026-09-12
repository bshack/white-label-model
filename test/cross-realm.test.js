'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const {Model} = require('../dist/index');

test('accepts ordinary objects from another realm while rejecting non-plain objects', () => {
    const crossRealm = vm.runInNewContext('({name: "Ada", nested: {active: true}})');
    const model = new Model(crossRealm);

    assert.equal(model.get().name, 'Ada');
    model.get().nested.active = false;
    assert.equal(model.get().nested.active, false);

    class Person {
        constructor(name) {this.name = name;}
    }
    assert.throws(() => new Model(new Person('Ada')), /plain object, array, or Map/);

    const customPrototype = Object.create(null);
    assert.throws(() => new Model(Object.create(customPrototype)), /plain object, array, or Map/);
});
