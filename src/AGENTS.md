# white-label-model source instructions

These instructions are more specific than the repository-root agent guide for files under `src/`.

## Model 7 public contract

- `Model` directly extends native `EventTarget`. Local Model events and optional mediator relays use `EventTarget`, `CustomEvent`, and `CustomEvent.detail`.
- The public Model surface is the documented state API plus native EventTarget listener methods; keep internal helpers private.
- Model owns observable state only. Networking, persistence, rendering, routing, and application-wide orchestration remain outside the package.
- Preserve synchronous mutation return values, `silent` semantics, event order, object/array/Map behavior, and whole-state `CustomEvent.detail` payload identity.
- Deep observation must remain lazy and path-based. Do not add whole-tree scans or diffs for ordinary nested mutations.
- A proxy retained from a replaced/cleared/destroyed root may still mutate that detached object, but it must never publish events as if it belonged to the current Model root.
- Keep runtime validation separate from TypeScript types. Direct nested writes are observable but intentionally do not run the whole-state validator; explicit mutation methods do.
- Preserve prototype-pollution protections for `__proto__`, `constructor`, and `prototype` paths.

## Verification

Run the repository’s full lint, type, runtime, 100% per-file coverage, audit, packed-package, package-manager, and supported-Node checks before treating a source change as release-ready. Do not weaken coverage or public-contract assertions to accommodate an implementation change.
