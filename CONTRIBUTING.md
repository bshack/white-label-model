# Contributing

Thanks for improving `white-label-model`.

## Setup and checks

Use Node.js `^22.18.0 || >=24.11.0` and npm. From the repository root:

```sh
npm ci --ignore-scripts
npm run build && node --test test/<file>.test.js   # quick loop while iterating
npm run lint && npm run coverage && npm run audit  # full gate before opening a PR
```

`npm run coverage` builds (which typechecks), runs the consumer type checks and every Node test, and requires 100% statements, branches, functions, and lines per source file. Lint warnings fail the gate. `npm run benchmark` prints timings if your change affects performance.

The build rewrites the tracked `dist/` folder. Unless your change is meant to update `dist/`, restore it before committing: `git checkout -- dist` and remove any new untracked files there.

## Pull requests

- Keep changes focused and preserve the documented Model contract for object, array, and Map roots.
- Keep deep observation lazy and path-based. Do not add whole-model scans, deep diffs, or compatibility aliases without an explicit architectural decision.
- Edit `src/`, not `dist/`.
- Add or update tests when behavior changes. Do not weaken coverage, lint, type, or security checks.
- Review the complete diff for credentials, private data, debugging code, and unrelated formatting.
- Breaking public API changes need a SemVer major release, not compatibility shims.

## Security

The optional validator receives the complete proposed state before construction or an explicit mutation is committed; returning `false` rejects it. Use it for untrusted runtime data such as API, storage, or user input. Direct nested writes through `get()` do not run it. Never put real secrets or personal data in tests or docs, and report suspected vulnerabilities as described in [`SECURITY.md`](SECURITY.md).
