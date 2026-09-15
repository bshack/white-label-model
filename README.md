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

## Requirements

- Node.js `^22.18.0` or `>=24.11.0`
- npm, Yarn, and pnpm are supported for installation; see [`PACKAGE_MANAGERS.md`](PACKAGE_MANAGERS.md)
- Native `Proxy` support for deep observation
- Native `Map` support when using `Map` state

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

// `change` receives the complete current state after an accepted mutation.
profile.on('change', state => {
    console.log(state);
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
profile.get(); // => {id: 42, name: 'Grace'}
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
| `initialize()` | Start the instance for lifecycle chaining. | The same `Model` instance. |
| `get()` | Return the complete current state. | The observable object, array, or `Map` root. |
| `get(key)` | Read an object property, array index, or Map value. | The matching value, or `undefined` when the key/index does not resolve. |
| `set(data, silent?)` | Replace the root with any supported shape. | `true` when accepted; `false` for unsupported or validator-rejected data. |
| `update(...)` | Merge object fields or replace/merge one array or Map member. | `true` when accepted; `false` for an invalid call, missing member, or validator rejection. |
| `push(...)` | Append array values or add Map entries. | `true` when accepted; `false` for an invalid call, object state, or validator rejection. |
| `delete(key, silent?)` | Delete one object property, array index, or Map entry. | `true` when removed; `false` when the member does not exist or validation rejects the result. |
| `clear(silent?)` | Reset to an empty value of the current root shape. | Always `true`. |
| `destroy()` | Clear silently and release listeners. | The same `Model` instance after cleanup. |

Passing `true` as the final `silent` argument suppresses events. Mutation methods are synchronous: their return value is available only after validation and the accepted state change have completed.

`update()` shallow-merges plain objects and blocks `__proto__`, `constructor`, and `prototype` from merge input. It does not recursively merge nested objects.

## Events

Successful non-silent explicit mutations emit `change` followed by their operation event: `set`, `update`, `push`, `delete`, or `clear`.

```js
model.on('change', state => {
    // `state` is the complete current state.
});

model.on('update', state => {
    // `state` is the complete current state after update().
});
```

Remove owned subscriptions with the same callback reference:

```js
model.removeListener('change', handleChange);
```

These local Model events intentionally retain the EventEmitter-style API. The optional application-wide Mediator bridge described below uses the web-standard EventTarget contract instead.

## Deep observation

Object, array, and Map branches are proxied lazily as they are accessed. Direct nested changes emit `change` plus a structured `mutate` event.

```js
const model = new Model({
    user: {preferences: {theme: 'light'}}
});

model.on('mutate', mutation => {
    console.log(mutation.operation); // => 'set'
    console.log(mutation.path);      // => ['user', 'preferences', 'theme']
});

model.get().user.preferences.theme = 'dark';
```

The `mutate` payload is:

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

Direct writes to `__proto__`, `constructor`, and `prototype` are rejected.

## Runtime validation

A validator is optional. Most Models do not need one when the application already controls the values being written.

Use a validator when actual runtime data needs to be checked before Model accepts it—for example data from an API, storage, decoded JSON, or user input. The validator is a caller-supplied function that receives the **complete proposed state**. Return `true` to accept that state or `false` to reject it.

```ts
const user = new Model({name: 'Ada'}, value =>
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as {name?: unknown}).name === 'string'
);

user.set({name: 'Grace'}); // => true; state is accepted
user.set({name: 42});      // => false; state is unchanged
```

Model runs the validator before initial construction and before explicit `set()`, `update()`, `push()`, and `delete()` changes are committed. Invalid construction throws `TypeError`; a rejected later mutation returns `false` without changing state.

The validator is a whole-state acceptance check, not a field-by-field schema system. Direct nested assignments through `get()` remain observable but do **not** run the whole-state validator. Use the explicit mutation methods when runtime validation must be enforced. `clear()` and `destroy()` intentionally bypass acceptance validation so cleanup cannot be blocked.

TypeScript and the validator solve different problems: TypeScript checks code at development time, while the optional validator checks the actual values present at runtime.

## Async work stays outside state mutation

Model does not turn state operations into asynchronous workflows. Resolve I/O first, then apply the result synchronously:

```js
const data = await fetchData();
model.set(data);
```

The legacy `serviceGet()`, `servicePatch()`, `servicePost()`, and `servicePut()` methods remain no-I/O compatibility placeholders and resolve `{}`. New application networking should stay in application-owned services rather than extending Model's responsibility.

## Mediator integration

Model does not import or require `white-label-mediator`. Assign any EventTarget-compatible object plus a Model `name` to relay namespaced application events as `model:<name>:<event>`. The Model state or mutation payload is carried in `CustomEvent.detail`.

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

### Migrating from Model 6

Model's local `on()`, `once()`, `emit()`, and `removeListener()` behavior is unchanged. Only the optional `model.mediator` bridge changes.

If application code supplied an EventEmitter-compatible mediator, replace it with an EventTarget-compatible object. Namespaced relay subscribers now receive a `CustomEvent` and read the original payload from `event.detail` instead of receiving the payload as the callback's first argument.

## TypeScript

`Model<T>` describes the supported root state:

```ts
const profile = new Model<{name: string}>({name: 'Ada'});
const tasks = new Model<Array<{id: number; complete: boolean}>>([]);
const people = new Model<Map<string, {name: string}>>(new Map());
```

TypeScript describes expected values to the compiler but does not validate data arriving at runtime. Add the optional validator only when that runtime boundary needs an acceptance check.

## Performance model

Deep observation is lazy and does not impose a configured nesting-depth limit. The regression suite covers very deep paths, unrelated throwing getters, 20,000 unrelated properties, and repeated observed nested writes. Timing tests are regression guards rather than universal performance guarantees; application listeners, validation, path depth, and runtime conditions still matter.

## Serverless and function runtimes

Use a request-scoped Model for mutable request data. Serverless platforms can reuse one warm process for many sequential or overlapping invocations, so a module-level Model can retain state or listeners from an earlier request unless that shared lifetime is explicitly intended.

Keep persistence outside Model. Load data through the application-owned database, cache, API, object store, or other service, validate external values at the appropriate trust boundary, apply the result with normal synchronous Model operations, and let the request-owned Model end with the invocation.

Immutable configuration may live at module scope when useful. The important boundary is mutable application/request state, not whether code happens to execute in a function runtime.

The package currently documents Node.js as its supported server runtime. Its local browser-compatible EventEmitter implementation and standards-based optional mediator bridge are portability tools, not blanket compatibility claims for every edge provider; verify the actual target runtime before deployment.

## Event compatibility

Model's local event contract is regression-tested against both Node's EventEmitter implementation and the npm browser implementation. The optional mediator relay is separately tested through native EventTarget/CustomEvent semantics. See [`docs/events-compatibility.md`](docs/events-compatibility.md) for details.

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

Coverage enforces 100% statements, branches, functions, and lines per implementation file. CI builds authored source, uploads generated package artifacts for inspection, audits dependencies, packs the package, and verifies the packed public API across npm, Yarn, and pnpm.

Implementation lives in `src/`; generated JavaScript, source maps, and declarations live in `dist/`. Edit TypeScript sources and regenerate `dist` rather than hand-editing generated output.

## Design boundary

Model owns observable state. It intentionally does not own rendering, routing, networking, persistence, or application-wide event orchestration. Those boundaries are what keep it useful as a primitive instead of turning it into a framework.
