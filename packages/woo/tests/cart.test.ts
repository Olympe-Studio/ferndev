import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import {
  addToCart,
  applyCoupon,
  batchAddToCart,
  updateQuantity,
  initializeCart,
  updateCartItem,
  removeFromCart,
  getCart,
  clearCart,
  removeCoupon,
} from "../src/cart"
import { $cart, $shopConfig } from "../src/stores"
import type { Cart, CartItem } from "../src/types"

const ORIGIN = "http://localhost"
const realFetch = globalThis.fetch

const EMPTY: Cart = {
  items: [], subtotal: "0", total: "0", item_count: 0,
  tax_total: "0", needs_shipping: false, shipping_total: "0", meta_data: {},
}

const SAMPLE: Cart = {
  items: [{ key: "k1" } as Cart["items"][number]],
  subtotal: "10", total: "12", item_count: 1,
  tax_total: "2", needs_shipping: false, shipping_total: "0", meta_data: {},
}

function browser(): void {
  // @ts-expect-error - stub browser globals for callAction
  globalThis.window = { location: { href: `${ORIGIN}/` }, origin: ORIGIN }
}

function respondJson(obj: unknown, status = 200): void {
  // @ts-expect-error - replace fetch with a JSON stub
  globalThis.fetch = () =>
    Promise.resolve(new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } }))
}

beforeEach(() => {
  browser()
  $cart.set({ ...EMPTY })
})

afterEach(() => {
  // @ts-expect-error - cleanup stub
  delete globalThis.window
  globalThis.fetch = realFetch
})

describe("addToCart", () => {
  test("success updates the store and returns the cart", async () => {
    respondJson({ cart: SAMPLE })
    const res = await addToCart({ productId: 1 })
    expect(res.status).toBe("ok")
    if (res.status === "ok") expect(res.cart.item_count).toBe(1)
    expect($cart.get().item_count).toBe(1)
  })

  test("business error surfaces with message + code and leaves the store untouched", async () => {
    respondJson({ status: "error", error: { message: "Out of stock", code: "out_of_stock" } })
    const res = await addToCart({ productId: 2 })
    expect(res.status).toBe("error")
    if (res.status === "error") {
      expect(res.error.message).toBe("Out of stock")
      expect(res.error.code).toBe("out_of_stock")
    }
    expect($cart.get().item_count).toBe(0)
  })

  test("transport error (HTTP 500) surfaces as an error result", async () => {
    respondJson({}, 500)
    const res = await addToCart({ productId: 3 })
    expect(res.status).toBe("error")
  })
})

describe("applyCoupon", () => {
  test("invalid coupon surfaces the backend message", async () => {
    respondJson({ status: "error", message: "Coupon does not exist" })
    const res = await applyCoupon("NOPE")
    expect(res.status).toBe("error")
    if (res.status === "error") expect(res.error.message).toBe("Coupon does not exist")
  })
})

describe("updateQuantity", () => {
  test("negative quantity returns an invalid_quantity error without calling the backend", async () => {
    respondJson({ cart: SAMPLE })
    const res = await updateQuantity("k1", -1)
    expect(res.status).toBe("error")
    if (res.status === "error") expect(res.error.code).toBe("invalid_quantity")
  })
})

describe("batchAddToCart", () => {
  test("full success returns ok with per-item results", async () => {
    respondJson({
      success: true,
      message: "",
      results: [{ index: 0, success: true, message: "", cart_item_key: "k1" }],
      cart: SAMPLE,
    })
    const res = await batchAddToCart({ items: [{ productId: 1 }] })
    expect(res.status).toBe("ok")
    if (res.status === "ok") expect(res.results.length).toBe(1)
    expect($cart.get().item_count).toBe(1)
  })

  test("partial failure returns error but preserves results and updates the cart", async () => {
    respondJson({
      success: false,
      message: "Some items failed",
      results: [{ index: 0, success: false, message: "oos", cart_item_key: null }],
      cart: SAMPLE,
    })
    const res = await batchAddToCart({ items: [{ productId: 1 }] })
    expect(res.status).toBe("error")
    if (res.status === "error") expect(res.results?.length).toBe(1)
    expect($cart.get().item_count).toBe(1)
  })

  test("transport error surfaces as an error result", async () => {
    respondJson({}, 500)
    const res = await batchAddToCart({ items: [{ productId: 1 }] })
    expect(res.status).toBe("error")
  })

  test("non-object payload → invalid response payload error", async () => {
    respondJson(5)
    const res = await batchAddToCart({ items: [{ productId: 1 }] })
    expect(res.status).toBe("error")
    if (res.status === "error") expect(res.error.message).toMatch(/Invalid response payload/)
  })

  test("success without a results array defaults results to []", async () => {
    respondJson({ success: true, cart: SAMPLE })
    const res = await batchAddToCart({ items: [{ productId: 1 }] })
    expect(res.status).toBe("ok")
    if (res.status === "ok") expect(res.results).toEqual([])
  })

  test("malformed cart with results → error carrying results", async () => {
    respondJson({
      success: true,
      results: [{ index: 0, success: false, message: "x", cart_item_key: null }],
      cart: { foo: 1 },
    })
    const res = await batchAddToCart({ items: [{ productId: 1 }] })
    expect(res.status).toBe("error")
    if (res.status === "error") expect(res.results?.length).toBe(1)
  })
})

describe("resolveCart branches (via addToCart)", () => {
  test("non-object payload → invalid response payload error", async () => {
    respondJson(5)
    const res = await addToCart({ productId: 1 })
    expect(res.status).toBe("error")
    if (res.status === "error") expect(res.error.message).toMatch(/Invalid response payload/)
  })

  test("missing cart → 'Response missing cart data'", async () => {
    respondJson({})
    const res = await addToCart({ productId: 1 })
    expect(res.status).toBe("error")
    if (res.status === "error") expect(res.error.message).toMatch(/missing cart data/)
  })

  test("malformed cart is merged with defaults and returned ok", async () => {
    respondJson({ cart: { foo: 1 } })
    const res = await addToCart({ productId: 1 })
    expect(res.status).toBe("ok")
    if (res.status === "ok") {
      expect(res.cart.item_count).toBe(0)
      expect(res.cart.items).toEqual([])
    }
  })

  test("business error without a message falls back to 'Unknown error'", async () => {
    respondJson({ status: "error" })
    const res = await addToCart({ productId: 1 })
    expect(res.status).toBe("error")
    if (res.status === "error") expect(res.error.message).toBe("Unknown error")
  })
})

describe("initializeCart", () => {
  const CONFIG = {
    currency: "USD",
    currency_symbol: "$",
    currency_position: "left",
    price_decimals: 2,
    decimal_separator: ".",
    thousand_separator: ",",
  }

  test("success stores cart + config and returns both", async () => {
    respondJson({ cart: SAMPLE, config: CONFIG })
    const res = await initializeCart()
    expect(res.status).toBe("ok")
    if (res.status === "ok") {
      expect(res.cart.item_count).toBe(1)
      expect(res.config.currency).toBe("USD")
    }
    expect($cart.get().item_count).toBe(1)
    expect($shopConfig.get().currency).toBe("USD")
  })

  test("transport error surfaces as error", async () => {
    respondJson({}, 500)
    const res = await initializeCart()
    expect(res.status).toBe("error")
  })

  test("invalid cart payload surfaces as error", async () => {
    respondJson({ cart: { bad: true }, config: CONFIG })
    const res = await initializeCart()
    expect(res.status).toBe("error")
    if (res.status === "error") expect(res.error.message).toMatch(/invalid payload/)
  })

  test("non-object config surfaces as error", async () => {
    respondJson({ cart: SAMPLE, config: "nope" })
    const res = await initializeCart()
    expect(res.status).toBe("error")
  })
})

describe("single-action success paths", () => {
  test("getCart returns the cart", async () => {
    respondJson({ cart: SAMPLE })
    const res = await getCart()
    expect(res.status).toBe("ok")
    if (res.status === "ok") expect(res.cart.item_count).toBe(1)
  })

  test("clearCart returns the emptied cart", async () => {
    respondJson({ cart: { ...EMPTY } })
    const res = await clearCart()
    expect(res.status).toBe("ok")
    if (res.status === "ok") expect(res.cart.item_count).toBe(0)
  })

  test("removeFromCart returns the cart", async () => {
    respondJson({ cart: { ...EMPTY } })
    const res = await removeFromCart("k1")
    expect(res.status).toBe("ok")
  })

  test("applyCoupon success returns the cart", async () => {
    respondJson({ cart: SAMPLE })
    const res = await applyCoupon("SAVE10")
    expect(res.status).toBe("ok")
  })

  test("removeCoupon returns the cart", async () => {
    respondJson({ cart: SAMPLE })
    const res = await removeCoupon("SAVE10")
    expect(res.status).toBe("ok")
  })
})

describe("updateQuantity delegation + positive path", () => {
  test("zero delegates to removeFromCart", async () => {
    respondJson({ cart: { ...EMPTY } })
    const res = await updateQuantity("k1", 0)
    expect(res.status).toBe("ok")
    if (res.status === "ok") expect(res.cart.item_count).toBe(0)
  })

  test("positive quantity updates the cart", async () => {
    respondJson({ cart: SAMPLE })
    const res = await updateQuantity("k1", 3)
    expect(res.status).toBe("ok")
    if (res.status === "ok") expect(res.cart.item_count).toBe(1)
  })
})

describe("updateCartItem paths", () => {
  test("quantity-only delegates to updateQuantity", async () => {
    respondJson({ cart: SAMPLE })
    const res = await updateCartItem({ cartItemKey: "k1", quantity: 2 })
    expect(res.status).toBe("ok")
  })

  test("variation path with the item present calls the action", async () => {
    $cart.set({
      ...EMPTY,
      items: [{ key: "k1", product_id: 10, quantity: 1 } as CartItem],
      item_count: 1,
    })
    respondJson({ cart: SAMPLE })
    const res = await updateCartItem({ cartItemKey: "k1", variationId: 5, variation: { size: "L" } })
    expect(res.status).toBe("ok")
  })

  test("item not found returns an item_not_found error", async () => {
    $cart.set({ ...EMPTY })
    respondJson({ cart: SAMPLE })
    const res = await updateCartItem({ cartItemKey: "missing", variationId: 5, variation: { size: "L" } })
    expect(res.status).toBe("error")
    if (res.status === "error") expect(res.error.code).toBe("item_not_found")
  })
})
