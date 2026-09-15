# Event compatibility and dependency assessment

## Two intentionally different event boundaries

`white-label-model` has two event responsibilities and they intentionally use different contracts in Model 7:

1. **Local Model events** (`change`, `set`, `update`, `push`, `delete`, `clear`, `mutate`) retain the existing EventEmitter-style API.
2. **Optional application-wide mediator relays** use the web-standard `EventTarget` / `CustomEvent` contract.

This separation keeps the existing Model subscription API stable while allowing application-wide White Label messaging to align with `white-label-mediator` 5.

## Local Model runtime resolution

Model imports `events`. Node resolves that name to its built-in EventEmitter; browser bundlers resolve the installed `events` npm package. The lockfile currently selects `events@3.3.0` for browser builds.

`test/events-compatibility.test.js` exercises compiled Model classes against both implementations using the same local-event contract. Preserve these behaviors unless a future Model major release deliberately changes its own event API:

- synchronous, ordered dispatch;
- listeners receive the emitter as `this`, all arguments, and original payload references;
- `emit()` returns whether listeners handled the event;
- `on`/`addListener`, `once`, `removeListener`/`off`, `removeAllListeners`, and chaining;
- recursive `once` behavior and callback removal semantics;
- duplicate listener registration/removal behavior;
- mutation during emission follows the retained EventEmitter snapshot behavior;
- string and symbol event names, prepend methods, listener inspection APIs, meta-events, error behavior, validation, and max-listener settings covered by the shared regression contract.

Model lifecycle tests additionally verify silent destruction, supported root shapes, validation, event ordering, and payload identity.

## Application mediator relay

When both `model.name` and `model.mediator` are configured, Model relays each successful local event as:

```text
model:<name>:<event>
```

The assigned mediator is structural: Model requires `dispatchEvent(event)` and does not import `white-label-mediator`.

The original Model payload is carried in `CustomEvent.detail`:

```js
mediator.addEventListener('model:profile:change', event => {
    console.log(event.detail);
});
```

This relay is synchronous because native `dispatchEvent()` is synchronous. Its return value is intentionally ignored: EventTarget's boolean describes cancellation semantics, not whether a listener existed.

The relay tests use native `EventTarget` directly. They verify object, array, and Map state, namespaced ordering relative to local Model events, payload identity through `detail`, and deep-mutation relay behavior.

## Why Model still depends on `events`

Mediator 5 no longer requires the npm `events` package, but Model still does because its **own public local event API remains EventEmitter-style**. Removing that dependency would require a separate Model major release and would also affect consumers such as `white-label-view` that currently subscribe with `on('change', ...)` and `removeListener(...)`.

Do not remove or replace Model's local EventEmitter backend as part of Mediator 5 integration work.

## Browser verification

`test/browser-smoke.js` exercises Model's browser-facing local event behavior after bundling. Browser bundlers should continue resolving the npm `events` implementation for Model itself.

The application mediator bridge uses global `EventTarget` and `CustomEvent`; supported runtimes must provide those standards. The documented Node versions do.

## Migration from Model 6

Model 6 accepted an EventEmitter-compatible object for `model.mediator` and called `mediator.emit(name, payload)`.

Model 7 requires an EventTarget-compatible object and dispatches:

```js
new CustomEvent(name, {detail: payload})
```

Therefore application code listening to namespaced Model relays must change from:

```js
mediator.on('model:profile:update', state => {
    console.log(state);
});
```

to:

```js
mediator.addEventListener('model:profile:update', event => {
    console.log(event.detail);
});
```

Model's own local `model.on(...)`, `model.emit(...)`, `model.once(...)`, and `model.removeListener(...)` contracts are unchanged.

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

Coverage remains 100% per implementation file. The EventEmitter backend matrix protects local Model behavior, while dedicated EventTarget relay tests protect the application mediator boundary.
