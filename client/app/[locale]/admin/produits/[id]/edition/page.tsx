import { AdminProductFormPage } from "@/features/admin/products/AdminProductFormPage"

type AdminProductEditRoutePageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminProductEditRoutePage({
  params,
}: AdminProductEditRoutePageProps) {
  const { id } = await params

  return <AdminProductFormPage mode="edit" productId={id} />
}
