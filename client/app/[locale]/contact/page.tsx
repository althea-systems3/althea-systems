import { getLocale, getTranslations } from "next-intl/server"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const CONTACT_EMAIL = "althea.systems3@gmail.com"

type ContactInfoItem = {
  id: string
  label: string
  value: string
}

type ContactPageLocaleContent = {
  badge: string
  responseTimeLabel: string
  responseTimeValue: string
  primaryCtaLabel: string
  secondaryCtaLabel: string
  contactChannelsTitle: string
  contactChannelsDescription: string
  contactInfo: ContactInfoItem[]
  supportScopeTitle: string
  supportScopeDescription: string
  supportScopeItems: string[]
  escalationTitle: string
  escalationDescription: string
}

const CONTACT_PAGE_CONTENT_BY_LOCALE: Record<string, ContactPageLocaleContent> =
  {
    fr: {
      badge: "Support Althea Systems",
      responseTimeLabel: "Delai moyen de reponse",
      responseTimeValue: "Sous 24h ouvrables",
      primaryCtaLabel: "Envoyer un e-mail",
      secondaryCtaLabel: "Copier l'adresse e-mail",
      contactChannelsTitle: "Canaux de contact",
      contactChannelsDescription:
        "Notre equipe traite en priorite les demandes recues via l'adresse officielle.",
      contactInfo: [
        { id: "email", label: "E-mail", value: CONTACT_EMAIL },
        {
          id: "availability",
          label: "Disponibilite",
          value: "Lundi au vendredi",
        },
        {
          id: "hours",
          label: "Horaires",
          value: "09:00 - 18:00 (heure de Paris)",
        },
      ],
      supportScopeTitle: "Pour quels sujets nous contacter ?",
      supportScopeDescription:
        "Nous vous aidons sur les sujets e-commerce, techniques et administratifs.",
      supportScopeItems: [
        "Suivi de commande et statut de livraison",
        "Assistance connexion et compte client",
        "Questions sur les produits et disponibilites",
        "Facturation, devis et demandes commerciales",
      ],
      escalationTitle: "Besoin d'une priorisation ?",
      escalationDescription:
        "Indiquez dans l'objet de votre message : URGENT - [votre sujet].",
    },
    en: {
      badge: "Althea Systems Support",
      responseTimeLabel: "Average response time",
      responseTimeValue: "Within 24 business hours",
      primaryCtaLabel: "Send an email",
      secondaryCtaLabel: "Copy email address",
      contactChannelsTitle: "Contact channels",
      contactChannelsDescription:
        "Our team prioritizes requests sent through the official address.",
      contactInfo: [
        { id: "email", label: "Email", value: CONTACT_EMAIL },
        {
          id: "availability",
          label: "Availability",
          value: "Monday to Friday",
        },
        {
          id: "hours",
          label: "Hours",
          value: "09:00 AM - 06:00 PM (Paris time)",
        },
      ],
      supportScopeTitle: "What can we help you with?",
      supportScopeDescription:
        "We provide support for e-commerce, technical, and administrative topics.",
      supportScopeItems: [
        "Order tracking and delivery status",
        "Sign-in and customer account support",
        "Product and availability questions",
        "Billing, quotes, and sales requests",
      ],
      escalationTitle: "Need priority handling?",
      escalationDescription:
        "Include in your subject line: URGENT - [your topic].",
    },
    ar: {
      badge: "دعم Althea Systems",
      responseTimeLabel: "متوسط وقت الرد",
      responseTimeValue: "خلال 24 ساعة عمل",
      primaryCtaLabel: "إرسال بريد إلكتروني",
      secondaryCtaLabel: "نسخ عنوان البريد الإلكتروني",
      contactChannelsTitle: "قنوات التواصل",
      contactChannelsDescription:
        "يعطي فريقنا الأولوية للطلبات الواردة عبر العنوان الرسمي.",
      contactInfo: [
        { id: "email", label: "البريد الإلكتروني", value: CONTACT_EMAIL },
        { id: "availability", label: "التوفر", value: "من الاثنين إلى الجمعة" },
        {
          id: "hours",
          label: "ساعات العمل",
          value: "09:00 - 18:00 (بتوقيت باريس)",
        },
      ],
      supportScopeTitle: "بخصوص أي مواضيع يمكن التواصل معنا؟",
      supportScopeDescription:
        "نقدّم المساعدة في المواضيع التقنية والتجارية والإدارية.",
      supportScopeItems: [
        "متابعة الطلبات وحالة التسليم",
        "المساعدة في تسجيل الدخول وحساب العميل",
        "الاستفسار عن المنتجات والتوفر",
        "الفوترة، عروض الأسعار، والطلبات التجارية",
      ],
      escalationTitle: "هل تحتاج معالجة ذات أولوية؟",
      escalationDescription: "اكتب في عنوان الرسالة: URGENT - [موضوعك].",
    },
    he: {
      badge: "תמיכת Althea Systems",
      responseTimeLabel: "זמן תגובה ממוצע",
      responseTimeValue: "תוך 24 שעות עסקים",
      primaryCtaLabel: "שליחת אימייל",
      secondaryCtaLabel: "העתקת כתובת אימייל",
      contactChannelsTitle: "ערוצי יצירת קשר",
      contactChannelsDescription:
        "הצוות שלנו נותן עדיפות לפניות שנשלחות לכתובת הרשמית.",
      contactInfo: [
        { id: "email", label: "אימייל", value: CONTACT_EMAIL },
        { id: "availability", label: "זמינות", value: "ימים שני עד שישי" },
        {
          id: "hours",
          label: "שעות פעילות",
          value: "09:00 - 18:00 (שעון פריז)",
        },
      ],
      supportScopeTitle: "באילו נושאים אפשר לפנות אלינו?",
      supportScopeDescription:
        "אנחנו מספקים תמיכה בנושאים טכניים, מסחריים ומנהליים.",
      supportScopeItems: [
        "מעקב הזמנה וסטטוס משלוח",
        "סיוע בהתחברות ובחשבון לקוח",
        "שאלות על מוצרים וזמינות",
        "חיוב, הצעות מחיר ופניות מסחריות",
      ],
      escalationTitle: "צריך טיפול בעדיפות גבוהה?",
      escalationDescription: "יש לציין בנושא ההודעה: URGENT - [הנושא שלך].",
    },
  }

function getContactPageLocaleContent(locale: string): ContactPageLocaleContent {
  return (
    CONTACT_PAGE_CONTENT_BY_LOCALE[locale] ?? CONTACT_PAGE_CONTENT_BY_LOCALE.fr
  )
}

export default async function ContactPage() {
  const t = await getTranslations("Pages.contact")
  const locale = await getLocale()
  const localeContent = getContactPageLocaleContent(locale)

  return (
    <section className="container py-10 sm:py-14 lg:py-16">
      <div className="mx-auto grid max-w-5xl gap-6 sm:gap-8">
        <header className="rounded-2xl border border-border/80 bg-[#d4f4f7]/60 p-5 sm:p-7">
          <p className="text-sm font-medium text-[#0a7490]">
            {localeContent.badge}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0a2540] sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t("description")}
          </p>
          <p className="mt-3 text-sm text-muted-foreground/80">
            {localeContent.responseTimeLabel}: {localeContent.responseTimeValue}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              asChild
              className="bg-[#0a7490] text-white hover:bg-[#086178]"
            >
              <a href={`mailto:${CONTACT_EMAIL}`}>
                {localeContent.primaryCtaLabel}
              </a>
            </Button>
            <Button asChild variant="outline">
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=Contact%20Althea%20Systems`}
              >
                {localeContent.secondaryCtaLabel}
              </a>
            </Button>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg text-[#0a2540]">
                {localeContent.contactChannelsTitle}
              </CardTitle>
              <CardDescription>
                {localeContent.contactChannelsDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {localeContent.contactInfo.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-border/70 bg-muted/30 p-3"
                >
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="mt-1 text-muted-foreground">{item.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg text-[#0a2540]">
                {localeContent.supportScopeTitle}
              </CardTitle>
              <CardDescription>
                {localeContent.supportScopeDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {localeContent.supportScopeItems.map((item) => (
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
        </div>

        <Card className="border-[#0a7490]/30 bg-[#d4f4f7]/40">
          <CardHeader>
            <CardTitle className="text-lg text-[#0a2540]">
              {localeContent.escalationTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {localeContent.escalationDescription}
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
