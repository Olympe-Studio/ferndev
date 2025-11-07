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
# Build all
bun run build:all

# Build individually
cd packages/core && bun run build
cd packages/woo && bun run build
```

### Type Checking

```bash
# Check types for core
cd packages/core && bunx tsc --noEmit

# Check types for woo
cd packages/woo && bunx tsc --noEmit
```

## Release Process

1. Update version in \`package.json\`
2. Update CHANGELOG in README
3. Build: \`bun run build\`
4. Commit changes
5. Tag release: \`git tag v1.x.x\`
6. Publish: \`npm publish\` (or \`bun publish\`)

## License

MIT © Tanguy Magnaudet

## Links

- [Fern Framework](https://fern.dev)
- [Documentation](https://docs.fern.dev)
