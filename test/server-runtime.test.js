'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {Model} = require('../dist');

function withoutBrowserGlobals(t) {
    const previousWindow = global.window;
    const previousDocument = global.document;
    delete global.window;
    delete global.document;
    t.after(() => {
        if (previousWindow === undefined) {delete global.window;} else {global.window = previousWindow;}
        if (previousDocument === undefined) {delete global.document;} else {global.document = previousDocument;}
    });
}

test('model keeps the same observable contract in plain Node without browser globals', t => {
    withoutBrowserGlobals(t);
    const model = new Model({user: {name: 'Ada'}, tags: ['math']});
    const changes = [];
    model.on('change', state => changes.push(state.user.name));

    assert.equal(model.update({user: {name: 'Grace'}}), true);
    assert.equal(model.get().user.name, 'Grace');
    assert.deepEqual(changes, ['Grace']);

    model.get().user.name = 'Katherine';
    assert.equal(model.get().user.name, 'Katherine');
    assert.deepEqual(changes, ['Grace', 'Katherine']);
});

test('server request data stays isolated when each request owns a model instance', t => {
    withoutBrowserGlobals(t);
    const first = new Model({requestId: 'first', value: 1});
    const second = new Model({requestId: 'second', value: 2});

    first.update({value: 10});
    assert.deepEqual(first.get(), {requestId: 'first', value: 10});
    assert.deepEqual(second.get(), {requestId: 'second', value: 2});
});
