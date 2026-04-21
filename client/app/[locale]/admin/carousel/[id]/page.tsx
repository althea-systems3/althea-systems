import { AdminCarouselDetailPage } from "@/features/admin/carousel/AdminCarouselDetailPage"

type AdminCarouselDetailRoutePageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminCarouselDetailRoutePage({
  params,
}: AdminCarouselDetailRoutePageProps) {
  const { id } = await params

  return <AdminCarouselDetailPage slideId={id} />
}
