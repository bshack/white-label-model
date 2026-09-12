# Contributing

Thanks for improving `white-label-model`.

## Setup

```sh
npm ci --ignore-scripts
npm run lint
npm run typecheck
npm test
npm run coverage
npm run audit
npm pack --dry-run
```

## Pull requests

Keep changes focused and preserve the documented Model contract across plain-object, array, and Map roots. Deep observation should remain lazy and path-based; do not add whole-model deep scans or compatibility aliases without an explicit architectural decision.

Add or update tests when behavior changes. Do not weaken coverage, lint, type, or security checks. Review the complete diff for generated-file drift, credentials, private data, debugging code, and unrelated formatting changes.

Breaking public API changes require a SemVer major release rather than compatibility shims.

## Security

Treat validator boundaries and untrusted state carefully. Do not include real secrets or sensitive data in tests or documentation. Follow `SECURITY.md` for suspected vulnerabilities.