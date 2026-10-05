import { test, expect, describe, beforeEach } from "bun:test"
import {
  $cart,
  $cartItemsCount,
  $cartTotal,
  $cartSubtotal,
  $cartTaxTotal,
  $cartShippingTotal,
  $cartIsLoading,
  incrementLoadingState,
  decrementLoadingState,
} from "../src/stores"
import * as woo from "../src/index"
import type { Cart } from "../src/types"

const FILLED: Cart = {
  items: [],
  subtotal: "10",
  total: "12",
  item_count: 3,
  tax_total: "2",
  needs_shipping: true,
  shipping_total: "5",
  meta_data: {},
}

describe("computed cart stores", () => {
  beforeEach(() => {
    $cart.set({ ...FILLED })
  })

  test("each computed store derives its value from $cart", () => {
    expect($cartItemsCount.get()).toBe(3)
    expect($cartTotal.get()).toBe("12")
    expect($cartSubtotal.get()).toBe("10")
    expect($cartTaxTotal.get()).toBe("2")
    expect($cartShippingTotal.get()).toBe("5")
  })
})

describe("loading-state counter", () => {
  beforeEach(() => {
    // Drain any residual counter to a known baseline (decrement clamps at zero).
    for (let i = 0; i < 5; i++) decrementLoadingState()
  })

  test("first increment sets loading; a balanced decrement clears it", () => {
    incrementLoadingState()
    expect($cartIsLoading.get()).toBe(true)
    decrementLoadingState()
    expect($cartIsLoading.get()).toBe(false)
  })

  test("nested operations keep loading true until all complete", () => {
    incrementLoadingState()
    incrementLoadingState() // 1 -> 2: the `=== 1` false branch, stays true
    expect($cartIsLoading.get()).toBe(true)
    decrementLoadingState() // 2 -> 1: still loading
    expect($cartIsLoading.get()).toBe(true)
    decrementLoadingState() // 1 -> 0: cleared
    expect($cartIsLoading.get()).toBe(false)
  })

  test("decrementing below zero is clamped and stays not-loading", () => {
    decrementLoadingState() // already 0 -> hits the `<= 0` safety reset
    expect($cartIsLoading.get()).toBe(false)
  })
})

describe("package barrel (src/index.ts)", () => {
  test("re-exports the public API", () => {
    expect(typeof woo.addToCart).toBe("function")
    expect(typeof woo.formatPrice).toBe("function")
    expect(woo.$cart).toBeDefined()
  })
})
