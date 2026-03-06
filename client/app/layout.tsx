import type { Metadata } from "next"
import { cookies } from "next/headers"
import { Inter, Poppins } from "next/font/google"
import "./globals.css"
import { defaultLocale, isRtlLocale, locales, type AppLocale } from "@/lib/i18n"

export const metadata: Metadata = {
  title: "Althea Systems",
  description: "Base front-end e-commerce Next.js avec i18n et accessibilite.",
}

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
})

const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  variable: "--font-heading",
  weight: ["600"],
  display: "swap",
})

function toLocale(value?: string): AppLocale {
  if (value && locales.includes(value as AppLocale)) {
    return value as AppLocale
  }
  return defaultLocale
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const locale = toLocale(cookieStore.get("NEXT_LOCALE")?.value)

  return (
    <html lang={locale} dir={isRtlLocale(locale) ? "rtl" : "ltr"}>
      <body className={`${inter.variable} ${poppins.variable}`}>
        {children}
      </body>
    </html>
  )
}
