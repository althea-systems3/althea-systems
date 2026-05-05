"use client"

import {
  CreditCard,
  LayoutDashboard,
  MapPin,
  PackageSearch,
  UserRound,
} from "lucide-react"
import type { ReactNode } from "react"
import { useTranslations } from "next-intl"

import { Link, usePathname } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

type AccountDashboardLayoutProps = {
  children: ReactNode
}

type DashboardNavigationItem = {
  href: string
  labelKey: string
  icon: typeof LayoutDashboard
}

const DASHBOARD_NAVIGATION_ITEMS: DashboardNavigationItem[] = [
  {
    href: "/mon-compte",
    labelKey: "dashboard.navigation.overview",
    icon: LayoutDashboard,
  },
  {
    href: "/mon-compte/profil",
    labelKey: "dashboard.navigation.profile",
    icon: UserRound,
  },
  {
    href: "/mon-compte/commandes",
    labelKey: "dashboard.navigation.orders",
    icon: PackageSearch,
  },
  {
    href: "/mon-compte/adresses",
    labelKey: "dashboard.navigation.addresses",
    icon: MapPin,
  },
  {
    href: "/mon-compte/paiements",
    labelKey: "dashboard.navigation.payments",
    icon: CreditCard,
  },
]

function isNavigationItemActive(pathname: string, href: string): boolean {
  if (href === "/mon-compte") {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AccountDashboardLayout({
  children,
}: AccountDashboardLayoutProps) {
  const t = useTranslations("Account")
  const currentPathname = usePathname()

  return (
    <section className="container py-6 sm:py-8 lg:py-10">
      <div className="relative mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-[#f0fbfc] via-white to-[#eaf3fb] px-6 py-8 sm:mb-8 sm:px-8 sm:py-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at 95% 5%, rgba(20,184,200,0.18) 0, transparent 50%), radial-gradient(circle at 5% 95%, rgba(28,78,128,0.10) 0, transparent 50%)",
          }}
        />
        <div className="relative space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-cta backdrop-blur">
            Espace personnel
          </span>
          <h1 className="heading-font text-3xl leading-tight text-brand-nav sm:text-4xl">
            {t("dashboard.title")}
          </h1>
          <p className="max-w-3xl text-sm text-slate-700 sm:text-base">
            {t("dashboard.description")}
          </p>
        </div>
      </div>

      <nav
        aria-label={t("dashboard.navigationAriaLabel")}
        className="mb-5 flex gap-2 overflow-x-auto pb-2 lg:hidden"
      >
        {DASHBOARD_NAVIGATION_ITEMS.map(
          ({ href, labelKey, icon: NavigationIcon }) => {
            const isActive = isNavigationItemActive(currentPathname, href)

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-brand-cta bg-brand-cta text-white"
                    : "border-border bg-white text-brand-nav hover:bg-slate-100",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <NavigationIcon className="size-4" aria-hidden="true" />
                {t(labelKey)}
              </Link>
            )
          },
        )}
      </nav>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr] lg:gap-6">
        <aside className="hidden lg:block">
          <nav
            aria-label={t("dashboard.navigationAriaLabel")}
            className="rounded-xl border border-border bg-white p-3"
          >
            <ul className="space-y-1">
              {DASHBOARD_NAVIGATION_ITEMS.map(
                ({ href, labelKey, icon: NavigationIcon }) => {
                  const isActive = isNavigationItemActive(currentPathname, href)

                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        className={cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-brand-nav text-white"
                            : "text-brand-nav hover:bg-slate-100",
                        )}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <NavigationIcon className="size-4" aria-hidden="true" />
                        {t(labelKey)}
                      </Link>
                    </li>
                  )
                },
              )}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 rounded-xl border border-border bg-white p-4 sm:p-5 lg:p-6">
          {children}
        </div>
      </div>
    </section>
  )
}
