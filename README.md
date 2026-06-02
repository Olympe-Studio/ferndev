# Fern Framework - JavaScript Packages

Monorepo containing JavaScript/TypeScript packages for the [Fern PHP Framework](https://fern.dev).

## Packages

### [@ferndev/core](./packages/core) ![](https://img.shields.io/npm/v/@ferndev/core)

Core client library for making authenticated action requests to Fern PHP framework.

- **Size:** 1.8 KB gzipped
- **Features:** Type-safe, CSRF protection, timeout control
- [Documentation](./packages/core/README.md)

### [@ferndev/woo](./packages/woo) ![](https://img.shields.io/npm/v/@ferndev/woo)

WooCommerce integration with reactive state management via Nanostores.

- **Size:** 6.3 KB gzipped
- **Features:** Cart management, price formatting, reactive stores
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

### Type Checking & Linting

Both packages share a strict `tsconfig.base.json` and a type-aware `typescript-eslint`
config (`strictTypeChecked` + `stylisticTypeChecked`).

```bash
# All packages, from the repo root
bun run typecheck      # tsc --noEmit per package
bun run lint           # eslint . (strict, type-aware)

# A single package
cd packages/core && bun run typecheck && bun run lint
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md). Latest: **2.0.0** (breaking — type-safety overhaul).

## Release Process

1. Update version in each `packages/*/package.json`
2. Update [CHANGELOG.md](./CHANGELOG.md)
3. Build: `bun run build`
4. Commit changes
5. Tag release: `git tag vX.Y.Z`
6. Publish: `npm publish` (or `bun publish`)

## License

MIT © Tanguy Magnaudet

## Links

- [Fern Framework](https://fern.dev)
- [Documentation](https://docs.fern.dev)
