import { atom, computed, map } from "nanostores"
import { Cart, WooCommerceConfig } from "./types"

/**
 * Cart state store.
 * Contains all cart data including items, totals, and shipping information.
 * Initialize with `initializeCart()` from './cart' on app mount.
 */
export const $cart = map<Cart>({
  items: [],
  subtotal: "0",
  total: "0",
  item_count: 0,
  tax_total: "0",
  needs_shipping: false,
  shipping_total: "0"
})

/**
 * Computed store for total number of items in cart.
 * Returns 0 if cart is not initialized.
 */
export const $cartItemsCount = computed($cart, cart => cart.item_count || 0)

/**
 * Computed store for cart total amount.
 * Returns "0" if cart is not initialized.
 */
export const $cartTotal = computed($cart, cart => cart.total || "0")

/**
 * Computed store for cart subtotal (before taxes and shipping).
 * Returns "0" if cart is not initialized.
 */
export const $cartSubtotal = computed($cart, cart => cart.subtotal || "0")

/**
 * Computed store for total tax amount.
 * Returns "0" if cart is not initialized.
 */
export const $cartTaxTotal = computed($cart, cart => cart.tax_total || "0")

/**
 * Computed store for total shipping cost.
 * Returns "0" if cart is not initialized.
 */
export const $cartShippingTotal = computed($cart, cart => cart.shipping_total || "0")

/**
 * Loading state indicator for cart operations.
 * Set to true during API calls, false when complete.
 */
export const $cartIsLoading = atom(false)

/**
 * Internal counter for tracking concurrent cart operations.
 * Prevents race conditions when multiple operations run simultaneously.
 * @internal
 */
let loadingOperationsCount = 0

/**
 * Increment the loading operations counter and set loading state to true.
 * Safe for concurrent operations - loading state remains true until all operations complete.
 * @internal
 */
export function incrementLoadingState(): void {
  loadingOperationsCount++
  if (loadingOperationsCount === 1) {
    $cartIsLoading.set(true)
  }
}

/**
 * Decrement the loading operations counter and set loading state to false when no operations remain.
 * Safe for concurrent operations - loading state only becomes false when ALL operations complete.
 * @internal
 */
export function decrementLoadingState(): void {
  loadingOperationsCount--
  if (loadingOperationsCount <= 0) {
    loadingOperationsCount = 0 // Safety: prevent negative counts
    $cartIsLoading.set(false)
  }
}

/**
 * WooCommerce shop configuration store.
 * Contains currency settings, tax configuration, and store URLs.
 * Initialized by `initializeCart()` from './cart' on app mount.
 *
 * IMPORTANT: This store starts empty. Always check for existence of properties
 * before accessing them, or call `initializeCart()` first.
 */
export const $shopConfig = map<Partial<WooCommerceConfig>>({})