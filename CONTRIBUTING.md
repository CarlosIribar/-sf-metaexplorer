# Contributing

Thanks for your interest in improving SF Metadata Explorer.

## Report bugs

- Search existing issues before opening a new one.
- Include steps to reproduce, expected behavior, and environment details.

## Propose features

- Open an issue with a short proposal and rationale.
- Include examples or workflow details when possible.

## Development setup

```bash
npm install
npm run compile
npm test
```

Run the TUI locally:

```bash
node --loader ts-node/esm ./bin/dev.js metadata:explorer
```

## Style guide

- Keep changes focused and avoid unrelated refactors.
- Add tests for new behavior.
- Follow existing lint and formatting rules.

## Pull request process

1. Fork the repository and create a feature branch.
2. Make changes with tests.
3. Ensure `npm test` passes.
4. Open a PR describing the change and validation steps.

## Required tests

- Unit tests for new logic.
- Manual verification for TUI behavior when relevant.
