import { CataloguePage } from "@/features/catalogue/CataloguePage"

type CategoryPageProps = {
  params: Promise<{ slug: string }>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params

  return (
    <section className="container py-8 pb-14 sm:py-10 sm:pb-20">
      <CataloguePage slug={slug} />
    </section>
  )
}
