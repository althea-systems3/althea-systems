import { AdminCarouselFormPage } from "@/features/admin/carousel/AdminCarouselFormPage"

type AdminCarouselEditRoutePageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminCarouselEditRoutePage({
  params,
}: AdminCarouselEditRoutePageProps) {
  const { id } = await params

  return <AdminCarouselFormPage mode="edit" slideId={id} />
}
