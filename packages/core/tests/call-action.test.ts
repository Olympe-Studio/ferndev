import { test, expect, describe, afterEach } from "bun:test"
import { callAction, defineAction, isOk, isErr } from "../index"

const ORIGIN = "http://localhost"
const realFetch = globalThis.fetch

function browser(href = `${ORIGIN}/page`, origin = ORIGIN): void {
  // @ts-expect-error - stubbing the browser global for the same-origin / fetch guards
  globalThis.window = { location: { href }, origin }
}

afterEach(() => {
  // @ts-expect-error - clean up the stubbed global between tests
  delete globalThis.window
  globalThis.fetch = realFetch
})

function respond(body: BodyInit, init?: ResponseInit): { calls: RequestInit[] } {
  const calls: RequestInit[] = []
  // @ts-expect-error - replacing fetch with a stub
  globalThis.fetch = (_url: string, opts: RequestInit) => {
    calls.push(opts)
    return Promise.resolve(new Response(body, init))
  }
  return { calls }
}

const JSON_HEADERS = { headers: { "content-type": "application/json" } }

describe("callAction", () => {
  test("builds a JSON body with action + nonce in both places", async () => {
    browser()
    const spy = respond(JSON.stringify({ ok: true }), { status: 200, ...JSON_HEADERS })

    const res = await callAction<{ ok: boolean }>("addToCart", { product_id: 1 }, "nonce123")

    expect(res.status).toBe("ok")
    expect(isOk(res)).toBe(true)
    if (isOk(res)) expect(res.data.ok).toBe(true)

    const init = spy.calls[0]!
    const body = JSON.parse(init.body as string) as Record<string, unknown>
    expect(body).toEqual({
      action: "addToCart",
      args: { product_id: 1, _nonce: "nonce123" },
      _nonce: "nonce123",
    })
    const headers = init.headers as Record<string, string>
    expect(headers["Content-Type"]).toBe("application/json")
    expect(headers["X-Fern-Action"]).toBe("")
  })

  test("FormData carries action + nonce at top level and in args", async () => {
    browser()
    const spy = respond("ok", { status: 200 })

    const fd = new FormData()
    fd.append("file", "x")
    const res = await callAction("upload", fd, "n1")

    expect(res.status).toBe("ok")
    const sent = spy.calls[0]!.body as FormData
    expect(sent.get("action")).toBe("upload")
    expect(sent.get("_nonce")).toBe("n1")
    expect(sent.get("args[_nonce]")).toBe("n1")
  })

  test("errors with 400 outside the browser", async () => {
    const res = await callAction("x")
    expect(isErr(res)).toBe(true)
    if (isErr(res)) expect(res.error.status).toBe(400)
  })

  test("preserves HTTP error status", async () => {
    browser()
    respond("nope", { status: 500 })
    const res = await callAction("x")
    expect(isErr(res)).toBe(true)
    if (isErr(res)) expect(res.error.status).toBe(500)
  })

  test("maps an aborted request to 408", async () => {
    browser()
    // @ts-expect-error - reject with an AbortError-shaped error
    globalThis.fetch = () => {
      const e = new Error("aborted")
      e.name = "AbortError"
      return Promise.reject(e)
    }
    const res = await callAction("x", {}, "", { timeout: 5 })
    expect(isErr(res)).toBe(true)
    if (isErr(res)) expect(res.error.status).toBe(408)
  })

  test("aborts via the real timeout timer when fetch hangs", async () => {
    browser()
    // @ts-expect-error - fetch that only settles when the abort signal fires
    globalThis.fetch = (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          const e = new Error("The operation was aborted")
          e.name = "AbortError"
          reject(e)
        })
      })
    const res = await callAction("slow", {}, "", { timeout: 5 })
    expect(isErr(res)).toBe(true)
    if (isErr(res)) expect(res.error.status).toBe(408)
  })

  test("a non-Error rejection falls back to 'Request failed' / 500", async () => {
    browser()
    // @ts-expect-error - reject with a non-Error value
    globalThis.fetch = () => Promise.reject("boom-string")
    const res = await callAction("x")
    expect(isErr(res)).toBe(true)
    if (isErr(res)) {
      expect(res.error.status).toBe(500)
      expect(res.error.message).toBe("Request failed")
    }
  })

  test("omits the nonce from the JSON body when none is given", async () => {
    browser()
    const spy = respond(JSON.stringify({}), { status: 200, ...JSON_HEADERS })
    await callAction("noNonce", { a: 1 })
    const body = JSON.parse(spy.calls[0]!.body as string) as Record<string, unknown>
    expect(body).toEqual({ action: "noNonce", args: { a: 1 }, _nonce: "" })
  })

  test("works with action only (omitted args, nonce and options)", async () => {
    browser()
    const spy = respond(JSON.stringify({ ok: 1 }), { status: 200, ...JSON_HEADERS })
    const res = await callAction("ping")
    expect(res.status).toBe("ok")
    const body = JSON.parse(spy.calls[0]!.body as string) as Record<string, unknown>
    expect(body).toEqual({ action: "ping", args: {}, _nonce: "" })
  })

  test("FormData without a nonce omits the nonce fields", async () => {
    browser()
    const spy = respond("ok", { status: 200 })
    const fd = new FormData()
    fd.append("k", "v")
    await callAction("up", fd)
    const sent = spy.calls[0]!.body as FormData
    expect(sent.get("action")).toBe("up")
    expect(sent.get("_nonce")).toBeNull()
    expect(sent.get("args[_nonce]")).toBeNull()
  })
})

describe("isOk / isErr", () => {
  test("discriminate both branches", () => {
    const ok = { status: "ok", data: 1 } as const
    const err = { status: "error", error: { message: "no" } } as const
    expect(isOk(ok)).toBe(true)
    expect(isErr(ok)).toBe(false)
    expect(isErr(err)).toBe(true)
    expect(isOk(err)).toBe(false)
  })
})

describe("defineAction", () => {
  test("forwards action name, args and nonce to callAction", async () => {
    browser()
    const spy = respond(JSON.stringify({ value: 42 }), { status: 200, ...JSON_HEADERS })

    const getThing = defineAction<{ id: number }, { value: number }>("getThing")
    const res = await getThing({ id: 7 }, "nonceX")

    expect(res.status).toBe("ok")
    if (isOk(res)) expect(res.data.value).toBe(42)

    const body = JSON.parse(spy.calls[0]!.body as string) as Record<string, unknown>
    expect(body.action).toBe("getThing")
    expect(body.args).toEqual({ id: 7, _nonce: "nonceX" })
  })
})
