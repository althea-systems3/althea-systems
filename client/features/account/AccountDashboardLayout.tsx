"use client"

import {
  CreditCard,
  LayoutDashboard,
  MapPin,
  PackageSearch,
  UserRound,
} from "lucide-react"
import type { ReactNode } from "react"

import { Link, usePathname } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

type AccountDashboardLayoutProps = {
  children: ReactNode
}

type DashboardNavigationItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

const DASHBOARD_NAVIGATION_ITEMS: DashboardNavigationItem[] = [
  {
    href: "/mon-compte",
    label: "Vue d'ensemble",
    icon: LayoutDashboard,
  },
  {
    href: "/mon-compte/profil",
    label: "Profil",
    icon: UserRound,
  },
  {
    href: "/mon-compte/commandes",
    label: "Commandes",
    icon: PackageSearch,
  },
  {
    href: "/mon-compte/adresses",
    label: "Adresses",
    icon: MapPin,
  },
  {
    href: "/mon-compte/paiements",
    label: "Paiements",
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
  const currentPathname = usePathname()

  return (
    <section className="container py-6 sm:py-8 lg:py-10">
      <div className="mb-5 space-y-1 sm:mb-6">
        <h1 className="heading-font text-2xl text-brand-nav sm:text-3xl">
          Mon compte
        </h1>
        <p className="max-w-3xl text-sm text-slate-600 sm:text-base">
          Gere ton profil, tes commandes, tes adresses et tes moyens de paiement
          depuis un espace unique.
        </p>
      </div>

      <nav
        aria-label="Navigation espace compte"
        className="mb-5 flex gap-2 overflow-x-auto pb-2 lg:hidden"
      >
        {DASHBOARD_NAVIGATION_ITEMS.map(
          ({ href, label, icon: NavigationIcon }) => {
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
                {label}
              </Link>
            )
          },
        )}
      </nav>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr] lg:gap-6">
        <aside className="hidden lg:block">
          <nav
            aria-label="Navigation espace compte"
            className="rounded-xl border border-border bg-white p-3"
          >
            <ul className="space-y-1">
              {DASHBOARD_NAVIGATION_ITEMS.map(
                ({ href, label, icon: NavigationIcon }) => {
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
                        {label}
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
