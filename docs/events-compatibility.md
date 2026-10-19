# EventTarget contract

## Runtime model

`white-label-model` uses the platform `EventTarget` contract for both local Model notifications and optional application-wide mediator relays.

Local Model events are:

- `change`
- `set`
- `update`
- `push`
- `delete`
- `clear`
- `mutate`

Each event is dispatched synchronously as a `CustomEvent`. The Model state or mutation payload is available through `event.detail`.

## Local listener lifecycle

Model inherits from native `EventTarget`. Two methods are overridden: `addEventListener()` combines an optional caller-provided `AbortSignal` with the Model's own lifecycle signal, and `removeEventListener()` normalizes the `capture` option so Node.js matches browser removal behavior. Native EventTarget owns registration identity, `once`, capture matching, cancellation behavior, and listener invocation.

`destroy()` silently clears Model state, aborts the Model-owned listener lifecycle, and leaves the same Model instance reusable. New listeners may be registered after destruction.

Supported runtimes therefore need native:

- `EventTarget`
- `CustomEvent`
- `AbortController`
- `AbortSignal.any()`

## Observable-root lifecycle

Deep proxies belong to the root generation that created them. When `set()`, `clear()`, or `destroy()` replaces the root, a previously retained proxy still references its old JavaScript object but is detached from the Model event lifecycle. Mutating that detached object does not dispatch `change` or `mutate` for the current Model state.

Object-root `update()` mutates the current root in place, so it does not start a new generation: retained root and nested proxies stay attached.

Within one generation, a proxy can go stale when its object moves (for example an array item shifts after `delete()`) or when an alias is replaced. Before dispatching, Model walks back up the parents the proxy was reached through and looks for the object under its last known key, then under the other keys of that parent. If found, `mutate.detail.path` reports the current path; otherwise the write stays silent. A proxy whose ancestor was replaced by a different object stays silent even if its object is still reachable elsewhere. This keeps the check proportional to depth rather than state size, so deep observation stays lazy and path-based.

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
- detached old-root proxies not publishing current-state events;
- the same event contract for object, array, and Map roots;
- deep-mutation detail and mediator relay behavior; and
- the same contract in supported Node runtimes without `window` or `document`.

`test/browser-smoke.js` exercises the browser-facing EventTarget contract.

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

```sh
npm ci --ignore-scripts
npm run lint && npm run coverage && npm run audit
```

`npm run coverage` includes the build, type checks, and every Node test, and keeps coverage at 100% per source file. Dedicated runtime, type-consumer, browser-consumer, server-runtime, deep-mutation, detached-root, and mediator-relay tests protect the event boundary.
