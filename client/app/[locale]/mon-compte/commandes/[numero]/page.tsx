import { AccountOrderDetailSection } from "@/features/account/AccountOrderDetailSection"

type AccountOrderDetailPageProps = {
  params: Promise<{ numero: string }>
}

export default async function AccountOrderDetailPage({
  params,
}: AccountOrderDetailPageProps) {
  const { numero } = await params

  return <AccountOrderDetailSection orderNumber={numero} />
}
