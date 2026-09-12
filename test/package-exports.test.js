'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

test('public package entrypoint resolves from built output', () => {
    const packageExports = require('white-label-model');
    assert.equal(typeof packageExports.Model, 'function');
});
