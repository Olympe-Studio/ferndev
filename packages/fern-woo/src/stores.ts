import { atom, computed, map } from "nanostores"
import { Cart, WooCommerceConfig } from "./types"

export const $cart = map<Cart>({
  items: [],
  subtotal: "0",
  total: "0",
  item_count: 0,
  tax_total: "0",
  needs_shipping: false,
  shipping_total: "0"
})

// Computed values
export const $cartItemsCount = computed($cart, cart => cart.item_count)
export const $cartTotal = computed($cart, cart => cart.total)
export const $cartSubtotal = computed($cart, cart => cart.subtotal)
export const $cartTaxTotal = computed($cart, cart => cart.tax_total)
export const $cartShippingTotal = computed($cart, cart => cart.shipping_total)

export const $cartIsLoading = atom(false)
export const $shopConfig = map<WooCommerceConfig>()