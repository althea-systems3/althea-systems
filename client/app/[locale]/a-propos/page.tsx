import { getLocale, getTranslations } from "next-intl/server"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"

type AboutMetric = {
  id: string
  label: string
  value: string
}

type AboutPageLocaleContent = {
  badge: string
  missionTitle: string
  missionDescription: string
  visionTitle: string
  visionDescription: string
  metricsTitle: string
  metricsDescription: string
  metrics: AboutMetric[]
  commitmentsTitle: string
  commitmentsDescription: string
  commitments: string[]
  ctaTitle: string
  ctaDescription: string
  browseCatalogLabel: string
  contactTeamLabel: string
}

const ABOUT_PAGE_CONTENT_BY_LOCALE: Record<string, AboutPageLocaleContent> = {
  fr: {
    badge: "Qui sommes-nous",
    missionTitle: "Notre mission",
    missionDescription:
      "Althea Systems aide les professionnels et structures de sante a acceder rapidement aux produits essentiels, avec une experience d'achat claire, fiable et performante.",
    visionTitle: "Notre vision",
    visionDescription:
      "Construire une plateforme e-commerce specialisee, capable d'aligner qualite de service, rigueur operationnelle et accompagnement humain sur toute la chaine de commande.",
    metricsTitle: "Althea Systems en quelques chiffres",
    metricsDescription:
      "Des indicateurs simples pour presenter notre niveau d'engagement au quotidien.",
    metrics: [
      { id: "catalog", label: "References catalogue", value: "500+" },
      {
        id: "delivery",
        label: "Commandes expediees par semaine",
        value: "1 200+",
      },
      { id: "support", label: "Temps de reponse support", value: "< 24h" },
      { id: "satisfaction", label: "Satisfaction clients", value: "96%" },
    ],
    commitmentsTitle: "Nos engagements",
    commitmentsDescription:
      "Chaque commande est traitee avec le meme niveau d'exigence, de la preparation jusqu'au suivi client.",
    commitments: [
      "Disponibilite des produits mise a jour en continu.",
      "Parcours de commande fluide et securise.",
      "Support reactif pour les demandes techniques et commerciales.",
      "Amelioration continue grace aux retours de nos clients.",
    ],
    ctaTitle: "Travaillons ensemble",
    ctaDescription:
      "Decouvrez nos gammes ou contactez notre equipe pour toute demande specifique.",
    browseCatalogLabel: "Voir le catalogue",
    contactTeamLabel: "Contacter l'equipe",
  },
  en: {
    badge: "Who we are",
    missionTitle: "Our mission",
    missionDescription:
      "Althea Systems helps healthcare professionals and organizations access essential products faster, through a clear, reliable, and high-performance purchasing experience.",
    visionTitle: "Our vision",
    visionDescription:
      "To build a specialized e-commerce platform that combines service quality, operational rigor, and human support across the full order journey.",
    metricsTitle: "Althea Systems at a glance",
    metricsDescription:
      "A few practical indicators that reflect our day-to-day commitment.",
    metrics: [
      { id: "catalog", label: "Catalog references", value: "500+" },
      { id: "delivery", label: "Orders shipped per week", value: "1,200+" },
      { id: "support", label: "Support response time", value: "< 24h" },
      { id: "satisfaction", label: "Customer satisfaction", value: "96%" },
    ],
    commitmentsTitle: "Our commitments",
    commitmentsDescription:
      "Every order is handled with the same level of quality, from preparation to customer follow-up.",
    commitments: [
      "Product availability updated continuously.",
      "Smooth and secure checkout experience.",
      "Responsive support for technical and business requests.",
      "Continuous improvement driven by customer feedback.",
    ],
    ctaTitle: "Let us work together",
    ctaDescription:
      "Browse our product ranges or contact our team for any specific request.",
    browseCatalogLabel: "Browse catalog",
    contactTeamLabel: "Contact the team",
  },
  ar: {
    badge: "من نحن",
    missionTitle: "مهمتنا",
    missionDescription:
      "تساعد Althea Systems المتخصصين والجهات العاملة في الرعاية الصحية على الوصول السريع إلى المنتجات الأساسية عبر تجربة شراء واضحة وموثوقة وعالية الأداء.",
    visionTitle: "رؤيتنا",
    visionDescription:
      "بناء منصة تجارة إلكترونية متخصصة تجمع بين جودة الخدمة والانضباط التشغيلي والدعم البشري طوال رحلة الطلب.",
    metricsTitle: "Althea Systems في أرقام",
    metricsDescription: "مؤشرات مختصرة توضّح مستوى التزامنا اليومي.",
    metrics: [
      { id: "catalog", label: "مراجع الكتالوج", value: "+500" },
      { id: "delivery", label: "طلبات مشحونة أسبوعيا", value: "+1,200" },
      { id: "support", label: "زمن استجابة الدعم", value: "< 24 ساعة" },
      { id: "satisfaction", label: "رضا العملاء", value: "%96" },
    ],
    commitmentsTitle: "التزاماتنا",
    commitmentsDescription:
      "نتعامل مع كل طلب بنفس مستوى الدقة، من التحضير حتى متابعة العميل.",
    commitments: [
      "تحديث مستمر لتوفر المنتجات.",
      "رحلة طلب سلسة وآمنة.",
      "دعم سريع للطلبات التقنية والتجارية.",
      "تحسين مستمر بناء على ملاحظات العملاء.",
    ],
    ctaTitle: "لنعمل معا",
    ctaDescription: "اكتشف مجموعاتنا أو تواصل مع فريقنا لأي طلب خاص.",
    browseCatalogLabel: "عرض الكتالوج",
    contactTeamLabel: "التواصل مع الفريق",
  },
  es: {
    badge: "Quienes somos",
    missionTitle: "Nuestra mision",
    missionDescription:
      "Althea Systems ayuda a profesionales y organizaciones sanitarias a acceder rapidamente a productos esenciales mediante una experiencia de compra clara, fiable y de alto rendimiento.",
    visionTitle: "Nuestra vision",
    visionDescription:
      "Construir una plataforma de comercio electronico especializada que combine calidad de servicio, rigor operativo y acompanamiento humano en toda la experiencia de pedido.",
    metricsTitle: "Althea Systems en cifras",
    metricsDescription:
      "Indicadores simples que reflejan nuestro nivel de compromiso diario.",
    metrics: [
      { id: "catalog", label: "Referencias de catalogo", value: "500+" },
      { id: "delivery", label: "Pedidos enviados por semana", value: "1.200+" },
      {
        id: "support",
        label: "Tiempo de respuesta de soporte",
        value: "< 24 h",
      },
      { id: "satisfaction", label: "Satisfaccion de clientes", value: "96%" },
    ],
    commitmentsTitle: "Nuestros compromisos",
    commitmentsDescription:
      "Cada pedido se gestiona con el mismo nivel de exigencia, desde la preparacion hasta el seguimiento del cliente.",
    commitments: [
      "Disponibilidad de productos actualizada de forma continua.",
      "Proceso de compra fluido y seguro.",
      "Soporte rapido para solicitudes tecnicas y comerciales.",
      "Mejora continua basada en los comentarios de clientes.",
    ],
    ctaTitle: "Trabajemos juntos",
    ctaDescription:
      "Descubra nuestras gamas o contacte con nuestro equipo para cualquier necesidad especifica.",
    browseCatalogLabel: "Ver catalogo",
    contactTeamLabel: "Contactar al equipo",
  },
}

function getAboutPageLocaleContent(locale: string): AboutPageLocaleContent {
  return ABOUT_PAGE_CONTENT_BY_LOCALE[locale] ?? ABOUT_PAGE_CONTENT_BY_LOCALE.fr
}

export default async function AboutPage() {
  const t = await getTranslations("Pages.about")
  const locale = await getLocale()
  const localeContent = getAboutPageLocaleContent(locale)

  return (
    <section className="container py-10 sm:py-14 lg:py-16">
      <div className="mx-auto grid max-w-5xl gap-6 sm:gap-8">
        <header className="rounded-2xl border border-border/80 bg-[#d4f4f7]/60 p-5 sm:p-7">
          <Badge
            variant="secondary"
            className="w-fit bg-[#d4f4f7] text-[#0a7490] hover:bg-[#c7edf1]"
          >
            {localeContent.badge}
          </Badge>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0a2540] sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t("description")}
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg text-[#0a2540]">
                {localeContent.missionTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {localeContent.missionDescription}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg text-[#0a2540]">
                {localeContent.visionTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {localeContent.visionDescription}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg text-[#0a2540]">
              {localeContent.metricsTitle}
            </CardTitle>
            <CardDescription>
              {localeContent.metricsDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {localeContent.metrics.map((metric) => (
                <div
                  key={metric.id}
                  className="rounded-lg border border-border/70 bg-muted/30 p-4"
                >
                  <p className="text-2xl font-semibold text-[#0a2540]">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-lg text-[#0a2540]">
              {localeContent.commitmentsTitle}
            </CardTitle>
            <CardDescription>
              {localeContent.commitmentsDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {localeContent.commitments.map((item) => (
                <li key={item} className="flex gap-2">
                  <span
                    aria-hidden
                    className="mt-1 h-1.5 w-1.5 rounded-full bg-[#0a7490]"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-[#0a7490]/30 bg-[#d4f4f7]/40">
          <CardHeader>
            <CardTitle className="text-lg text-[#0a2540]">
              {localeContent.ctaTitle}
            </CardTitle>
            <CardDescription>{localeContent.ctaDescription}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              asChild
              className="bg-[#0a7490] text-white hover:bg-[#086178]"
            >
              <Link href="/catalogue">{localeContent.browseCatalogLabel}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/contact">{localeContent.contactTeamLabel}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
