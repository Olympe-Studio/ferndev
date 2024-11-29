import { callAction } from "@ferndev/core"
import { $cart, $cartIsLoading, $shopConfig } from "./stores"
import { AddToCartArgs, Cart, InitialStateResponse, UpdateCartItemArgs } from "./types"

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
  $cartIsLoading.set(true)
  try {
    const result = await callAction<InitialStateResponse>('getInitialState')
    if (result.status === 'ok' && result.data) {
      $cart.set(result.data.cart)
      $shopConfig.set(result.data.config)
    }
    return result
  } finally {
    $cartIsLoading.set(false)
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
  $cartIsLoading.set(true)
  try {
    const result = await callAction<{ cart: Cart }>('addToCart', {
      product_id: productId,
      quantity,
      variation_id: variationId,
      variation,
      cart_item_key: cartItemKey
    })
    if (result.status === 'ok' && result.data) {
      $cart.set(JSON.parse(JSON.stringify(result.data.cart)))
    }

    $cartIsLoading.set(false)
    return result
  } catch (e) {
    $cartIsLoading.set(false)
    throw e
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
  $cartIsLoading.set(true)
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

    if (result.status === 'ok' && result.data) {
      $cart.set(result.data.cart)
    }

    $cartIsLoading.set(false)
    return result
  } catch (e) {
    $cartIsLoading.set(false)
    throw e
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
  $cartIsLoading.set(true)
  try {
    const result = await callAction<{ cart: Cart }>('removeFromCart', {
      cart_item_key: cartItemKey
    })
    if (result.status === 'ok' && result.data) {
      $cart.set(result.data.cart)
    }

    $cartIsLoading.set(false)
    return result
  } catch (e) {
    $cartIsLoading.set(false)
    throw e
  }
}

/**
 * Update the quantity of an item in the cart.
 *
 * @param cartItemKey - The unique key of the cart item to update
 * @param quantity - The new quantity to set
 * @returns A promise that resolves to the action result containing updated cart
 * @example
 * ```ts
 * await updateQuantity('a123b456c789', 3)
 * ```
 */
export const updateQuantity = async (cartItemKey: string, quantity: number) => {
  $cartIsLoading.set(true)
  try {
    const result = await callAction<{ cart: Cart }>('updateCartItemQuantity', {
      cart_item_key: cartItemKey,
      quantity
    })
    if (result.status === 'ok' && result.data) {
      $cart.set(result.data.cart)
    }

    $cartIsLoading.set(false)
    return result
  } catch (e) {
    $cartIsLoading.set(false)
    throw e
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
  $cartIsLoading.set(true)
  try {
    const result = await callAction<{ cart: Cart }>('getCartContents')
    if (result.status === 'ok' && result.data) {
      $cart.set(result.data.cart)
    }

    $cartIsLoading.set(false)
    return result
  } catch (e) {
    $cartIsLoading.set(false)
    throw e
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
  $cartIsLoading.set(true)
  try {
    const result = await callAction<{ cart: Cart }>('clearCart')
    if (result.status === 'ok' && result.data) {
      $cart.set(result.data.cart)
    }

    $cartIsLoading.set(false)
    return result
  } catch (e) {
    $cartIsLoading.set(false)
    throw e
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
  $cartIsLoading.set(true)
  try {
    const result = await callAction<{ cart: Cart }>('applyCoupon', {
      coupon: couponCode
    })
    if (result.status === 'ok' && result.data) {
      $cart.set(result.data.cart)
    }

    $cartIsLoading.set(false)
    return result
  } catch (e) {
    $cartIsLoading.set(false)
    throw e
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
  $cartIsLoading.set(true)
  try {
    const result = await callAction<{ cart: Cart }>('removeCoupon', {
      coupon: couponCode
    })
    if (result.status === 'ok' && result.data) {
      $cart.set(result.data.cart)
    }

    $cartIsLoading.set(false)
    return result
  } catch (e) {
    $cartIsLoading.set(false)
    throw e
  }
}