import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"

export default function LocalizedHomePage() {
  const t = useTranslations("Home")
  const tA11y = useTranslations("A11y")

  return (
    <div className="min-h-screen bg-slate-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-md focus:bg-white focus:px-3 focus:py-2"
      >
        {tA11y("skip")}
      </a>
      <header className="border-b border-slate-200 bg-white">
        <nav
          aria-label="Primary"
          className="container flex items-center justify-between py-4"
        >
          <p className="text-sm font-semibold tracking-wide">Althea Systems</p>
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/"
              locale="fr"
              className="underline-offset-4 hover:underline"
            >
              FR
            </Link>
            <Link
              href="/"
              locale="en"
              className="underline-offset-4 hover:underline"
            >
              EN
            </Link>
            <Link
              href="/"
              locale="ar"
              className="underline-offset-4 hover:underline"
            >
              AR
            </Link>
          </div>
        </nav>
      </header>
      <main id="main-content" className="container py-16">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">{t("subtitle")}</p>
        <div className="mt-8">
          <Button>{t("cta")}</Button>
        </div>
      </main>
      <footer className="container border-t border-slate-200 py-6 text-sm text-slate-500">
        Base e-commerce bootstrap
      </footer>
    </div>
  )
}
