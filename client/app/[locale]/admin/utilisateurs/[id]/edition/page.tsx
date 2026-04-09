import { AdminUserEditPage } from "@/features/admin/users/AdminUserEditPage"

type AdminUserEditRoutePageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminUserEditRoutePage({
  params,
}: AdminUserEditRoutePageProps) {
  const { id } = await params

  return <AdminUserEditPage userId={id} />
}
