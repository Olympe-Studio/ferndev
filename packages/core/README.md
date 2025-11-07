# @ferndev/core

A lightweight, type-safe client library for making authenticated action requests to the Fern PHP framework.

[![Version](https://img.shields.io/npm/v/@ferndev/core)](https://www.npmjs.com/package/@ferndev/core)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@ferndev/core)](https://bundlephobia.com/package/@ferndev/core)
[![License](https://img.shields.io/npm/l/@ferndev/core)](https://github.com/ferndev/core/blob/main/LICENSE)

## Features

- ✅ **Type-Safe** - Full TypeScript support with strict typing
- 🔒 **Secure** - Built-in CSRF protection with nonce support
- ⚡ **Lightweight** - Only 1.8 KB gzipped
- 🎯 **Simple API** - Single function for all your action needs
- ⏱️ **Timeout Control** - Configurable request timeouts
- 🛡️ **Defensive** - Validates request origins and argument types
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
import { callAction } from '@ferndev/core';

const sayHello = async (name: string, nonce: string) => {
  const result = await callAction<{ message: string }>(
    'sayHello',
    { name },
    nonce
  );

  if (result.status === 'error') {
    console.error('Failed:', result.error?.message);
    return;
  }

  console.log(result.data.message); // "Hello, John!"
};

sayHello('John', getNonce());
```

## API Reference

### \`callAction<T>(action, args?, nonce?, options?)\`

Makes an authenticated action request to the Fern backend.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| \`action\` | \`string\` | *required* | The action name to call (matches PHP method name) |
| \`args\` | \`Record<string, any> \\| FormData\` | \`{}\` | Arguments to pass to the action |
| \`nonce\` | \`string\` | \`''\` | CSRF nonce token for security |
| \`options\` | \`CallActionOptions\` | \`{}\` | Request configuration |

#### Options

```typescript
interface CallActionOptions {
  timeout?: number; // Request timeout in milliseconds (default: 30000)
}
```

#### Returns

```typescript
Promise<{
  data?: T;                    // Response data (typed)
  error?: {                    // Error details
    message: string;
    status?: number;           // HTTP status code
  };
  status: 'ok' | 'error';      // Request status
}>
```

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
  switch (result.error?.status) {
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

Invalid argument types are caught and converted to empty objects with console warnings:

```ts
// These are automatically handled:
callAction('test', 'invalid string')  // → Converted to {}
callAction('test', null)               // → Converted to {}
callAction('test', undefined)          // → Converted to {}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters or browser-only call |
| 403 | Forbidden - CSRF token invalid or cross-origin request |
| 408 | Timeout - Request exceeded timeout limit |
| 500 | Server Error - Backend error occurred |

## TypeScript Support

Full TypeScript support with generics for type-safe responses:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const result = await callAction<User>('getUser', { id: 123 }, nonce);

if (result.status === 'ok') {
  // result.data is typed as User
  console.log(result.data.name); // ✅ Type-safe
}
```

## Bundle Size

- **ES Module:** 1.79 KB (0.82 KB gzipped)
- **UMD Module:** 1.65 KB (0.86 KB gzipped)

## Browser Compatibility

- Chrome/Edge: ✅ Latest 2 versions
- Firefox: ✅ Latest 2 versions
- Safari: ✅ Latest 2 versions
- Requires: \`fetch\` API, \`AbortController\`, \`Promise\`

## Changelog

### v1.2.0 (2025-01-07)

- ✨ Added configurable request timeout (default: 30s)
- 🔒 Added same-origin validation for security
- 🛡️ Added defensive type checking for arguments
- 📝 Preserved HTTP status codes in errors
- 📚 Added comprehensive JSDoc documentation
- 🐛 Fixed type mismatch in error handling

### v1.1.1 (Previous)

- Initial release with basic action calling

## License

MIT © Tanguy Magnaudet

## Links

- [Fern Framework Documentation](https://fern.dev)
