# white-label-model

`white-label-model` provides two small event-emitting data containers:

- `Model` stores a plain JavaScript object.
- `Collection` stores an array or a `Map`.

Both classes emit predictable events when data changes, can relay namespaced events through a mediator, and provide lifecycle hooks for application code.

The package has no DOM or generated HTML, so WCAG and search indexing are application responsibilities. When model state controls an interface, expose changes through semantic controls and appropriate status announcements, keep keyboard and pointer experiences equivalent, and avoid hiding primary public content behind client-only state.

## Requirements

- Node.js `^22.18.0` or `>=24.11.0` for installation and development
- Native `Map` support when using map collections

## Versioning policy

Backward compatibility is not maintained through placeholder arguments, sentinel values, deprecated overloads, or permissive legacy return contracts. Breaking public API changes are communicated with a Semantic Versioning major release and migration notes.

### Version 5 migration

`Model.get()` now returns a lazily observed `Proxy`. Direct assignments and property deletions at any nesting depth emit the existing full-state `change` event plus a new `mutate` event with `{operation, path, oldValue, newValue, state}`. Nested objects and arrays are wrapped only when accessed; mutations do not deep-scan or deep-diff unrelated model state. Because `get()` now returns an observable proxy rather than the original root object identity, this is a major release. `Collection` behavior is unchanged.

### Version 4 migration

Array `push` now uses `push(valueOrValues, silent?)`; bulk Map `push` uses `push(map, silent?)`. The legacy `false` placeholder forms are rejected. Whole-collection replacement uses `set()` rather than the former `update(collection, placeholder, silent)` overload. Clearing uses `clear(silent?)`; `delete()` now always removes one member, so `false` is a valid Map key. Model-like nested setters must return `true` to accept updates. No compatibility shims are retained.

## Install and import

```sh
npm install white-label-model
```

```js
import {Collection, Model} from 'white-label-model';
```

CommonJS is also supported:

```js
const {Collection, Model} = require('white-label-model');
```

## Model quick start

```js
const profile = new Model({
    id: 42,
    name: 'Ada'
});

profile.on('change', (data) => {
    console.log('Current profile:', data);
});

profile.update({name: 'Grace'});
console.log(profile.get()); // {id: 42, name: 'Grace'}
```

### Model methods

| Method | Behavior | Events |
| --- | --- | --- |
| `get()` | Returns a lazily observed proxy for the stored object. | Direct nested writes emit `change`, `mutate` |
| `set(data, silent)` | Replaces all model data with a plain object. | `change`, `set` |
| `update(data, silent)` | Creates a shallow merge of current and new safe own properties. | `change`, `update` |
| `delete(silent)` | Replaces the data with an empty object. | `change`, `delete` |
| `initialize()` | Lifecycle hook that returns the model. | None |
| `destroy()` | Clears data silently and removes all listeners. | None |

Mutation methods return `true` when the input is accepted and `false` when it is not. Pass `true` as the final `silent` argument to change data without emitting events:

```js
profile.set({id: 42, name: 'Ada'}, true);
profile.update({name: 'Grace'}, true);
profile.delete(true);
```

`update()` blocks the special keys `__proto__`, `constructor`, and `prototype` while merging. The merge is shallow; nested objects are replaced rather than recursively merged.

Direct writes through `get()` are observed at arbitrary practical depth without recursively scanning the model. Plain objects and arrays are proxied lazily as each branch is accessed. Every changed property emits one `change` event with the complete current state and one `mutate` event with the exact property path. Assigning the same value is ignored. Array methods are observed through the property operations they perform. Direct writes to `__proto__`, `constructor`, and `prototype` are rejected.

```js
profile.get().preferences = {theme: 'light'};
profile.get().preferences.theme = 'dark';

profile.on('mutate', ({operation, path, oldValue, newValue}) => {
    console.log(operation, path, oldValue, newValue);
});
```

The observation cost follows the accessed path rather than total model size. CI includes a large-unrelated-state regression test so a nested write cannot silently turn into a whole-model scan.

## Collection quick start

Array collections are the default:

```js
const colors = new Collection(['red', 'green']);

colors.on('push', (items) => {
    console.log('Collection now contains:', items);
});

colors.push('blue');
console.log(colors.get(1)); // green
```

Use a `Map` when items need named keys:

```js
const people = new Collection(new Map([
    ['ada', new Model({name: 'Ada'})]
]));

people.push('grace', new Model({name: 'Grace'}));
console.log(people.get('grace').get()); // {name: 'Grace'}
```

### Collection methods

| Method | Behavior | Events |
| --- | --- | --- |
| `get()` | Returns the complete array or `Map`. | None |
| `get(index)` | Returns one array item or map value. | None |
| `set(data, silent)` | Replaces the collection with an array or `Map`. | `change`, `set` |
| `push(value, silent)` | Adds one value or an array of values to an array collection. | `change`, `push` |
| `push(key, value, silent)` | Adds one entry to a map collection. | `change`, `push` |
| `push(map, silent)` | Adds every entry from another `Map`. | `change`, `push` |
| `update(index, value, silent)` | Updates one item. Plain objects are shallowly merged. | `change`, `update` |
| `delete(index, silent)` | Removes one item. | `change`, `delete` |
| `clear(silent)` | Clears the collection while preserving array/map type. | `change`, `delete` |
| `destroy()` | Clears data silently and removes all listeners. | None |

Examples:

```js
const tasks = new Collection([
    {id: 1, complete: false},
    {id: 2, complete: false}
]);

tasks.update(1, {complete: true});
tasks.delete(0);
tasks.push({id: 3, complete: false});

// Replace all collection data without emitting an event.
tasks.set([], true);

// Add array data without emitting an event.
tasks.push({id: 4, complete: false}, true);
```

`Model.get()` returns a live observable proxy, so direct assignments and deletes emit events. `Collection.get()` still returns the stored array or `Map` rather than a defensive copy; use Collection mutation methods when you want collection events.

## Events

Every successful non-silent mutation emits both `change` and an operation-specific event:

```js
profile.on('change', handleAnyChange);
profile.on('set', handleReplacement);
profile.on('update', handleUpdate);
profile.on('delete', handleDeletion);

colors.on('push', handleAddition);
```

All listeners receive the complete current model or collection data.

For direct Model property changes, `change` keeps that full-state payload and `mutate` receives path-specific details:

```js
profile.on('mutate', ({operation, path, oldValue, newValue, state}) => {
    // path is an array of property keys, for example ['user', 'profile', 'name'].
});
```

Remove a listener with the same callback reference:

```js
profile.removeListener('change', handleAnyChange);
```

## Relay events through a mediator

Set both `name` and `mediator` to relay each local event under the pattern `<type>:<name>:<event>`:

```js
import Mediator from 'white-label-mediator';
import {Model} from 'white-label-model';

const mediator = new Mediator();
const session = new Model({authenticated: false});

session.name = 'session';
session.mediator = mediator;

mediator.on('model:session:update', (data) => {
    console.log('Session changed:', data);
});

session.update({authenticated: true});
```

The model still emits its local `change` and `update` events in addition to the mediator messages.

## Extend a model or collection

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

const user = new UserModel();
```

`serviceGet`, `servicePatch`, `servicePost`, and `servicePut` are placeholder async methods on both base classes. They resolve to an empty object until an application overrides them; they do not perform network requests by themselves.

## Event backend compatibility

The test suite also loads the npm browser implementation explicitly and checks it against the same EventEmitter contract as Node. See [the compatibility contract and replacement assessment](https://github.com/bshack/white-label-model/blob/master/docs/events-compatibility.md) for covered behavior and limitations. These checks run under Node and do not replace real-browser integration testing.

## Development

Tests live in `test/*.test.js` and use Node's built-in `node:test` runner, strict assertions, and native mocks. Run `npm test` for the build, consumer type checks, and full suite; `npm run coverage` retains the existing c8 coverage gate. After building, run `node --test test/model.test.js` for the converted suite alone.

```sh
npm ci
npm run build
npm run lint
npm run typecheck
npm test
npm run coverage
npm run audit
```

The npm package publishes the compiled `dist` directory and this README.

## TypeScript development and version 3.0.0 migration

Implementation code now uses strict TypeScript. Builds emit JavaScript, source maps with embedded source, and `.d.ts` declarations into `dist`. JavaScript callers can still use the package without compiling TypeScript themselves. JSDoc comments describe parameters, return values, lifecycle behavior, and validation at the implementation, and are retained in declarations.

```ts
import {Model, Collection} from 'white-label-model';

const profile = new Model<{name: string}>({name: 'Ada'});
profile.update({name: 'Grace'});
const name: string | undefined = profile.get().name;
// get() returns Partial<T>: delete() can clear every field.
const profiles = new Collection([profile]);
```

`Model<T>` describes the object fields. Runtime validation remains necessary for untrusted JSON: TypeScript does not sanitize incoming data. Collections expose unknown members until callers narrow them. `serviceGet`, `servicePost`, `servicePut`, and `servicePatch` are extension hooks that resolve an empty object; they do not perform HTTP requests.

This is a major release because the distribution is now CommonJS emitted by TypeScript, replacing the previous UMD wrapper. CommonJS `require` and the documented ESM imports remain supported. Direct AMD loading or browser script tags that depended on UMD globals must migrate to a browser bundler. Edit `src/*.ts`, then run `npm run build`; do not edit generated `dist` files. The obsolete Babel build dependencies have been removed.

### Verification, coverage, and compatibility

Version 4.0.0 has no runtime dependency on mediator, view, or router. Package tests cover the Model and Collection public contracts independently; consuming applications are responsible for integration testing the package versions they select.

```sh
npm ci --ignore-scripts
npm run lint
npm run typecheck
npm test
npm run coverage
npm pack --dry-run
```

`npm test` builds the code, checks TypeScript consumer examples against the emitted declarations, and runs the tests. `npm run coverage` additionally enforces **100% statements, branches, functions, and lines for each implementation file**. Unexecuted implementation files count toward the result; declaration-only files contain no executable code and are excluded. Reports are written to `coverage`, including `lcov.info` for coverage viewers. CI runs the same gate and checks committed build output for drift.

Tests exercise the compiled JavaScript interface used by downstream callers. Coverage is an execution metric, not proof that all possible inputs or external integrations are correct.

To undo this migration, revert its commit and run `npm ci` from the restored lockfile. No npm release, database migration, or production deployment is performed by these development changes.
### Validate data at runtime

Pass an optional validator when state can originate outside TypeScript:

```ts
const user = new Model({name: 'Ada'}, value =>
    typeof value === 'object' && value !== null &&
    typeof (value as {name?: unknown}).name === 'string'
);
```

The validator runs for construction, `set()`, and merged `update()` data. Invalid mutations return `false` and leave existing state unchanged.

Direct assignments through the observable object returned by `get()` do not invoke the optional validator; use `set()` or `update()` when a mutation must pass whole-model runtime validation.

## Current behavior notes

`delete()` and `destroy()` clear the model's own state even when its validator rejects an empty object. Previously returned object references are not erased. Collection updates of nested models request a silent child update, then publish the collection's normal notifications once. Nested model-like setters must return `true` to accept an update; `false` or `undefined` rejects it. Silent collection updates emit no notifications. Array appends preserve the backing array and handle large batches without spread-argument limits, including self-appends.
