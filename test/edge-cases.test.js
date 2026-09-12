'use strict';

const assert = require('node:assert/strict');
const {describe, it, mock} = require('node:test');
const {Model} = require('../dist/index');

describe('Model valid edge cases', () => {
    it('preserves symbol-keyed state across object updates and accepts symbol patch keys', () => {
        const existing = Symbol('existing');
        const added = Symbol('added');
        const model = new Model({name: 'Ada', [existing]: 'keep'});

        assert.equal(model.update({name: 'Grace', [added]: 'new'}), true);
        assert.equal(model.get().name, 'Grace');
        assert.equal(model.get(existing), 'keep');
        assert.equal(model.get(added), 'new');
    });

    it('preserves a null-prototype object root across updates', () => {
        const state = Object.create(null);
        state.name = 'Ada';
        const model = new Model(state);

        assert.equal(Object.getPrototypeOf(model.get()), null);
        assert.equal(model.update({name: 'Grace'}), true);
        assert.equal(Object.getPrototypeOf(model.get()), null);
        assert.equal(model.get().name, 'Grace');
    });

    it('supports circular object graphs without recursive traversal', () => {
        const state = {name: 'root'};
        state.self = state;
        const model = new Model(state);
        const mutate = mock.fn();
        model.on('mutate', mutate);

        model.get().self.name = 'updated';

        assert.equal(model.get().name, 'updated');
        assert.equal(model.get().self.name, 'updated');
        assert.equal(mutate.mock.callCount(), 1);
        assert.deepEqual(mutate.mock.calls[0].arguments[0].path, ['self', 'name']);
    });

    it('keeps shared nested references coherent across different paths', () => {
        const shared = {count: 0};
        const model = new Model({left: shared, right: shared});

        model.get().left.count = 1;

        assert.equal(model.get().right.count, 1);
    });

    it('handles special primitive values using Object.is semantics', () => {
        const model = new Model({nan: NaN, zero: -0, big: 1n, symbol: Symbol.for('state'), missing: undefined});
        const mutate = mock.fn();
        model.on('mutate', mutate);

        model.get().nan = NaN;
        assert.equal(mutate.mock.callCount(), 0);

        model.get().zero = 0;
        assert.equal(mutate.mock.callCount(), 1);
        assert.equal(Object.is(mutate.mock.calls[0].arguments[0].oldValue, -0), true);
        assert.equal(Object.is(mutate.mock.calls[0].arguments[0].newValue, 0), true);
        assert.equal(model.get().big, 1n);
        assert.equal(model.get().symbol, Symbol.for('state'));
        assert.equal(model.get().missing, undefined);
    });

    it('keeps nested non-observable built-ins intact without false deep events', () => {
        const date = new Date('2026-01-01T00:00:00.000Z');
        const set = new Set(['a']);
        const regex = /model/gi;
        const model = new Model({date, set, regex});
        const mutate = mock.fn();
        model.on('mutate', mutate);

        assert.equal(model.get().date, date);
        assert.equal(model.get().set, set);
        assert.equal(model.get().regex, regex);

        date.setUTCFullYear(2027);
        set.add('b');
        regex.lastIndex = 1;

        assert.equal(mutate.mock.callCount(), 0);
        assert.equal(model.get().date.getUTCFullYear(), 2027);
        assert.equal(model.get().set.has('b'), true);
        assert.equal(model.get().regex.lastIndex, 1);
    });

    it('supports identity-sensitive and unusual Map keys in mutation paths', () => {
        const objectKey = {id: 1};
        const symbolKey = Symbol('map-key');
        const model = new Model(new Map([
            [objectKey, {value: 1}],
            [symbolKey, {value: 2}],
            [NaN, {value: 3}]
        ]));
        const mutate = mock.fn();
        model.on('mutate', mutate);

        model.get().get(objectKey).value = 4;
        model.get().get(symbolKey).value = 5;
        model.get().get(NaN).value = 6;

        assert.equal(mutate.mock.callCount(), 3);
        assert.equal(mutate.mock.calls[0].arguments[0].path[0], objectKey);
        assert.equal(mutate.mock.calls[1].arguments[0].path[0], symbolKey);
        assert.equal(Number.isNaN(mutate.mock.calls[2].arguments[0].path[0]), true);
    });

    it('rejects direct writes to a frozen root without emitting mutation events', () => {
        const model = new Model(Object.freeze({value: 1}));
        const mutate = mock.fn();
        model.on('mutate', mutate);

        assert.throws(() => {
            model.get().value = 2;
        }, TypeError);
        assert.equal(model.get().value, 1);
        assert.equal(mutate.mock.callCount(), 0);
    });
});
