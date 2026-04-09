import { AdminCategoryDetailPage } from "@/features/admin/categories/AdminCategoryDetailPage"

type AdminCategoryDetailRoutePageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminCategoryDetailRoutePage({
  params,
}: AdminCategoryDetailRoutePageProps) {
  const { id } = await params

  return <AdminCategoryDetailPage categoryId={id} />
}
