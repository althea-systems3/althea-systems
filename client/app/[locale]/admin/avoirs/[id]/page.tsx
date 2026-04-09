import { AdminCreditNoteDetailPage } from "@/features/admin/invoices/AdminCreditNoteDetailPage"

type AdminCreditNoteDetailRoutePageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminCreditNoteDetailRoutePage({
  params,
}: AdminCreditNoteDetailRoutePageProps) {
  const { id } = await params

  return <AdminCreditNoteDetailPage creditNoteId={id} />
}
