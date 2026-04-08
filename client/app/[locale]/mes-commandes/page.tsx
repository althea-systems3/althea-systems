import { redirect } from "next/navigation"

type LegacyOrdersPageProps = {
  params: Promise<{ locale: string }>
}

export default async function LegacyOrdersPage({
  params,
}: LegacyOrdersPageProps) {
  const { locale } = await params

  redirect(`/${locale}/mon-compte/commandes`)
}
