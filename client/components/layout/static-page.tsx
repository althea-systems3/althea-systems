import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type StaticPageProps = {
  title: string
  description: string
}

export function StaticPage({ title, description }: StaticPageProps) {
  return (
    <section className="container py-10 sm:py-14 lg:py-16">
      <Card className="mx-auto max-w-4xl border-border/80 bg-[#d4f4f7]/40">
        <CardHeader>
          <Badge
            variant="secondary"
            className="w-fit bg-[#d4f4f7] text-[#0a7490] hover:bg-[#c7edf1]"
          >
            Althea Systems
          </Badge>
          <CardTitle className="text-3xl tracking-tight text-brand-nav sm:text-4xl">
            {title}
          </CardTitle>
          <CardDescription className="max-w-3xl text-slate-700">
            {description}
          </CardDescription>
        </CardHeader>
      </Card>
    </section>
  )
}
