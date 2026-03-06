type StaticPageProps = {
  title: string
  description: string
}

export function StaticPage({ title, description }: StaticPageProps) {
  return (
    <section className="container py-14 sm:py-20">
      <h1 className="heading-font text-3xl tracking-tight text-brand-nav sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 max-w-3xl text-slate-700">{description}</p>
    </section>
  )
}
