# Changelog

All notable changes to the Fern JS packages (`@ferndev/core`, `@ferndev/woo`) are recorded
here. The packages are versioned in lockstep and follow [Semantic Versioning](https://semver.org).

## 2.0.0 — 2026-06-02 — Type-safety overhaul (breaking)

### Breaking

**@ferndev/core**

- `ActionResult.data` is now `unknown` instead of `any`. Untyped reads no longer compile —
  pass a type argument (`callAction<MyType>('action')`) or narrow `result.data` before use.
- `ActionArgs` value type narrowed from `any` to `unknown`.
- Removed the runtime "invalid args" coercion (string / `null` → `{}` with `console`
  warnings). `args` is now statically typed as `object | FormData`; passing anything else is
  a compile error rather than a silent runtime fix-up.

**@ferndev/woo**

- `meta_data` bags on `Cart`, `CartItem`, `Variation`, and `CartItemData.variations[]`
  changed from `{ [key: string]: any }` to `Record<string, unknown>`. Cast or narrow the
  specific keys you read.

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
- `ActionResult`, `ActionArgs`, and `CallActionOptions` are now exported types.

### Changed (non-breaking, type-identical)

**@ferndev/woo**

- Index signatures (`CartItemVariation`, `CartItemData.attributes`) now emit as `Record<…>`.
- `WooCommerceConfig` is now an `interface` instead of a `type` alias.

### Migration

1. Add a type argument to each call: `callAction<MyType>('action')`, or narrow `result.data`.
2. Cast or guard the specific `cart.meta_data.*` keys you read.
3. *(optional but recommended)* Adopt arg typing — `callAction<MyData, MyArgs>('action', args)`
   or `const myAction = defineAction<MyArgs, MyData>('action')`.

No runtime behavior changed; the entire migration surface is the type-checker.

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
