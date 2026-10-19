# white-label-model

> Observable state without a state framework.

`white-label-model` is a small TypeScript library that holds application state (a plain object, an array, or a `Map`) and tells you when it changes. Mutations are synchronous, nested changes are observable, validation is optional, and it works in browsers and Node.js without any frontend framework.

[Documentation](https://whitelabeljs.org/docs/model/) · [API reference](https://whitelabeljs.org/api/#model) · [Demo site](https://whitelabeljs.org/)

**Responsibility:** own application state and describe when it changes. Nothing more.

## When to use it

Use Model when a feature needs observable state but not a framework-level store: new TypeScript applications, progressively enhanced server-rendered pages, isolated commerce or CMS features, legacy applications being modernized piece by piece, browser utilities, request-scoped server state, and tests.

Model is deliberately **not** a networking client, database layer, cache, async workflow engine, or a replacement for a framework store whose ecosystem you already rely on. Load data however your application already does, validate it at that boundary, then put it in a Model.

It composes with the rest of White Label but has no runtime dependency on it:

- [`white-label-view`](https://github.com/bshack/white-label-view) can render Model state and react to `change` events.
- [`white-label-mediator`](https://github.com/bshack/white-label-mediator) can receive namespaced Model events.
- [`white-label-router`](https://github.com/bshack/white-label-router) can turn URLs into intent that updates state.
- [`generator-white-label`](https://github.com/bshack/white-label) scaffolds a project that uses them together.

## Requirements

- Node.js `^22.18.0` or `>=24.11.0`, or a modern browser.
- Native `EventTarget`, `CustomEvent`, `AbortController`, `AbortSignal.any()`, `Proxy`, and (for `Map` state) `Map`.
- npm, Yarn, or pnpm; see [`PACKAGE_MANAGERS.md`](PACKAGE_MANAGERS.md).

## Install

```sh
npm install white-label-model
# or: yarn add white-label-model
# or: pnpm add white-label-model
```

```js
import {Model} from 'white-label-model';
// CommonJS: const {Model} = require('white-label-model');
```

## Quick start

```js
const profile = new Model({
    name: 'Ada',
    preferences: {theme: 'light'}
});

profile.addEventListener('change', event => {
    console.log(event.detail); // the complete current state
});

profile.update({name: 'Grace'});          // explicit mutation: 'change' then 'update'
profile.get().preferences.theme = 'dark'; // direct nested write: 'change' then 'mutate'
```

Everything is synchronous: when a mutation returns, `get()` already shows the new state and every listener has already run.

## Root shapes

The same class handles three root shapes.

```js
// Object
const profile = new Model({id: 42, name: 'Ada'});
profile.update({name: 'Grace'});

// Array
const tasks = new Model([{id: 1, complete: false}]);
tasks.push({id: 2, complete: false});
tasks.update(0, {complete: true});
tasks.delete(1);

// Map
const people = new Model(new Map([['ada', {name: 'Ada'}]]));
people.push('grace', {name: 'Grace'});
people.update('ada', {name: 'Ada Lovelace'});
```

Omitting the initial state gives an empty object. Anything other than a plain object (including a null-prototype object), array, or `Map` throws `TypeError`.

## API

| Method | What it does | Returns |
| --- | --- | --- |
| `new Model(data?, validator?)` | Create a Model. Throws `TypeError` for unsupported data or data the validator rejects. | A Model. |
| `get()` | Read the whole state. | The observable root object, array, or Map. |
| `get(key)` | Read one object property, array index, or Map value. | The value, or `undefined` when the key is missing. |
| `set(data, silent?)` | Replace the whole state with any supported shape. | `true`, or `false` for unsupported or rejected data. |
| `update(data, silent?)` | Object root: shallow-merge `data` into the state. | `true`, or `false` (see below). |
| `update(key, value, silent?)` | Array or Map root: replace one existing member; if both old and new values are plain objects, shallow-merge them instead. | `true`, or `false` for a missing key or rejected change. |
| `push(value \| values[], silent?)` | Array root: append one value, or each value in an array. | `true`, or `false` when rejected. |
| `push(key, value, silent?)` / `push(map, silent?)` | Map root: add or replace one entry, or every entry of another Map. | `true`, or `false` when rejected. Always `false` on an object root. |
| `delete(key, silent?)` | Remove one object property, array index (later items shift down), or Map entry. | `true` when removed, otherwise `false`. |
| `clear(silent?)` | Empty the state, keeping its shape: `{}` (with the same prototype, including `null`), `[]`, or an empty `Map`. | Always `true`. |
| `destroy()` | Clear silently and remove every listener. The instance stays usable. | The same Model. |
| `initialize()` | No-op hook for lifecycle chaining. | The same Model. |
| `addEventListener` / `removeEventListener` / `dispatchEvent` | Native `EventTarget` methods. | Native results. |
| `name`, `mediator` | Optional properties for [mediator relays](#mediator-integration). | — |

Pass `true` as the final `silent` argument to skip Model events for that call.

### `update()` details

- Merging is shallow. Nested objects are replaced, not merged recursively.
- Only enumerable own keys of the input are merged. `__proto__`, `constructor`, and `prototype` are ignored.
- On an object root, `update()` changes the existing root object **in place**. Proxies you obtained earlier from `get()` stay connected and keep emitting events, untouched properties keep their descriptors, and the validator runs once on the merged result.
- Merged values are stored as data; existing setters on the state are not called.
- It returns `false` and changes nothing if any merged key is read-only (a non-writable property or a non-configurable accessor), or would be new on a root that cannot gain properties (for example after `Object.preventExtensions()`, `Object.seal()`, or `Object.freeze()`).

## Events

Each successful, non-silent explicit mutation dispatches `change` and then an event named after the operation: `set`, `update`, `push`, `delete`, or `clear`. Both carry the complete current state in `event.detail`.

```js
model.addEventListener('update', event => {
    const state = event.detail;
});
```

Standard `EventTarget` options work, including one-time and abortable listeners:

```js
model.addEventListener('change', handleFirstChange, {once: true});

const controller = new AbortController();
model.addEventListener('change', handleChange, {signal: controller.signal});
controller.abort();
```

Remove a listener with the same callback and `capture` value used to add it. `destroy()` removes all listeners added through the Model.

## Deep observation

State returned by `get()` is wrapped in proxies, created lazily as you access each branch. Writing through those proxies dispatches `change` followed by `mutate`:

```js
const model = new Model({user: {preferences: {theme: 'light'}}});

model.addEventListener('mutate', event => {
    console.log(event.detail);
});

model.get().user.preferences.theme = 'dark';
// {
//     operation: 'set',
//     path: ['user', 'preferences', 'theme'],
//     oldValue: 'light',
//     newValue: 'dark',
//     state: model.get()
// }
```

`operation` is `'set'`, `'delete'`, or `'clear'` (`Map#clear()` only). The detail object and its `path` are frozen.

What is observed:

- property assignment (including assigning `undefined` to a new key), `delete`, and `Object.defineProperty()` on objects and arrays, including writing an array's `length`;
- `Map#set()`, `Map#delete()`, and `Map#clear()`.

Assigning a value that is already stored does nothing. On object and array proxies, writes and definitions of `__proto__`, `constructor`, and `prototype` are rejected, and `Object.setPrototypeOf()` cannot change the prototype.

Reading notes:

- Object proxies expose only own properties. A missing key, including an inherited one such as `toString`, reads as `undefined`. Array proxies still expose array methods.
- A value held in a non-writable, non-configurable property (for example any property of a frozen object) is returned as stored rather than wrapped, so reading through frozen state never throws. Writes inside such a value are not observed.
- A proxy from another Model, or from this one, is unwrapped to its raw object before it is stored, so state never holds another Model's proxy.

Observation is path-based. A nested write never diffs or scans unrelated state, and there is no depth limit. Shared references and circular references are supported.

### Retained proxies

You can keep a nested proxy (for example `const prefs = model.get().user.preferences`) and write through it later:

- **After `set()`, `clear()`, or `destroy()`**, proxies from the previous root are detached. Writing through them still changes the old object, but no events are dispatched and the current state is untouched.
- **After an array item moves or an alias is replaced**, Model re-finds the proxy's object by walking back up the parents it was reached through. Each level checks the last known key first, then the other keys of that one parent, so the cost depends on depth, not on state size. If the object is found, `mutate.detail.path` uses the current path.
- **Trade-off:** if an ancestor of the proxy was replaced by a different object, the proxy stays silent, even when its own object is still reachable through the replacement. Read the value again from `get()` to observe it.

## Runtime validation

A validator is optional. Use one when runtime data crosses a trust boundary, such as API responses, storage, decoded JSON, or user input.

```ts
const user = new Model({name: 'Ada'}, value =>
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as {name?: unknown}).name === 'string'
);

user.set({name: 'Grace'}); // true
user.set({name: 42});      // false, state unchanged
```

The validator receives the **complete proposed state** before construction and before `set()`, `update()`, `push()`, and `delete()` commit. Rejected construction throws `TypeError`; a rejected mutation returns `false` and changes nothing.

Direct nested writes through `get()` are observed but **do not** run the validator; use the explicit methods when validation must be enforced. `clear()` and `destroy()` skip validation so cleanup can never be blocked.

TypeScript checks your source at build time; the validator checks real values at runtime. They do not replace each other.

## Async work

Model never fetches or waits. Do I/O in your own code, then apply the result synchronously:

```js
const data = await fetchData();
model.set(data);
```

## Mediator integration

Model does not import `white-label-mediator`. Set `name` and assign any object with a `dispatchEvent(event)` method to `mediator`, and every Model event is also relayed as `model:<name>:<event>` with the same `detail`.

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

Local listeners run before the relay. A plain `EventTarget` works just as well.

## TypeScript

`Model<T>` types the root state and the `detail` of known events:

```ts
const profile = new Model<{name: string}>({name: 'Ada'});
profile.addEventListener('change', event => {
    event.detail.name.toUpperCase();
});

const tasks = new Model<Array<{id: number; complete: boolean}>>([]);
const people = new Model<Map<string, {name: string}>>(new Map());
```

`dispatchEvent()` is the native method; the event types are compile-time only and do not validate payloads you dispatch yourself.

## Server and serverless use

Create a Model per request for mutable request data. Serverless platforms often reuse a warm process across invocations, so a module-level Model can keep state or listeners from an earlier request.

Node.js is the documented server runtime. The event boundary is standards-based, but verify other server or edge runtimes before deploying to them.

## Performance

Proxies are created only for branches you access, and nested writes touch only the path involved. The test suite guards against whole-tree scans and copies with deterministic counters, and covers very deep paths, unrelated throwing getters, and large unrelated state. Run `npm run benchmark` to measure on your machine; listener work, validation, and path depth still affect real-world cost.

## Event contract

Local events and mediator relays share the same `EventTarget`/`CustomEvent` semantics. See [`docs/events-compatibility.md`](docs/events-compatibility.md) for the full contract the tests protect.

## Development

```sh
npm ci --ignore-scripts
npm run lint && npm run coverage && npm run audit
```

`npm run coverage` builds (which typechecks), runs the consumer type checks and every Node test, and enforces 100% statements, branches, functions, and lines per source file, so `npm test` and `npm run typecheck` need no separate run. CI also tests Node 22.18.0, packs the package, and installs it with npm, Yarn, and pnpm.

Source lives in `src/`. `dist/` is compiler output: edit TypeScript, never `dist/`. See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Design boundary

Model owns observable state. It does not own rendering, routing, networking, persistence, or application-wide event orchestration, which keeps it a small primitive rather than a framework.
