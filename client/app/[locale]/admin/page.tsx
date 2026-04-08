import { redirect } from "next/navigation"

type AdminIndexPageProps = {
  params: Promise<{ locale: string }>
}

export default async function AdminIndexPage({ params }: AdminIndexPageProps) {
  const { locale } = await params
  redirect(`/${locale}/admin/dashboard`)
}
