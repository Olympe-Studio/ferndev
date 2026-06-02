import { test, expect, describe, afterAll, mock } from "bun:test"
import * as core from "@ferndev/core"
import {
  initializeCart,
  addToCart,
  batchAddToCart,
  updateCartItem,
  updateQuantity,
  removeFromCart,
  getCart,
  clearCart,
  applyCoupon,
  removeCoupon,
} from "../src/cart"
import { $cart } from "../src/stores"
import type { Cart, CartItem } from "../src/types"

// Snapshot the real exports as plain value refs (not live bindings) so we can restore them.
const realCore = {
  callAction: core.callAction,
  defineAction: core.defineAction,
  isOk: core.isOk,
  isErr: core.isErr,
}

afterAll(() => {
  // Restore so the rejecting callAction does not leak into other test files.
  mock.module("@ferndev/core", () => realCore)
})

describe("cart action catch blocks (callAction rejects)", () => {
  test("every action returns a contextual error result", async () => {
    mock.module("@ferndev/core", () => ({
      ...realCore,
      callAction: () => Promise.reject(new Error("network down")),
    }))

    // updateCartItem must reach its own try/catch — seed an item so the variation path runs.
    $cart.set({
      items: [{ key: "k1", product_id: 10, quantity: 1 } as CartItem],
      subtotal: "0",
      total: "0",
      item_count: 1,
      tax_total: "0",
      needs_shipping: false,
      shipping_total: "0",
      meta_data: {},
    } as Cart)

    const results = await Promise.all([
      initializeCart(),
      addToCart({ productId: 1 }),
      batchAddToCart({ items: [{ productId: 1 }] }),
      updateCartItem({ cartItemKey: "k1", variationId: 5, variation: { size: "L" } }),
      updateQuantity("k1", 2),
      removeFromCart("k1"),
      getCart(),
      clearCart(),
      applyCoupon("X"),
      removeCoupon("X"),
    ])

    expect(results).toHaveLength(10)
    for (const res of results) {
      expect(res.status).toBe("error")
    }
  })
})
