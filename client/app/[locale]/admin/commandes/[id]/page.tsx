import { AdminOrderDetailPage } from "@/features/admin/orders/AdminOrderDetailPage"

type AdminOrderDetailRoutePageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminOrderDetailRoutePage({
  params,
}: AdminOrderDetailRoutePageProps) {
  const { id } = await params

  return <AdminOrderDetailPage orderId={id} />
}
