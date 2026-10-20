'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {types} = require('node:util');
const {Model} = require('../dist');

function recordMutations(model) {
    const mutations = [];
    model.addEventListener('mutate', event => mutations.push(event.detail));
    return mutations;
}

test('object update mutates the root in place so retained proxies stay attached', () => {
    const model = new Model({name: 'Ada', prefs: {theme: 'light'}});
    const root = model.get();
    const prefs = model.get().prefs;
    const mutations = recordMutations(model);
    const updates = [];
    model.addEventListener('update', event => updates.push(event.detail));

    assert.equal(model.update({name: 'Grace'}), true);
    assert.equal(model.get(), root);
    assert.deepEqual(updates, [root]);

    prefs.theme = 'dark';
    assert.equal(model.get().prefs.theme, 'dark');
    assert.equal(mutations.length, 1);
    assert.deepEqual(mutations[0].path, ['prefs', 'theme']);

    root.extra = 1;
    assert.equal(model.get().extra, 1);
    assert.deepEqual(mutations[1].path, ['extra']);

    assert.equal(model.update({name: 'Lin'}, true), true);
    assert.equal(updates.length, 1);
    assert.equal(model.get().name, 'Lin');
});

test('object update replaces a merged child and detaches only that child proxy', () => {
    const model = new Model({profile: {name: 'Ada'}, prefs: {theme: 'light'}});
    const oldProfile = model.get().profile;
    const prefs = model.get().prefs;
    const mutations = recordMutations(model);

    assert.equal(model.update({profile: {name: 'Grace'}, prefs: model.get().prefs}), true);
    oldProfile.name = 'Detached';
    assert.equal(mutations.length, 0);
    assert.equal(model.get().profile.name, 'Grace');
    assert.equal(model.get().prefs, prefs);
    prefs.theme = 'dark';
    assert.deepEqual(mutations.map(item => item.path), [['prefs', 'theme']]);
});

test('object update validates once against a candidate that preserves non-enumerable and accessor state', () => {
    const state = {name: 'Ada'};
    Object.defineProperty(state, 'hidden', {configurable: true, enumerable: false, writable: true, value: 1});
    Object.defineProperty(state, 'computed', {configurable: true, enumerable: true, get: () => 'derived'});
    const seen = [];
    const model = new Model(state, candidate => {
        seen.push(candidate);
        return Object.hasOwn(candidate, 'hidden');
    });
    seen.length = 0;

    assert.equal(model.update({name: 'Grace'}), true);
    assert.equal(seen.length, 1);
    assert.notEqual(seen[0], state);
    assert.equal(seen[0].name, 'Grace');
    assert.equal(state.name, 'Grace');
    assert.equal(Object.getOwnPropertyDescriptor(state, 'hidden').enumerable, false);
    assert.equal(typeof Object.getOwnPropertyDescriptor(state, 'computed').get, 'function');

    assert.equal(model.update({computed: 'stored'}), true);
    assert.deepEqual(Object.getOwnPropertyDescriptor(state, 'computed'), {
        configurable: true,
        enumerable: true,
        value: 'stored',
        writable: true
    });
});

test('object update rejects writes the root state does not allow, without partial changes', () => {
    const state = {name: 'Ada'};
    Object.defineProperty(state, 'locked', {configurable: true, enumerable: true, writable: false, value: 1});
    Object.defineProperty(state, 'fixed', {configurable: false, enumerable: true, get: () => 2});
    const model = new Model(state);
    const changes = [];
    model.addEventListener('change', event => changes.push(event.detail));

    assert.equal(model.update({name: 'Grace', locked: 3}), false);
    assert.equal(model.update({name: 'Grace', fixed: 3}), false);
    assert.equal(model.get().name, 'Ada');

    const frozen = new Model(Object.freeze({name: 'Ada'}));
    assert.equal(frozen.update({name: 'Grace'}), false);
    const sealed = new Model(Object.preventExtensions({name: 'Ada'}), () => true);
    assert.equal(sealed.update({added: true}), false);
    assert.equal(sealed.update({name: 'Grace'}), true);
    assert.equal(sealed.get().name, 'Grace');
    assert.equal(changes.length, 0);
});

test('reading frozen nested state returns the stored value instead of violating proxy invariants', () => {
    const inner = {value: 1};
    const model = new Model({config: Object.freeze({inner})});

    assert.equal(model.get().config.inner, inner);
    assert.equal(model.get().config.inner.value, 1);

    const frozenRoot = new Model(Object.freeze({inner: {value: 1}}));
    assert.equal(frozenRoot.get().inner.value, 1);
});

test('assigning undefined to a missing key creates the property and emits', () => {
    const model = new Model({});
    const mutations = recordMutations(model);

    model.get().missing = undefined;

    assert.equal(Object.hasOwn(model.get(), 'missing'), true);
    assert.equal(mutations.length, 1);
    assert.deepEqual(mutations[0].path, ['missing']);
    assert.equal(mutations[0].oldValue, undefined);

    model.get().missing = undefined;
    assert.equal(mutations.length, 1);

    model.get().toString = Object.prototype.toString;
    assert.equal(mutations.length, 2);
    assert.equal(mutations[1].oldValue, undefined);
});

test('another Model proxy is never stored as raw state', () => {
    const source = new Model({prefs: {theme: 'light'}});
    const sourceMutations = recordMutations(source);
    const seen = [];
    const target = new Model({}, candidate => {
        seen.push(candidate);
        return true;
    });
    const targetMutations = recordMutations(target);

    assert.equal(target.update({prefs: source.get().prefs}), true);
    assert.equal(types.isProxy(seen.at(-1).prefs), false);
    target.get().prefs.theme = 'dark';
    assert.equal(source.get().prefs.theme, 'dark');
    assert.equal(sourceMutations.length, 0);
    assert.equal(targetMutations.length, 1);

    target.get().direct = source.get().prefs;
    assert.equal(types.isProxy(targetMutations.at(-1).newValue), false);

    const copy = new Model(source.get());
    copy.get().prefs.theme = 'blue';
    assert.equal(sourceMutations.length, 0);
    assert.equal(target.set(source.get()), true);
    target.get().prefs.theme = 'green';
    assert.equal(sourceMutations.length, 0);

    // A proxy nested inside caller-owned data is unwrapped lazily on read.
    assert.equal(target.set({wrapper: {prefs: source.get().prefs}}), true);
    target.get().wrapper.prefs.theme = 'red';
    assert.equal(sourceMutations.length, 0);
    assert.equal(source.get().prefs.theme, 'red');

    const list = new Model([{name: 'Ada'}]);
    assert.equal(list.update(0, source.get()), true);
    assert.equal(types.isProxy(list.get().at(0).prefs), true);
    list.get()[0].prefs.theme = 'final';
    assert.equal(sourceMutations.length, 0);
});

test('rebasing a stale proxy inspects only its observed ancestors', () => {
    let unrelatedReads = 0;
    const unrelatedState = {};
    for (let index = 0; index < 1000; index += 1) {unrelatedState[`key${index}`] = {index};}
    const unrelated = new Proxy(unrelatedState, {
        get(target, property, receiver) {
            unrelatedReads += 1;
            return Reflect.get(target, property, receiver);
        },
        getOwnPropertyDescriptor(target, property) {
            unrelatedReads += 1;
            return Reflect.getOwnPropertyDescriptor(target, property);
        },
        ownKeys(target) {
            unrelatedReads += 1;
            return Reflect.ownKeys(target);
        }
    });
    const model = new Model({unrelated, items: [{name: 'Ada'}, {name: 'Grace'}]});
    const mutations = recordMutations(model);
    const moved = model.get().items[1];
    const removed = model.get().items[0];
    model.get().items.shift();
    mutations.length = 0;
    unrelatedReads = 0;

    moved.name = 'Grace Hopper';
    removed.name = 'Detached';
    moved.name = 'Rear Admiral Hopper';

    assert.equal(unrelatedReads, 0);
    assert.deepEqual(mutations.map(item => item.path), [['items', '0', 'name'], ['items', '0', 'name']]);
});

test('a stale proxy whose observed ancestor was replaced stays silent', () => {
    const model = new Model({outer: {middle: {inner: {value: 1}}}});
    const mutations = recordMutations(model);
    const inner = model.get().outer.middle.inner;
    const middle = model.get().outer.middle;
    model.get().outer = {middle};
    mutations.length = 0;

    // The raw object is still shared, but its observed parent chain is gone, so no current path is published.
    inner.value = 2;
    assert.equal(mutations.length, 0);
    assert.equal(model.get().outer.middle.inner.value, 2);

    model.get().outer.middle.inner.value = 3;
    assert.deepEqual(mutations.map(item => item.path), [['outer', 'middle', 'inner', 'value']]);
});

test('Object.defineProperty through a proxy is observed and blocked keys stay protected', () => {
    const model = new Model({items: [{id: 1}, {id: 2}], profile: {name: 'Ada'}});
    const mutations = recordMutations(model);

    Object.defineProperty(model.get().profile, 'name', {value: 'Grace'});
    Object.defineProperty(model.get().profile, 'age', {value: 36, enumerable: true, configurable: true, writable: true});
    const getter = () => 'computed';
    Object.defineProperty(model.get().profile, 'age', {get: getter});
    Object.defineProperty(model.get().profile, 'name', {enumerable: false});

    assert.deepEqual(mutations.map(item => [item.path, item.oldValue, item.newValue]), [
        [['profile', 'name'], 'Ada', 'Grace'],
        [['profile', 'age'], undefined, 36],
        [['profile', 'age'], 36, undefined]
    ]);
    assert.equal(model.get().profile.age, 'computed');

    const removed = model.get().items[1];
    Object.defineProperty(model.get().items, 'length', {value: 1});
    mutations.length = 0;
    removed.id = 3;
    assert.equal(mutations.length, 0);

    const shared = {id: 4};
    Object.defineProperty(model.get(), 'shared', {value: model.get().items[0], enumerable: true, configurable: true, writable: true});
    assert.equal(types.isProxy(Object.getOwnPropertyDescriptor(model.get(), 'shared').value), false);
    assert.equal(model.get().shared, model.get().shared);
    assert.equal(Reflect.defineProperty(model.get().profile, '__proto__', {value: shared}), false);
    assert.equal(Reflect.defineProperty(model.get().profile, 'constructor', {value: shared}), false);
    Object.freeze(model.get().profile);
    assert.equal(Reflect.defineProperty(model.get().profile, 'name', {value: 'Lin'}), false);
    assert.equal({}.id, undefined);
});

test('freezing an observed object through its proxy keeps nested reads valid', () => {
    const model = new Model({config: {inner: {value: 1}}});
    const mutations = recordMutations(model);
    const config = model.get().config;
    const inner = config.inner;
    assert.equal(types.isProxy(inner), true);

    Object.freeze(config);

    assert.equal(config.inner.value, 1);
    assert.equal(types.isProxy(config.inner), false);
    assert.equal(mutations.length, 0);
    // The retained proxy was invalidated by the attribute change but still rebases to its unchanged key.
    inner.value = 2;
    assert.deepEqual(mutations.map(item => item.path), [['config', 'inner', 'value']]);
});

test('prototype replacement through a proxy is rejected', () => {
    const model = new Model({profile: {name: 'Ada'}});
    const prototype = {polluted: true};

    assert.throws(() => Object.setPrototypeOf(model.get(), prototype), TypeError);
    assert.throws(() => Object.setPrototypeOf(model.get().profile, prototype), TypeError);
    assert.equal(Reflect.setPrototypeOf(model.get(), Object.prototype), true);
    assert.equal(Object.getPrototypeOf(model.get()), Object.prototype);
    assert.equal(model.get().polluted, undefined);
});

test('prototype replacement through a Map proxy is rejected', () => {
    const model = new Model(new Map([['nested', new Map([['name', 'Ada']])]]));
    const prototype = {polluted: true};
    const root = model.get();
    const nested = root.get('nested');

    assert.throws(() => Object.setPrototypeOf(root, prototype), TypeError);
    assert.throws(() => Object.setPrototypeOf(nested, prototype), TypeError);
    assert.equal(Reflect.setPrototypeOf(root, Map.prototype), true);
    assert.equal(Object.getPrototypeOf(root), Map.prototype);
    assert.equal(Object.getPrototypeOf(nested), Map.prototype);
    assert.equal(root.polluted, undefined);
    assert.equal(root.get('nested').get('name'), 'Ada');
});

test('blocked keys cannot be written or defined on a Map proxy', () => {
    const model = new Model(new Map([['name', 'Ada']]));
    const root = model.get();
    const prototype = {polluted: true};
    const mutations = recordMutations(model);

    for (const key of ['__proto__', 'constructor', 'prototype']) {
        assert.equal(Reflect.set(root, key, prototype), false);
        assert.equal(Reflect.defineProperty(root, key, {value: prototype, configurable: true}), false);
        assert.equal(Object.prototype.hasOwnProperty.call(root, key), false);
    }
    assert.throws(() => {root.__proto__ = prototype;}, TypeError);
    assert.equal(Object.getPrototypeOf(root), Map.prototype);
    assert.equal(root.polluted, undefined);
    assert.equal(root.get('name'), 'Ada');
    assert.equal(mutations.length, 0);
    // Ordinary non-blocked properties keep their previous behaviour.
    assert.equal(Reflect.set(root, 'label', 'x'), true);
    assert.equal(root.label, 'x');
});

test('clear preserves a null-prototype object root', () => {
    const state = Object.create(null);
    state.name = 'Ada';
    const model = new Model(state);

    assert.equal(model.clear(), true);
    assert.equal(Object.getPrototypeOf(model.get()), null);
    assert.deepEqual(Reflect.ownKeys(model.get()), []);
});

test('Map keys that are arrays stay single path segments', () => {
    const key = ['a', 'b'];
    const model = new Model(new Map([[key, {value: 1}]]));
    const mutations = recordMutations(model);

    model.get().get(key).value = 2;
    model.get().set(key, 'replaced');

    assert.deepEqual(mutations.map(item => item.path), [[key, 'value'], [key]]);
});

test('array truncation through a non-number length detaches removed item proxies', () => {
    const model = new Model({items: [{name: 'Ada'}, {name: 'Grace'}]});
    const mutations = recordMutations(model);
    const removed = model.get().items[1];

    model.get().items.length = '1';
    mutations.length = 0;
    removed.name = 'Detached';

    assert.equal(mutations.length, 0);
});

test('stale rebasing reuses a still-valid Map key and never rebases through blocked keys', () => {
    const value = {count: 0};
    const model = new Model(new Map([['item', value]]));
    const mutations = recordMutations(model);
    const observed = model.get().get('item');

    assert.equal(model.push('item', value, true), true);
    observed.count = 1;
    assert.deepEqual(mutations.map(item => item.path), [['item', 'count']]);

    const state = {};
    Object.defineProperty(state, 'constructor', {configurable: true, enumerable: true, writable: true, value: {count: 0}});
    const blocked = new Model(state);
    const blockedMutations = recordMutations(blocked);
    const constructorValue = blocked.get().constructor;
    const retained = Reflect.get(state, 'constructor');
    assert.equal(blocked.delete('constructor', true), true);
    Object.defineProperty(state, 'constructor', {configurable: true, enumerable: true, writable: true, value: retained});
    constructorValue.count = 1;
    assert.equal(blockedMutations.length, 0);
});
