'use strict';

const assert = require('node:assert/strict');
const {describe, it, mock} = require('node:test');
const {Model} = require('../dist/index');

describe('Unified Model', () => {
    it('accepts plain objects, arrays, and Maps and rejects unsupported roots', () => {
        assert.deepEqual(new Model({name: 'Ada'}).get(), {name: 'Ada'});
        assert.deepEqual(new Model(['Ada']).get(), ['Ada']);
        assert.deepEqual([...new Model(new Map([['name', 'Ada']])).get()], [['name', 'Ada']]);
        assert.throws(() => new Model('invalid'), TypeError);
    });

    it('gets complete state and individual members', () => {
        const symbol = Symbol('value');
        const object = new Model({name: 'Ada', 2: 'two', [symbol]: 'symbol'});
        const array = new Model(['zero']);
        const map = new Model(new Map([[undefined, 'undefined'], ['name', 'Ada']]));
        assert.equal(object.get('name'), 'Ada');
        assert.equal(object.get(2), 'two');
        assert.equal(object.get(symbol), 'symbol');
        assert.equal(object.get({}), undefined);
        assert.equal(array.get(0), 'zero');
        assert.equal(array.get('0'), undefined);
        assert.equal(map.get(undefined), 'undefined');
        assert.equal(map.get('name'), 'Ada');
    });

    it('sets supported state, respects validation, silence, and proxy unwrapping', () => {
        const change = mock.fn();
        const set = mock.fn();
        const model = new Model({name: 'Ada'}, value => !Array.isArray(value) && value.name !== 'invalid');
        model.on('change', change);
        model.on('set', set);
        assert.equal(model.set({name: 'Grace'}), true);
        assert.equal(change.mock.callCount(), 1);
        assert.equal(set.mock.callCount(), 1);
        assert.equal(model.set({name: 'Silent'}, true), true);
        assert.equal(change.mock.callCount(), 1);
        assert.equal(model.set({name: 'invalid'}), false);
        assert.equal(model.set('bad'), false);
        const child = model.get();
        assert.equal(model.set(child, true), true);
        assert.equal(model.get().name, 'Silent');
    });

    it('updates object roots with a shallow merge', () => {
        const model = new Model({name: 'Ada', meta: {active: true}});
        const change = mock.fn();
        model.on('change', change);
        assert.equal(model.update({name: 'Grace'}), true);
        assert.deepEqual(model.get(), {name: 'Grace', meta: {active: true}});
        assert.equal(model.update({meta: {active: false}}, true), true);
        assert.deepEqual(model.get().meta, {active: false});
        assert.equal(change.mock.callCount(), 1);
        assert.equal(model.update('bad'), false);
        assert.equal(model.update({name: 'Lin'}, 'bad'), false);
        assert.equal(model.update({name: 'Lin'}, false, true), false);
    });

    it('rejects object updates that fail validation', () => {
        const model = new Model({count: 1}, value => value.count < 3);
        assert.equal(model.update({count: 2}), true);
        assert.equal(model.update({count: 3}), false);
        assert.equal(model.get().count, 2);
    });

    it('updates array members by index and merges plain objects', () => {
        const model = new Model([{name: 'Ada', active: true}, 'second']);
        assert.equal(model.update(0, {name: 'Grace'}), true);
        assert.deepEqual(model.get(0), {name: 'Grace', active: true});
        assert.equal(model.update(1, 'updated', true), true);
        assert.equal(model.get(1), 'updated');
        assert.equal(model.update(9, 'missing'), false);
        assert.equal(model.update(-1, 'missing'), false);
        assert.equal(model.update('0', 'missing'), false);
        assert.equal(model.update(0), false);
    });

    it('validates successful array member updates against candidate state', () => {
        const model = new Model([1, 2], value => value.every(item => item < 10));
        assert.equal(model.update(1, 3), true);
        assert.deepEqual(model.get(), [1, 3]);
        assert.equal(model.update(1, 10), false);
        assert.deepEqual(model.get(), [1, 3]);
    });

    it('updates Map members and validates candidate collection state', () => {
        const model = new Model(new Map([['person', {name: 'Ada', active: true}]]), value => value.get('person')?.name !== 'Invalid');
        assert.equal(model.update('person', {name: 'Grace'}), true);
        assert.deepEqual(model.get('person'), {name: 'Grace', active: true});
        assert.equal(model.update('person', {name: 'Invalid'}), false);
        assert.equal(model.update('missing', {name: 'Nope'}), false);
        assert.equal(model.get('person').name, 'Grace');
    });

    it('pushes one or many array values and supports silence and validation', () => {
        const model = new Model([], value => value.length <= 3);
        const push = mock.fn();
        model.on('push', push);
        assert.equal(model.push('a'), true);
        assert.equal(model.push(['b', 'c'], true), true);
        assert.deepEqual(model.get(), ['a', 'b', 'c']);
        assert.equal(push.mock.callCount(), 1);
        assert.equal(model.push('d'), false);
        assert.equal(model.push(undefined), false);
        assert.equal(model.push('d', 'bad'), false);
        assert.equal(model.push('d', false, true), false);
    });

    it('pushes Map entries and Maps', () => {
        const model = new Model(new Map());
        assert.equal(model.push('ada', {name: 'Ada'}), true);
        assert.equal(model.push(new Map([['grace', {name: 'Grace'}]])), true);
        assert.deepEqual(model.get('ada'), {name: 'Ada'});
        assert.deepEqual(model.get('grace'), {name: 'Grace'});
        assert.equal(model.push(new Map(), 'bad'), false);
        assert.equal(model.push('missing-value'), false);
        const object = new Model({});
        assert.equal(object.push('nope'), false);
    });

    it('validates Map pushes before applying them', () => {
        const model = new Model(new Map(), value => !value.has('blocked'));
        assert.equal(model.push('ok', 1), true);
        assert.equal(model.push('blocked', 2), false);
        assert.equal(model.push(new Map([['blocked', 3]])), false);
        assert.equal(model.get().has('blocked'), false);
    });

    it('deletes object properties, array members, and Map entries', () => {
        const symbol = Symbol('symbol');
        const object = new Model({name: 'Ada', 2: 'two', [symbol]: true});
        assert.equal(object.delete('name'), true);
        assert.equal(object.delete(2), true);
        assert.equal(object.delete(symbol, true), true);
        assert.equal(object.delete('missing'), false);
        assert.equal(object.delete({}), false);

        const array = new Model(['a', 'b']);
        assert.equal(array.delete(0), true);
        assert.deepEqual(array.get(), ['b']);
        assert.equal(array.delete(-1), false);
        assert.equal(array.delete(9), false);
        assert.equal(array.delete('0'), false);

        const map = new Model(new Map([['a', 1]]));
        assert.equal(map.delete('a'), true);
        assert.equal(map.delete('a'), false);
    });

    it('rejects deletes that fail validation', () => {
        const object = new Model({required: true}, value => value.required === true);
        assert.equal(object.delete('required'), false);
        const numbered = new Model({2: 'two', required: true}, value => value.required === true);
        assert.equal(numbered.delete(2), true);
        assert.deepEqual(numbered.get(), {required: true});
        const array = new Model(['required'], value => value.length > 0);
        assert.equal(array.delete(0), false);
        const map = new Model(new Map([['required', true]]), value => value.has('required'));
        assert.equal(map.delete('required'), false);
    });

    it('clears each root shape while preserving its shape and bypassing acceptance validation for lifecycle cleanup', () => {
        const object = new Model({required: true}, value => value.required === true);
        const array = new Model(['a']);
        const map = new Model(new Map([['a', 1]]));
        assert.equal(object.clear(), true);
        assert.deepEqual(object.get(), {});
        assert.equal(array.clear(true), true);
        assert.deepEqual(array.get(), []);
        assert.equal(map.clear(), true);
        assert.equal(map.get().size, 0);
    });

    it('initializes, destroys, and provides empty service hooks', async () => {
        const model = new Model({name: 'Ada'});
        model.on('change', () => {});
        assert.equal(model.initialize(), model);
        assert.deepEqual(await model.serviceGet(), {});
        assert.deepEqual(await model.servicePatch(), {});
        assert.deepEqual(await model.servicePost(), {});
        assert.deepEqual(await model.servicePut(), {});
        assert.equal(model.destroy(), model);
        assert.deepEqual(model.get(), {});
        assert.deepEqual(model.eventNames(), []);
    });
});