# bitflick Open Source Packages

[![CI](https://github.com/flick-ing/bitflick/actions/workflows/ci.yml/badge.svg)](https://github.com/flick-ing/bitflick/actions/workflows/ci.yml)
[![Changesets](https://img.shields.io/badge/changesets-enabled-blue.svg)](https://github.com/changesets)
[![npm version inscriptions](https://img.shields.io/npm/v/@bitflick/inscriptions.svg)](https://www.npmjs.com/package/@bitflick/inscriptions)
[![npm version tsconfig](https://img.shields.io/npm/v/@bitflick/tsconfig.svg)](https://www.npmjs.com/package/@bitflick/tsconfig)

This monorepo contains the open source packages published under the `@bitflick` scope, managed by the [flick-ing](https://github.com/flick-ing) GitHub organization.

## Packages

| Package | Description | NPM |
| --- | --- | --- |
| [`@bitflick/inscriptions`](packages/inscriptions) | A Node.js TypeScript library for creating Bitcoin inscriptions (BRC20) and interacting with ordinals. | [![npm](https://img.shields.io/npm/v/@bitflick/inscriptions.svg)](https://www.npmjs.com/package/@bitflick/inscriptions) |
| [`@bitflick/tsconfig`](packages/tsconfig) | Shared TypeScript base configuration for all bitflick packages. | [![npm](https://img.shields.io/npm/v/@bitflick/tsconfig.svg)](https://www.npmjs.com/package/@bitflick/tsconfig) |

## Getting Started

Install and use in your project:

```bash
npm install @bitflick/inscriptions
# or
npm install @bitflick/tsconfig
```

Extend the shared TypeScript configuration in your `tsconfig.json`:

```json
{
  "extends": "@bitflick/tsconfig/tsconfig.base.json",
  "compilerOptions": {
    /* your overrides */
  }
}
```

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on contributing, reporting issues, and release process.

## Code of Conduct

This project and its contributors abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

See [SECURITY.md](SECURITY.md) for reporting security vulnerabilities.

## License

This project is licensed under the terms of the [MIT License](LICENSE).