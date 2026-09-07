# white-label-model

`white-label-model` provides two small event-emitting data containers:

- `Model` stores a plain JavaScript object.
- `Collection` stores an array or a `Map`.

Both classes emit predictable events when data changes, can relay namespaced events through a mediator, and provide lifecycle hooks for application code.

## Requirements

- Node.js `^22.18.0` or `>=24.11.0` for installation and development
- Native `Map` support when using map collections

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
| `get()` | Returns the stored object. | None |
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
| `push(value, placeholder, silent)` | Adds one value or an array of values to an array collection. Use `false` as the placeholder when passing `silent`. | `change`, `push` |
| `push(key, value, silent)` | Adds one entry to a map collection. | `change`, `push` |
| `push(map, placeholder, silent)` | Adds every entry from another `Map`. Use `false` as the placeholder when passing `silent`. | `change`, `push` |
| `update(index, value, silent)` | Updates one item. Plain objects are shallowly merged. | `change`, `update` |
| `update(collection, placeholder, silent)` | Replaces all data with an array or `Map`. Leave the placeholder undefined when passing `silent`. | `change`, `update` |
| `delete(index, silent)` | Removes one item. | `change`, `delete` |
| `delete(false, silent)` | Clears the collection while preserving array/map type. | `change`, `delete` |
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
tasks.update([], undefined, true);

// Add array data without emitting an event.
tasks.push({id: 4, complete: false}, false, true);
```

The object returned by `get()` is the stored object, array, or `Map`, not a defensive copy. Treat it as read-only and use mutation methods when you want events to be emitted.

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

## Development

```sh
npm ci
npm run build
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

`Model<T>` describes the object fields. Runtime validation remains necessary for untrusted JSON: TypeScript does not sanitize incoming data. Collections preserve the existing array/Map API and expose unknown members until callers narrow them. `serviceGet`, `servicePost`, `servicePut`, and `servicePatch` are extension hooks that resolve an empty object; they do not perform HTTP requests.

This is a major release because the distribution is now CommonJS emitted by TypeScript, replacing the previous UMD wrapper. CommonJS `require` and the documented ESM imports remain supported. Direct AMD loading or browser script tags that depended on UMD globals must migrate to a browser bundler. Edit `src/*.ts`, then run `npm run build`; do not edit generated `dist` files. The obsolete Babel build dependencies have been removed.

### Verification and coverage

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
npm run coverage
npm pack --dry-run
```

`npm test` builds the code, checks TypeScript consumer examples against the emitted declarations, and runs the tests. `npm run coverage` additionally enforces **100% statements, branches, functions, and lines for each implementation file**. Unexecuted implementation files count toward the result; declaration-only files contain no executable code and are excluded. Reports are written to `coverage`, including `lcov.info` for coverage viewers. CI runs the same gate and checks committed build output for drift.

Tests exercise the compiled JavaScript interface used by downstream callers. Coverage is an execution metric, not proof that all possible inputs or external integrations are correct.

To undo this migration, revert its commit and run `npm ci` from the restored lockfile. No npm release, database migration, or production deployment is performed by these development changes.
