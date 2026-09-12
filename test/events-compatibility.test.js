'use strict';

const assert = require('node:assert/strict');
const {it} = require('node:test');
const {backends, loadPackage} = require('./helpers/events-backend');
const eventsContract = require('./helpers/events-contract');

for (const [name, Backend] of backends) {
    const {Model} = loadPackage(Backend);
    eventsContract(`Model / ${name}`, () => new Model(), Backend);

    it(`Model / ${name}: object events preserve payload identity, order, silence, and validation`, () => {
        const model = new Model({name: 'Ada'}, value => typeof value.name === 'string');
        const calls = [];
        for (const event of ['change', 'set', 'update', 'delete', 'clear']) {
            model.on(event, value => {
                assert.equal(value, model.get());
                calls.push(event);
            });
        }
        assert.equal(model.set({name: 'Grace'}), true);
        assert.equal(model.update({name: 'Lin'}), true);
        assert.deepEqual(calls, ['change', 'set', 'change', 'update']);
        calls.length = 0;
        assert.equal(model.set({name: 'Silent'}, true), true);
        assert.equal(model.update({name: 'Still silent'}, true), true);
        assert.equal(model.set({name: 42}), false);
        assert.equal(model.update({name: 42}), false);
        assert.deepEqual(model.get(), {name: 'Still silent'});
        assert.deepEqual(calls, []);
    });

    for (const [label, data, key] of [
        ['array', [], 0],
        ['Map', new Map(), 'item']
    ]) {
        it(`Model ${label} / ${name}: collection operations use the same event contract`, () => {
            const model = new Model(data);
            const calls = [];
            for (const event of ['change', 'set', 'push', 'update', 'delete', 'clear']) {
                model.on(event, value => {
                    assert.equal(value, model.get());
                    calls.push(event);
                });
            }
            assert.equal(label === 'Map' ? model.push(key, {name: 'Ada'}) : model.push({name: 'Ada'}), true);
            assert.equal(model.update(key, {name: 'Grace'}), true);
            assert.deepEqual(model.get(key), {name: 'Grace'});
            assert.equal(model.delete(key), true);
            assert.equal(model.clear(), true);
            assert.deepEqual(calls, [
                'change', 'push', 'change', 'update', 'change', 'delete', 'change', 'clear'
            ]);
        });
    }

    it(`Model / ${name}: destroy clears every supported root shape silently`, () => {
        for (const instance of [new Model({name: 'Ada'}), new Model(['Ada']), new Model(new Map([['Ada', true]]))]) {
            const calls = [];
            instance.on('change', () => calls.push('change'));
            instance.on('clear', () => calls.push('clear'));
            instance.on(Symbol('custom'), () => calls.push('custom'));
            assert.equal(instance.initialize(), instance);
            assert.equal(instance.destroy(), instance);
            assert.deepEqual(instance.eventNames(), []);
            assert.deepEqual(calls, []);
            const state = instance.get();
            assert.equal(state instanceof Map ? state.size : Object.keys(state).length, 0);
        }
    });

    for (const [relayName, Relay] of backends) {
        it(`${name} state relays to ${relayName} through the single model namespace`, () => {
            for (const data of [{name: 'Ada'}, ['Ada'], new Map([['name', 'Ada']])]) {
                const instance = new Model();
                const mediator = new Relay();
                const calls = [];
                instance.name = 'profile';
                instance.mediator = mediator;
                for (const event of ['change', 'set']) {
                    instance.on(event, value => {
                        assert.equal(value, instance.get());
                        calls.push(`local:${event}`);
                    });
                    mediator.on(`model:profile:${event}`, value => {
                        assert.equal(value, instance.get());
                        calls.push(`relay:${event}`);
                    });
                }
                assert.equal(instance.set(data), true);
                assert.deepEqual(calls, ['local:change', 'relay:change', 'local:set', 'relay:set']);
            }
        });
    }
}
