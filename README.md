# white-label-model

> Observable state without a state framework.

`white-label-model` gives object, array, and `Map` state one small observable API. Mutations are synchronous, nested changes are observable, validation is optional, and the same class runs in browsers and Node.js.

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
- npm `>=11.0`
- Native `Proxy` support for deep observation
- Native `Map` support when using `Map` state

## Install

```sh
npm install white-label-model
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

| Method | Behavior |
| --- | --- |
| `get()` | Return the complete current state. |
| `get(key)` | Read an object property, array index, or Map value. |
| `set(data, silent?)` | Replace the root with any supported shape. |
| `update(...)` | Merge object fields or replace/merge one array or Map member. |
| `push(...)` | Append array values or add Map entries. |
| `delete(key, silent?)` | Delete one object property, array index, or Map entry. |
| `clear(silent?)` | Reset to an empty value of the current root shape. |
| `destroy()` | Clear silently and release listeners. |

Explicit mutation methods return `true` when accepted and `false` when rejected. Passing `true` as the final `silent` argument suppresses events.

`update()` shallow-merges plain objects and blocks `__proto__`, `constructor`, and `prototype` from merge input. It does not recursively merge nested objects.

## Events

Successful non-silent explicit mutations emit `change` followed by their operation event: `set`, `update`, `push`, `delete`, or `clear`.

```js
model.on('change', state => {
    // complete current state
});

model.on('update', state => {
    // complete current state after update()
});
```

Remove owned subscriptions with the same callback reference:

```js
model.removeListener('change', handleChange);
```

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

Pass an optional validator when explicit state changes must satisfy a runtime contract:

```ts
const user = new Model({name: 'Ada'}, value =>
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as {name?: unknown}).name === 'string'
);
```

Validation applies to construction, `set()`, `update()`, `push()`, and `delete()`. Invalid construction throws `TypeError`; invalid later mutations return `false` without changing state.

Direct assignments through `get()` do not run the whole-state validator. Use explicit mutation methods when validation is required. `clear()` and `destroy()` intentionally bypass acceptance validation so cleanup cannot be blocked.

## Async work stays outside state mutation

Model does not turn state operations into asynchronous workflows. Resolve I/O first, then apply the result synchronously:

```js
const data = await fetchData();
model.set(data);
```

Application-specific async behavior can live in a subclass or service without changing the Model contract.

## Mediator integration

Model does not import or require a mediator. Assign any EventEmitter-compatible object plus a Model `name` to relay events as `model:<name>:<event>`.

```js
import Mediator from 'white-label-mediator';
import {Model} from 'white-label-model';

const mediator = new Mediator();
const session = new Model({authenticated: false});

session.name = 'session';
session.mediator = mediator;

mediator.on('model:session:update', state => {
    console.log(state.authenticated);
});

session.update({authenticated: true});
```

This is composition, not coupling: another compatible emitter—or no mediator at all—works equally well.

## TypeScript

`Model<T>` describes the supported root state:

```ts
const profile = new Model<{name: string}>({name: 'Ada'});
const tasks = new Model<Array<{id: number; complete: boolean}>>([]);
const people = new Model<Map<string, {name: string}>>(new Map());
```

TypeScript does not validate untrusted runtime data; use the optional validator when that boundary matters.

## Performance model

Deep observation is lazy and does not impose a configured nesting-depth limit. The regression suite covers very deep paths, unrelated throwing getters, 20,000 unrelated properties, and repeated observed nested writes. Timing tests are regression guards rather than universal performance guarantees; application listeners, validation, path depth, and runtime conditions still matter.

## Event compatibility

Tests exercise both Node's EventEmitter implementation and the npm browser implementation against the same event contract, and run Model without `window` or `document` globals. See [`docs/events-compatibility.md`](docs/events-compatibility.md) for details.

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

Coverage enforces 100% statements, branches, functions, and lines per implementation file. CI rebuilds committed `dist` output and rejects generated-file drift.

Implementation lives in `src/`; generated JavaScript, source maps, and declarations live in `dist/`. Edit TypeScript sources and regenerate `dist` rather than hand-editing generated output.

## Design boundary

Model owns observable state. It intentionally does not own rendering, routing, networking, persistence, or application-wide event orchestration. Those boundaries are what keep it useful as a primitive instead of turning it into a framework.