'use strict';

// Runs the built package in real Chromium (not part of `npm test`). Run `npm run build` first, then
// `npm run test:browser`. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE to use a local Chromium binary.
const assert = require('node:assert/strict');
const path = require('node:path');
const {after, before, test} = require('node:test');
const esbuild = require('esbuild');
const {chromium} = require('playwright');

const root = path.join(__dirname, '..', '..');

/** Bundle a CommonJS entry for the browser as a classic script. */
async function bundle(entryPoint, globalName) {
    const result = await esbuild.build({
        entryPoints: [path.join(root, entryPoint)],
        bundle: true,
        write: false,
        format: 'iife',
        platform: 'browser',
        target: 'es2022',
        ...(globalName ? {globalName} : {}),
    });
    return result.outputFiles[0].text;
}

let browser;
let page;
const pageErrors = [];

before(async () => {
    const [modelScript, smokeScript] = await Promise.all([
        bundle('dist/index.js', 'WhiteLabel'),
        bundle('test/browser-smoke.js'),
    ]);
    browser = await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined});
    page = await browser.newPage();
    page.on('pageerror', error => pageErrors.push(error));
    await page.setContent('<!doctype html><html><head><title>Model browser test</title></head><body></body></html>');
    await page.addScriptTag({content: modelScript});
    await page.addScriptTag({content: smokeScript});
});

after(async () => {
    await browser?.close();
});

test('runs in a real browser page, not Node', async () => {
    const environment = await page.evaluate(() => ({
        hasProcess: typeof globalThis.process !== 'undefined',
        hasDocument: typeof document === 'object',
        userAgent: navigator.userAgent,
        nativeEventTarget: EventTarget.toString().includes('[native code]'),
    }));
    assert.equal(environment.hasProcess, false);
    assert.equal(environment.hasDocument, true);
    assert.match(environment.userAgent, /Chrome/);
    assert.equal(environment.nativeEventTarget, true);
    assert.deepEqual(pageErrors, []);
});

test('the shared browser smoke script passes in Chromium', async () => {
    assert.equal(await page.evaluate(() => globalThis.whiteLabelSmokePassed), true);
});

test('object, array, and Map roots are browser EventTargets with observable state', async () => {
    const result = await page.evaluate(() => {
        const {Model} = globalThis.WhiteLabel;
        const object = new Model({name: 'Ada'});
        const array = new Model([{id: 1}]);
        const map = new Model(new Map([['ada', {name: 'Ada'}]]));
        return {
            eventTargets: [object, array, map].every(model => model instanceof EventTarget),
            objectName: object.get('name'),
            arrayIsArray: Array.isArray(array.get()),
            arrayId: array.get()[0].id,
            mapIsMap: map.get() instanceof Map,
            mapSize: map.get().size,
            mapName: map.get().get('ada').name,
        };
    });
    assert.deepEqual(result, {
        eventTargets: true,
        objectName: 'Ada',
        arrayIsArray: true,
        arrayId: 1,
        mapIsMap: true,
        mapSize: 1,
        mapName: 'Ada',
    });
});

test('nested proxy mutations dispatch change and mutate CustomEvents with the documented detail', async () => {
    const result = await page.evaluate(() => {
        const {Model} = globalThis.WhiteLabel;
        const describe = model => {
            const events = [];
            const record = event => events.push({
                type: event.type,
                isCustomEvent: event instanceof CustomEvent,
                detailIsState: event.detail === model.get(),
                operation: event.detail.operation,
                path: event.detail.path,
                oldValue: event.detail.oldValue,
                newValue: event.detail.newValue,
                mutationStateIsState: event.type === 'mutate' ? event.detail.state === model.get() : undefined,
                frozen: event.type === 'mutate' ? Object.isFrozen(event.detail) && Object.isFrozen(event.detail.path) : undefined,
            });
            model.addEventListener('change', record);
            model.addEventListener('mutate', record);
            return events;
        };

        const object = new Model({profile: {name: 'Ada'}});
        const objectEvents = describe(object);
        object.get().profile.name = 'Grace';

        const array = new Model([{tags: ['a']}]);
        const arrayEvents = describe(array);
        array.get()[0].tags.push('b');

        const map = new Model(new Map([['ada', {active: true}]]));
        const mapEvents = describe(map);
        map.get().get('ada').active = false;
        map.get().delete('ada');

        return {objectEvents, arrayEvents, mapEvents, mapSize: map.get().size};
    });

    const change = {type: 'change', isCustomEvent: true, detailIsState: true};
    const strip = events => events.map(event => Object.fromEntries(
        Object.entries(event).filter(([, value]) => value !== undefined)
    ));
    assert.deepEqual(strip(result.objectEvents), [
        change,
        {type: 'mutate', isCustomEvent: true, detailIsState: false, operation: 'set', path: ['profile', 'name'],
            oldValue: 'Ada', newValue: 'Grace', mutationStateIsState: true, frozen: true},
    ]);
    // Array#push writes the new index, then length (a no-op because it already matches).
    assert.deepEqual(strip(result.arrayEvents), [
        change,
        {type: 'mutate', isCustomEvent: true, detailIsState: false, operation: 'set', path: ['0', 'tags', '1'],
            newValue: 'b', mutationStateIsState: true, frozen: true},
    ]);
    assert.deepEqual(strip(result.mapEvents), [
        change,
        {type: 'mutate', isCustomEvent: true, detailIsState: false, operation: 'set', path: ['ada', 'active'],
            oldValue: true, newValue: false, mutationStateIsState: true, frozen: true},
        change,
        {type: 'mutate', isCustomEvent: true, detailIsState: false, operation: 'delete', path: ['ada'], oldValue: {active: false},
            mutationStateIsState: true, frozen: true},
    ]);
    assert.equal(result.mapSize, 0);
});

test('mediator relays reach a real EventTarget with the same detail', async () => {
    const result = await page.evaluate(() => {
        const {Model} = globalThis.WhiteLabel;
        const mediator = new EventTarget();
        const model = new Model({authenticated: false});
        model.name = 'session';
        model.mediator = mediator;
        const local = [];
        const relayed = [];
        model.addEventListener('update', event => local.push(event.detail));
        for (const type of ['model:session:change', 'model:session:update', 'model:session:mutate']) {
            mediator.addEventListener(type, event => relayed.push({
                type: event.type,
                isCustomEvent: event instanceof CustomEvent,
                detailIsState: event.detail === model.get(),
                ...(event.detail.path ? {path: event.detail.path} : {}),
            }));
        }
        model.update({authenticated: true});
        model.get().authenticated = false;
        return {local: local.length, sameDetail: local[0] === model.get(), relayed};
    });
    assert.equal(result.local, 1);
    assert.equal(result.sameDetail, true);
    assert.deepEqual(result.relayed, [
        {type: 'model:session:change', isCustomEvent: true, detailIsState: true},
        {type: 'model:session:update', isCustomEvent: true, detailIsState: true},
        {type: 'model:session:change', isCustomEvent: true, detailIsState: true},
        {type: 'model:session:mutate', isCustomEvent: true, detailIsState: false, path: ['authenticated']},
    ]);
});

test('an aborted AbortSignal removes Model listeners', async () => {
    const result = await page.evaluate(() => {
        const {Model} = globalThis.WhiteLabel;
        const model = new Model({count: 0});
        const controller = new AbortController();
        let calls = 0;
        model.addEventListener('change', () => {calls += 1;}, {signal: controller.signal});
        model.update({count: 1});
        controller.abort();
        model.update({count: 2});
        model.get().count = 3;
        return {calls, count: model.get('count'), aborted: controller.signal.aborted};
    });
    assert.deepEqual(result, {calls: 1, count: 3, aborted: true});
});

test('structured data parsed from JSON is observable and serialises back unchanged', async () => {
    const result = await page.evaluate(() => {
        const {Model} = globalThis.WhiteLabel;
        const json = '{"user":{"name":"Ada","roles":["admin"]},"__proto__":{"local":true}}';
        const model = new Model(JSON.parse(json));
        const paths = [];
        model.addEventListener('mutate', event => paths.push(event.detail.path));
        model.get().user.roles.push('editor');
        return {
            ownProto: model.get('__proto__').local,
            polluted: {}.local,
            roles: [...model.get().user.roles],
            paths,
            roundTrip: JSON.stringify(model.get()),
        };
    });
    assert.deepEqual(result, {
        ownProto: true,
        polluted: undefined,
        roles: ['admin', 'editor'],
        paths: [['user', 'roles', '1']],
        roundTrip: '{"user":{"name":"Ada","roles":["admin","editor"]},"__proto__":{"local":true}}',
    });
});

test('reads through frozen nested state do not throw and return stored values', async () => {
    const result = await page.evaluate(() => {
        const {Model} = globalThis.WhiteLabel;
        const settings = Object.freeze({theme: Object.freeze({mode: 'dark'})});
        const model = new Model({settings});
        const theme = model.get().settings.theme;
        return {
            mode: theme.mode,
            sameObject: theme === settings.theme,
            mapFrozenRead: new Model(new Map([['config', settings]])).get().get('config').theme.mode,
        };
    });
    assert.deepEqual(result, {mode: 'dark', sameObject: true, mapFrozenRead: 'dark'});
});

test('object update() mutates in place so retained proxies keep emitting events', async () => {
    const result = await page.evaluate(() => {
        const {Model} = globalThis.WhiteLabel;
        const model = new Model({name: 'Ada', prefs: {theme: 'light'}});
        const root = model.get();
        const prefs = root.prefs;
        const types = [];
        const paths = [];
        model.addEventListener('change', event => types.push(event.type));
        model.addEventListener('update', event => types.push(event.type));
        model.addEventListener('mutate', event => {
            types.push(event.type);
            paths.push(event.detail.path);
        });
        const updated = model.update({name: 'Grace'});
        prefs.theme = 'dark';
        root.name = 'Hopper';
        return {
            updated,
            sameRoot: model.get() === root,
            theme: model.get().prefs.theme,
            name: model.get('name'),
            types,
            paths,
        };
    });
    assert.deepEqual(result, {
        updated: true,
        sameRoot: true,
        theme: 'dark',
        name: 'Hopper',
        types: ['change', 'update', 'change', 'mutate', 'change', 'mutate'],
        paths: [['prefs', 'theme'], ['name']],
    });
});

test('Map and object proxies reject prototype replacement in the browser', async () => {
    const result = await page.evaluate(() => {
        const {Model} = globalThis.WhiteLabel;
        const attempt = target => {
            try {
                Object.setPrototypeOf(target, {polluted: true});
                return 'changed';
            } catch (error) {
                return error.constructor.name;
            }
        };
        return {
            object: attempt(new Model({}).get()),
            array: attempt(new Model([]).get()),
            map: attempt(new Model(new Map()).get()),
        };
    });
    assert.deepEqual(result, {object: 'TypeError', array: 'TypeError', map: 'TypeError'});
    assert.deepEqual(pageErrors, []);
});
