import { AdminProductDetailPage } from "@/features/admin/products/AdminProductDetailPage"

type AdminProductDetailRoutePageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminProductDetailRoutePage({
  params,
}: AdminProductDetailRoutePageProps) {
  const { id } = await params

  return <AdminProductDetailPage productId={id} />
}
