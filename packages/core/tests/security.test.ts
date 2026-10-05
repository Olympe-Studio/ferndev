import { test, expect, describe, afterEach } from "bun:test"
import { callAction } from "../index"

const ORIGIN = "http://localhost"
const realFetch = globalThis.fetch

function browser(href = `${ORIGIN}/page`): void {
  // @ts-expect-error - stub browser globals
  globalThis.window = { location: { href }, origin: ORIGIN }
}

afterEach(() => {
  // @ts-expect-error - cleanup
  delete globalThis.window
  globalThis.fetch = realFetch
})

function capture(): { url: unknown; init: RequestInit }[] {
  const calls: { url: unknown; init: RequestInit }[] = []
  // @ts-expect-error - replace fetch with a capturing stub
  globalThis.fetch = (url: unknown, init: RequestInit) => {
    calls.push({ url, init })
    return Promise.resolve(
      new Response("{}", { status: 200, headers: { "content-type": "application/json" } }),
    )
  }
  return calls
}

// Security invariant: CSRF protection depends entirely on the WordPress nonce being
// transmitted. A refactor that drops it would silently disable CSRF protection.
describe("security: CSRF nonce is always transmitted", () => {
  test("JSON body carries the nonce at top level and inside args", async () => {
    browser()
    const calls = capture()
    await callAction("doThing", { x: 1 }, "csrf-nonce-123")
    const body = JSON.parse(calls[0]!.init.body as string) as Record<string, unknown>
    expect(body._nonce).toBe("csrf-nonce-123")
    expect((body.args as Record<string, unknown>)._nonce).toBe("csrf-nonce-123")
  })

  test("FormData carries the nonce at top level and inside args", async () => {
    browser()
    const calls = capture()
    const fd = new FormData()
    fd.append("f", "v")
    await callAction("upload", fd, "csrf-nonce-456")
    const sent = calls[0]!.init.body as FormData
    expect(sent.get("_nonce")).toBe("csrf-nonce-456")
    expect(sent.get("args[_nonce]")).toBe("csrf-nonce-456")
  })

  test("the X-Fern-Action header is always present (custom-header CSRF signal)", async () => {
    browser()
    const calls = capture()
    await callAction("x", {}, "n")
    const headers = calls[0]!.init.headers as Record<string, string>
    expect("X-Fern-Action" in headers).toBe(true)
  })
})

// Security invariant: the request must target the current document (same-origin); it must
// never be sent to an attacker-influenced or external URL.
describe("security: requests are same-origin", () => {
  test("fetch targets the current document URL", async () => {
    browser("http://localhost/current-page")
    const calls = capture()
    await callAction("x", {}, "n")
    expect(calls[0]!.url).toBe("http://localhost/current-page")
  })

  test("never issues a request from a non-browser context", async () => {
    // no window stub -> must short-circuit before any fetch
    let fetched = false
    // @ts-expect-error - tripwire fetch
    globalThis.fetch = () => {
      fetched = true
      return Promise.resolve(new Response("{}"))
    }
    const res = await callAction("x")
    expect(res.status).toBe("error")
    expect(fetched).toBe(false)
  })
})
