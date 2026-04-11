# Contributing

All pull requests must be meaningful and pass CI before they are accepted.

## Scripts

> Run using `bun run <script name>`, e.g. `bun run format-fix`

- `dev` Starts the API with hot reloading enabled.
- `start` Runs the API normally.
- `lint` Runs linting (code quality) checks.
- `lint-fix` Like `lint` but also tries to fix any issues.
- `format` Runs formatting (code style) checks.
- `format-fix` Like `format` but also tries to fix any issues.
- `typecheck` Does type checking.
- `test` Runs testing suite.
- `check-all` Runs the `format`, `lint`, `typecheck`, and `test` scripts.

## Extra Scripts

> Run using `bun scripts/<script name>.ts`, e.g. `bun scripts/seedRewards.ts`

- `generateTokens` Randomly generates strings to use a secrets.
- `loc` Gets cumulative lines of code and number of source files in the project.
- `seed` Puts dummy data in the users and steam users tables.
- `seedRewards` Puts dummy data in the economy rewards and economy reward items tables.

## Architecture Guidelines

#### Locale

Use New Zealand / United Kingdom locales (en-NZ, en-US) in documentation and logs.

```ts
throw new Error("Invalid Authorisation"); // ok

throw new Error("Invalid Authorization"); // bad
```

But use American locale (en-US) in the code itself.

```ts
enum Color {} // ok

enum Colour {} // bad
```

#### Ordering

In places with many similarly-structured, single exports, the exported node should be at the top of the file.

This makes for easier viewing when quickly switching between files, since the initial cursor position (in VS Code at least) is at the top of the file.

See `src/routes` and `src/services` for examples of this.
