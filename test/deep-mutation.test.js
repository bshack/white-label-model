'use strict';

const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {describe, it, mock} = require('node:test');
const {performance} = require('node:perf_hooks');

const {Model} = require('../dist/index');

describe('Model deep mutation tracking', function() {
    it('tracks arbitrary nested assignments without a whole-tree update call', function() {
        const model = new Model({
            user: {profile: {preferences: {theme: 'light'}}}
        });
        const changes = mock.fn();
        const mutations = mock.fn();
        model.on('change', changes);
        model.on('mutate', mutations);

        model.get().user.profile.preferences.theme = 'dark';

        assert.equal(model.get().user.profile.preferences.theme, 'dark');
        assert.equal(changes.mock.callCount(), 1);
        assert.equal(mutations.mock.callCount(), 1);
        assert.deepEqual(mutations.mock.calls[0].arguments[0], {
            operation: 'set',
            path: ['user', 'profile', 'preferences', 'theme'],
            oldValue: 'light',
            newValue: 'dark',
            state: model.get()
        });
    });

    it('tracks property deletion and ignores deletion of a missing property', function() {
        const model = new Model({settings: {mode: 'compact'}});
        const mutations = mock.fn();
        model.on('mutate', mutations);

        delete model.get().settings.mode;
        delete model.get().settings.missing;

        assert.equal(mutations.mock.callCount(), 1);
        assert.deepEqual(mutations.mock.calls[0].arguments[0].path, ['settings', 'mode']);
        assert.equal(mutations.mock.calls[0].arguments[0].operation, 'delete');
        assert.equal(mutations.mock.calls[0].arguments[0].oldValue, 'compact');
        assert.equal(mutations.mock.calls[0].arguments[0].newValue, undefined);
    });

    it('does not emit when assigning the same value', function() {
        const model = new Model({settings: {mode: 'compact'}});
        const mutations = mock.fn();
        model.on('mutate', mutations);

        model.get().settings.mode = 'compact';

        assert.equal(mutations.mock.callCount(), 0);
    });

    it('tracks array index writes and mutating array methods lazily', function() {
        const model = new Model({items: ['first']});
        const mutations = [];
        model.on('mutate', mutation => mutations.push(mutation));

        model.get().items.push('second');
        model.get().items[0] = 'updated';

        assert.deepEqual(model.get().items, ['updated', 'second']);
        assert.deepEqual(mutations.map(item => item.path), [
            ['items', '1'],
            ['items', '0']
        ]);
    });

    it('returns a stable proxy for repeated reads through the same parent', function() {
        const model = new Model({user: {profile: {name: 'Ada'}}});

        assert.equal(model.get().user, model.get().user);
        assert.equal(model.get().user.profile, model.get().user.profile);
    });

    it('unwraps an observed object when it is assigned elsewhere', function() {
        const model = new Model({source: {value: 1}, target: null});
        const source = model.get().source;

        model.get().target = source;
        model.get().target.value = 2;

        assert.equal(model.get().source.value, 2);
        assert.equal(model.get().target.value, 2);
    });

    it('supports symbol keys and reports the exact property key in the path', function() {
        const key = Symbol('state');
        const model = new Model({});
        const mutations = mock.fn();
        model.on('mutate', mutations);

        model.get()[key] = {enabled: true};
        model.get()[key].enabled = false;

        assert.equal(mutations.mock.callCount(), 2);
        assert.equal(mutations.mock.calls[0].arguments[0].path[0], key);
        assert.deepEqual(mutations.mock.calls[1].arguments[0].path, [key, 'enabled']);
    });

    it('blocks prototype-pollution keys on direct writes', function() {
        const model = new Model({safe: true});

        assert.throws(() => {
            model.get().__proto__ = {polluted: true};
        }, TypeError);
        assert.throws(() => {
            model.get().constructor = {polluted: true};
        }, TypeError);
        assert.throws(() => {
            model.get().prototype = {polluted: true};
        }, TypeError);
        assert.equal({}.polluted, undefined);
    });

    it('does not emit a mutation when the underlying object rejects a write', function() {
        const locked = Object.freeze({value: 1});
        const model = new Model({locked});
        const mutations = mock.fn();
        model.on('mutate', mutations);

        assert.throws(() => {
            model.get().locked.value = 2;
        }, TypeError);
        assert.equal(mutations.mock.callCount(), 0);
    });

    it('does not emit a mutation when the underlying object rejects a delete', function() {
        const locked = {};
        Object.defineProperty(locked, 'value', {
            configurable: false,
            enumerable: true,
            value: 1,
            writable: true
        });
        const model = new Model({locked});
        const mutations = mock.fn();
        model.on('mutate', mutations);

        assert.throws(() => {
            delete model.get().locked.value;
        }, TypeError);
        assert.equal(mutations.mock.callCount(), 0);
    });

    it('relays deep changes through the mediator namespace', function() {
        const model = new Model({profile: {name: 'Ada'}});
        const mediator = new EventEmitter();
        const change = mock.fn();
        const mutate = mock.fn();
        model.name = 'profile';
        model.mediator = mediator;
        mediator.on('model:profile:change', change);
        mediator.on('model:profile:mutate', mutate);

        model.get().profile.name = 'Grace';

        assert.equal(change.mock.callCount(), 1);
        assert.equal(mutate.mock.callCount(), 1);
    });

    it('tracks very deep paths without an artificial depth limit', function() {
        const root = {};
        let cursor = root;
        for (let index = 0; index < 64; index += 1) {
            cursor.next = {};
            cursor = cursor.next;
        }
        cursor.value = 0;

        const model = new Model(root);
        const mutations = mock.fn();
        model.on('mutate', mutations);
        let observed = model.get();
        for (let index = 0; index < 64; index += 1) {
            observed = observed.next;
        }
        observed.value = 1;

        const mutation = mutations.mock.calls[0].arguments[0];
        assert.equal(mutation.path.length, 65);
        assert.equal(mutation.path.at(-1), 'value');
    });

    it('does not traverse unrelated state while observing or mutating one path', function() {
        const unrelated = {};
        Object.defineProperty(unrelated, 'expensive', {
            enumerable: true,
            get() {
                throw new Error('unrelated branch was traversed');
            }
        });
        const model = new Model({active: {count: 0}, unrelated});

        model.get().active.count = 1;

        assert.equal(model.get().active.count, 1);
    });

    it('keeps deep writes effectively independent of unrelated model size', function() {
        const unrelated = {};
        for (let index = 0; index < 20000; index += 1) {
            unrelated[`key${index}`] = index;
        }
        const model = new Model({active: {count: 0}, unrelated});
        const active = model.get().active;
        const start = performance.now();
        for (let index = 1; index <= 1000; index += 1) {
            active.count = index;
        }
        const elapsed = performance.now() - start;

        assert.equal(active.count, 1000);
        assert.ok(elapsed < 2000, `1000 observed writes took ${elapsed.toFixed(1)}ms`);
    });
});
