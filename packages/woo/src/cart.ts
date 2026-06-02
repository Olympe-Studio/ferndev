import { callAction, ActionResult } from "@ferndev/core"
import { $cart, $shopConfig, incrementLoadingState, decrementLoadingState } from "./stores"
import {
  AddToCartArgs,
  Cart,
  InitialStateResponse,
  UpdateCartItemArgs,
  BatchAddToCartArgs,
  BatchAddToCartResponse,
  BatchItemResult,
  WooCommerceConfig,
  WooError,
  CartResult,
  BatchCartResult,
  InitialStateResult
} from "./types"

const DEFAULT_CART: Cart = {
  items: [],
  subtotal: "0",
  total: "0",
  item_count: 0,
  tax_total: "0",
  needs_shipping: false,
  shipping_total: "0",
  meta_data: {}
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

function isValidCart(cart: unknown): cart is Cart {
  const c = asRecord(cart)
  return c !== null && Array.isArray(c['items']) && typeof c['item_count'] === 'number'
}

/**
 * Extract a {@link WooError} from a backend payload that signalled a business failure,
 * preferring a nested `error.message`/`error.code` and falling back to top-level fields.
 */
function payloadError(payload: Record<string, unknown>): WooError {
  const nested = asRecord(payload['error'])
  const message = nested?.['message'] ?? payload['message']
  const code = nested?.['code'] ?? payload['code']
  const error: WooError = {
    message: typeof message === 'string' ? message : 'Unknown error'
  }
  if (typeof code === 'string') error.code = code
  return error
}

/**
 * Map a core {@link ActionResult} into a normalized {@link CartResult}, updating the `$cart`
 * store only when the operation genuinely succeeded. Business failures (e.g. out-of-stock)
 * surface as `{ status: 'error', error }` instead of being swallowed.
 */
function resolveCart(result: ActionResult<{ cart: Cart }>, { clone }: { clone?: boolean } = {}): CartResult {
  if (result.status === 'error') {
    return { status: 'error', error: { message: result.error.message } }
  }

  const payload = asRecord(result.data)
  if (!payload) {
    return { status: 'error', error: { message: 'Invalid response payload' } }
  }

  if (payload['status'] === 'error') {
    return { status: 'error', error: payloadError(payload) }
  }

  const rawCart = payload['cart']
  if (rawCart == null) {
    return { status: 'error', error: { message: 'Response missing cart data' } }
  }

  const cart = isValidCart(rawCart) ? rawCart : { ...DEFAULT_CART, ...(rawCart as Partial<Cart>) }
  $cart.set(clone ? (JSON.parse(JSON.stringify(cart)) as Cart) : cart)
  return { status: 'ok', cart }
}

/**
 * Map a batch response into a {@link BatchCartResult}, preserving per-item `results`. A partial
 * failure still updates the cart with the items that succeeded but reports `status: 'error'`.
 */
function resolveBatch(result: ActionResult<BatchAddToCartResponse>, { clone }: { clone?: boolean } = {}): BatchCartResult {
  if (result.status === 'error') {
    return { status: 'error', error: { message: result.error.message } }
  }

  const payload = asRecord(result.data)
  if (!payload) {
    return { status: 'error', error: { message: 'Invalid response payload' } }
  }

  const results = Array.isArray(payload['results']) ? (payload['results'] as BatchItemResult[]) : undefined
  const rawCart = payload['cart']

  if (!isValidCart(rawCart)) {
    return { status: 'error', error: payloadError(payload), results }
  }

  $cart.set(clone ? (JSON.parse(JSON.stringify(rawCart)) as Cart) : rawCart)

  if (payload['success'] === false) {
    return { status: 'error', error: payloadError(payload), results }
  }

  return { status: 'ok', cart: rawCart, results: results ?? [] }
}

/**
 * Initialize the cart and shop configuration state.
 * This should be called when the app first loads to set up the initial cart state
 * and shop configuration (currency, tax settings, etc.).
 *
 * @returns A promise resolving to an {@link InitialStateResult} carrying both cart and shop config
 * @example
 * ```ts
 * // On app mount:
 * const result = await initializeCart()
 * if (result.status === 'error') console.error(result.error.message)
 * ```
 */
export const initializeCart = async (): Promise<InitialStateResult> => {
  incrementLoadingState()
  try {
    const result = await callAction<InitialStateResponse>('getInitialState')
    if (result.status === 'error') {
      return { status: 'error', error: { message: result.error.message } }
    }

    const payload = asRecord(result.data)
    const rawCart = payload?.['cart']
    const rawConfig = payload?.['config']
    if (!isValidCart(rawCart) || asRecord(rawConfig) === null) {
      return { status: 'error', error: { message: 'initializeCart returned invalid payload' } }
    }

    const config = rawConfig as WooCommerceConfig
    $cart.set(rawCart)
    $shopConfig.set(config)
    return { status: 'ok', cart: rawCart, config }
  } catch (e) {
    return { status: 'error', error: { message: `Failed to initialize cart: ${e instanceof Error ? e.message : 'Unknown error'}` } }
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
 * @returns A promise resolving to a {@link CartResult} with the updated cart, or an error
 *
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
}: AddToCartArgs): Promise<CartResult> => {
  incrementLoadingState()
  try {
    const result = await callAction<{ cart: Cart }>('addToCart', {
      product_id: productId,
      quantity,
      variation_id: variationId,
      variation,
      cart_item_key: cartItemKey
    })
    return resolveCart(result, { clone: true })
  } catch (e) {
    return { status: 'error', error: { message: `Failed to add product ${productId} to cart: ${e instanceof Error ? e.message : 'Unknown error'}` } }
  } finally {
    decrementLoadingState()
  }
}

/**
 * Add multiple products to the cart in a single batch operation.
 * Allows adding multiple products at once with individual success/failure tracking.
 *
 * @param items - Array of items to add to cart
 * @returns A promise resolving to a {@link BatchCartResult} with per-item `results`
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
export const batchAddToCart = async ({ items }: BatchAddToCartArgs): Promise<BatchCartResult> => {
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

    return resolveBatch(result, { clone: true })
  } catch (e) {
    return { status: 'error', error: { message: `Failed to batch add ${items.length} items to cart: ${e instanceof Error ? e.message : 'Unknown error'}` } }
  } finally {
    decrementLoadingState()
  }
}

/**
 * Update a cart item's quantity and/or variation
 * Handles both simple and variable products
 *
 * @param args - Configuration for the cart item update
 * @returns A promise resolving to a {@link CartResult}
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
}: UpdateCartItemArgs): Promise<CartResult> => {
  incrementLoadingState()
  try {
    // If only updating quantity (simple or variable product)
    if (quantity && !variationId && !variation) {
      return await updateQuantity(cartItemKey, quantity)
    }

    // If updating variation or both quantity and variation
    const currentItem = $cart.get().items.find(item => item.key === cartItemKey)
    if (!currentItem) {
      return { status: 'error', error: { message: 'Cart item not found', code: 'item_not_found' } }
    }

    const result = await callAction<{ cart: Cart }>('updateCartItem', {
      cart_item_key: cartItemKey,
      product_id: currentItem.product_id,
      quantity: quantity ?? currentItem.quantity,
      variation_id: variationId,
      variation
    })

    return resolveCart(result)
  } catch (e) {
    return { status: 'error', error: { message: `Failed to update cart item ${cartItemKey}: ${e instanceof Error ? e.message : 'Unknown error'}` } }
  } finally {
    decrementLoadingState()
  }
}

/**
 * Remove an item from the cart.
 *
 * @param cartItemKey - The unique key of the cart item to remove
 * @returns A promise resolving to a {@link CartResult} with the updated cart
 * @example
 * ```ts
 * await removeFromCart('a123b456c789')
 * ```
 */
export const removeFromCart = async (cartItemKey: string): Promise<CartResult> => {
  incrementLoadingState()
  try {
    const result = await callAction<{ cart: Cart }>('removeFromCart', {
      cart_item_key: cartItemKey
    })
    return resolveCart(result)
  } catch (e) {
    return { status: 'error', error: { message: `Failed to remove cart item ${cartItemKey}: ${e instanceof Error ? e.message : 'Unknown error'}` } }
  } finally {
    decrementLoadingState()
  }
}

/**
 * Update the quantity of an item in the cart.
 *
 * @param cartItemKey - The unique key of the cart item to update
 * @param quantity - The new quantity to set (must be positive; zero removes the item)
 * @returns A promise resolving to a {@link CartResult}. A negative quantity yields an error
 * result with code `invalid_quantity` rather than throwing.
 * @example
 * ```ts
 * await updateQuantity('a123b456c789', 3)
 * ```
 */
export const updateQuantity = async (cartItemKey: string, quantity: number): Promise<CartResult> => {
  // Validation: quantity must not be negative
  if (quantity < 0) {
    return { status: 'error', error: { message: `Invalid quantity: ${quantity}. Quantity must be positive. Use removeFromCart() to remove items.`, code: 'invalid_quantity' } }
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
    return resolveCart(result)
  } catch (e) {
    return { status: 'error', error: { message: `Failed to update quantity for cart item ${cartItemKey}: ${e instanceof Error ? e.message : 'Unknown error'}` } }
  } finally {
    decrementLoadingState()
  }
}

/**
 * Fetch the current cart contents from the server.
 * Useful for refreshing the cart state or checking for changes.
 *
 * @returns A promise resolving to a {@link CartResult} with the current cart
 * @example
 * ```ts
 * await getCart()
 * ```
 */
export const getCart = async (): Promise<CartResult> => {
  incrementLoadingState()
  try {
    const result = await callAction<{ cart: Cart }>('getCartContents')
    return resolveCart(result)
  } catch (e) {
    return { status: 'error', error: { message: `Failed to fetch cart contents: ${e instanceof Error ? e.message : 'Unknown error'}` } }
  } finally {
    decrementLoadingState()
  }
}

/**
 * Clear all items from the cart.
 *
 * @returns A promise resolving to a {@link CartResult} with the emptied cart
 * @example
 * ```ts
 * await clearCart()
 * ```
 */
export const clearCart = async (): Promise<CartResult> => {
  incrementLoadingState()
  try {
    const result = await callAction<{ cart: Cart }>('clearCart')
    return resolveCart(result)
  } catch (e) {
    return { status: 'error', error: { message: `Failed to clear cart: ${e instanceof Error ? e.message : 'Unknown error'}` } }
  } finally {
    decrementLoadingState()
  }
}

/**
 * Apply a coupon code to the cart.
 *
 * @param couponCode - The coupon code to apply
 * @returns A promise resolving to a {@link CartResult} with the updated cart
 * @example
 * ```ts
 * await applyCoupon('SAVE20')
 * ```
 */
export const applyCoupon = async (couponCode: string): Promise<CartResult> => {
  incrementLoadingState()
  try {
    const result = await callAction<{ cart: Cart }>('applyCoupon', {
      coupon: couponCode
    })
    return resolveCart(result)
  } catch (e) {
    return { status: 'error', error: { message: `Failed to apply coupon '${couponCode}': ${e instanceof Error ? e.message : 'Unknown error'}` } }
  } finally {
    decrementLoadingState()
  }
}

/**
 * Remove a coupon from the cart.
 *
 * @param couponCode - The coupon code to remove
 * @returns A promise resolving to a {@link CartResult} with the updated cart
 * @example
 * ```ts
 * await removeCoupon('SAVE20')
 * ```
 */
export const removeCoupon = async (couponCode: string): Promise<CartResult> => {
  incrementLoadingState()
  try {
    const result = await callAction<{ cart: Cart }>('removeCoupon', {
      coupon: couponCode
    })
    return resolveCart(result)
  } catch (e) {
    return { status: 'error', error: { message: `Failed to remove coupon '${couponCode}': ${e instanceof Error ? e.message : 'Unknown error'}` } }
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
  if (
    typeof config.price_decimals === 'undefined' ||
    typeof config.decimal_separator === 'undefined' ||
    typeof config.thousand_separator === 'undefined' ||
    typeof config.currency_symbol === 'undefined' ||
    typeof config.currency_position === 'undefined'
  ) {
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
