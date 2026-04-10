import { afterEach, describe, expect, it, vi } from "vitest"

import { buildSecureRequestInit, secureFetch } from "@/lib/http/secureFetch"

describe("secureFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.cookie =
      "csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"
  })

  it("applies secure defaults for mutating requests", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }))

    await secureFetch("/api/test", {
      method: "POST",
      body: JSON.stringify({ ping: true }),
    })

    expect(fetchSpy).toHaveBeenCalledOnce()

    const [, requestInit] = fetchSpy.mock.calls[0]
    const headers = new Headers(requestInit?.headers)

    expect(requestInit?.credentials).toBe("same-origin")
    expect(requestInit?.cache).toBe("no-store")
    expect(headers.get("X-Requested-With")).toBe("XMLHttpRequest")
    expect(headers.get("Content-Type")).toBe("application/json")
  })

  it("forwards csrf token from cookies on mutating requests", async () => {
    document.cookie = "csrf_token=test-token; path=/"

    const requestInit = buildSecureRequestInit({
      method: "PATCH",
      body: JSON.stringify({ ok: true }),
    })

    const headers = new Headers(requestInit.headers)

    expect(headers.get("X-CSRF-Token")).toBe("test-token")
  })

  it("does not force json content type for form data payloads", () => {
    const formData = new FormData()
    formData.set("file", "value")

    const requestInit = buildSecureRequestInit({
      method: "POST",
      body: formData,
    })

    const headers = new Headers(requestInit.headers)

    expect(headers.get("Content-Type")).toBeNull()
  })
})
