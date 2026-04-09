import type { Metadata } from "next"
import { cookies } from "next/headers"
import { Inter, Noto_Sans_Arabic, Poppins } from "next/font/google"
import "./globals.css"
import { isRtlLocale, toAppLocale } from "@/lib/i18n"

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

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-rtl-ar",
  display: "swap",
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const locale = toAppLocale(cookieStore.get("NEXT_LOCALE")?.value)

  return (
    <html lang={locale} dir={isRtlLocale(locale) ? "rtl" : "ltr"}>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${poppins.variable} ${notoSansArabic.variable}`}
      >
        {children}
      </body>
    </html>
  )
}
