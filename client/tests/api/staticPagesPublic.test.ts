import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mockSupabaseMaybeSingle = vi.fn()

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
    }),
  }),
}))

import { GET } from "@/app/api/static-pages/[slug]/route"

function createRequest(locale: string) {
  return new NextRequest(
    `http://localhost:3000/api/static-pages/cgu?locale=${locale}`,
    {
      method: "GET",
    },
  )
}

function createRouteContext(slug: string) {
  return {
    params: Promise.resolve({ slug }),
  }
}

describe("GET /api/static-pages/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key"
  })

  it("returns 404 for unknown slug", async () => {
    const response = await GET(
      createRequest("fr"),
      createRouteContext("unknown"),
    )

    expect(response.status).toBe(404)
  })

  it("returns fallback payload when row is missing", async () => {
    mockSupabaseMaybeSingle.mockResolvedValue({ data: null, error: null })

    const response = await GET(createRequest("fr"), createRouteContext("cgu"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.slug).toBe("cgu")
    expect(body.isFallbackData).toBe(true)
    expect(typeof body.contentMarkdown).toBe("string")
  })

  it("returns database payload when row exists", async () => {
    mockSupabaseMaybeSingle.mockResolvedValue({
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

    const response = await GET(createRequest("fr"), createRouteContext("cgu"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.isFallbackData).toBe(false)
    expect(body.title).toBe("CGU")
    expect(body.contentMarkdown).toBe("## Test")
  })
})
