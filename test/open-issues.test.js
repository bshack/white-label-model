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

test('batch coalesces change events while preserving operation events', () => {
    const model = new Model({count: 0});
    const events = [];
    let finalDetail;

    model.addEventListener('change', event => {
        events.push('change');
        finalDetail = event.detail;
    });
    model.addEventListener('update', () => events.push('update'));

    const result = model.batch(() => {
        assert.equal(model.update({count: 1}), true);
        assert.equal(model.update({count: 2}), true);
        return 'result';
    });

    assert.equal(result, 'result');
    assert.deepEqual(events, ['update', 'update', 'change']);
    assert.strictEqual(finalDetail, model.get());
    assert.equal(model.get().count, 2);
});

test('batch supports nesting, silent mutations, mediator relays, and thrown callbacks', () => {
    const model = new Model({count: 0, nested: {value: 0}});
    const mediator = new EventTarget();
    const local = [];
    const relayed = [];

    model.name = 'counter';
    model.mediator = mediator;
    model.addEventListener('change', () => local.push('change'));
    model.addEventListener('update', () => local.push('update'));
    model.addEventListener('mutate', () => local.push('mutate'));
    mediator.addEventListener('model:counter:change', event => relayed.push(['change', event.detail.count]));
    mediator.addEventListener('model:counter:update', event => relayed.push(['update', event.detail.count]));

    model.batch(() => {
        model.update({count: 1});
        model.batch(() => {
            model.update({count: 2}, true);
            model.get().nested.value = 1;
        });
        model.update({count: 3});
    });

    assert.deepEqual(local, ['update', 'mutate', 'update', 'change']);
    assert.deepEqual(relayed, [['update', 1], ['update', 3], ['change', 3]]);

    local.length = 0;
    model.batch(() => model.update({count: 4}, true));
    assert.deepEqual(local, []);

    assert.throws(() => model.batch(() => {
        model.update({count: 5});
        throw new Error('stop');
    }), /stop/);
    assert.deepEqual(local, ['update', 'change']);
    assert.equal(model.get().count, 5);

    assert.throws(() => model.batch(null), /requires a callback function/);
});
