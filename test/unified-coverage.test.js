'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {Model} = require('../dist');
const Utilities = require('../dist/utilities');

test('observable Map exposes native reads, iteration, callbacks, and mutations', () => {
    const model = new Model(new Map([
        ['object', {name: 'Ada'}],
        ['number', 1]
    ]));
    const map = model.get();
    const changes = [];
    const mutations = [];
    model.on('change', state => changes.push(state));
    model.on('mutate', mutation => mutations.push(mutation));

    assert.equal(map.size, 2);
    assert.equal(map.has('number'), true);
    assert.equal(map.get('object'), map.get('object'));
    map.get('object').name = 'Grace';
    assert.equal(mutations.at(-1).path[0], 'object');
    assert.equal(mutations.at(-1).path[1], 'name');

    const visited = [];
    map.forEach((value, key, receivedMap) => {
        visited.push([key, value]);
        assert.equal(receivedMap, map);
    });
    assert.equal(visited.length, 2);

    const values = [...map.values()];
    assert.equal(values.length, 2);
    assert.equal(values[0].name, 'Grace');
    assert.deepEqual([...map.keys()], ['object', 'number']);
    assert.deepEqual([...map.entries()].map(([key]) => key), ['object', 'number']);
    assert.deepEqual([...map].map(([key]) => key), ['object', 'number']);

    assert.equal(map.set('number', 1), map);
    assert.equal(changes.length, 1);
    assert.equal(map.set('number', 2), map);
    assert.equal(map.get('number'), 2);
    assert.equal(map.delete('missing'), false);
    assert.equal(map.delete('number'), true);
    assert.equal(map.has('number'), false);
    map.clear();
    assert.equal(map.size, 0);
    map.clear();
    assert.equal(map.size, 0);
});

test('Map nested proxy cache refreshes when a key receives a different object', () => {
    const model = new Model(new Map([['person', {name: 'Ada'}]]));
    const map = model.get();
    const first = map.get('person');
    map.set('person', {name: 'Grace'});
    const second = map.get('person');
    assert.notEqual(first, second);
    assert.equal(second.name, 'Grace');
});

test('object update reports rejection if a stateful validator changes between checks', () => {
    let checks = 0;
    const model = new Model({name: 'Ada'}, () => {
        checks += 1;
        return checks !== 3;
    });
    assert.equal(model.update({name: 'Grace'}), false);
    assert.equal(model.get().name, 'Ada');
});

test('shared Utilities guards and array helper retain their standalone contract', () => {
    const utilities = new Utilities();
    assert.equal(utilities.isMap(new Map()), true);
    assert.equal(utilities.isMap({}), false);
    assert.equal(utilities.isFinite(1), true);
    assert.equal(utilities.isFinite(Infinity), false);
    assert.equal(utilities.isFinite('1'), false);
    assert.equal(utilities.isPlainObject(Object.create(null)), true);
    assert.equal(utilities.isPlainObject(new (class Example {})()), false);
    assert.equal(utilities.isPlainObject([]), false);
    const items = ['a', 'b'];
    assert.equal(utilities.pullAt(items, 0), items);
    assert.deepEqual(items, ['b']);
});
