# EventTarget contract and Model 7 migration

## Runtime model

`white-label-model` 7 uses the platform `EventTarget` contract for both local Model notifications and optional application-wide mediator relays.

Local Model events are:

- `change`
- `set`
- `update`
- `push`
- `delete`
- `clear`
- `mutate`

Each event is dispatched synchronously as a `CustomEvent`. The Model state or mutation payload is available through `event.detail`.

This aligns Model with `white-label-mediator` 5 instead of maintaining a separate EventEmitter vocabulary for local state events.

## Local listener lifecycle

Model inherits from native `EventTarget`. `addEventListener()` is overridden only to combine an optional caller-provided `AbortSignal` with the Model's own lifecycle signal. Native EventTarget still owns registration identity, `once`, capture matching, cancellation behavior, and listener invocation.

`destroy()` silently clears Model state, aborts the Model-owned listener lifecycle, and leaves the same Model instance reusable. New listeners may be registered after destruction.

Supported runtimes therefore need native:

- `EventTarget`
- `CustomEvent`
- `AbortController`
- `AbortSignal.any()`

## Contract under test

The regression suite protects the behavior White Label depends on:

- synchronous local event delivery;
- Model instances being native `EventTarget` instances;
- state and mutation payload identity through `CustomEvent.detail`;
- local event order (`change` before the operation-specific event);
- standard duplicate-registration and removal behavior;
- standard `{once: true}` behavior, including re-entrant dispatch;
- caller-provided AbortSignal cleanup;
- native `dispatchEvent()` cancellation return semantics;
- silent mutation options suppressing Model-generated events;
- `destroy()` removing Model-owned listeners without emitting cleanup events;
- reusing a Model after `destroy()`;
- the same event contract for object, array, and Map roots;
- deep-mutation detail and mediator relay behavior; and
- the same contract in supported Node runtimes without `window` or `document`.

`test/browser-smoke.js` exercises the browser-facing EventTarget contract without an EventEmitter polyfill.

## Application mediator relay

When both `model.name` and `model.mediator` are configured, Model relays each successful local event as:

```text
model:<name>:<event>
```

The assigned mediator is structural: Model requires `dispatchEvent(event)` and does not import `white-label-mediator`.

The original Model payload is carried in `CustomEvent.detail` at both boundaries:

```js
model.addEventListener('change', event => {
    console.log(event.detail);
});

mediator.addEventListener('model:profile:change', event => {
    console.log(event.detail);
});
```

Local delivery occurs before the matching mediator relay. Relay cancellation does not change the Model mutation result because EventTarget's boolean describes event cancellation, not whether a listener existed or whether state should be rolled back.

## Migration from Model 6

Model 6 used EventEmitter semantics for local events and accepted an EventEmitter-compatible `model.mediator`.

Model 7 standardizes both boundaries on EventTarget/CustomEvent.

### Local subscriptions

```js
// Model 6
model.on('change', state => render(state));
model.once('change', state => initialize(state));
model.removeListener('change', handleChange);

// Model 7
model.addEventListener('change', event => render(event.detail));
model.addEventListener('change', event => initialize(event.detail), {once: true});
model.removeEventListener('change', handleChange);
```

### Mediator subscriptions

```js
// Model 6
mediator.on('model:profile:update', state => render(state));

// Model 7
mediator.addEventListener('model:profile:update', event => render(event.detail));
```

EventEmitter-specific APIs are intentionally not reproduced as part of the Model 7 public contract. That includes `emit`, `on`, `once`, `addListener`, `off`, `removeListener`, listener inspection, prepend methods, symbol event names, max-listener settings, meta-events, and EventEmitter's special `error` behavior.

Applications should use ordinary JavaScript exceptions for errors rather than relying on EventEmitter's special `error` event semantics.

## TypeScript

The public `Model<T>` type maps each known Model event name to its `CustomEvent.detail` type. Listener registration and removal are typed:

```ts
const model = new Model<{name: string}>({name: 'Ada'});

model.addEventListener('change', event => {
    event.detail.name.toUpperCase();
});
```

`dispatchEvent()` remains the native EventTarget method. The compile-time event map does not add runtime payload validation to arbitrary caller-dispatched events.

## Validation

Run:

```sh
npm ci --ignore-scripts
npm run lint
npm run typecheck
npm test
npm run coverage
npm run audit
npm pack --dry-run
```

Coverage remains 100% per implementation file. Dedicated runtime, type-consumer, browser-consumer, server-runtime, deep-mutation, and mediator-relay tests protect the standardized event boundary.
