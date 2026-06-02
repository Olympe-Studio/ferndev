import { test, expect, describe, beforeEach, afterEach } from "bun:test"
import { addToCart, batchAddToCart, initializeCart, formatPrice } from "../src/cart"
import { $shopConfig } from "../src/stores"

const ORIGIN = "http://localhost"
const realFetch = globalThis.fetch

function browser(): void {
  // @ts-expect-error - stub browser globals
  globalThis.window = { location: { href: `${ORIGIN}/` }, origin: ORIGIN }
}

function respondRaw(json: string, status = 200): void {
  // @ts-expect-error - fetch stub returning a raw JSON string (so we control exact keys)
  globalThis.fetch = () =>
    Promise.resolve(new Response(json, { status, headers: { "content-type": "application/json" } }))
}

beforeEach(() => {
  browser()
})

afterEach(() => {
  // @ts-expect-error - cleanup
  delete globalThis.window
  globalThis.fetch = realFetch
})

// Security invariant: a malicious/compromised backend response must not be able to pollute
// Object.prototype through the cart-response handling (spread-merge + structured clone).
describe("security: prototype pollution resistance", () => {
  const PROBE = "__pp_probe__"

  afterEach(() => {
    // ensure no test leaves the global prototype dirty
    delete (Object.prototype as Record<string, unknown>)[PROBE]
  })

  test("addToCart with a malformed cart carrying __proto__ does not pollute", async () => {
    respondRaw(`{"cart": {"__proto__": {"${PROBE}": "polluted"}}}`)
    await addToCart({ productId: 1 })
    expect(({} as Record<string, unknown>)[PROBE]).toBeUndefined()
  })

  test("addToCart with a constructor.prototype payload does not pollute", async () => {
    respondRaw(
      `{"cart": {"items": [], "item_count": 0, "constructor": {"prototype": {"${PROBE}": "polluted"}}}}`,
    )
    await addToCart({ productId: 1 })
    expect(({} as Record<string, unknown>)[PROBE]).toBeUndefined()
  })

  test("a valid cart carrying __proto__ does not pollute after the structured clone", async () => {
    respondRaw(`{"cart": {"items": [], "item_count": 0, "__proto__": {"${PROBE}": "x"}}}`)
    const res = await addToCart({ productId: 1 })
    expect(res.status).toBe("ok")
    expect(({} as Record<string, unknown>)[PROBE]).toBeUndefined()
  })

  test("initializeCart with a malicious config does not pollute", async () => {
    respondRaw(
      `{"cart": {"items": [], "item_count": 0}, "config": {"currency": "USD", "__proto__": {"${PROBE}": "x"}}}`,
    )
    await initializeCart()
    expect(({} as Record<string, unknown>)[PROBE]).toBeUndefined()
  })

  test("batchAddToCart with a malicious cart does not pollute", async () => {
    respondRaw(
      `{"success": true, "results": [], "cart": {"items": [], "item_count": 0, "__proto__": {"${PROBE}": "x"}}}`,
    )
    await batchAddToCart({ items: [{ productId: 1 }] })
    expect(({} as Record<string, unknown>)[PROBE]).toBeUndefined()
  })
})

// Security invariant: formatPrice runs a grouping regex; it must stay linear/bounded on
// extreme numeric input (no catastrophic backtracking / ReDoS).
describe("security: formatPrice has no ReDoS", () => {
  beforeEach(() => {
    $shopConfig.set({
      price_decimals: 2,
      decimal_separator: ".",
      thousand_separator: ",",
      currency_symbol: "$",
      currency_position: "left",
    })
  })

  test("formats an extreme magnitude within a tight time bound", () => {
    const start = performance.now()
    const out = formatPrice(Number.MAX_SAFE_INTEGER)
    const elapsed = performance.now() - start
    expect(typeof out).toBe("string")
    expect(elapsed).toBeLessThan(50)
  })
})
