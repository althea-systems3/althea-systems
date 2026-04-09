import { AdminInvoiceDetailPage } from "@/features/admin/invoices/AdminInvoiceDetailPage"

type AdminInvoiceDetailRoutePageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminInvoiceDetailRoutePage({
  params,
}: AdminInvoiceDetailRoutePageProps) {
  const { id } = await params

  return <AdminInvoiceDetailPage invoiceId={id} />
}
