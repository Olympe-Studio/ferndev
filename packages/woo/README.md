# @ferndev/woo

WooCommerce integration library for the Fern PHP framework with reactive state management.

[![Version](https://img.shields.io/npm/v/@ferndev/woo)](https://www.npmjs.com/package/@ferndev/woo)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@ferndev/woo)](https://bundlephobia.com/package/@ferndev/woo)
[![License](https://img.shields.io/npm/l/@ferndev/woo)](https://github.com/ferndev/woo/blob/main/LICENSE)

## Features

- 🛒 **Cart Management** - Full WooCommerce cart operations
- 🔄 **Reactive State** - Powered by Nanostores for efficient reactivity
- 💰 **Price Formatting** - Automatic currency formatting based on shop config
- 🎫 **Coupon Support** - Apply and remove discount codes
- ⚡ **Race-Condition Safe** - Handles concurrent operations correctly
- 🛡️ **Defensive Programming** - Validates quantities and handles edge cases
- 📝 **Fully Typed** - Complete TypeScript definitions
- 🪶 **Lightweight** - Only 6.3 KB (1.66 KB gzipped)

## Installation

```bash
bun add @ferndev/woo @ferndev/core nanostores
# or
npm install @ferndev/woo @ferndev/core nanostores
# or
yarn add @ferndev/woo @ferndev/core nanostores
```

## Quick Start

### 1. Initialize Cart on App Mount

```typescript
import { initializeCart } from '@ferndev/woo';

// Call once when your app starts
await initializeCart();
```

### 2. Use Cart Functions

```typescript
import { addToCart, removeFromCart, $cartItemsCount } from '@ferndev/woo';

// Add product to cart
const result = await addToCart({
  productId: 123,
  quantity: 2
});

// React to cart changes
$cartItemsCount.subscribe(count => {
  console.log(\`Cart has \${count} items\`);
});
```

## API Reference

### Cart Operations

#### \`initializeCart()\`

Initialize cart and shop configuration. **Must be called before any other cart operations.**

```typescript
await initializeCart();
```

#### \`addToCart(options)\`

Add a product to the cart.

```typescript
// Simple product
await addToCart({
  productId: 123,
  quantity: 2
});

// Variable product
await addToCart({
  productId: 456,
  quantity: 1,
  variationId: 789,
  variation: { size: 'large', color: 'blue' }
});
```

#### \`batchAddToCart({ items })\`

Add multiple products in one operation.

```typescript
await batchAddToCart({
  items: [
    { productId: 123, quantity: 2 },
    { productId: 456, quantity: 1, variationId: 789 }
  ]
});
```

#### \`updateQuantity(cartItemKey, quantity)\`

Update item quantity. **Validates quantity and auto-removes if zero.**

```typescript
await updateQuantity('abc123', 3);  // Set to 3
await updateQuantity('abc123', 0);  // Removes item
await updateQuantity('abc123', -1); // Throws error
```

#### \`removeFromCart(cartItemKey)\`

Remove an item from cart.

```typescript
await removeFromCart('abc123');
```

#### \`clearCart()\`

Remove all items from cart.

```typescript
await clearCart();
```

#### \`applyCoupon(code)\` / \`removeCoupon(code)\`

Manage discount coupons.

```typescript
await applyCoupon('SAVE20');
await removeCoupon('SAVE20');
```

### Reactive Stores

All stores are Nanostores that you can subscribe to for reactive updates:

```typescript
import {
  \$cart,              // Full cart object
  \$cartItemsCount,    // Number of items
  \$cartTotal,         // Total amount
  \$cartSubtotal,      // Subtotal (before tax/shipping)
  \$cartTaxTotal,      // Total tax
  \$cartShippingTotal, // Shipping cost
  \$cartIsLoading,     // Loading state
  \$shopConfig         // WooCommerce configuration
} from '@ferndev/woo';

// React to changes
\$cartItemsCount.subscribe(count => {
  document.getElementById('cart-badge').textContent = count;
});

// Get current value
const currentTotal = \$cartTotal.get();
```

### Price Formatting

```typescript
import { formatPrice } from '@ferndev/woo';

// Automatically formats based on shop configuration
formatPrice(1234.56);  // "$1,234.56" (or €1.234,56 depending on config)
formatPrice(-10.00);    // "-$10.00"
```

## Framework Integration

### React / Solid / Preact

```tsx
import { useStore } from '@nanostores/react'; // or @nanostores/solid, etc.
import { \$cartItemsCount, addToCart } from '@ferndev/woo';

function CartBadge() {
  const count = useStore(\$cartItemsCount);
  
  return <span className="badge">{count}</span>;
}

function AddToCartButton({ productId }: { productId: number }) {
  const handleClick = async () => {
    await addToCart({ productId, quantity: 1 });
  };
  
  return <button onClick={handleClick}>Add to Cart</button>;
}
```

### Svelte

```svelte
<script>
  import { \$cartItemsCount, addToCart } from '@ferndev/woo';
</script>

<div class="cart-badge">{\$cartItemsCount}</div>

<button on:click={() => addToCart({ productId: 123, quantity: 1 })}>
  Add to Cart
</button>
```

### Vue

```vue
<script setup>
import { useStore } from '@nanostores/vue';
import { \$cartItemsCount, addToCart } from '@ferndev/woo';

const count = useStore(\$cartItemsCount);
</script>

<template>
  <span class="badge">{{ count }}</span>
  <button @click="addToCart({ productId: 123, quantity: 1 })">
    Add to Cart
  </button>
</template>
```

## Error Handling

All cart functions throw descriptive errors with context:

```typescript
try {
  await addToCart({ productId: 123, quantity: 2 });
} catch (error) {
  // Error messages are descriptive:
  // "Failed to add product 123 to cart: Out of stock"
  console.error(error.message);
  
  // Original error preserved in .cause
  console.error(error.cause);
}
```

## Concurrent Operations

The library handles concurrent operations safely:

```typescript
// These can run simultaneously without issues
await Promise.all([
  addToCart({ productId: 1, quantity: 1 }),
  addToCart({ productId: 2, quantity: 1 }),
  addToCart({ productId: 3, quantity: 1 })
]);

// Loading state remains true until ALL complete
```

## Bundle Size

- **ES Module:** 6.30 KB (1.66 KB gzipped)
- **UMD Module:** 5.32 KB (1.68 KB gzipped)

## TypeScript

Fully typed with exported interfaces:

```typescript
import type {
  Cart,
  CartItem,
  WooCommerceConfig,
  AddToCartArgs,
  UpdateCartItemArgs
} from '@ferndev/woo';
```

## Changelog

### v1.2.0 (2025-01-07)

- 🐛 **CRITICAL FIX:** Fixed TypeError when \`\$shopConfig\` was undefined
- 🔒 Fixed race conditions in concurrent cart operations
- ✅ Added quantity validation (prevents negative values)
- 📝 Added error context to all operations
- 🛡️ Added defensive checks in \`formatPrice()\`
- 📚 Added comprehensive JSDoc documentation
- 📦 Improved bundle size optimization

### v1.1.3 (Previous)

- Initial release with basic cart functionality

## License

MIT © Tanguy Magnaudet

## Links

- [Fern Framework Documentation](https://fern.dev)
- [@ferndev/core](https://www.npmjs.com/package/@ferndev/core)
- [Nanostores](https://github.com/nanostores/nanostores)
