import { test, expect, describe, afterEach } from "bun:test"
import { formatPrice } from "../src/cart"
import { $shopConfig } from "../src/stores"
import type { WooCommerceConfig } from "../src/types"

const BASE: Partial<WooCommerceConfig> = {
  price_decimals: 2,
  decimal_separator: ".",
  thousand_separator: ",",
  currency_symbol: "$",
  currency_position: "left",
}

function setConfig(over: Partial<WooCommerceConfig> = {}): void {
  $shopConfig.set({ ...BASE, ...over })
}

afterEach(() => {
  $shopConfig.set({})
})

describe("formatPrice", () => {
  test("left position with USD defaults", () => {
    setConfig()
    expect(formatPrice(1234.56)).toBe("$1,234.56")
  })

  test("right_space with EUR separators", () => {
    setConfig({
      currency_symbol: "€",
      currency_position: "right_space",
      decimal_separator: ",",
      thousand_separator: " ",
    })
    expect(formatPrice(1234.5)).toBe("1 234,50 €")
  })

  test("right position", () => {
    setConfig({ currency_position: "right" })
    expect(formatPrice(9.9)).toBe("9.90$")
  })

  test("left_space position", () => {
    setConfig({ currency_position: "left_space" })
    expect(formatPrice(5)).toBe("$ 5.00")
  })

  test("negative values keep the sign outside the symbol", () => {
    setConfig()
    expect(formatPrice(-10)).toBe("-$10.00")
  })

  test("zero decimals", () => {
    setConfig({ price_decimals: 0 })
    expect(formatPrice(1999)).toBe("$1,999")
  })

  test("falls back to left placement for an unknown currency_position", () => {
    setConfig({ currency_position: "diagonal" as WooCommerceConfig["currency_position"] })
    expect(formatPrice(5)).toBe("$5.00")
  })

  test("throws when shop config is not initialized", () => {
    $shopConfig.set({})
    expect(() => formatPrice(1)).toThrow(/not initialized/)
  })
})
