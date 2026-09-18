'use strict';

const assert = require('node:assert/strict');
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
        model.addEventListener('change', changes);
        model.addEventListener('mutate', event => mutations(event.detail));

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
        model.addEventListener('mutate', event => mutations(event.detail));

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
        model.addEventListener('mutate', event => mutations(event.detail));

        model.get().settings.mode = 'compact';

        assert.equal(mutations.mock.callCount(), 0);
    });

    it('tracks array index writes and mutating array methods lazily', function() {
        const model = new Model({items: ['first']});
        const mutations = [];
        model.addEventListener('mutate', event => mutations.push(event.detail));

        model.get().items.push('second');
        model.get().items[0] = 'updated';

        assert.deepEqual(model.get().items, ['updated', 'second']);
        assert.deepEqual(mutations.map(item => item.path), [
            ['items', '1'],
            ['items', '0']
        ]);
    });

    it('does not emit from a nested proxy after its path is replaced', function() {
        const model = new Model({profile: {name: 'Ada'}});
        const changes = mock.fn();
        const mutations = mock.fn();
        model.addEventListener('change', changes);
        model.addEventListener('mutate', event => mutations(event.detail));

        const detached = model.get().profile;
        model.get().profile = {name: 'Grace'};
        changes.mock.resetCalls();
        mutations.mock.resetCalls();

        detached.name = 'Detached';

        assert.equal(model.get().profile.name, 'Grace');
        assert.equal(detached.name, 'Detached');
        assert.equal(changes.mock.callCount(), 0);
        assert.equal(mutations.mock.callCount(), 0);
    });

    it('rebases retained array-item proxies after reindexing', function() {
        const model = new Model({items: [{name: 'Ada'}, {name: 'Grace'}]});
        const mutations = [];
        model.addEventListener('mutate', event => mutations.push(event.detail));

        const moved = model.get().items[1];
        model.get().items.shift();
        mutations.length = 0;

        moved.name = 'Grace Hopper';
        assert.equal(mutations.length, 1);
        assert.deepEqual(mutations[0].path, ['items', '0', 'name']);

        model.get().items[0].name = 'Rear Admiral Hopper';
        assert.equal(mutations.length, 2);
        assert.deepEqual(mutations[1].path, ['items', '0', 'name']);
    });

    it('silences detached Map values and nested paths whose parent no longer exists', function() {
        const mapModel = new Model(new Map([['person', {name: 'Ada'}]]));
        const mapMutations = mock.fn();
        mapModel.addEventListener('mutate', event => mapMutations(event.detail));
        const detachedMapValue = mapModel.get().get('person');
        mapModel.get().delete('person');
        mapMutations.mock.resetCalls();

        detachedMapValue.name = 'Detached';
        assert.equal(mapMutations.mock.callCount(), 0);

        const objectModel = new Model({outer: {inner: {value: 1}}});
        const objectMutations = mock.fn();
        objectModel.addEventListener('mutate', event => objectMutations(event.detail));
        const detachedInner = objectModel.get().outer.inner;
        objectModel.get().outer = 1;
        objectMutations.mock.resetCalls();

        detachedInner.value = 2;
        assert.equal(objectMutations.mock.callCount(), 0);
    });

    it('silences an old Map value proxy after the same key receives a replacement object', function() {
        const model = new Model(new Map([['person', {name: 'Ada'}]]));
        const mutations = mock.fn();
        model.addEventListener('mutate', event => mutations(event.detail));
        const detached = model.get().get('person');

        model.get().set('person', {name: 'Grace'});
        mutations.mock.resetCalls();
        detached.name = 'Detached';

        assert.equal(model.get().get('person').name, 'Grace');
        assert.equal(mutations.mock.callCount(), 0);
    });

    it('invalidates retained root-member proxies after explicit update and delete operations', function() {
        const arrayModel = new Model([{name: 'Ada'}, {name: 'Grace'}]);
        const arrayMutations = mock.fn();
        arrayModel.addEventListener('mutate', event => arrayMutations(event.detail));

        const replaced = arrayModel.get(0);
        assert.equal(arrayModel.update(0, {name: 'Augusta'}), true);
        arrayMutations.mock.resetCalls();
        replaced.name = 'Detached';
        assert.equal(arrayMutations.mock.callCount(), 0);

        const shifted = arrayModel.get(1);
        assert.equal(arrayModel.delete(0), true);
        arrayMutations.mock.resetCalls();
        shifted.name = 'Grace Hopper';
        assert.equal(arrayMutations.mock.callCount(), 1);
        assert.deepEqual(arrayMutations.mock.calls[0].arguments[0].path, ['0', 'name']);

        arrayModel.get(0).name = 'Rear Admiral Hopper';
        assert.equal(arrayMutations.mock.callCount(), 2);
        assert.deepEqual(arrayMutations.mock.calls[1].arguments[0].path, ['0', 'name']);

        const objectModel = new Model({profile: {name: 'Ada'}});
        const objectMutations = mock.fn();
        objectModel.addEventListener('mutate', event => objectMutations(event.detail));
        const deleted = objectModel.get().profile;
        assert.equal(objectModel.delete('profile'), true);
        objectMutations.mock.resetCalls();

        deleted.name = 'Detached';
        assert.equal(objectMutations.mock.callCount(), 0);
    });

    it('invalidates retained root Map value proxies after explicit collection operations', function() {
        const model = new Model(new Map([['person', {name: 'Ada'}]]));
        const mutations = mock.fn();
        model.addEventListener('mutate', event => mutations(event.detail));

        const updated = model.get('person');
        assert.equal(model.update('person', {name: 'Grace'}), true);
        mutations.mock.resetCalls();
        updated.name = 'Detached';
        assert.equal(mutations.mock.callCount(), 0);

        const pushed = model.get('person');
        assert.equal(model.push('person', {name: 'Katherine'}), true);
        mutations.mock.resetCalls();
        pushed.name = 'Detached Grace';
        assert.equal(mutations.mock.callCount(), 0);

        const deleted = model.get('person');
        assert.equal(model.delete('person'), true);
        mutations.mock.resetCalls();
        deleted.name = 'Detached Katherine';
        assert.equal(mutations.mock.callCount(), 0);
    });

    it('invalidates truncated array items without detaching non-index properties', function() {
        const metadata = Symbol('metadata');
        const model = new Model({items: [{name: 'Ada'}, {name: 'Grace'}]});
        model.get().items[metadata] = {active: true};
        const removed = model.get().items[1];
        const retainedMetadata = model.get().items[metadata];
        const mutations = [];
        model.addEventListener('mutate', event => mutations.push(event.detail));

        model.get().items.length = 1;
        mutations.length = 0;

        removed.name = 'Detached';
        assert.equal(mutations.length, 0);

        retainedMetadata.active = false;
        assert.equal(mutations.length, 1);
        assert.equal(mutations[0].path[0], 'items');
        assert.equal(mutations[0].path[1], metadata);
        assert.equal(mutations[0].path[2], 'active');
    });

    it('keeps unaffected root-array proxies active when explicit deletion reindexes later items', function() {
        const metadata = Symbol('metadata');
        const model = new Model([{name: 'Ada'}, {name: 'Grace'}, {name: 'Katherine'}]);
        model.get()[metadata] = {active: true};

        const first = model.get(0);
        const removed = model.get(1);
        const metadataProxy = model.get()[metadata];
        const mutations = [];
        model.addEventListener('mutate', event => mutations.push(event.detail));

        assert.equal(model.delete(1), true);
        mutations.length = 0;

        removed.name = 'Detached';
        assert.equal(mutations.length, 0);

        first.name = 'Ada Lovelace';
        metadataProxy.active = false;

        assert.equal(mutations.length, 2);
        assert.deepEqual(mutations[0].path, ['0', 'name']);
        assert.equal(mutations[1].path[0], metadata);
        assert.equal(mutations[1].path[1], 'active');
    });

    it('rebases a stale proxy when its raw object remains live through another alias', function() {
        const shared = {count: 0};
        const model = new Model({left: shared, right: shared});
        const changes = mock.fn();
        const mutations = mock.fn();
        model.addEventListener('change', changes);
        model.addEventListener('mutate', event => mutations(event.detail));

        const staleLeft = model.get().left;
        model.get().left = {count: 10};
        changes.mock.resetCalls();
        mutations.mock.resetCalls();

        staleLeft.count = 2;

        assert.equal(model.get().right.count, 2);
        assert.equal(changes.mock.callCount(), 1);
        assert.equal(mutations.mock.callCount(), 1);
        assert.deepEqual(mutations.mock.calls[0].arguments[0].path, ['right', 'count']);
    });

    it('rebases a stale circular proxy back to the live root path', function() {
        const state = {name: 'root'};
        state.self = state;
        const model = new Model(state);
        const mutations = mock.fn();
        model.addEventListener('mutate', event => mutations(event.detail));

        const staleSelf = model.get().self;
        model.get().self = {name: 'replacement'};
        mutations.mock.resetCalls();

        staleSelf.name = 'updated root';

        assert.equal(model.get().name, 'updated root');
        assert.equal(mutations.mock.callCount(), 1);
        assert.deepEqual(mutations.mock.calls[0].arguments[0].path, ['name']);
    });

    it('rebases a stale Map value proxy to another live key alias', function() {
        const shared = {count: 0};
        const model = new Model(new Map([
            ['left', shared],
            ['right', shared]
        ]));
        const mutations = mock.fn();
        model.addEventListener('mutate', event => mutations(event.detail));

        const staleLeft = model.get().get('left');
        model.get().delete('left');
        mutations.mock.resetCalls();

        staleLeft.count = 2;

        assert.equal(model.get().get('right').count, 2);
        assert.equal(mutations.mock.callCount(), 1);
        assert.deepEqual(mutations.mock.calls[0].arguments[0].path, ['right', 'count']);
    });

    it('stale-alias recovery skips accessors, blocked keys, and descriptor-less proxy keys', function() {
        let getterCalls = 0;
        let descriptorCalls = 0;
        const ghost = new Proxy({}, {
            ownKeys() {return ['ghost'];},
            getOwnPropertyDescriptor() {
                descriptorCalls += 1;
                return undefined;
            }
        });
        const state = {
            stale: {value: 1},
            ghost
        };
        Object.defineProperty(state, 'lazy', {
            enumerable: true,
            get() {
                getterCalls += 1;
                return {value: 'side effect'};
            }
        });
        Object.defineProperty(state, 'constructor', {
            configurable: true,
            enumerable: true,
            value: {value: 'blocked'}
        });

        const model = new Model(state);
        const mutations = mock.fn();
        model.addEventListener('mutate', event => mutations(event.detail));
        const detached = model.get().stale;
        model.get().stale = {value: 2};
        mutations.mock.resetCalls();

        detached.value = 3;

        assert.equal(mutations.mock.callCount(), 0);
        assert.equal(getterCalls, 0);
        assert.equal(descriptorCalls > 0, true);
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
        model.addEventListener('mutate', event => mutations(event.detail));

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
        model.addEventListener('mutate', event => mutations(event.detail));

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
        model.addEventListener('mutate', event => mutations(event.detail));

        assert.throws(() => {
            delete model.get().locked.value;
        }, TypeError);
        assert.equal(mutations.mock.callCount(), 0);
    });

    it('relays deep changes through the mediator namespace', function() {
        const model = new Model({profile: {name: 'Ada'}});
        const mediator = new EventTarget();
        const change = mock.fn();
        const mutate = mock.fn();
        model.name = 'profile';
        model.mediator = mediator;
        mediator.addEventListener('model:profile:change', change);
        mediator.addEventListener('model:profile:mutate', mutate);

        model.get().profile.name = 'Grace';

        assert.equal(change.mock.callCount(), 1);
        assert.equal(mutate.mock.callCount(), 1);
        assert.equal(change.mock.calls[0].arguments[0].detail, model.get());
        assert.equal(mutate.mock.calls[0].arguments[0].detail.state, model.get());
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
        model.addEventListener('mutate', event => mutations(event.detail));
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
