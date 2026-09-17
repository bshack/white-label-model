'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const {Model} = require('../dist/index');

test('accepts cross-realm Maps and rejects Symbol.toStringTag Map spoofs', () => {
    const crossRealmMap = vm.runInNewContext('new Map([["profile", {active: true}]])');
    const model = new Model(crossRealmMap);

    assert.equal(model.get()[Symbol.toStringTag], 'Map');
    assert.equal(model.get('profile').active, true);
    model.get('profile').active = false;
    assert.equal(model.get('profile').active, false);

    const spoofedMap = {value: 1, [Symbol.toStringTag]: 'Map'};
    assert.throws(() => new Model(spoofedMap), /plain object, array, or Map/);
});

test('Map detection preserves same-model observable Map proxy behavior', () => {
    const model = new Model(new Map([['first', {active: true}]]));
    const observed = model.get();

    assert.equal(model.push(observed), true);
    assert.equal(model.get('first').active, true);
    model.get('first').active = false;
    assert.equal(model.get('first').active, false);
});
