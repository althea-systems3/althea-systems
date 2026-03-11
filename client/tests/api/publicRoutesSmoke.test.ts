import { describe, expect, it } from "vitest"

import { GET as getCarouselRoute } from "@/app/api/carousel/route"
import { GET as getCategoriesRoute } from "@/app/api/categories/route"
import { GET as getHealthRoute } from "@/app/api/health/route"
import { GET as getTopProductsRoute } from "@/app/api/top-products/route"

describe("Public API routes smoke tests", () => {
  it("returns an ok status for health route", async () => {
    const response = await getHealthRoute()
    const responseBody = await response.json()

    expect(response.status).toBe(200)
    expect(responseBody).toEqual({ status: "ok" })
  })

  it("returns at least one slide in carousel route", async () => {
    const response = await getCarouselRoute()
    const responseBody = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(responseBody.slides)).toBe(true)
    expect(responseBody.slides.length).toBeGreaterThan(0)
    expect(responseBody.slides[0]).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      imageUrl: expect.any(String),
    })
  })

  it("returns category payload for categories route", async () => {
    const response = await getCategoriesRoute()
    const responseBody = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(responseBody.categories)).toBe(true)
    expect(responseBody.categories.length).toBeGreaterThan(0)
    expect(typeof responseBody.isFallbackData).toBe("boolean")
    expect(responseBody.categories[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      slug: expect.any(String),
    })
  })

  it("returns top product payload for top-products route", async () => {
    const response = await getTopProductsRoute()
    const responseBody = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(responseBody.products)).toBe(true)
    expect(responseBody.products.length).toBeGreaterThan(0)
    expect(typeof responseBody.isFallbackData).toBe("boolean")
    expect(responseBody.products[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      slug: expect.any(String),
      displayOrder: expect.any(Number),
      isAvailable: expect.any(Boolean),
    })
  })
})
