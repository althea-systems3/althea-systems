import { ProductPage } from "@/features/product/ProductPage"

type ProductSlugPageProps = {
  params: Promise<{ slug: string }>
}

export default async function ProductSlugPage({
  params,
}: ProductSlugPageProps) {
  const { slug } = await params

  return (
    <section className="container py-8 pb-14 sm:py-10 sm:pb-20">
      <ProductPage slug={slug} />
    </section>
  )
}
