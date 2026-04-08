import { redirect } from "next/navigation"

type LegacyProductPageProps = {
  params: Promise<{ locale: string; slug: string }>
}

export default async function LegacyProductPage({
  params,
}: LegacyProductPageProps) {
  const { locale, slug } = await params

  redirect(`/${locale}/produits/${slug}`)
}
