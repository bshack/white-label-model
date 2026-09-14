# Package manager support

`white-label-model` supports npm, Yarn, and pnpm consumers.

## Install

```sh
npm install white-label-model
yarn add white-label-model
pnpm add white-label-model
```

CI packs the real distributable artifact and installs that same artifact with all three package managers before exercising the public Model API.

## Repository development

The committed `package-lock.json` remains the repository's canonical dependency lockfile and npm remains the maintenance/audit path used by the primary CI job. Yarn and pnpm compatibility does not require committing `yarn.lock` or `pnpm-lock.yaml`.

Nested project scripts use Node's `--run` support so `npm test`, `yarn test`, and `pnpm test` do not depend on another package manager to invoke child scripts.
