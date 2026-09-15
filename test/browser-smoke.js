// Bundle this file for a browser; see docs/events-compatibility.md.
const {Model} = require('..');
const instances = [new Model(), new Model([]), new Model(new Map())];
const assert = (value, message) => { if (!value) throw new Error(message); };

for (const model of instances) {
    assert(model instanceof EventTarget, 'Model is an EventTarget');

    const calls = [];
    const listener = function (event) {
        assert(this === model, 'listener receiver');
        calls.push(event.detail);
    };
    model.addEventListener('data', listener);
    model.addEventListener('data', listener);
    model.dispatchEvent(new CustomEvent('data', {detail: 42}));
    assert(calls.length === 1 && calls[0] === 42, 'native duplicate registration and payload');
    model.removeEventListener('data', listener);
    model.dispatchEvent(new CustomEvent('data', {detail: 43}));
    assert(calls.length === 1, 'listener removal');

    let once = 0;
    model.addEventListener('recursive', () => {
        once++;
        model.dispatchEvent(new CustomEvent('recursive'));
    }, {once: true});
    model.dispatchEvent(new CustomEvent('recursive'));
    assert(once === 1, 'recursive once');

    const controller = new AbortController();
    model.addEventListener('abortable', listener, {signal: controller.signal});
    controller.abort();
    model.dispatchEvent(new CustomEvent('abortable', {detail: 44}));
    assert(calls.length === 1, 'abort signal cleanup');

    model.addEventListener('cleanup', listener);
    model.destroy();
    model.dispatchEvent(new CustomEvent('cleanup', {detail: 45}));
    assert(calls.length === 1, 'destroy cleanup');

    model.addEventListener('reused', listener);
    model.dispatchEvent(new CustomEvent('reused', {detail: 46}));
    assert(calls.at(-1) === 46, 'reuse after destroy');
}

globalThis.whiteLabelSmokePassed = true;
