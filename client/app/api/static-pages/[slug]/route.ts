import { NextRequest, NextResponse } from "next/server"

import {
  getPublicStaticPageContent,
  STATIC_PAGE_REVALIDATE_SECONDS,
} from "@/lib/static-pages/publicContent"
import { isStaticPageSlug } from "@/lib/static-pages/staticPages"

type RouteContext = {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { slug } = await params

  if (!isStaticPageSlug(slug)) {
    return NextResponse.json(
      { error: "Page statique introuvable." },
      { status: 404 },
    )
  }

  const payload = await getPublicStaticPageContent({
    slug,
    localeInput: request.nextUrl.searchParams.get("locale"),
  })

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": `public, s-maxage=${STATIC_PAGE_REVALIDATE_SECONDS}, stale-while-revalidate=${STATIC_PAGE_REVALIDATE_SECONDS * 2}`,
    },
  })
}
