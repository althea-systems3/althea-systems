import { getLocale, getTranslations } from "next-intl/server"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Link } from "@/i18n/navigation"

type TermsArticle = {
  id: string
  title: string
  paragraphs: string[]
}

type TermsPageLocaleContent = {
  lastUpdatedLabel: string
  lastUpdatedDate: string
  quickSummaryTitle: string
  quickSummaryDescription: string
  quickSummaryBulletPoints: string[]
  legalLinkLabel: string
  supportTitle: string
  supportPrefix: string
  supportLinkLabel: string
  supportSuffix: string
  articles: TermsArticle[]
}

const TERMS_PAGE_CONTENT_BY_LOCALE: Record<string, TermsPageLocaleContent> = {
  fr: {
    lastUpdatedLabel: "Derniere mise a jour",
    lastUpdatedDate: "12 mars 2026",
    quickSummaryTitle: "Resume rapide",
    quickSummaryDescription:
      "En utilisant ce site, vous acceptez les regles d'utilisation, de securite et de protection des donnees.",
    quickSummaryBulletPoints: [
      "Usage reserve aux professionnels de sante et structures associees.",
      "Informations de compte exactes et maintenues a jour.",
      "Paiement securise et confidentialite des donnees sensibles.",
    ],
    legalLinkLabel: "Mentions legales",
    supportTitle: "Besoin d'aide ou d'une precision ?",
    supportPrefix: "Notre equipe peut vous repondre via la page",
    supportLinkLabel: "Contact",
    supportSuffix: ".",
    articles: [
      {
        id: "scope",
        title: "1. Objet",
        paragraphs: [
          "Les presentes CGU encadrent l'utilisation du site Althea Systems et de ses fonctionnalites e-commerce.",
          "Toute navigation, creation de compte ou commande vaut acceptation pleine et entiere des presentes conditions.",
        ],
      },
      {
        id: "account",
        title: "2. Compte utilisateur",
        paragraphs: [
          "Certaines fonctionnalites necessitent un compte (suivi de commande, historique, gestion des adresses).",
          "L'utilisateur est responsable de la confidentialite de ses identifiants et des actions realisees depuis son compte.",
        ],
      },
      {
        id: "orders",
        title: "3. Commandes et disponibilite",
        paragraphs: [
          "Les informations produit (prix, description, stock) sont fournies avec soin, mais peuvent evoluer sans preavis.",
          "Un produit indisponible peut etre retire ou bloque du checkout jusqu'a sa remise en stock.",
        ],
      },
      {
        id: "privacy",
        title: "4. Donnees personnelles et securite",
        paragraphs: [
          "Les donnees sont traitees pour la gestion des comptes, commandes et demandes de contact, dans le respect des regles applicables.",
          "Les echanges sont securises et les informations sensibles ne sont jamais exposees integralement.",
        ],
      },
      {
        id: "law",
        title: "5. Droit applicable",
        paragraphs: [
          "Les presentes CGU sont soumises au droit applicable au lieu d'etablissement de l'editeur du site.",
          "En cas de question juridique, consultez les mentions legales ou contactez notre equipe.",
        ],
      },
    ],
  },
  en: {
    lastUpdatedLabel: "Last updated",
    lastUpdatedDate: "March 12, 2026",
    quickSummaryTitle: "Quick summary",
    quickSummaryDescription:
      "By using this website, you accept usage, security, and data protection rules.",
    quickSummaryBulletPoints: [
      "Use is intended for healthcare professionals and related organizations.",
      "Account information must remain accurate and up to date.",
      "Payments are secured and sensitive data is protected.",
    ],
    legalLinkLabel: "Legal notice",
    supportTitle: "Need help or clarification?",
    supportPrefix: "Our team can assist you through the",
    supportLinkLabel: "Contact",
    supportSuffix: "page.",
    articles: [
      {
        id: "scope",
        title: "1. Purpose",
        paragraphs: [
          "These Terms of Use govern access to and use of the Althea Systems e-commerce website.",
          "Browsing the website, creating an account, or placing an order implies full acceptance of these terms.",
        ],
      },
      {
        id: "account",
        title: "2. User account",
        paragraphs: [
          "Some features require an account (order tracking, order history, address management).",
          "Users are responsible for keeping their credentials confidential and for activity performed through their account.",
        ],
      },
      {
        id: "orders",
        title: "3. Orders and availability",
        paragraphs: [
          "Product information (price, description, stock) is provided with care but may change without notice.",
          "Out-of-stock items may be removed or blocked from checkout until available again.",
        ],
      },
      {
        id: "privacy",
        title: "4. Personal data and security",
        paragraphs: [
          "Data is processed to manage accounts, orders, and contact requests in accordance with applicable rules.",
          "Exchanges are secured and sensitive information is never fully exposed.",
        ],
      },
      {
        id: "law",
        title: "5. Governing law",
        paragraphs: [
          "These Terms are governed by the law applicable at the publisher's place of establishment.",
          "For legal questions, consult the legal notice or contact our team.",
        ],
      },
    ],
  },
  ar: {
    lastUpdatedLabel: "آخر تحديث",
    lastUpdatedDate: "12 مارس 2026",
    quickSummaryTitle: "ملخص سريع",
    quickSummaryDescription:
      "باستخدام هذا الموقع، فإنك توافق على قواعد الاستخدام والأمان وحماية البيانات.",
    quickSummaryBulletPoints: [
      "الاستخدام مخصص للمهنيين في المجال الصحي والجهات المرتبطة.",
      "يجب أن تكون معلومات الحساب دقيقة ومحدثة.",
      "عمليات الدفع آمنة والبيانات الحساسة محمية.",
    ],
    legalLinkLabel: "الإشعارات القانونية",
    supportTitle: "هل تحتاج إلى مساعدة أو توضيح؟",
    supportPrefix: "يمكن لفريقنا مساعدتك عبر صفحة",
    supportLinkLabel: "اتصل بنا",
    supportSuffix: ".",
    articles: [
      {
        id: "scope",
        title: "1. الغرض",
        paragraphs: [
          "تنظم هذه الشروط العامة استخدام منصة Althea Systems للتجارة الإلكترونية.",
          "إن التصفح أو إنشاء حساب أو تنفيذ طلب يعني القبول الكامل لهذه الشروط.",
        ],
      },
      {
        id: "account",
        title: "2. حساب المستخدم",
        paragraphs: [
          "تتطلب بعض الميزات حسابًا مثل تتبع الطلبات وسجل الطلبات وإدارة العناوين.",
          "المستخدم مسؤول عن سرية بيانات الدخول وعن الأنشطة المنفذة من خلال حسابه.",
        ],
      },
      {
        id: "orders",
        title: "3. الطلبات والتوفر",
        paragraphs: [
          "تُعرض معلومات المنتجات مثل السعر والوصف والمخزون بعناية، لكنها قد تتغير دون إشعار مسبق.",
          "يمكن حجب المنتجات غير المتوفرة من إتمام الشراء حتى عودتها للمخزون.",
        ],
      },
      {
        id: "privacy",
        title: "4. البيانات الشخصية والأمان",
        paragraphs: [
          "تتم معالجة البيانات لإدارة الحسابات والطلبات وطلبات التواصل وفق القواعد المعمول بها.",
          "تتم حماية التبادلات ولا يتم عرض المعلومات الحساسة بشكل كامل.",
        ],
      },
      {
        id: "law",
        title: "5. القانون المطبق",
        paragraphs: [
          "تخضع هذه الشروط للقانون المعمول به في مكان تواجد ناشر الموقع.",
          "للأسئلة القانونية، راجع الإشعارات القانونية أو تواصل مع فريقنا.",
        ],
      },
    ],
  },
  he: {
    lastUpdatedLabel: "עדכון אחרון",
    lastUpdatedDate: "12 במרץ 2026",
    quickSummaryTitle: "סיכום מהיר",
    quickSummaryDescription:
      "בשימוש באתר זה, אתה מסכים לכללי שימוש, אבטחה והגנת מידע.",
    quickSummaryBulletPoints: [
      "השימוש מיועד לאנשי מקצוע בתחום הבריאות ולגופים קשורים.",
      "פרטי החשבון חייבים להיות מדויקים ומעודכנים.",
      "התשלומים מאובטחים והמידע הרגיש מוגן.",
    ],
    legalLinkLabel: "הצהרה משפטית",
    supportTitle: "צריך עזרה או הבהרה?",
    supportPrefix: "הצוות שלנו יכול לסייע דרך עמוד",
    supportLinkLabel: "צור קשר",
    supportSuffix: ".",
    articles: [
      {
        id: "scope",
        title: "1. מטרה",
        paragraphs: [
          "תנאי שימוש אלה מסדירים את השימוש בפלטפורמת המסחר של Althea Systems.",
          "גלישה באתר, יצירת חשבון או ביצוע הזמנה מהווים הסכמה מלאה לתנאים אלה.",
        ],
      },
      {
        id: "account",
        title: "2. חשבון משתמש",
        paragraphs: [
          "חלק מהפונקציות דורשות חשבון, כגון מעקב הזמנות, היסטוריית הזמנות וניהול כתובות.",
          "המשתמש אחראי על סודיות פרטי ההזדהות ועל הפעילות המתבצעת דרך החשבון.",
        ],
      },
      {
        id: "orders",
        title: "3. הזמנות וזמינות",
        paragraphs: [
          "מידע המוצר כמו מחיר, תיאור ומלאי מוצג בקפידה, אך עשוי להשתנות ללא הודעה מוקדמת.",
          "מוצרים שאינם זמינים עשויים להיחסם מהמשך תהליך הרכישה עד לחידוש המלאי.",
        ],
      },
      {
        id: "privacy",
        title: "4. מידע אישי ואבטחה",
        paragraphs: [
          "המידע מעובד לצורך ניהול חשבונות, הזמנות ופניות בהתאם לכללים החלים.",
          "התקשורת מאובטחת ומידע רגיש אינו מוצג במלואו.",
        ],
      },
      {
        id: "law",
        title: "5. דין חל",
        paragraphs: [
          "תנאים אלה כפופים לדין החל במקום מושבו של מפרסם האתר.",
          "לשאלות משפטיות ניתן לעיין בהצהרה המשפטית או לפנות לצוות שלנו.",
        ],
      },
    ],
  },
}

function getTermsPageLocaleContent(locale: string): TermsPageLocaleContent {
  return TERMS_PAGE_CONTENT_BY_LOCALE[locale] ?? TERMS_PAGE_CONTENT_BY_LOCALE.fr
}

export default async function TermsPage() {
  const t = await getTranslations("Pages.terms")
  const locale = await getLocale()
  const localeContent = getTermsPageLocaleContent(locale)

  return (
    <section className="container py-10 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-5xl space-y-6 sm:space-y-8">
        <header className="rounded-2xl border border-border/80 bg-[#d4f4f7]/60 p-5 sm:p-7">
          <Badge
            variant="secondary"
            className="w-fit bg-[#d4f4f7] text-[#0a7490] hover:bg-[#c7edf1]"
          >
            Althea Systems
          </Badge>
          <h1 className="heading-font text-3xl tracking-tight text-brand-nav sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-sm text-slate-700 sm:text-base">
            {t("description")}
          </p>
          <Badge variant="outline" className="mt-4 w-fit text-slate-700">
            {localeContent.lastUpdatedLabel}: {localeContent.lastUpdatedDate}
          </Badge>
        </header>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-brand-nav">
              {localeContent.quickSummaryTitle}
            </CardTitle>
            <CardDescription>
              {localeContent.quickSummaryDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 ps-5 text-sm text-slate-700">
              {localeContent.quickSummaryBulletPoints.map((bulletPoint) => (
                <li key={bulletPoint}>{bulletPoint}</li>
              ))}
              <li>
                <Link
                  href="/mentions-legales"
                  className="font-medium text-brand-cta hover:underline"
                >
                  {localeContent.legalLinkLabel}
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-4 sm:space-y-5">
          {localeContent.articles.map((termsArticle) => (
            <Card key={termsArticle.id} className="border-border/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl text-brand-nav sm:text-2xl">
                  {termsArticle.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed text-slate-700 sm:text-base">
                {termsArticle.paragraphs.map((paragraph, paragraphIndex) => (
                  <p key={`${termsArticle.id}-paragraph-${paragraphIndex}`}>
                    {paragraph}
                  </p>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-brand-cta/40 bg-slate-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-brand-nav">
              {localeContent.supportTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 sm:text-base">
            <p>
              {localeContent.supportPrefix}{" "}
              <Link
                href="/contact"
                className="font-medium text-brand-cta hover:underline"
              >
                {localeContent.supportLinkLabel}
              </Link>
              {localeContent.supportSuffix}
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
