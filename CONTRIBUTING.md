# Contributing to @bitflick packages

Thank you for your interest in contributing to the bitflick open source packages!

## Code of Conduct

All contributors are expected to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting issues or requesting features

Before opening a new issue, please search for existing issues:

- [Report a bug](.github/ISSUE_TEMPLATE/bug_report.md)
- [Request a feature](.github/ISSUE_TEMPLATE/feature_request.md)

## Getting started

1. Fork the repository.
2. Clone your fork:
   ```bash
   git clone git@github.com:<your-username>/bitflick.git
   cd bitflick
   ```
3. Install dependencies:
   ```bash
   yarn
   ```

## Branching & Changesets

We use [Changesets](https://github.com/changesets/changesets) to manage semantic versioning and changelogs.

After making your changes, run:
```bash
yarn changeset
```
to create a changeset and describe the type of change (major, minor, patch).

## Pull Requests

When opening a PR:

- Ensure your branch is up-to-date with `main`.
- Include or update tests for any new or changed functionality.
- Run `yarn lint` and `yarn test` and ensure everything passes.
- Add or update documentation in the relevant package README.

## Quality checks

- `yarn lint` — verify code style.
- `yarn test` — run the test suite.

Thank you for helping improve this project!