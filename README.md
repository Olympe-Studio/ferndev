# Fern Framework - JavaScript Packages

Monorepo containing JavaScript/TypeScript packages for the [Fern PHP Framework](https://fern.dev).

## Packages

### [@ferndev/core](./packages/core) ![](https://img.shields.io/npm/v/@ferndev/core)

Core client library for making authenticated action requests to Fern PHP framework.

- **Size:** ~0.7 KB gzipped
- **Features:** Type-safe discriminated-union results, CSRF protection, timeout control
- [Documentation](./packages/core/README.md)

### [@ferndev/woo](./packages/woo) ![](https://img.shields.io/npm/v/@ferndev/woo)

WooCommerce integration with reactive state management via Nanostores.

- **Size:** ~2.9 KB gzipped (incl. nanostores + core)
- **Features:** Cart management, normalized result types, price formatting, reactive stores
- [Documentation](./packages/woo/README.md)

## Quick Start

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Build specific package
cd packages/core && bun run build
```

## Development

### Prerequisites

- [Bun](https://bun.sh) v1.1.31 or higher
- Node.js v18+ (for compatibility testing)

### Project Structure

```
ferndev/
├── packages/
│   ├── core/           # @ferndev/core - Action client
│   └── woo/            # @ferndev/woo - WooCommerce integration
├── package.json        # Root package.json
└── README.md
```

### Building Packages

Each package uses Vite for bundling:

```bash
# Build all (workspace filter)
bun run build

# Build individually
cd packages/core && bun run build
cd packages/woo && bun run build
```

### Quality gates

Both packages share a strict `tsconfig.base.json` and a type-aware `typescript-eslint`
config (`strictTypeChecked` + `stylisticTypeChecked`). The same gates run in CI
(`.github/workflows/ci.yml`) on every PR.

```bash
# All packages, from the repo root
bun run typecheck      # tsc --noEmit per package
bun run lint           # eslint . (strict, type-aware)
bun test               # bun test runner (pure logic + cart-result behavior)
bun run publint        # validates package.json / exports for publishing
bun run attw           # are-the-types-wrong: type resolution across CJS/ESM/bundler
bun run size           # size-limit budgets (see .size-limit.json)
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md). Latest: **2.0.0** (breaking — type-safety + error-model overhaul).

## Release Process

Releases are managed with [Changesets](https://github.com/changesets/changesets); `@ferndev/core`
and `@ferndev/woo` version in lockstep (a `fixed` group).

1. Record release intent for your change: `bun changeset`
2. Push to `master`. The Release workflow (`.github/workflows/release.yml`) opens a
   "Version Packages" PR that applies the bumps and updates `CHANGELOG.md`.
3. Merge that PR. CI publishes the bumped packages to npm with provenance
   (`changeset publish`).

## License

MIT © Tanguy Magnaudet

## Links

- [Fern Framework](https://fern.dev)
- [Documentation](https://docs.fern.dev)
