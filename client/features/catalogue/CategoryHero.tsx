"use client"

import { useState } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { CatalogueCategory } from "./catalogueTypes"

type CategoryHeroProps = {
  category: CatalogueCategory | null
  isLoading: boolean
  hasError: boolean
  isNotFound: boolean
}

function CategoryHeroImageFallback({ name }: { name: string }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-nav/90 to-brand-cta/80"
      aria-hidden="true"
    >
      <span className="heading-font text-5xl text-white sm:text-7xl">
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}

function CategoryHeroImage({ category }: { category: CatalogueCategory }) {
  const t = useTranslations("CataloguePage")
  const [hasImageLoadFailed, setHasImageLoadFailed] = useState(false)

  const hasImage = Boolean(category.imageUrl) && !hasImageLoadFailed

  if (!hasImage) {
    return <CategoryHeroImageFallback name={category.name} />
  }

  return (
    <Image
      src={category.imageUrl as string}
      alt={t("hero.imageAlt", { categoryName: category.name })}
      fill
      priority
      sizes="100vw"
      className="object-cover"
      onError={() => setHasImageLoadFailed(true)}
    />
  )
}

function CategoryHeroSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="h-48 w-full rounded-xl sm:h-64 md:h-72 lg:h-80" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-8 w-2/5" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    </div>
  )
}

export function CategoryHero({
  category,
  isLoading,
  hasError,
  isNotFound,
}: CategoryHeroProps) {
  const t = useTranslations("CataloguePage")

  if (isLoading) {
    return <CategoryHeroSkeleton />
  }

  if (isNotFound) {
    return (
      <div
        className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center"
        role="alert"
      >
        <p className="heading-font text-lg text-brand-nav">
          {t("hero.notFoundTitle")}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {t("hero.notFoundDescription")}
        </p>
      </div>
    )
  }

  if (hasError || !category) {
    return (
      <div
        className="rounded-xl border border-dashed border-red-200 bg-red-50/50 p-8 text-center"
        role="alert"
      >
        <p className="heading-font text-lg text-brand-nav">
          {t("hero.errorTitle")}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {t("hero.errorDescription")}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div
        className={cn(
          "relative h-48 w-full overflow-hidden rounded-xl bg-slate-100 sm:h-64 md:h-72 lg:h-80",
        )}
      >
        <CategoryHeroImage category={category} />

        <div
          className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent"
          aria-hidden="true"
        />

        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 md:p-8">
          <h1 className="heading-font text-2xl leading-tight text-white drop-shadow-md sm:text-3xl md:text-4xl">
            {category.name}
          </h1>
        </div>
      </div>

      {category.description ? (
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-700 sm:text-base">
          {category.description}
        </p>
      ) : null}
    </div>
  )
}
