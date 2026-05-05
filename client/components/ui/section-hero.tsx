import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type SectionHeroProps = {
  badge?: string
  title: string
  description?: string
  align?: "left" | "center"
  /** Couleur de fond du dégradé. Default: brand cyan/blue. */
  variant?: "default" | "muted"
  className?: string
  children?: ReactNode
}

/**
 * Hero générique avec dégradé + badge optionnel + titre + description.
 *
 * Style aligné sur la section value-props de la home pour avoir une
 * identité visuelle cohérente partout.
 */
export function SectionHero({
  badge,
  title,
  description,
  align = "left",
  variant = "default",
  className,
  children,
}: SectionHeroProps) {
  const isCentered = align === "center"

  const backgroundClass =
    variant === "muted"
      ? "bg-gradient-to-br from-slate-50 via-white to-slate-100"
      : "bg-gradient-to-br from-[#f0fbfc] via-white to-[#eaf3fb]"

  return (
    <section
      className={cn(
        "relative overflow-hidden border-b border-slate-200",
        backgroundClass,
        className,
      )}
    >
      {variant === "default" ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(20,184,200,0.12) 0, transparent 45%), radial-gradient(circle at 80% 80%, rgba(28,78,128,0.10) 0, transparent 50%)",
          }}
        />
      ) : null}

      <div
        className={cn(
          "container relative py-10 sm:py-14 lg:py-16",
          isCentered && "text-center",
        )}
      >
        <div
          className={cn(
            isCentered ? "mx-auto max-w-3xl" : "max-w-3xl",
            "space-y-3",
          )}
        >
          {badge ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-cta backdrop-blur">
              {badge}
            </span>
          ) : null}

          <h1 className="heading-font text-3xl leading-tight tracking-tight text-brand-nav sm:text-4xl lg:text-5xl">
            {title}
          </h1>

          {description ? (
            <p
              className={cn(
                "text-base text-slate-700 sm:text-lg",
                isCentered ? "mx-auto max-w-2xl" : "max-w-2xl",
              )}
            >
              {description}
            </p>
          ) : null}

          {children}
        </div>
      </div>
    </section>
  )
}
