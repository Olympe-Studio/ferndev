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
export const $cartItemsCount = computed($cart, cart => cart?.item_count || 0)
export const $cartTotal = computed($cart, cart => cart?.total || "0")
export const $cartSubtotal = computed($cart, cart => cart?.subtotal || "0")
export const $cartTaxTotal = computed($cart, cart => cart?.tax_total || "0")
export const $cartShippingTotal = computed($cart, cart => cart?.shipping_total || "0")

export const $cartIsLoading = atom(false)
export const $shopConfig = map<WooCommerceConfig>()