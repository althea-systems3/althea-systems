import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"

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

import { GET, PUT } from "@/app/api/admin/pages/texte-fixe-home/route"

function createRequest(method: "GET" | "PUT", body?: unknown) {
  return new NextRequest(
    "http://localhost:3000/api/admin/pages/texte-fixe-home?locale=fr",
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

describe("/api/admin/pages/texte-fixe-home", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyAdminAccess.mockResolvedValue(null)
  })

  it("GET returns fallback payload when no row exists", async () => {
    mockSupabaseMaybeSingle.mockResolvedValue({ data: null, error: null })

    const response = await GET(createRequest("GET"))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.slug).toBe("texte-fixe-home")
    expect(body.isFallbackData).toBe(true)
  })

  it("PUT saves home fixed text content", async () => {
    mockSupabaseUpsertSingle.mockResolvedValue({
      data: {
        slug: "texte-fixe-home",
        locale: "fr",
        titre: "Informations importantes",
        contenu_markdown: "**Message**",
        date_mise_a_jour: "2026-01-01T10:00:00.000Z",
      },
      error: null,
    })

    const response = await PUT(
      createRequest("PUT", {
        locale: "fr",
        title: "Informations importantes",
        contentMarkdown: "**Message**",
      }),
    )

    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.isFallbackData).toBe(false)
    expect(body.slug).toBe("texte-fixe-home")
    expect(body.title).toBe("Informations importantes")
  })

  it("returns denied response when admin check fails", async () => {
    mockVerifyAdminAccess.mockResolvedValue(
      NextResponse.json(
        {
          error: "Non autorise",
        },
        {
          status: 401,
        },
      ),
    )

    const response = await GET(createRequest("GET"))
    expect(response.status).toBe(401)
  })
})
