# white-label-model

> Observable state without a state framework.

`white-label-model` is a lightweight observable TypeScript state-management library for plain objects, arrays, and `Map` state in browser and Node.js applications. Mutations are synchronous, nested changes are observable, validation is optional, and the same class works without a frontend framework.

[Documentation](https://whitelabeljs.org/docs/model/) · [API reference](https://whitelabeljs.org/api/#model) · [Demo site](https://whitelabeljs.org/)

**Responsibility:** own application state and describe when it changes. Nothing more.

## Why it exists

White Label treats application architecture as a set of focused responsibilities rather than mandatory framework layers. Model gives state a clear home while leaving networking, rendering, routing, persistence, and application policy to the code that owns those concerns.

Use it independently or compose it with the rest of White Label:

- [`white-label-view`](https://github.com/bshack/white-label-view) can render Model state and react to `change` events.
- [`white-label-mediator`](https://github.com/bshack/white-label-mediator) can receive namespaced Model events without becoming a Model dependency.
- [`white-label-router`](https://github.com/bshack/white-label-router) can turn URLs into application intent that updates state.
- [`generator-white-label`](https://github.com/bshack/white-label) creates a working project showing the pieces together.

The package has no runtime dependency on the other White Label packages.

## Where it fits

Model is useful when a feature needs observable state but does **not** need a framework-level store. That includes new TypeScript applications, progressively enhanced server-rendered pages, isolated commerce/CMS features, existing applications being modernized incrementally, browser utilities, server/request-scoped state, and tests.

It can be introduced by itself: application code can load data through an existing API, backend, storage layer, or framework, validate it at that boundary, then place the resulting state in Model. No White Label renderer, router, mediator, component framework, or persistence layer is required.

Model is deliberately not a networking client, database abstraction, cache, async workflow engine, or replacement for an existing framework store when that store's conventions and ecosystem are already valuable. Its advantage is a small synchronous state boundary with standards-based events.

## Requirements

- Node.js `^22.18.0` or `>=24.11.0`.
- npm, Yarn, and pnpm are supported for installation; see [`PACKAGE_MANAGERS.md`](PACKAGE_MANAGERS.md).
- Native `EventTarget`, `CustomEvent`, `AbortController`, and `AbortSignal.any()` support.
- Native `Proxy` support for deep observation.
- Native `Map` support when using `Map` state.

## Install

```sh
npm install white-label-model
# or: yarn add white-label-model
# or: pnpm add white-label-model
```

```js
import {Model} from 'white-label-model';
```

CommonJS is also supported:

```js
const {Model} = require('white-label-model');
```

## Start with state

```js
const profile = new Model({
    name: 'Ada',
    preferences: {theme: 'light'}
});

profile.addEventListener('change', event => {
    console.log(event.detail);
});

profile.update({name: 'Grace'});
profile.get().preferences.theme = 'dark';
```

State changes and event delivery are synchronous. After a mutation returns, `get()` exposes the resulting state and listeners have already run.

For request-specific server state, create a Model per request or otherwise scope it to the intended lifetime.

## One API, three root shapes

### Object

```js
const profile = new Model({id: 42, name: 'Ada'});
profile.update({name: 'Grace'});
profile.get();
```

### Array

```js
const tasks = new Model([{id: 1, complete: false}]);
tasks.push({id: 2, complete: false});
tasks.update(0, {complete: true});
tasks.delete(1);
```

### Map

```js
const people = new Model(new Map([
    ['ada', {name: 'Ada'}]
]));

people.push('grace', {name: 'Grace'});
people.update('ada', {name: 'Ada Lovelace'});
```

`clear()` preserves the current root shape: object → `{}`, array → `[]`, Map → an empty `Map`.

## Public API

| Method | Behavior | Returns |
| --- | --- | --- |
| `initialize()` | Start the instance for lifecycle chaining. | The same Model instance. |
| `addEventListener(type, callback, options?)` | Subscribe with native EventTarget listener semantics; Model payloads are in `CustomEvent.detail`. | `undefined`. |
| `removeEventListener(type, callback, options?)` | Remove a previously registered listener using native EventTarget matching rules. | `undefined`. |
| `dispatchEvent(event)` | Dispatch an application-supplied `Event` or `CustomEvent`. | Native EventTarget cancellation result. |
| `get()` | Return the complete current state. | The observable object, array, or Map root. |
| `get(key)` | Read an object property, array index, or Map value. | The matching value, or `undefined`. |
| `set(data, silent?)` | Replace the root with any supported shape. | `true` when accepted; `false` for unsupported/validator-rejected data. |
| `update(...)` | Merge object fields or replace/merge one array/Map member. | `true` when accepted; `false` for invalid/missing/rejected changes. |
| `push(...)` | Append array values or add Map entries. | `true` when accepted; `false` for invalid/object/rejected changes. |
| `delete(key, silent?)` | Delete one object property, array index, or Map entry. | `true` when removed; `false` otherwise. |
| `clear(silent?)` | Reset to an empty value of the current root shape. | Always `true`. |
| `destroy()` | Clear silently and release listeners. | The same reusable Model instance. |

Passing `true` as the final `silent` argument suppresses Model-generated events. Mutation methods are synchronous: their return value is available only after validation and the accepted state change have completed.

`update()` shallow-merges plain objects and blocks `__proto__`, `constructor`, and `prototype` from merge input. It does not recursively merge nested objects.

## Events

Successful non-silent explicit mutations dispatch `change` followed by their operation event: `set`, `update`, `push`, `delete`, or `clear`. Payloads are carried in `CustomEvent.detail`.

```js
model.addEventListener('change', event => {
    const state = event.detail;
});

model.addEventListener('update', event => {
    const state = event.detail;
});
```

Use standard EventTarget options for one-time and abortable subscriptions:

```js
model.addEventListener('change', handleFirstChange, {once: true});

const controller = new AbortController();
model.addEventListener('change', handleChange, {signal: controller.signal});
controller.abort();
```

Remove subscriptions with the same callback reference and capture mode. `destroy()` releases Model-owned listeners and leaves the instance reusable.

## Deep observation

Object, array, and Map branches are proxied lazily as they are accessed. Direct nested changes dispatch `change` plus a structured `mutate` event.

```js
const model = new Model({
    user: {preferences: {theme: 'light'}}
});

model.addEventListener('mutate', event => {
    console.log(event.detail.operation);
    console.log(event.detail.path);
});

model.get().user.preferences.theme = 'dark';
```

The `mutate` detail contains:

```js
{
    operation: 'set',
    path: ['user', 'preferences', 'theme'],
    oldValue: 'light',
    newValue: 'dark',
    state: model.get()
}
```

Observation is path-based: accessing a branch creates proxies for that branch, and a direct mutation does not deep-diff unrelated state. Direct object deletion and direct `Map#set()`, `Map#delete()`, and `Map#clear()` operations are observed. Assigning the same value is ignored.

When `set()`, `clear()`, or `destroy()` replaces the root, previously retained proxies still refer to old JavaScript objects but are detached from the Model lifecycle. Mutating those detached proxies does not dispatch current Model events or change the current root.

When a retained proxy becomes stale because an array item moved or one alias was replaced, Model checks whether that raw object is still reachable through the current root. If it remains live, `mutate.detail.path` is reported using a current path; if it is no longer reachable, the proxy remains detached and silent. Shared-reference graphs and circular references are supported.

Direct writes to `__proto__`, `constructor`, and `prototype` are rejected.

## Runtime validation

A validator is optional. Use it when actual runtime data needs to be checked before Model accepts it—for example data from an API, storage, decoded JSON, or user input.

```ts
const user = new Model({name: 'Ada'}, value =>
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as {name?: unknown}).name === 'string'
);

user.set({name: 'Grace'}); // true
user.set({name: 42});      // false
```

The validator receives the **complete proposed state**. Model runs it before initial construction and before explicit `set()`, `update()`, `push()`, and `delete()` operations are committed. Invalid construction throws `TypeError`; a rejected later mutation returns `false` without changing state.

Direct nested assignments through `get()` remain observable but do **not** run the whole-state validator. Use explicit mutation methods when runtime validation must be enforced. `clear()` and `destroy()` intentionally bypass validation so cleanup cannot be blocked.

TypeScript and runtime validation solve different problems: TypeScript checks source at development time; the validator checks actual values at runtime.

## Async work stays outside state mutation

Model does not own networking or turn state operations into asynchronous workflows. Resolve I/O in application-owned code, validate external data at that boundary when needed, then apply it synchronously:

```js
const data = await fetchData();
model.set(data);
```

This boundary keeps Model usable inside existing backend/API contracts rather than forcing the application to replace them.

## Mediator integration

Model does not import or require `white-label-mediator`. Assign any EventTarget-compatible object plus a Model `name` to relay namespaced events as `model:<name>:<event>`.

```js
import Mediator from 'white-label-mediator';
import {Model} from 'white-label-model';

const mediator = new Mediator();
const session = new Model({authenticated: false});
session.name = 'session';
session.mediator = mediator;

mediator.addEventListener('model:session:update', event => {
    console.log(event.detail.authenticated);
});

session.update({authenticated: true});
```

This is composition, not coupling: another compatible EventTarget—or no mediator at all—works equally well.

## TypeScript

`Model<T>` describes the supported root state and provides typed Model event listeners:

```ts
const profile = new Model<{name: string}>({name: 'Ada'});
profile.addEventListener('change', event => {
    event.detail.name.toUpperCase();
});

const tasks = new Model<Array<{id: number; complete: boolean}>>([]);
const people = new Model<Map<string, {name: string}>>(new Map());
```

The event-name map constrains known listener callbacks. `dispatchEvent()` remains the native EventTarget method and is not runtime payload validation.

## Performance model

Deep observation is lazy and does not impose a configured nesting-depth limit. The regression suite covers very deep paths, unrelated throwing getters, 20,000 unrelated properties, and repeated observed nested writes. Timing tests are regression guards rather than universal performance guarantees; listener work, validation, path depth, and runtime conditions still matter.

## Serverless and function runtimes

Use a request-scoped Model for mutable request data. Serverless platforms can reuse one warm process for sequential or overlapping invocations, so a module-level Model can retain state or listeners from an earlier request unless that shared lifetime is intentional.

Keep persistence outside Model. Load data through the application-owned database, cache, API, object store, or other service, validate values at the appropriate trust boundary, apply them with normal synchronous operations, and let request-owned state end with the invocation.

The package currently documents Node.js as its supported server runtime. Its standards-based event boundary is portable to modern browser runtimes, but verify specific server/edge targets before deployment.

## Event contract

Model's local event contract and optional mediator relay use the same EventTarget/CustomEvent semantics. The regression suite covers native listener options, cancellation return semantics, synchronous ordering, payload identity, cleanup/reuse, object/array/Map state, deep mutation detail, detached-root behavior, and browser-facing behavior. See [`docs/events-compatibility.md`](docs/events-compatibility.md).

## Development

```sh
npm ci --ignore-scripts
npm run lint
npm run typecheck
npm test
npm run coverage
npm run audit
npm pack --dry-run
```

Coverage enforces 100% statements, branches, functions, and lines per implementation file. CI tests the documented Node versions, builds authored source, audits dependencies, packs the package, and verifies the public API across npm, Yarn, and pnpm.

Implementation lives in `src/`; generated JavaScript, source maps, and declarations live in `dist/`. Edit TypeScript sources and regenerate `dist` rather than hand-editing generated output.

## Design boundary

Model owns observable state. It intentionally does not own rendering, routing, networking, persistence, or application-wide event orchestration. Those boundaries are what keep it useful as a primitive instead of turning it into a framework.
