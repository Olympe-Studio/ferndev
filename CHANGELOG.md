# Changelog

All notable changes to the Fern JS packages (`@ferndev/core`, `@ferndev/woo`) are recorded
here. The packages are versioned in lockstep and follow [Semantic Versioning](https://semver.org).

## 2.0.0 — 2026-06-02 — Type-safety + error-model overhaul (breaking)

### Breaking

**@ferndev/core**

- `ActionResult.data` is now `unknown` instead of `any`. Untyped reads no longer compile —
  pass a type argument (`callAction<MyType>('action')`) or narrow `result.data` before use.
- `ActionArgs` value type narrowed from `any` to `unknown`.
- Removed the runtime "invalid args" coercion (string / `null` → `{}` with `console`
  warnings). `args` is now statically typed as `object | FormData`; passing anything else is
  a compile error rather than a silent runtime fix-up.
- **`ActionResult<T>` is now a discriminated union** on `status`:
  `{ status: 'ok'; data: T } | { status: 'error'; error: ActionError }`. After a
  `status === 'ok'` check (or `isOk(result)`), `data` is available without optional chaining;
  `error` only exists on the error branch. Reads of `result.data?.x` *without* first narrowing
  on `status` no longer compile.

**@ferndev/woo**

- `meta_data` bags on `Cart`, `CartItem`, `Variation`, and `CartItemData.variations[]`
  changed from `{ [key: string]: any }` to `Record<string, unknown>`. Cast or narrow the
  specific keys you read.
- **Cart actions now return normalized result unions instead of the raw `ActionResult`.**
  `addToCart`, `updateCartItem`, `updateQuantity`, `removeFromCart`, `getCart`, `clearCart`,
  `applyCoupon`, `removeCoupon` return `CartResult` (`{ status: 'ok'; cart } |
  { status: 'error'; error }`). `initializeCart` returns `InitialStateResult` (adds `config`),
  and `batchAddToCart` returns `BatchCartResult` (preserves per-item `results`).
- **Business failures now surface as `status: 'error'`.** Previously an out-of-stock add,
  invalid coupon, etc. was swallowed to `console.error` while the call still returned
  `status: 'ok'`. These now return `{ status: 'error', error: { message, code? } }` so the UI
  can react. The `$cart` store is only updated on success (a partial batch still updates it).

### Added

**@ferndev/core**

- `callAction<TData, TArgs>` — a second type parameter lets callers type-check the args
  payload: `callAction<CartResponse, AddToCartArgs>('addToCart', args)`. The bound is
  `object | FormData` (not `Record<string, unknown>`) so your own `interface` types are
  accepted — a `Record` bound rejects interfaces for lack of an index signature.
- `defineAction<TArgs, TData>(action)` — bind an action's argument and response types once
  and get a fully typed caller. Recommended pattern: the action ↔ types binding lives in a
  single local declaration, so every call site is checked with no per-call generics and no
  string to mistype.
- `isOk(result)` / `isErr(result)` type guards that narrow an `ActionResult` to its branch.
- `ActionResult`, `ActionArgs`, `CallActionOptions`, and `ActionError` are exported types.

**@ferndev/woo**

- `CartResult`, `BatchCartResult`, `InitialStateResult`, and `WooError` result types.

### Changed (non-breaking, type-identical)

**@ferndev/woo**

- Index signatures (`CartItemVariation`, `CartItemData.attributes`) now emit as `Record<…>`.
- `WooCommerceConfig` is now an `interface` instead of a `type` alias.

### Fixed (packaging — externally fatal)

- **`require()` was broken in both packages**: `exports["."].require` pointed at `*.umd.js`
  but the built file is `*.umd.cjs`. Any CommonJS `require('@ferndev/woo')` threw. Now fixed.
- **`@ferndev/woo` had no `types` condition** inside its `exports` map (and woo's rolled
  `.d.ts` used extensionless relative re-exports that fail under `node16`). Types now resolve
  green across `node10`, `node16` (CJS + ESM), and `bundler` (verified with
  `@arethetypeswrong/cli`).
- `pkg.main` pointed at unpublished source (`index.ts` / `src/index.ts`); now the published
  CJS entry. Added `engines.node`, `sideEffects` flags, and per-condition `.d.cts` types.
- The root workspace package is no longer published (`private: true`); it previously declared
  `main`/`module` pointing at files that never existed.

### Tooling

- CI (`.github/workflows/ci.yml`): typecheck, lint, build, `bun test --coverage`, `publint`,
  `attw`, and `size-limit` on every PR. Changesets-driven releases with npm provenance.
- **100% test coverage, hard-gated.** A `bun test` suite (56 tests) covers `callAction`/
  `defineAction`/`isOk`/`isErr`, the cart actions and their `resolveCart`/`resolveBatch`
  normalization, `formatPrice`, and the nanostores cart stores. `bunfig.toml` enforces
  `coverageThreshold = { lines = 1, functions = 1, statements = 1 }` (Bun measures
  line/function/statement, not branches; the suite is branch-complete by design). The backend is
  mocked: happy paths stub `fetch`; the actions' defensive `catch` blocks are exercised via
  `mock.module('@ferndev/core', …)` forcing `callAction` to reject.

### Migration

1. Add a type argument to each call: `callAction<MyType>('action')`, or narrow `result.data`.
2. **Narrow on `status` before reading `data`/`error`** (or use `isOk` / `isErr`):
   `if (isOk(res)) { use(res.data) } else { show(res.error.message) }`.
3. For woo cart actions, branch on the returned `CartResult`/`BatchCartResult`: success carries
   `cart` (and `results` for batch); failure carries `error`. Handle business failures
   (out-of-stock, bad coupon) that now report `status: 'error'`.
4. Cast or guard the specific `cart.meta_data.*` keys you read.
5. *(optional but recommended)* Adopt arg typing — `callAction<MyData, MyArgs>('action', args)`
   or `const myAction = defineAction<MyArgs, MyData>('action')`.

The `@ferndev/core` type changes are checker-only, but the `@ferndev/woo` error-model redesign
**does** change runtime behavior: cart actions return the normalized result unions, no longer
throw, and surface business failures as `status: 'error'`. Migrate the call sites accordingly.

## 1.2.2 — 2026-06-02 — Strict type hardening (non-breaking)

- Added a shared strict `tsconfig.base.json` extended by both packages:
  `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`,
  `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`,
  `noUncheckedSideEffectImports`, `noImplicitOverride`, and more.
- Added `typescript-eslint` static analysis (`strictTypeChecked` + `stylisticTypeChecked`)
  with root `lint` / `typecheck` scripts.
- Fixed two latent `meta_data` type errors in `@ferndev/woo` that were shipping despite a
  passing build, plus every issue surfaced by the stricter config. Public `.d.ts` unchanged.

## 1.2.0 — 2025-01-07

**@ferndev/core**

- Configurable request timeout (default 30s), same-origin validation, defensive argument
  checks, preserved HTTP status codes, comprehensive JSDoc.

**@ferndev/woo**

- Fixed `TypeError` when `$shopConfig` was undefined; fixed race conditions in concurrent
  cart operations; added quantity validation and error context; defensive `formatPrice()`.

## 1.1.x — Initial releases

- `@ferndev/core` 1.1.1 — basic action calling.
- `@ferndev/woo` 1.1.3 — basic cart functionality.
