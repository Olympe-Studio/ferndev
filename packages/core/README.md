# @ferndev/core

A lightweight, type-safe client library for making authenticated action requests to the Fern PHP framework.

[![Version](https://img.shields.io/npm/v/@ferndev/core)](https://www.npmjs.com/package/@ferndev/core)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@ferndev/core)](https://bundlephobia.com/package/@ferndev/core)
[![License](https://img.shields.io/npm/l/@ferndev/core)](https://github.com/ferndev/core/blob/main/LICENSE)

## Features

- ✅ **Type-Safe** - Full TypeScript support with strict typing
- 🔒 **Secure** - Built-in CSRF protection with nonce support
- ⚡ **Lightweight** - Only 1.8 KB gzipped
- 🎯 **Simple API** - `callAction` for one-offs, `defineAction` to bind an action's types once
- ⏱️ **Timeout Control** - Configurable request timeouts
- 🛡️ **Defensive** - Validates request origins; argument and response types enforced at compile time
- 📝 **Well Documented** - Comprehensive JSDoc and examples

## Installation

```bash
bun add @ferndev/core
# or
npm install @ferndev/core
# or
yarn add @ferndev/core
```

## Quick Start

### 1. Create a Controller (PHP)

```php
// App/Controllers/HomePageController.php
<?php

namespace App\Controllers;

use Fern\Core\Factory\Singleton;
use Fern\Core\Services\HTTP\Reply;
use Fern\Core\Services\Controller\Controller;
use Fern\Core\Services\HTTP\Request;

class HomePageController extends Singleton implements Controller {
  public static string \$handle = '4'; // Page ID

  public function handle(Request \$request): Reply {
    return new Reply(200, Views::render('HomePage', [
      'title' => 'Hello Fern!',
      'nonce' => wp_create_nonce('say_hello'),
    ]));
  }

  /**
   * Example action that returns a greeting
   */
  #[Nonce(actionName: 'say_hello')]
  public function sayHello(Request \$request): Reply {
    \$action = \$request->getAction();
    \$name = \$action->get('name', 'World');

    return new Reply(200, [
      'message' => "Hello, {\$name}!",
    ]);
  }
}
```

### 2. Call from Client (TypeScript)

```ts
import { callAction, defineAction, isOk } from '@ferndev/core';

interface SayHelloArgs { name: string }

// Per-call: the response type is required in v2; the args type is optional but recommended
const sayHello = async (name: string, nonce: string) => {
  const result = await callAction<{ message: string }, SayHelloArgs>(
    'sayHello',
    { name },
    nonce,
  );

  // ActionResult is a discriminated union — narrow on `status` (or use isOk/isErr)
  if (result.status === 'error') {
    console.error('Failed:', result.error.message);
    return;
  }

  console.log(result.data.message); // "Hello, John!" — `data` is available, no `?.`
};

// Recommended: bind the action's types once, then call it cleanly everywhere
const sayHelloAction = defineAction<SayHelloArgs, { message: string }>('sayHello');
const result = await sayHelloAction({ name: 'John' }, getNonce());
if (isOk(result)) console.log(result.data.message);
```

## API Reference

### `callAction<TData, TArgs>(action, args?, nonce?, options?)`

Makes an authenticated action request to the Fern backend.

#### Type parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `TData` | `unknown` | Expected response data type. Defaults to `unknown` — you must supply it (`callAction<MyType>(…)`) or narrow before reading `result.data`. |
| `TArgs` | `Record<string, unknown>` | Optional args type. Supply it to type-check the payload: `callAction<Data, MyArgs>(…)`. Bound to `object` or `FormData`, so your own `interface` types are accepted. |

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `action` | `string` | *required* | The action name to call (matches PHP method name) |
| `args` | `TArgs` (an object or `FormData`) | `undefined` | Arguments to pass to the action |
| `nonce` | `string` | `''` | CSRF nonce token for security |
| `options` | `CallActionOptions` | `{}` | Request configuration |

#### Options

```typescript
interface CallActionOptions {
  timeout?: number; // Request timeout in milliseconds (default: 30000)
}
```

#### Returns

```typescript
Promise<ActionResult<TData>>

// Discriminated union on `status`. Narrow before reading `data` / `error`,
// or use the isOk(result) / isErr(result) type guards.
type ActionResult<TData = unknown> =
  | { status: 'ok'; data: TData }
  | { status: 'error'; error: ActionError };

interface ActionError {
  message: string;
  status?: number;             // HTTP status code (e.g. 403, 408, 500)
}
```

### `defineAction<TArgs, TData>(action)`

Binds an action name to its argument and response types **once** and returns a fully typed
caller. This is the recommended way to consume actions: the binding lives in a single local
declaration, so every call site is type-checked with no per-call generics and no action
string to mistype.

```typescript
import { defineAction } from '@ferndev/core';

interface AddToCartArgs { product_id: number; quantity: number }
interface CartResponse  { cart: Cart }

const addToCart = defineAction<AddToCartArgs, CartResponse>('addToCart');

const result = await addToCart({ product_id: 123, quantity: 2 }); // ✅ args + data typed
if (result.status === 'ok') result.data.cart;                     // ✅ CartResponse
await addToCart({ product_id: 123 });                             // ❌ missing quantity
```

Returns `(args?: TArgs, nonce?: string, options?: CallActionOptions) => Promise<ActionResult<TData>>`.

## Advanced Usage

### With Custom Timeout

```ts
// For slow operations (reports, exports, etc.)
const result = await callAction(
  'generateReport',
  { reportType: 'annual' },
  nonce,
  { timeout: 60000 } // 60 seconds
);
```

### With FormData (File Uploads)

```ts
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', 'My document');

const result = await callAction('uploadFile', formData, nonce);
```

### Error Handling

```ts
const result = await callAction('updateUser', { id: 123 }, nonce);

if (result.status === 'error') {
  switch (result.error.status) {
    case 400:
      console.error('Bad request:', result.error.message);
      break;
    case 403:
      console.error('Forbidden:', result.error.message);
      break;
    case 408:
      console.error('Request timeout');
      break;
    case 500:
      console.error('Server error:', result.error.message);
      break;
    default:
      console.error('Unknown error:', result.error?.message);
  }
}
```

## Security Features

### CSRF Protection

Always use nonces for state-changing operations:

```php
// Generate nonce in PHP
\$nonce = wp_create_nonce('delete_post');

// Verify with #[Nonce] attribute
#[Nonce(actionName: 'delete_post')]
public function deletePost(Request \$request): Reply {
  // Nonce automatically verified by framework
  // ...
}
```

```ts
// Pass nonce from client
await callAction('deletePost', { postId: 123 }, nonce);
```

### Same-Origin Validation

Requests are automatically validated to be same-origin for security. Cross-origin requests are blocked with a 403 error.

### Input Type Validation

As of v2 `args` is statically typed as `object | FormData`, so invalid argument types are
caught at compile time rather than coerced at runtime:

```ts
callAction('test', 'invalid string')  // ❌ compile error
callAction('test', { ok: true })      // ✅
callAction('test')                    // ✅ args optional
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters or browser-only call |
| 403 | Forbidden - CSRF token invalid or cross-origin request |
| 408 | Timeout - Request exceeded timeout limit |
| 500 | Server Error - Backend error occurred |

## TypeScript Support

Full TypeScript support with generics for type-safe requests **and** responses. The response
type defaults to `unknown`, so the compiler forces you to declare it:

```typescript
interface User { id: number; name: string; email: string }
interface GetUserArgs { id: number }

const result = await callAction<User, GetUserArgs>('getUser', { id: 123 }, nonce);

if (result.status === 'ok') {
  console.log(result.data.name); // ✅ User, type-safe — `data` is non-optional here
}

// Without a type argument, result.data is `unknown` and must be narrowed:
const raw = await callAction('getUser', { id: 123 }, nonce);
// raw.data.name → ❌ 'raw.data' is of type 'unknown'
```

The exported types `ActionResult`, `ActionError`, `ActionArgs`, and `CallActionOptions` are
available for your own signatures, alongside the `isOk` / `isErr` guards:

```typescript
import type { ActionResult, ActionArgs, CallActionOptions } from '@ferndev/core';
```

## Bundle Size

- **ES Module:** 1.79 KB (0.82 KB gzipped)
- **UMD Module:** 1.65 KB (0.86 KB gzipped)

## Browser Compatibility

- Chrome/Edge: ✅ Latest 2 versions
- Firefox: ✅ Latest 2 versions
- Safari: ✅ Latest 2 versions
- Requires: `fetch` API, `AbortController`, `Promise`

## Changelog

See the monorepo [CHANGELOG.md](../../CHANGELOG.md). Latest: **2.0.0** — response type
defaults to `unknown`, caller-typed `args`, and `defineAction`.

## License

MIT © Tanguy Magnaudet

## Links

- [Fern Framework Documentation](https://fern.dev)
