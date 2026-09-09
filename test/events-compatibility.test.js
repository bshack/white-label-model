'use strict';

const assert = require('node:assert/strict');
const {it} = require('node:test');
const {backends, loadPackage} = require('./helpers/events-backend');
const eventsContract = require('./helpers/events-contract');

for (const [name, Backend] of backends) {
    const {Model, Collection} = loadPackage(Backend);
    eventsContract(`Model / ${name}`, () => new Model(), Backend);
    eventsContract(`Collection / ${name}`, () => new Collection(), Backend);

    it(`Model / ${name}: mutations preserve payload identity, order, silence, and validation`, () => {
        const model = new Model({name: 'Ada'}, value => typeof value.name === 'string');
        const calls = [];
        for (const event of ['change', 'set', 'update', 'delete']) {
            model.on(event, value => {
                assert.equal(value, model.get());
                calls.push([event, {...value}]);
            });
        }
        assert.equal(model.set({name: 'Grace'}), true);
        assert.equal(model.update({name: 'Lin'}), true);
        assert.deepEqual(calls, [
            ['change', {name: 'Grace'}], ['set', {name: 'Grace'}],
            ['change', {name: 'Lin'}], ['update', {name: 'Lin'}]
        ]);
        calls.length = 0;
        assert.equal(model.set({name: 'Silent'}, true), true);
        assert.equal(model.update({name: 'Still silent'}, true), true);
        assert.equal(model.set({name: 42}), false);
        assert.equal(model.update({name: 42}), false);
        assert.deepEqual(model.get(), {name: 'Still silent'});
        assert.deepEqual(calls, []);

        const deletable = new Model({name: 'Ada'});
        const deletion = [];
        deletable.on('change', value => deletion.push(['change', value]));
        deletable.on('delete', value => deletion.push(['delete', value]));
        assert.equal(deletable.delete(), true);
        assert.deepEqual(deletion, [['change', {}], ['delete', {}]]);
        deletion.length = 0;
        deletable.set({name: 'Ada'}, true);
        deletable.delete(true);
        assert.deepEqual(deletion, []);
    });

    for (const map of [false, true]) {
        it(`Collection ${map ? 'Map' : 'array'} / ${name}: event ordering, payloads, and silent mutations`, () => {
            const collection = new Collection(map ? new Map() : []);
            const calls = [];
            for (const event of ['change', 'set', 'push', 'update', 'delete']) {
                collection.on(event, value => {
                    assert.equal(value, collection.get());
                    assert.equal(value instanceof Map, map);
                    calls.push(event);
                });
            }
            assert.equal(map ? collection.push('item', {name: 'Ada'}) : collection.push({name: 'Ada'}), true);
            assert.equal(collection.update(map ? 'item' : 0, {name: 'Grace'}), true);
            assert.deepEqual(collection.get(map ? 'item' : 0), {name: 'Grace'});
            assert.equal(collection.delete(map ? 'item' : 0), true);
            assert.equal(collection.set(map ? new Map() : []), true);
            assert.deepEqual(calls, ['change', 'push', 'change', 'update', 'change', 'delete', 'change', 'set']);
            calls.length = 0;
            if (map) collection.push('item', {name: 'Ada'}, true);
            else collection.push({name: 'Ada'}, undefined, true);
            collection.update(map ? 'item' : 0, {name: 'Grace'}, true);
            collection.delete(map ? 'item' : 0, true);
            collection.set(map ? new Map() : [], true);
            collection.delete(false, true);
            assert.deepEqual(calls, []);
        });
    }

    it(`Model and Collection / ${name}: destroy clears state and listeners silently`, () => {
        for (const instance of [new Model({name: 'Ada'}), new Collection(['Ada']), new Collection(new Map())]) {
            const calls = [];
            instance.on('change', () => calls.push('change'));
            instance.on('delete', () => calls.push('delete'));
            instance.on(Symbol('custom'), () => calls.push('custom'));
            assert.equal(instance.initialize(), instance);
            assert.equal(instance.destroy(), instance);
            assert.deepEqual(instance.eventNames(), []);
            assert.deepEqual(calls, []);
            assert.equal(instance.get() instanceof Map ? instance.get().size : Object.keys(instance.get()).length, 0);
        }
    });

    for (const [relayName, Relay] of backends) {
        it(`${name} state relays to ${relayName} with local and namespaced events`, () => {
            for (const [label, instance] of [['model', new Model()], ['collection', new Collection()]]) {
                const mediator = new Relay();
                const calls = [];
                instance.name = 'profile';
                instance.mediator = mediator;
                for (const event of ['change', 'set']) {
                    instance.on(event, data => {
                        assert.equal(data, instance.get());
                        calls.push(`local:${event}`);
                    });
                    mediator.on(`${label}:profile:${event}`, data => {
                        assert.equal(data, instance.get());
                        calls.push(`relay:${event}`);
                    });
                }
                const data = label === 'model' ? {name: 'Ada'} : ['Ada'];
                assert.equal(instance.set(data), true);
                assert.deepEqual(calls, ['local:change', 'relay:change', 'local:set', 'relay:set']);
                calls.length = 0;
                instance.set(data, true);
                instance.destroy();
                assert.deepEqual(calls, []);
                assert.equal(mediator.listenerCount(`${label}:profile:change`), 1);
            }
        });
    }
}
