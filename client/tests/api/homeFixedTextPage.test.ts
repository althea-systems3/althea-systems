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

import { GET } from "@/app/api/pages/texte-fixe-home/route"

function createRequest(locale: string) {
  return new NextRequest(
    `http://localhost:3000/api/pages/texte-fixe-home?locale=${locale}`,
    {
      method: "GET",
    },
  )
}

describe("GET /api/pages/texte-fixe-home", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key"
  })

  it("returns empty fallback payload when no row exists", async () => {
    mockSupabaseMaybeSingle.mockResolvedValue({ data: null, error: null })

    const response = await GET(createRequest("fr"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.slug).toBe("texte-fixe-home")
    expect(body.isFallbackData).toBe(true)
    expect(body.contentMarkdown).toBe("")
  })

  it("returns database payload when row exists", async () => {
    mockSupabaseMaybeSingle.mockResolvedValue({
      data: {
        slug: "texte-fixe-home",
        locale: "fr",
        titre: "Titre",
        contenu_markdown: "Texte",
        date_mise_a_jour: "2026-01-01T10:00:00.000Z",
      },
      error: null,
    })

    const response = await GET(createRequest("fr"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.isFallbackData).toBe(false)
    expect(body.title).toBe("Titre")
    expect(body.contentMarkdown).toBe("Texte")
  })

  it("returns fallback payload when Supabase is not configured", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    const response = await GET(createRequest("fr"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.isFallbackData).toBe(true)
    expect(body.contentMarkdown).toBe("")
  })
})
