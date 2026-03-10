"use client"

import { useState } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import type { HomeCategory } from "./categoryGridTypes"
import { getCategoryPagePath } from "./categoryGridUtils"

type HomeCategoryCardProps = {
  homeCategory: HomeCategory
}

function HomeCategoryCardImage({ homeCategory }: HomeCategoryCardProps) {
  const translateHomeCategoryGrid = useTranslations("HomeCategoryGrid")
  const [hasImageLoadFailed, setHasImageLoadFailed] = useState(false)

  const hasImage = Boolean(homeCategory.imageUrl) && !hasImageLoadFailed

  if (!hasImage) {
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-nav/90 to-brand-cta/80"
        aria-hidden="true"
      >
        <span className="heading-font text-3xl text-white">
          {homeCategory.name.charAt(0).toUpperCase()}
        </span>
      </div>
    )
  }

  return (
    <Image
      src={homeCategory.imageUrl as string}
      alt={translateHomeCategoryGrid("categoryImageAlt", {
        categoryName: homeCategory.name,
      })}
      fill
      loading="lazy"
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
      className="object-cover transition-transform duration-300 group-hover:scale-105 group-focus-visible:scale-105"
      onError={() => {
        setHasImageLoadFailed(true)
      }}
    />
  )
}

export function HomeCategoryCard({ homeCategory }: HomeCategoryCardProps) {
  const translateHomeCategoryGrid = useTranslations("HomeCategoryGrid")
  const categoryPagePath = getCategoryPagePath(homeCategory.slug)

  return (
    <li>
      <Link
        href={categoryPagePath}
        className={cn(
          "group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
          "transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-cta/50 hover:shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta focus-visible:ring-offset-2",
        )}
        aria-label={translateHomeCategoryGrid("categoryLinkLabel", {
          categoryName: homeCategory.name,
        })}
      >
        <article>
          <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
            <HomeCategoryCardImage homeCategory={homeCategory} />
            <div
              className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent"
              aria-hidden="true"
            />
          </div>
          <div className="p-4">
            <h3 className="heading-font min-h-[3rem] break-words text-base leading-snug text-brand-nav sm:text-lg">
              {homeCategory.name}
            </h3>
          </div>
        </article>
      </Link>
    </li>
  )
}
