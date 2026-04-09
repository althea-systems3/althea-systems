import { AdminInvoiceEditPage } from "@/features/admin/invoices/AdminInvoiceEditPage"

type AdminInvoiceEditRoutePageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminInvoiceEditRoutePage({
  params,
}: AdminInvoiceEditRoutePageProps) {
  const { id } = await params

  return <AdminInvoiceEditPage invoiceId={id} />
}
