import { redirect } from "next/navigation"

type LegacySettingsPageProps = {
  params: Promise<{ locale: string }>
}

export default async function LegacySettingsPage({
  params,
}: LegacySettingsPageProps) {
  const { locale } = await params

  redirect(`/${locale}/mon-compte/profil`)
}
