"use client"

import { useLocale, useTranslations } from "next-intl"
import {
  Info,
  Languages,
  LogIn,
  LogOut,
  Menu,
  Scale,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  UserPlus,
  X,
} from "lucide-react"
import type { ComponentType, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  FOOTER_LINK_ITEMS,
  INSTAGRAM_SOCIAL_URL,
  LINKEDIN_SOCIAL_URL,
  MOBILE_MENU_DIALOG_ID,
  type LayoutMenuItemKey,
  X_SOCIAL_URL,
} from "@/features/layout/layoutConstants"
import { useMainLayoutState } from "@/features/layout/useMainLayoutState"
import { Link, usePathname } from "@/i18n/navigation"
import { locales } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type MainLayoutProps = {
  children: ReactNode
}

const MENU_ITEM_ICON_BY_KEY: Record<
  LayoutMenuItemKey | "logout",
  ComponentType<{ className?: string }>
> = {
  settings: Settings,
  orders: ShoppingBag,
  terms: Scale,
  legal: Info,
  contact: Info,
  about: Info,
  signIn: LogIn,
  signUp: UserPlus,
  logout: LogOut,
}

function getLanguageButtonClassName(
  languageCode: string,
  currentLocale: string,
): string {
  const isCurrentLocale = currentLocale === languageCode

  return cn(
    "rounded-full px-2 py-1 text-xs font-medium uppercase transition-colors sm:px-2.5",
    isCurrentLocale
      ? "bg-brand-nav text-white"
      : "text-brand-nav hover:bg-slate-100",
  )
}

export function MainLayout({ children }: MainLayoutProps) {
  const translateLayout = useTranslations("Layout")
  const translateAccessibility = useTranslations("A11y")
  const currentPathname = usePathname()
  const currentLocale = useLocale()

  const {
    cartItemCount,
    isMobileMenuOpen,
    isUserAuthenticated,
    menuItems,
    menuPanelRef,
    menuToggleButtonRef,
    handleCloseMobileMenu,
    handleLogoutUser,
    handleToggleMobileMenu,
  } = useMainLayoutState()

  const menuToggleLabel = isMobileMenuOpen
    ? translateLayout("closeMenu")
    : translateLayout("openMenu")
  const hasCartBadge = cartItemCount > 0
  const overlayVisibilityClassName = isMobileMenuOpen
    ? "pointer-events-auto bg-slate-950/50 opacity-100"
    : "pointer-events-none opacity-0"
  const menuVisibilityClassName = isMobileMenuOpen
    ? "translate-x-0"
    : "translate-x-full"

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        {translateAccessibility("skip")}
      </a>

      <header className="sticky top-0 z-40 border-b border-border/70 bg-white/90 backdrop-blur-sm">
        <div className="container py-2 md:py-3">
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 md:grid-cols-[auto_1fr_auto] md:gap-4">
            <Link
              href="/"
              className="text-base font-semibold tracking-tight text-brand-nav sm:text-lg"
            >
              Althea Systems
            </Link>

            <div className="flex items-center justify-end gap-1 sm:gap-2 md:order-3">
              <nav
                aria-label={translateLayout("languageLabel")}
                className="flex items-center gap-1 rounded-full border border-border bg-white p-1"
              >
                {locales.map((languageCode) => (
                  <Link
                    key={languageCode}
                    href={currentPathname}
                    locale={languageCode}
                    className={getLanguageButtonClassName(
                      languageCode,
                      currentLocale,
                    )}
                    aria-current={
                      currentLocale === languageCode ? "page" : undefined
                    }
                  >
                    {languageCode}
                  </Link>
                ))}
              </nav>

              <Link
                href="/panier"
                className="relative rounded-md p-2 text-brand-nav transition-colors hover:bg-slate-100"
                aria-label={translateLayout("cart")}
              >
                <ShoppingCart className="size-5" aria-hidden="true" />
                {hasCartBadge ? (
                  <span className="absolute -top-1 -end-1 min-w-5 rounded-full bg-brand-success px-1.5 py-0.5 text-center text-[10px] font-semibold text-white">
                    {cartItemCount}
                  </span>
                ) : null}
              </Link>

              <Button
                ref={menuToggleButtonRef}
                type="button"
                variant="ghost"
                size="icon"
                aria-label={menuToggleLabel}
                aria-expanded={isMobileMenuOpen}
                aria-controls={MOBILE_MENU_DIALOG_ID}
                onClick={handleToggleMobileMenu}
              >
                {isMobileMenuOpen ? (
                  <X className="size-5 text-brand-nav" aria-hidden="true" />
                ) : (
                  <Menu className="size-5 text-brand-nav" aria-hidden="true" />
                )}
              </Button>
            </div>

            <form
              role="search"
              className="col-span-2 md:col-span-1 md:order-2"
              onSubmit={(submitEvent) => {
                submitEvent.preventDefault()
              }}
            >
              <label htmlFor="global-search" className="sr-only">
                {translateLayout("search")}
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  id="global-search"
                  type="search"
                  placeholder={translateLayout("searchPlaceholder")}
                  className="w-full rounded-full border border-border bg-white py-2 ps-9 pe-3 text-sm text-slate-700 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cta"
                />
              </div>
            </form>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-50 transition-opacity md:duration-200",
          overlayVisibilityClassName,
        )}
        aria-hidden={!isMobileMenuOpen}
      >
        <button
          type="button"
          className="absolute inset-0 h-full w-full"
          aria-label={translateLayout("closeMenu")}
          onClick={handleCloseMobileMenu}
          tabIndex={isMobileMenuOpen ? 0 : -1}
        />

        <aside
          id={MOBILE_MENU_DIALOG_ID}
          ref={menuPanelRef}
          role="dialog"
          aria-modal="true"
          aria-label={translateLayout("menu")}
          className={cn(
            "absolute inset-y-0 end-0 z-10 flex h-full w-full flex-col bg-white shadow-xl transition-transform duration-200 md:w-[26rem]",
            menuVisibilityClassName,
          )}
        >
          <div className="flex items-center justify-between border-b border-border p-4">
            <p className="font-semibold text-brand-nav">
              {translateLayout("menu")}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={translateLayout("closeMenu")}
              onClick={handleCloseMobileMenu}
            >
              <X className="size-5 text-brand-nav" aria-hidden="true" />
            </Button>
          </div>

          <nav
            className="flex-1 overflow-y-auto p-4"
            aria-label={translateLayout("menu")}
          >
            <ul className="space-y-1">
              {menuItems.map(({ key, href }) => {
                const MenuItemIcon = MENU_ITEM_ICON_BY_KEY[key]

                return (
                  <li key={key}>
                    <Link
                      href={href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-brand-nav transition-colors hover:bg-slate-100"
                      onClick={handleCloseMobileMenu}
                    >
                      <MenuItemIcon className="size-4" aria-hidden="true" />
                      <span>{translateLayout(`menuItems.${key}`)}</span>
                    </Link>
                  </li>
                )
              })}

              {isUserAuthenticated ? (
                <li>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-brand-error transition-colors hover:bg-red-50"
                    onClick={handleLogoutUser}
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    <span>{translateLayout("menuItems.logout")}</span>
                  </button>
                </li>
              ) : null}
            </ul>
          </nav>

          <div className="border-t border-border p-4 text-xs text-slate-600">
            <p className="flex items-center gap-2 font-medium text-brand-nav">
              <Languages className="size-4" aria-hidden="true" />
              {translateLayout("languageLabel")}
            </p>
            <p className="mt-1">{translateLayout("menuHint")}</p>
          </div>
        </aside>
      </div>

      <main id="main-content" className="flex-1">
        {children}
      </main>

      <footer className="hidden border-t border-border/80 bg-white lg:block">
        <div className="container flex items-center justify-between py-5 text-sm">
          <nav aria-label={translateLayout("footer")}>
            <ul className="flex items-center gap-6 text-brand-nav">
              {FOOTER_LINK_ITEMS.map(({ href, key }) => (
                <li key={key}>
                  <Link href={href} className="hover:text-brand-cta">
                    {translateLayout(`menuItems.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-4 text-brand-nav">
            <span>{translateLayout("socials")}</span>
            <a
              href={LINKEDIN_SOCIAL_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-brand-cta"
            >
              LinkedIn
            </a>
            <a
              href={INSTAGRAM_SOCIAL_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-brand-cta"
            >
              Instagram
            </a>
            <a
              href={X_SOCIAL_URL}
              target="_blank"
              rel="noreferrer"
              className="hover:text-brand-cta"
            >
              X
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
