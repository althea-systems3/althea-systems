"use client"

import { Menu, LogOut, ShieldCheck, X } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Link, usePathname } from "@/i18n/navigation"
import { ADMIN_NAV_ITEMS } from "@/features/admin/adminNavigation"

type AdminShellProps = {
  adminName: string
  locale: string
  children: React.ReactNode
}

export function AdminShell({ adminName, locale, children }: AdminShellProps) {
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      window.location.href = `/${locale}/connexion`
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[280px_1fr]">
        <aside
          className={`fixed inset-y-0 start-0 z-50 w-72 border-e border-[#003d5c]/15 bg-[#003d5c] p-4 text-white transition-transform duration-200 lg:static lg:w-auto lg:translate-x-0 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          aria-label="Navigation backoffice"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="heading-font text-lg font-semibold">Admin Panel</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 hover:text-white lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Fermer la navigation"
            >
              <X className="size-5" aria-hidden="true" />
            </Button>
          </div>

          <nav className="mt-6" aria-label="Modules admin">
            <ul className="space-y-1.5">
              {ADMIN_NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                const ItemIcon = item.icon

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? "bg-white text-[#003d5c]"
                          : "text-white/90 hover:bg-white/10"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <ItemIcon className="size-4" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        {isSidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Fermer le menu"
          />
        ) : null}

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setIsSidebarOpen(true)}
                  aria-label="Ouvrir la navigation"
                >
                  <Menu className="size-4" aria-hidden="true" />
                </Button>
                <p className="heading-font text-lg font-semibold text-brand-nav">
                  Backoffice administrateur
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-1 rounded-full bg-[#003d5c]/10 px-3 py-1 text-xs font-medium text-brand-nav sm:inline-flex">
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                  {adminName}
                </span>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  {isLoggingOut ? "Déconnexion..." : "Logout"}
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
