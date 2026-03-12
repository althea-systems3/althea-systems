import { getLocale, getTranslations } from "next-intl/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"

type LegalSection = {
  id: string
  title: string
  paragraphs: string[]
}

type LegalPageLocaleContent = {
  lastUpdatedLabel: string
  lastUpdatedDate: string
  publisherCardTitle: string
  publisherName: string
  publisherAddress: string
  publisherCapital: string
  publisherRcs: string
  publisherDirector: string
  publisherEmail: string
  hostingCardTitle: string
  hostingName: string
  hostingAddress: string
  hostingWebsite: string
  contactTitle: string
  contactPrefix: string
  contactLinkLabel: string
  contactSuffix: string
  sections: LegalSection[]
}

const LEGAL_PAGE_CONTENT_BY_LOCALE: Record<string, LegalPageLocaleContent> = {
  fr: {
    lastUpdatedLabel: "Derniere mise a jour",
    lastUpdatedDate: "12 mars 2026",
    publisherCardTitle: "Editeur du site",
    publisherName: "Althea Systems SAS",
    publisherAddress: "15 rue de l'Innovation, 75001 Paris, France",
    publisherCapital: "Capital social : 50 000 EUR",
    publisherRcs: "RCS Paris B 123 456 789",
    publisherDirector: "Directeur de la publication : Marie Fontaine",
    publisherEmail: "contact@althea-systems.fr",
    hostingCardTitle: "Hebergeur",
    hostingName: "Vercel Inc.",
    hostingAddress: "340 Pine Street, Suite 1300, San Francisco, CA 94104, USA",
    hostingWebsite: "https://vercel.com",
    contactTitle: "Contact pour questions juridiques",
    contactPrefix:
      "Pour toute demande relative aux mentions legales, utilisez notre page",
    contactLinkLabel: "Contact",
    contactSuffix: ".",
    sections: [
      {
        id: "intellectual-property",
        title: "1. Propriete intellectuelle",
        paragraphs: [
          "L'ensemble du contenu de ce site (textes, images, logos, elements graphiques, code source) est la propriete exclusive d'Althea Systems SAS ou de ses partenaires et est protege par les lois francaises et internationales sur la propriete intellectuelle.",
          "Toute reproduction, representation, modification ou exploitation de tout ou partie du contenu sans autorisation ecrite d'Althea Systems SAS est strictement interdite.",
        ],
      },
      {
        id: "personal-data",
        title: "2. Donnees personnelles et RGPD",
        paragraphs: [
          "Althea Systems SAS traite vos donnees personnelles conformement au Reglement General sur la Protection des Donnees (RGPD – UE 2016/679) et a la loi Informatique et Libertes.",
          "Vous disposez d'un droit d'acces, de rectification, d'effacement, de limitation et de portabilite de vos donnees. Pour exercer ces droits, contactez-nous a : dpo@althea-systems.fr.",
          "Vous pouvez egalement introduire une reclamation aupres de la CNIL (www.cnil.fr) si vous estimez que vos droits ne sont pas respectes.",
        ],
      },
      {
        id: "cookies",
        title: "3. Cookies",
        paragraphs: [
          "Ce site utilise des cookies techniques necessaires a son bon fonctionnement (gestion de session, panier). Aucun cookie publicitaire tiers n'est depose sans votre consentement explicite.",
          "Vous pouvez parametrer votre navigateur pour refuser les cookies. Certaines fonctionnalites du site pourraient alors etre degradees.",
        ],
      },
      {
        id: "liability",
        title: "4. Limitation de responsabilite",
        paragraphs: [
          "Althea Systems SAS s'efforce de maintenir les informations du site exactes et a jour. Toutefois, nous ne saurions garantir l'exhaustivite, l'exactitude ou l'actualite de ces informations a tout instant.",
          "Althea Systems SAS ne pourra etre tenue responsable des dommages directs ou indirects resultant de l'utilisation de ce site ou de l'impossibilite d'y acceder.",
        ],
      },
      {
        id: "governing-law",
        title: "5. Droit applicable",
        paragraphs: [
          "Le present site et ses mentions legales sont regis par le droit francais. En cas de litige, les tribunaux competents de Paris seront seuls juges.",
        ],
      },
    ],
  },
  en: {
    lastUpdatedLabel: "Last updated",
    lastUpdatedDate: "March 12, 2026",
    publisherCardTitle: "Website publisher",
    publisherName: "Althea Systems SAS",
    publisherAddress: "15 rue de l'Innovation, 75001 Paris, France",
    publisherCapital: "Share capital: EUR 50,000",
    publisherRcs: "Paris Trade Register B 123 456 789",
    publisherDirector: "Publication director: Marie Fontaine",
    publisherEmail: "contact@althea-systems.fr",
    hostingCardTitle: "Hosting provider",
    hostingName: "Vercel Inc.",
    hostingAddress: "340 Pine Street, Suite 1300, San Francisco, CA 94104, USA",
    hostingWebsite: "https://vercel.com",
    contactTitle: "Contact for legal inquiries",
    contactPrefix:
      "For any request relating to this legal notice, please use our",
    contactLinkLabel: "Contact",
    contactSuffix: "page.",
    sections: [
      {
        id: "intellectual-property",
        title: "1. Intellectual property",
        paragraphs: [
          "All content on this website (texts, images, logos, graphic elements, source code) is the exclusive property of Althea Systems SAS or its partners and is protected by French and international intellectual property laws.",
          "Any reproduction, representation, modification or exploitation of all or part of the content without written permission from Althea Systems SAS is strictly prohibited.",
        ],
      },
      {
        id: "personal-data",
        title: "2. Personal data and GDPR",
        paragraphs: [
          "Althea Systems SAS processes your personal data in compliance with the General Data Protection Regulation (GDPR – EU 2016/679) and the French Data Protection Act.",
          "You have the right to access, rectify, erase, restrict and port your data. To exercise these rights, contact us at: dpo@althea-systems.fr.",
          "You may also lodge a complaint with the CNIL (www.cnil.fr) if you believe your rights are not being respected.",
        ],
      },
      {
        id: "cookies",
        title: "3. Cookies",
        paragraphs: [
          "This website uses technical cookies required for its proper operation (session management, shopping cart). No third-party advertising cookies are placed without your explicit consent.",
          "You can configure your browser to reject cookies. Some website features may then be degraded.",
        ],
      },
      {
        id: "liability",
        title: "4. Limitation of liability",
        paragraphs: [
          "Althea Systems SAS strives to keep the information on this site accurate and up to date. However, we cannot guarantee the completeness, accuracy or timeliness of this information at all times.",
          "Althea Systems SAS shall not be liable for any direct or indirect damages resulting from the use of this website or the inability to access it.",
        ],
      },
      {
        id: "governing-law",
        title: "5. Governing law",
        paragraphs: [
          "This website and its legal notice are governed by French law. In the event of a dispute, the competent courts of Paris shall have sole jurisdiction.",
        ],
      },
    ],
  },
  ar: {
    lastUpdatedLabel: "آخر تحديث",
    lastUpdatedDate: "12 مارس 2026",
    publisherCardTitle: "ناشر الموقع",
    publisherName: "Althea Systems SAS",
    publisherAddress: "15 rue de l'Innovation, 75001 باريس، فرنسا",
    publisherCapital: "رأس المال: 50,000 يورو",
    publisherRcs: "سجل التجارة بباريس B 123 456 789",
    publisherDirector: "مدير النشر: Marie Fontaine",
    publisherEmail: "contact@althea-systems.fr",
    hostingCardTitle: "مزود الاستضافة",
    hostingName: "Vercel Inc.",
    hostingAddress: "340 Pine Street, Suite 1300, San Francisco, CA 94104, USA",
    hostingWebsite: "https://vercel.com",
    contactTitle: "التواصل بشأن الاستفسارات القانونية",
    contactPrefix: "لأي استفسار يتعلق بهذا الإشعار القانوني، يرجى استخدام صفحة",
    contactLinkLabel: "التواصل",
    contactSuffix: ".",
    sections: [
      {
        id: "intellectual-property",
        title: "1. الملكية الفكرية",
        paragraphs: [
          "جميع محتويات هذا الموقع (نصوص، صور، شعارات، عناصر رسومية، كود مصدري) هي ملك حصري لشركة Althea Systems SAS أو شركائها، وتحميها قوانين الملكية الفكرية الفرنسية والدولية.",
          "يُحظر تمامًا أي نسخ أو تمثيل أو تعديل أو استغلال لأي جزء من المحتوى دون إذن كتابي مسبق من Althea Systems SAS.",
        ],
      },
      {
        id: "personal-data",
        title: "2. البيانات الشخصية واللائحة الأوروبية RGPD",
        paragraphs: [
          "تعالج شركة Althea Systems SAS بياناتك الشخصية وفقًا للائحة الأوروبية العامة لحماية البيانات (GDPR – EU 2016/679) وقانون حماية البيانات الفرنسي.",
          "يحق لك الوصول إلى بياناتك وتصحيحها وحذفها وتقييد معالجتها ونقلها. لممارسة هذه الحقوق، تواصل معنا على: dpo@althea-systems.fr.",
          "يمكنك أيضًا تقديم شكوى إلى هيئة CNIL (www.cnil.fr) إن رأيت أن حقوقك غير مُحترمة.",
        ],
      },
      {
        id: "cookies",
        title: "3. ملفات تعريف الارتباط (Cookies)",
        paragraphs: [
          "يستخدم هذا الموقع ملفات تعريف ارتباط تقنية ضرورية لعمله الصحيح (إدارة الجلسة، سلة الشراء). لا يتم وضع أي ملفات إعلانية من طرف ثالث دون موافقتك الصريحة.",
          "يمكنك ضبط متصفحك لرفض ملفات تعريف الارتباط، وإن كان ذلك قد يُضعف بعض ميزات الموقع.",
        ],
      },
      {
        id: "liability",
        title: "4. حدود المسؤولية",
        paragraphs: [
          "تسعى شركة Althea Systems SAS إلى إبقاء معلومات الموقع دقيقة ومحدّثة، غير أننا لا نضمن الشمولية أو الدقة أو التحديث الفوري في جميع الأوقات.",
          "لن تتحمل شركة Althea Systems SAS أي مسؤولية عن الأضرار المباشرة أو غير المباشرة الناجمة عن استخدام هذا الموقع أو تعذّر الوصول إليه.",
        ],
      },
      {
        id: "governing-law",
        title: "5. القانون المطبّق",
        paragraphs: [
          "يخضع هذا الموقع وإشعاراته القانونية للقانون الفرنسي. وفي حال نشوء أي نزاع، تختص محاكم باريس وحدها بالنظر فيه.",
        ],
      },
    ],
  },
  he: {
    lastUpdatedLabel: "עדכון אחרון",
    lastUpdatedDate: "12 במרץ 2026",
    publisherCardTitle: "מפרסם האתר",
    publisherName: "Althea Systems SAS",
    publisherAddress: "15 rue de l'Innovation, 75001 פריז, צרפת",
    publisherCapital: "הון רשום: 50,000 אירו",
    publisherRcs: "רשם החברות פריז B 123 456 789",
    publisherDirector: "מנהל פרסום: Marie Fontaine",
    publisherEmail: "contact@althea-systems.fr",
    hostingCardTitle: "ספק אחסון",
    hostingName: "Vercel Inc.",
    hostingAddress: "340 Pine Street, Suite 1300, San Francisco, CA 94104, USA",
    hostingWebsite: "https://vercel.com",
    contactTitle: "יצירת קשר בנושאים משפטיים",
    contactPrefix: "לכל פנייה הנוגעת להצהרה המשפטית, אנא השתמש בעמוד",
    contactLinkLabel: "יצירת קשר",
    contactSuffix: ".",
    sections: [
      {
        id: "intellectual-property",
        title: "1. קניין רוחני",
        paragraphs: [
          "כל תוכן האתר (טקסטים, תמונות, לוגואים, אלמנטים גרפיים, קוד מקור) הוא רכוש בלעדי של Althea Systems SAS או שותפיה, ומוגן על פי חוקי הקניין הרוחני הצרפתיים והבינלאומיים.",
          "כל העתקה, שכפול, שינוי או ניצול של כל חלק מהתוכן ללא אישור בכתב מ-Althea Systems SAS אסורה בהחלט.",
        ],
      },
      {
        id: "personal-data",
        title: "2. נתונים אישיים ו-GDPR",
        paragraphs: [
          "Althea Systems SAS מעבדת את הנתונים האישיים שלך בהתאם לתקנת GDPR (EU 2016/679) ולחוק הגנת הנתונים הצרפתי.",
          "יש לך זכות גישה, תיקון, מחיקה, הגבלה וניידות של הנתונים שלך. לממש זכויות אלה, צור קשר בכתובת: dpo@althea-systems.fr.",
          "תוכל גם להגיש תלונה ל-CNIL (www.cnil.fr) אם אתה סבור שזכויותיך אינן מכובדות.",
        ],
      },
      {
        id: "cookies",
        title: "3. עוגיות (Cookies)",
        paragraphs: [
          "אתר זה משתמש בעוגיות טכניות הנחוצות לפעולתו התקינה (ניהול הפעלה, עגלת קניות). לא מוטמעות עוגיות פרסום של צד שלישי ללא הסכמתך המפורשת.",
          "תוכל להגדיר את הדפדפן שלך לסרב לעוגיות, אם כי חלק מתכונות האתר עלולות להיפגע.",
        ],
      },
      {
        id: "liability",
        title: "4. הגבלת אחריות",
        paragraphs: [
          "Althea Systems SAS שואפת לשמור על מידע האתר מדויק ומעודכן. עם זאת, איננו יכולים להבטיח שלמות, דיוק או עדכניות מלאה בכל עת.",
          "Althea Systems SAS לא תישא באחריות לכל נזק ישיר או עקיף הנובע משימוש באתר זה או מחוסר יכולת לגשת אליו.",
        ],
      },
      {
        id: "governing-law",
        title: "5. הדין החל",
        paragraphs: [
          "אתר זה והצהרתו המשפטית כפופים לחוק הצרפתי. במקרה של סכסוך, בתי המשפט המוסמכים של פריז יהיו בעלי סמכות שיפוט בלעדית.",
        ],
      },
    ],
  },
}

function getLegalPageLocaleContent(locale: string): LegalPageLocaleContent {
  return LEGAL_PAGE_CONTENT_BY_LOCALE[locale] ?? LEGAL_PAGE_CONTENT_BY_LOCALE.fr
}

export default async function LegalPage() {
  const t = await getTranslations("Pages.legal")
  const locale = await getLocale()
  const localeContent = getLegalPageLocaleContent(locale)

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
          <h1 className="text-2xl font-bold tracking-tight text-[#0a2540] sm:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t("description")}
          </p>
          <Badge variant="outline" className="mt-3 w-fit text-slate-700">
            {localeContent.lastUpdatedLabel} : {localeContent.lastUpdatedDate}
          </Badge>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                {localeContent.publisherCardTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                {localeContent.publisherName}
              </p>
              <p>{localeContent.publisherAddress}</p>
              <p>{localeContent.publisherCapital}</p>
              <p>{localeContent.publisherRcs}</p>
              <p>{localeContent.publisherDirector}</p>
              <p>
                <a
                  href={`mailto:${localeContent.publisherEmail}`}
                  className="text-[#0a7490] hover:underline"
                >
                  {localeContent.publisherEmail}
                </a>
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                {localeContent.hostingCardTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                {localeContent.hostingName}
              </p>
              <p>{localeContent.hostingAddress}</p>
              <p>
                <a
                  href={localeContent.hostingWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0a7490] hover:underline"
                >
                  {localeContent.hostingWebsite}
                </a>
              </p>
            </CardContent>
          </Card>
        </div>

        {localeContent.sections.map((section) => (
          <Card key={section.id} className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-[#0a2540]">
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {section.paragraphs.map((paragraph, idx) => (
                <p
                  key={idx}
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  {paragraph}
                </p>
              ))}
            </CardContent>
          </Card>
        ))}

        <Card className="border-[#0a7490]/30 bg-[#d4f4f7]/40">
          <CardContent className="pt-5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              {localeContent.contactTitle}
            </p>
            <p className="mt-1">
              {localeContent.contactPrefix}{" "}
              <Link
                href="/contact"
                className="font-medium text-[#0a7490] hover:underline"
              >
                {localeContent.contactLinkLabel}
              </Link>
              {localeContent.contactSuffix}
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
