import { callAction } from "@ferndev/core"
import { $cart, $cartIsLoading, $shopConfig, incrementLoadingState, decrementLoadingState } from "./stores"
import { AddToCartArgs, Cart, InitialStateResponse, UpdateCartItemArgs, BatchAddToCartArgs, BatchAddToCartResponse } from "./types"

type CartActionResult = Awaited<ReturnType<typeof callAction<{ cart: Cart }>>>

const DEFAULT_CART: Cart = {
  items: [],
  subtotal: "0",
  total: "0",
  item_count: 0,
  tax_total: "0",
  needs_shipping: false,
  shipping_total: "0"
}

function isValidCart(cart: unknown): cart is Cart {
  if (!cart || typeof cart !== 'object') return false
  const c = cart as Record<string, unknown>
  return (
    Array.isArray(c.items) &&
    typeof c.item_count === 'number'
  )
}

// Validate responses before touching the cart store to avoid writing undefined data on backend errors.
function getCartFromResult(actionName: string, result: CartActionResult): Cart | null {
  if (result.status !== 'ok') {
    console.error(`[Fern Woo] ${actionName} request failed: ${result.error?.message ?? 'Unknown error'}`)
    return null
  }

  const data = result.data as any

  if (!data || typeof data !== 'object') {
    console.error(`[Fern Woo] ${actionName} returned invalid response payload`, data)
    return null
  }

  if ('status' in data && data.status === 'error') {
    const message = (data as any).error?.message ?? (data as any).message ?? 'Unknown error'
    console.error(`[Fern Woo] ${actionName} failed: ${message}`)
    return null
  }

  if (!('cart' in data) || data.cart == null) {
    console.error(`[Fern Woo] ${actionName} response missing cart data`, data)
    return null
  }

  const cart = data.cart
  if (!isValidCart(cart)) {
    console.error(`[Fern Woo] ${actionName} returned malformed cart data`, cart)
    return { ...DEFAULT_CART, ...cart }
  }

  return cart
}

function updateCartStore(actionName: string, result: CartActionResult, { clone }: { clone?: boolean } = {}) {
  const cart = getCartFromResult(actionName, result)
  if (!cart) return

  $cart.set(clone ? JSON.parse(JSON.stringify(cart)) : cart)
}

/**
 * Initialize the cart and shop configuration state.
 * This should be called when the app first loads to set up the initial cart state
 * and shop configuration (currency, tax settings, etc.).
 *
 * @returns A promise that resolves to the action result containing both cart and shop config
 * @example
 * ```ts
 * // On app mount:
 * await initializeCart()
 * ```
 */
export const initializeCart = async () => {
  incrementLoadingState()
  try {
    const result = await callAction<InitialStateResponse>('getInitialState')
    if (result.status === 'ok' && result.data?.cart && result.data?.config) {
      $cart.set(result.data.cart)
      $shopConfig.set(result.data.config)
    } else if (result.status === 'ok') {
      console.error('[Fern Woo] initializeCart returned invalid payload', result.data)
    }
    return result
  } catch (e) {
    const error = new Error(`Failed to initialize cart: ${e instanceof Error ? e.message : 'Unknown error'}`)
    error.cause = e
    throw error
  } finally {
    decrementLoadingState()
  }
}

/**
 * Add a product to the cart.
 * Supports both simple and variable products.
 *
 * @param productId - The ID of the product to add
 * @param quantity - The quantity to add (defaults to 1)
 * @param variationId - For variable products, the specific variation ID
 * @param variation - For variable products, the attribute combinations
 * @returns A promise that resolves to the action result containing updated cart

 * @example
 * Simple product:
 * ```ts
 * await addToCart({ productId: 123, quantity: 2 })
 * ```
 *
 * @example
 * Variable product:
 * ```ts
 * await addToCart({
 *   productId: 123,
 *   variationId: 456,
 *   variation: { size: 'large', color: 'blue' },
 *   quantity: 1
 * })
 * ```
 *
 * @example
 * Modify existing cart item:
 * ```ts
 * await addToCart({
 *   productId: 123,
 *   variationId: 456,
 *   variation: { size: 'medium', color: 'red' },
 *   quantity: 2,
 *   cartItemKey: 'abc123'
 * })
 * ```
 */
export const addToCart = async ({
  productId,
  quantity = 1,
  variationId,
  variation = {},
  cartItemKey
}: AddToCartArgs) => {
  incrementLoadingState()
  try {
    const result = await callAction<{ cart: Cart }>('addToCart', {
      product_id: productId,
      quantity,
      variation_id: variationId,
      variation,
      cart_item_key: cartItemKey
    })
    updateCartStore('addToCart', result, { clone: true })
    return result
  } catch (e) {
    const error = new Error(`Failed to add product ${productId} to cart: ${e instanceof Error ? e.message : 'Unknown error'}`)
    error.cause = e
    throw error
  } finally {
    decrementLoadingState()
  }
}

/**
 * Add multiple products to the cart in a single batch operation.
 * Allows adding multiple products at once with individual success/failure tracking.
 *
 * @param items - Array of items to add to cart
 * @returns A promise that resolves to the batch operation result with individual item results
 *
 * @example
 * Simple batch add:
 * ```ts
 * await batchAddToCart({
 *   items: [
 *     { productId: 123, quantity: 2 },
 *     { productId: 456, quantity: 1 }
 *   ]
 * })
 * ```
 *
 * @example
 * Mixed simple and variable products:
 * ```ts
 * await batchAddToCart({
 *   items: [
 *     { productId: 123, quantity: 2 },
 *     {
 *       productId: 456,
 *       quantity: 1,
 *       variationId: 789,
 *       variation: { size: 'large', color: 'red' }
 *     }
 *   ]
 * })
 * ```
 */
export const batchAddToCart = async ({ items }: BatchAddToCartArgs) => {
  incrementLoadingState()
  try {
    const formattedItems = items.map(item => ({
      product_id: item.productId,
      quantity: item.quantity ?? 1,
      variation_id: item.variationId,
      variation: item.variation ?? {}
    }))

    const result = await callAction<BatchAddToCartResponse>('batchAddToCart', {
      items: formattedItems
    })

    updateCartStore('batchAddToCart', result, { clone: true })
    return result
  } catch (e) {
    const error = new Error(`Failed to batch add ${items.length} items to cart: ${e instanceof Error ? e.message : 'Unknown error'}`)
    error.cause = e
    throw error
  } finally {
    decrementLoadingState()
  }
}

/**
 * Update a cart item's quantity and/or variation
 * Handles both simple and variable products
 *
 * @param args - Configuration for the cart item update
 * @returns Promise with the cart action result
 *
 * @example
 * Update quantity of simple product:
 * ```ts
 * await updateCartItem({
 *   cartItemKey: 'abc123',
 *   quantity: 3
 * })
 * ```
 *
 * @example
 * Change variation of variable product:
 * ```ts
 * await updateCartItem({
 *   cartItemKey: 'abc123',
 *   quantity: 2,
 *   variationId: 456,
 *   variation: { size: 'medium', color: 'red' }
 * })
 * ```
 */
export const updateCartItem = async ({
  cartItemKey,
  quantity,
  variationId,
  variation
}: UpdateCartItemArgs) => {
  incrementLoadingState()
  try {
    // If only updating quantity (simple or variable product)
    if (quantity && !variationId && !variation) {
      return updateQuantity(cartItemKey, quantity)
    }

    // If updating variation or both quantity and variation
    const currentItem = $cart.get().items.find(item => item.key === cartItemKey)
    if (!currentItem) {
      throw new Error('Cart item not found')
    }

    const result = await callAction<{ cart: Cart }>('updateCartItem', {
      cart_item_key: cartItemKey,
      product_id: currentItem.product_id,
      quantity: quantity ?? currentItem.quantity,
      variation_id: variationId,
      variation
    })

    updateCartStore('updateCartItem', result)
    return result
  } catch (e) {
    const error = new Error(`Failed to update cart item ${cartItemKey}: ${e instanceof Error ? e.message : 'Unknown error'}`)
    error.cause = e
    throw error
  } finally {
    decrementLoadingState()
  }
}

/**
 * Remove an item from the cart.
 *
 * @param cartItemKey - The unique key of the cart item to remove
 * @returns A promise that resolves to the action result containing updated cart
 * @example
 * ```ts
 * await removeFromCart('a123b456c789')
 * ```
 */
export const removeFromCart = async (cartItemKey: string) => {
  incrementLoadingState()
  try {
    const result = await callAction<{ cart: Cart }>('removeFromCart', {
      cart_item_key: cartItemKey
    })
    updateCartStore('removeFromCart', result)
    return result
  } catch (e) {
    const error = new Error(`Failed to remove cart item ${cartItemKey}: ${e instanceof Error ? e.message : 'Unknown error'}`)
    error.cause = e
    throw error
  } finally {
    decrementLoadingState()
  }
}

/**
 * Update the quantity of an item in the cart.
 *
 * @param cartItemKey - The unique key of the cart item to update
 * @param quantity - The new quantity to set (must be positive; use removeFromCart for zero)
 * @returns A promise that resolves to the action result containing updated cart
 * @throws Error if quantity is negative
 * @example
 * ```ts
 * await updateQuantity('a123b456c789', 3)
 * ```
 */
export const updateQuantity = async (cartItemKey: string, quantity: number) => {
  // Validation: quantity must be positive
  if (quantity < 0) {
    throw new Error(`Invalid quantity: ${quantity}. Quantity must be positive. Use removeFromCart() to remove items.`)
  }

  // If quantity is zero, remove the item instead
  if (quantity === 0) {
    return removeFromCart(cartItemKey)
  }

  incrementLoadingState()
  try {
    const result = await callAction<{ cart: Cart }>('updateCartItemQuantity', {
      cart_item_key: cartItemKey,
      quantity
    })
    updateCartStore('updateQuantity', result)
    return result
  } catch (e) {
    const error = new Error(`Failed to update quantity for cart item ${cartItemKey}: ${e instanceof Error ? e.message : 'Unknown error'}`)
    error.cause = e
    throw error
  } finally {
    decrementLoadingState()
  }
}

/**
 * Fetch the current cart contents from the server.
 * Useful for refreshing the cart state or checking for changes.
 *
 * @returns A promise that resolves to the action result containing current cart
 * @example
 * ```ts
 * await getCart()
 * ```
 */
export const getCart = async () => {
  incrementLoadingState()
  try {
    const result = await callAction<{ cart: Cart }>('getCartContents')
    updateCartStore('getCartContents', result)
    return result
  } catch (e) {
    const error = new Error(`Failed to fetch cart contents: ${e instanceof Error ? e.message : 'Unknown error'}`)
    error.cause = e
    throw error
  } finally {
    decrementLoadingState()
  }
}

/**
 * Clear all items from the cart.
 *
 * @returns A promise that resolves to the action result containing empty cart
 * @example
 * ```ts
 * await clearCart()
 * ```
 */
export const clearCart = async () => {
  incrementLoadingState()
  try {
    const result = await callAction<{ cart: Cart }>('clearCart')
    updateCartStore('clearCart', result)
    return result
  } catch (e) {
    const error = new Error(`Failed to clear cart: ${e instanceof Error ? e.message : 'Unknown error'}`)
    error.cause = e
    throw error
  } finally {
    decrementLoadingState()
  }
}

/**
 * Apply a coupon code to the cart.
 *
 * @param couponCode - The coupon code to apply
 * @returns A promise that resolves to the action result containing updated cart
 * @example
 * ```ts
 * await applyCoupon('SAVE20')
 * ```
 */
export const applyCoupon = async (couponCode: string) => {
  incrementLoadingState()
  try {
    const result = await callAction<{ cart: Cart }>('applyCoupon', {
      coupon: couponCode
    })
    updateCartStore('applyCoupon', result)
    return result
  } catch (e) {
    const error = new Error(`Failed to apply coupon '${couponCode}': ${e instanceof Error ? e.message : 'Unknown error'}`)
    error.cause = e
    throw error
  } finally {
    decrementLoadingState()
  }
}

/**
 * Remove a coupon from the cart.
 *
 * @param couponCode - The coupon code to remove
 * @returns A promise that resolves to the action result containing updated cart
 * @example
 * ```ts
 * await removeCoupon('SAVE20')
 * ```
 */
export const removeCoupon = async (couponCode: string) => {
  incrementLoadingState()
  try {
    const result = await callAction<{ cart: Cart }>('removeCoupon', {
      coupon: couponCode
    })
    updateCartStore('removeCoupon', result)
    return result
  } catch (e) {
    const error = new Error(`Failed to remove coupon '${couponCode}': ${e instanceof Error ? e.message : 'Unknown error'}`)
    error.cause = e
    throw error
  } finally {
    decrementLoadingState()
  }
}

/**
 * Format a price according to WooCommerce shop configuration.
 * Handles currency symbol, positioning, and decimal/thousand separators.
 *
 * @param price - The numeric price to format
 * @returns Formatted price string with currency symbol
 *
 * @throws Error if shop config is not initialized (call `initializeCart()` first)
 *
 * @example
 * ```ts
 * formatPrice(1234.56)  // Returns: "$1,234.56" (depending on shop config)
 * formatPrice(-10.00)    // Returns: "-$10.00"
 * ```
 */
export function formatPrice(price: number): string {
  const config = $shopConfig.get();

  // Defensive check: config must be initialized with required properties
  if (!config ||
      typeof config.price_decimals === 'undefined' ||
      typeof config.decimal_separator === 'undefined' ||
      typeof config.thousand_separator === 'undefined' ||
      typeof config.currency_symbol === 'undefined' ||
      typeof config.currency_position === 'undefined') {
    throw new Error('[Fern Woo] Shop config not initialized. Call initializeCart() before using formatPrice()');
  }

  const absolutePrice = Math.abs(price);
  const formattedNumber = absolutePrice.toFixed(config.price_decimals)
    .replace('.', config.decimal_separator)
    .replace(/\B(?=(\d{3})+(?!\d))/g, config.thousand_separator);

  const sign = price < 0 ? '-' : '';
  switch (config.currency_position) {
    case 'left':
      return `${sign}${config.currency_symbol}${formattedNumber}`;
    case 'right':
      return `${sign}${formattedNumber}${config.currency_symbol}`;
    case 'left_space':
      return `${sign}${config.currency_symbol} ${formattedNumber}`;
    case 'right_space':
      return `${sign}${formattedNumber} ${config.currency_symbol}`;
    default:
      return `${sign}${config.currency_symbol}${formattedNumber}`;
  }
}
