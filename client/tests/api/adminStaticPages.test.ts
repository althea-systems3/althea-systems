import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mockVerifyAdminAccess = vi.fn()
const mockSupabaseMaybeSingle = vi.fn()
const mockSupabaseUpsertSingle = vi.fn()

vi.mock("@/lib/auth/adminGuard", () => ({
  verifyAdminAccess: () => mockVerifyAdminAccess(),
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => mockSupabaseMaybeSingle(),
          }),
        }),
      }),
      upsert: () => ({
        select: () => ({
          single: () => mockSupabaseUpsertSingle(),
        }),
      }),
    }),
  }),
}))

import { GET, PUT } from "@/app/api/admin/static-pages/[slug]/route"

function createRequest(method: "GET" | "PUT", body?: unknown) {
  return new NextRequest(
    "http://localhost:3000/api/admin/static-pages/cgu?locale=fr",
    {
      method,
      body: body ? JSON.stringify(body) : null,
      headers: body
        ? {
            "Content-Type": "application/json",
          }
        : undefined,
    },
  )
}

function createRouteContext(slug: string) {
  return {
    params: Promise.resolve({ slug }),
  }
}

describe("/api/admin/static-pages/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyAdminAccess.mockResolvedValue(null)
  })

  it("GET returns fallback defaults when no row exists", async () => {
    mockSupabaseMaybeSingle.mockResolvedValue({ data: null, error: null })

    const response = await GET(createRequest("GET"), createRouteContext("cgu"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.slug).toBe("cgu")
    expect(body.isFallbackData).toBe(true)
  })

  it("PUT validates title and markdown", async () => {
    const response = await PUT(
      createRequest("PUT", {
        locale: "fr",
        title: "",
        description: "",
        contentMarkdown: "",
      }),
      createRouteContext("cgu"),
    )

    expect(response.status).toBe(400)
  })

  it("PUT saves static page content", async () => {
    mockSupabaseUpsertSingle.mockResolvedValue({
      data: {
        slug: "cgu",
        locale: "fr",
        titre: "CGU",
        description: "Description",
        contenu_markdown: "## Test",
        date_mise_a_jour: "2026-01-01T10:00:00.000Z",
      },
      error: null,
    })

    const response = await PUT(
      createRequest("PUT", {
        locale: "fr",
        title: "CGU",
        description: "Description",
        contentMarkdown: "## Test",
      }),
      createRouteContext("cgu"),
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.isFallbackData).toBe(false)
    expect(body.slug).toBe("cgu")
    expect(body.title).toBe("CGU")
  })
})
