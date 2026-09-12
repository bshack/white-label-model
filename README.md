# white-label-model

`white-label-model` provides one observable `Model` for plain-object, array, or `Map` state. The same class and API run in browsers and Node.js server applications, handling keyed objects, ordered collections, and map collections while emitting predictable synchronous events.

## Requirements

- Node.js `^22.18.0` or `>=24.11.0`
- npm `>=11.0`
- Native `Proxy` support for deep observation
- Native `Map` support when using `Map` state

## Install and import

```sh
npm install white-label-model
```

ES modules:

```js
import {Model} from 'white-label-model';
```

CommonJS:

```js
const {Model} = require('white-label-model');
```

The import and runtime API are the same on the client and server. For request-specific state, create a model per request or otherwise scope it to the intended lifetime rather than sharing mutable request data globally.

## One model, three root shapes

### Plain object

```js
const profile = new Model({
    id: 42,
    name: 'Ada',
    preferences: {theme: 'light'}
});

profile.update({name: 'Grace'}); // => true
profile.get();
// => {id: 42, name: 'Grace', preferences: {theme: 'light'}}

profile.get().preferences.theme = 'dark';
profile.get();
// => {id: 42, name: 'Grace', preferences: {theme: 'dark'}}
```

### Array

```js
const tasks = new Model([
    {id: 1, complete: false},
    {id: 2, complete: false}
]);

tasks.update(1, {complete: true}); // => true
tasks.get();
// => [{id: 1, complete: false}, {id: 2, complete: true}]

tasks.push({id: 3, complete: false}); // => true
tasks.get();
// => [
//      {id: 1, complete: false},
//      {id: 2, complete: true},
//      {id: 3, complete: false}
//    ]

tasks.delete(0); // => true
tasks.get();
// => [{id: 2, complete: true}, {id: 3, complete: false}]
```

### Map

```js
const people = new Model(new Map([
    ['ada', {name: 'Ada'}]
]));

people.push('grace', {name: 'Grace'}); // => true
people.get();
// => Map(2) {
//      'ada' => {name: 'Ada'},
//      'grace' => {name: 'Grace'}
//    }

people.update('ada', {name: 'Ada Lovelace'}); // => true
people.get();
// => Map(2) {
//      'ada' => {name: 'Ada Lovelace'},
//      'grace' => {name: 'Grace'}
//    }
```

## API

The supported signatures depend on the current root shape.

| Method | Plain object | Array | Map | Events |
| --- | --- | --- | --- | --- |
| `get()` | Complete object | Complete array | Complete Map | None |
| `get(key)` | Property value | Item by integer index | Value by key | None |
| `set(data, silent?)` | Replace root with any supported shape | Same | Same | `change`, `set` |
| `update(data, silent?)` | Shallow merge safe own properties | — | — | `change`, `update` |
| `update(index, value, silent?)` | — | Replace/merge one item | — | `change`, `update` |
| `update(key, value, silent?)` | — | — | Replace/merge one value | `change`, `update` |
| `push(valueOrValues, silent?)` | Returns `false` | Append one or many values | — | `change`, `push` |
| `push(key, value, silent?)` | Returns `false` | — | Add/replace one entry | `change`, `push` |
| `push(map, silent?)` | Returns `false` | — | Add every entry | `change`, `push` |
| `delete(key, silent?)` | Delete one property | Delete one index | Delete one entry | `change`, `delete` |
| `clear(silent?)` | Replace with `{}` | Replace with `[]` | Replace with empty `Map` | `change`, `clear` |
| `destroy()` | Clear silently and remove listeners | Same | Same | None |

Explicit mutation methods return `true` when accepted and `false` when rejected. Passing `true` as the final `silent` argument suppresses their events.

`update()` shallow-merges plain objects and blocks `__proto__`, `constructor`, and `prototype` from merge input. It does not recursively merge nested objects.

`clear()` preserves the current root shape. `destroy()` uses silent clearing and removes listeners.

## Deep observation

Object, array, and Map branches are proxied lazily as they are accessed. There is no configured nesting-depth limit and no whole-model deep comparison after a mutation.

```js
const model = new Model({
    user: {
        profile: {
            preferences: {
                theme: 'light'
            }
        }
    }
});

let mutation;
model.on('mutate', payload => {
    mutation = payload;
});

model.get().user.profile.preferences.theme = 'dark'; // => 'dark'
model.get();
// => {
//      user: {
//          profile: {
//              preferences: {theme: 'dark'}
//          }
//      }
//    }

mutation;
// => {
//      operation: 'set',
//      path: ['user', 'profile', 'preferences', 'theme'],
//      oldValue: 'light',
//      newValue: 'dark',
//      state: {
//          user: {
//              profile: {
//                  preferences: {theme: 'dark'}
//              }
//          }
//      }
//    }
```

A changed direct property write emits:

- `change` with the complete current state.
- `mutate` with `{operation, path, oldValue, newValue, state}`.

Assigning the same value is ignored. Direct property deletion is observed. Array mutations performed through the returned proxy are observed through the property operations they perform. `Map#get()` returns observable nested values; direct `Map#set()`, `Map#delete()`, and `Map#clear()` are also observed.

Direct writes to the object keys `__proto__`, `constructor`, and `prototype` are rejected.

### Performance model

Observation is lazy and path-based. Accessing a branch creates proxies only for that branch, and a direct mutation does not scan or deep-diff unrelated state.

The regression suite includes:

- very deep nested paths with no artificial library depth limit;
- a throwing unrelated getter to prove unrelated branches are not traversed;
- a model containing 20,000 unrelated properties;
- 1,000 observed nested writes with a CI regression ceiling.

The timing check is a regression guard, not a universal performance guarantee. Runtime cost still depends on path depth, event listeners, validation performed by explicit operations, and the consuming application.

## Events

Successful non-silent explicit mutations emit `change` followed by their operation-specific event.

```js
model.on('change', handleAnyChange);
model.on('set', handleReplacement);
model.on('update', handleUpdate);
model.on('push', handleAppend);
model.on('delete', handleDeletion);
model.on('clear', handleClear);
model.on('mutate', handleDirectMutation);
```

Operation-specific listeners receive the complete current state. Direct proxy mutation listeners receive the path-specific `mutate` payload described above.

Remove a listener with the same callback reference:

```js
model.removeListener('change', handleAnyChange);
```

## Async work

Model state changes and event emission are synchronous. Methods such as `set()`, `update()`, `push()`, and `delete()` complete before returning, so code can immediately read the resulting state and listeners observe the change in the same call stack.

Keep asynchronous work outside the core mutation API and apply its result synchronously when it is ready:

```js
const data = await fetchData();
model.set(data);

model.get();
// => the state produced from data
```

Application-specific async behavior can also live in a subclass or other wrapper without changing the core Model contract:

```js
class UserModel extends Model {
    async load() {
        const response = await fetch('/user');
        const data = await response.json();

        this.set(data);
        return this.get();
    }
}
```

This keeps I/O, retries, cancellation, and transport concerns outside Model while preserving deterministic synchronous state updates.

## Runtime validation

Pass an optional validator when explicit state changes must satisfy a runtime contract:

```ts
const user = new Model({name: 'Ada'}, value =>
    typeof value === 'object' && value !== null &&
    !Array.isArray(value) &&
    typeof (value as {name?: unknown}).name === 'string'
);
```

The validator applies to:

- initial construction;
- `set()`;
- explicit `update()`;
- explicit `push()`;
- explicit `delete()`.

Invalid construction throws `TypeError`. Invalid later explicit mutations return `false` and leave existing state unchanged.

Direct assignments through the observable proxy returned by `get()` do **not** run the optional whole-state validator. Use explicit mutation methods when validation is required. `clear()` and `destroy()` bypass acceptance validation so lifecycle cleanup cannot be blocked by a validator that requires fields or members.

## Relay events through a mediator

Mediator integration is optional. Model does not import or require `white-label-mediator`; any EventEmitter-compatible object can be assigned to `model.mediator`.

Set both `name` and `mediator` to relay local events as `model:<name>:<event>` regardless of root shape:

```js
import Mediator from 'white-label-mediator';
import {Model} from 'white-label-model';

const mediator = new Mediator();
const session = new Model({authenticated: false});

session.name = 'session';
session.mediator = mediator;

let relayedState;
mediator.on('model:session:update', state => {
    relayedState = state;
});

session.update({authenticated: true}); // => true
session.get();
// => {authenticated: true}

relayedState;
// => {authenticated: true}
```

The relay uses the same synchronous event flow as Model's local events. Applications can use White Label Mediator, another compatible event emitter, or no mediator at all.

## Extend Model

```js
class UserModel extends Model {
    displayName() {
        return this.get().name || 'Anonymous';
    }

    async serviceGet() {
        const response = await fetch('/user');
        this.set(await response.json());
        return this.get();
    }
}
```

`serviceGet`, `servicePatch`, `servicePost`, and `servicePut` are extension hooks. The base implementations resolve an empty object and do not perform network requests.

## TypeScript

`Model<T>` describes the supported root state:

```ts
import {Model} from 'white-label-model';

const profile = new Model<{name: string}>({name: 'Ada'});
const tasks = new Model<Array<{id: number; complete: boolean}>>([]);
const people = new Model<Map<string, {name: string}>>(new Map());

profile.update({name: 'Grace'});
tasks.push({id: 1, complete: false});
people.push('ada', {name: 'Ada'});
```

TypeScript types do not validate untrusted runtime data; use the optional validator where needed.

## Event backend compatibility

The test suite loads both Node's EventEmitter implementation and the npm browser implementation against the same event contract. It also runs the model with no `window` or `document` globals to enforce the server-runtime contract. See `docs/events-compatibility.md` for the covered behavior and limitations.

## Development and verification

```sh
npm ci --ignore-scripts
npm run lint
npm run typecheck
npm test
npm run coverage
npm run audit
npm pack --dry-run
```

`npm run coverage` enforces **100% statements, branches, functions, and lines per implementation file**. CI also rebuilds committed `dist` output and rejects generated-file drift.

Implementation code lives in `src/`; generated JavaScript, source maps, and declarations live in `dist/`. Edit TypeScript sources and regenerate `dist`; do not hand-edit generated output.

The package can be installed and used independently; it has no runtime dependency on the other White Label packages.
