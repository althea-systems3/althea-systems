import { AdminCategoryFormPage } from "@/features/admin/categories/AdminCategoryFormPage"

type AdminCategoryEditRoutePageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminCategoryEditRoutePage({
  params,
}: AdminCategoryEditRoutePageProps) {
  const { id } = await params

  return <AdminCategoryFormPage mode="edit" categoryId={id} />
}
