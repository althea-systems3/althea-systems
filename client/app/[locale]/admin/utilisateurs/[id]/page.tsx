import { AdminUserDetailPage } from "@/features/admin/users/AdminUserDetailPage"

type AdminUserDetailRoutePageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminUserDetailRoutePage({
  params,
}: AdminUserDetailRoutePageProps) {
  const { id } = await params

  return <AdminUserDetailPage userId={id} />
}
