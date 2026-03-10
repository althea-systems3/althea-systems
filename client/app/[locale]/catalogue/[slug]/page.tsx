import { getTranslations } from "next-intl/server"
import { StaticPage } from "@/components/layout/static-page"

type CategoryPageProps = {
  params: Promise<{ slug: string }>
}

function formatCategorySlugLabel(categorySlug: string): string {
  return categorySlug.replace(/-/g, " ").trim()
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params
  const translateCategoryPage = await getTranslations("Pages.category")

  const formattedCategorySlug = formatCategorySlugLabel(slug)

  return (
    <StaticPage
      title={translateCategoryPage("title", {
        categorySlug: formattedCategorySlug,
      })}
      description={translateCategoryPage("description", {
        categorySlug: formattedCategorySlug,
      })}
    />
  )
}
