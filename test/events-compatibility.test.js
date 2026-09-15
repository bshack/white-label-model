'use strict';

const assert = require('node:assert/strict');
const {describe, it} = require('node:test');
const {Model} = require('../dist');

describe('Model EventTarget contract', () => {
    it('is a standards-based EventTarget with lifecycle chaining', () => {
        const model = new Model();
        assert.ok(model instanceof EventTarget);
        assert.equal(model.initialize(), model);
        assert.equal(model.destroy(), model);

        let calls = 0;
        model.addEventListener('reused', () => calls++);
        model.dispatchEvent(new CustomEvent('reused'));
        assert.equal(calls, 1);
    });

    it('supports native once, caller AbortSignal cleanup, and cancellation semantics', () => {
        const model = new Model();
        const calls = [];
        const controller = new AbortController();

        model.addEventListener('data', event => calls.push(['once', event.detail]), {once: true});
        model.addEventListener('data', event => calls.push(['signal', event.detail]), {signal: controller.signal});
        assert.equal(model.dispatchEvent(new CustomEvent('data', {detail: 1})), true);
        controller.abort();
        assert.equal(model.dispatchEvent(new CustomEvent('data', {detail: 2})), true);
        assert.deepEqual(calls, [['once', 1], ['signal', 1]]);

        model.addEventListener('cancel', event => event.preventDefault());
        assert.equal(model.dispatchEvent(new CustomEvent('cancel', {cancelable: true})), false);
    });

    it('object events preserve detail identity, order, silence, and validation', () => {
        const model = new Model({name: 'Ada'}, value => typeof value.name === 'string');
        const calls = [];
        for (const event of ['change', 'set', 'update', 'delete', 'clear']) {
            model.addEventListener(event, received => {
                assert.equal(received.detail, model.get());
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
        it(`Model ${label}: collection operations use the same event contract`, () => {
            const model = new Model(data);
            const calls = [];
            for (const event of ['change', 'set', 'push', 'update', 'delete', 'clear']) {
                model.addEventListener(event, received => {
                    assert.equal(received.detail, model.get());
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

    it('destroy clears every supported root shape and owned listener silently', () => {
        for (const instance of [new Model({name: 'Ada'}), new Model(['Ada']), new Model(new Map([['Ada', true]]))]) {
            const calls = [];
            instance.addEventListener('change', () => calls.push('change'));
            instance.addEventListener('clear', () => calls.push('clear'));
            instance.addEventListener('custom', () => calls.push('custom'));
            assert.equal(instance.initialize(), instance);
            assert.equal(instance.destroy(), instance);
            instance.dispatchEvent(new CustomEvent('custom'));
            assert.deepEqual(calls, []);
            const state = instance.get();
            assert.equal(state instanceof Map ? state.size : Object.keys(state).length, 0);
        }
    });

    it('state relays through the mediator namespace after each local event', () => {
        for (const data of [{name: 'Ada'}, ['Ada'], new Map([['name', 'Ada']])]) {
            const instance = new Model();
            const mediator = new EventTarget();
            const calls = [];
            instance.name = 'profile';
            instance.mediator = mediator;
            for (const event of ['change', 'set']) {
                instance.addEventListener(event, received => {
                    assert.equal(received.detail, instance.get());
                    calls.push(`local:${event}`);
                });
                mediator.addEventListener(`model:profile:${event}`, received => {
                    assert.equal(received.detail, instance.get());
                    calls.push(`relay:${event}`);
                });
            }
            assert.equal(instance.set(data), true);
            assert.deepEqual(calls, ['local:change', 'relay:change', 'local:set', 'relay:set']);
        }
    });
});
