import type { AppLocale } from "@/lib/i18n"
import type { StaticPageSlug } from "@/lib/static-pages/staticPages"

type FallbackPageLocaleContent = {
  title: string
  description: string
  markdown: string
}

type FallbackContentBySlug = Record<
  StaticPageSlug,
  Record<AppLocale, FallbackPageLocaleContent>
>

const FALLBACK_CONTENT_BY_SLUG: FallbackContentBySlug = {
  cgu: {
    fr: {
      title: "Conditions Generales d'Utilisation",
      description:
        "Consultez ici l'ensemble des conditions applicables a l'utilisation du site Althea Systems.",
      markdown: `## Objet\nLes presentes conditions encadrent l'utilisation du site Althea Systems.\n\n## Utilisation\n- L'utilisateur conserve la confidentialite de ses identifiants.\n- Toute action effectuee depuis le compte est presumee validee par son titulaire.\n\n## Responsabilites\nLe site peut evoluer a tout moment afin d'ameliorer les services proposes.\n\n## Contact\nPour toute question, consultez [la page de contact](/contact).`,
    },
    en: {
      title: "Terms of Use",
      description:
        "Read the terms that govern access and use of Althea Systems.",
      markdown: `## Purpose\nThese terms govern usage of the Althea Systems website.\n\n## Usage\n- Users must keep credentials confidential.\n- Actions made through an account are considered authorized by its owner.\n\n## Liability\nThe website may evolve at any time to improve the service.\n\n## Contact\nFor any question, visit the [contact page](/contact).`,
    },
    es: {
      title: "Condiciones de uso",
      description:
        "Consulte los terminos aplicables al uso del sitio Althea Systems.",
      markdown: `## Objeto\nEstas condiciones regulan el uso del sitio Althea Systems.\n\n## Uso\n- El usuario debe conservar sus credenciales de forma confidencial.\n- Las acciones realizadas desde la cuenta se consideran validadas por su titular.\n\n## Responsabilidad\nEl sitio puede evolucionar en cualquier momento para mejorar el servicio.\n\n## Contacto\nPara cualquier pregunta, consulte la [pagina de contacto](/contact).`,
    },
    ar: {
      title: "Conditions Generales d'Utilisation",
      description:
        "Consultez ici l'ensemble des conditions applicables a l'utilisation du site Althea Systems.",
      markdown: `## Objet\nLes presentes conditions encadrent l'utilisation du site Althea Systems.\n\n## Utilisation\n- L'utilisateur conserve la confidentialite de ses identifiants.\n- Toute action effectuee depuis le compte est presumee validee par son titulaire.\n\n## Contact\nPour toute question, consultez [la page de contact](/contact).`,
    },
  },
  "mentions-legales": {
    fr: {
      title: "Mentions legales",
      description:
        "Retrouvez les informations juridiques et editoriales du site e-commerce.",
      markdown: `## Editeur\nAlthea Systems SAS\n\n## Hebergement\nLe site est heberge sur une infrastructure cloud securisee.\n\n## Donnees personnelles\nLes traitements de donnees sont effectues selon la reglementation applicable.\n\n## Contact\nPour toute demande, utilisez [la page de contact](/contact).`,
    },
    en: {
      title: "Legal notice",
      description:
        "Find legal and editorial information for this e-commerce website.",
      markdown: `## Publisher\nAlthea Systems SAS\n\n## Hosting\nThe website is hosted on secure cloud infrastructure.\n\n## Personal data\nData processing is performed in accordance with applicable regulations.\n\n## Contact\nFor any request, use the [contact page](/contact).`,
    },
    es: {
      title: "Aviso legal",
      description: "Consulte la informacion legal y editorial del sitio.",
      markdown: `## Editor\nAlthea Systems SAS\n\n## Alojamiento\nEl sitio esta alojado en una infraestructura cloud segura.\n\n## Datos personales\nEl tratamiento de datos se realiza conforme a la normativa aplicable.\n\n## Contacto\nPara cualquier solicitud, use la [pagina de contacto](/contact).`,
    },
    ar: {
      title: "Mentions legales",
      description:
        "Retrouvez les informations juridiques et editoriales du site e-commerce.",
      markdown: `## Editeur\nAlthea Systems SAS\n\n## Hebergement\nLe site est heberge sur une infrastructure cloud securisee.\n\n## Contact\nPour toute demande, utilisez [la page de contact](/contact).`,
    },
  },
  "a-propos": {
    fr: {
      title: "A propos de Althea Systems",
      description:
        "Althea Systems accompagne les entreprises avec une plateforme e-commerce performante et evolutive.",
      markdown: `## Notre mission\nAlthea Systems accompagne les structures de sante avec une experience d'achat fiable.\n\n## Notre engagement\n- Qualite de service\n- Rigueur operationnelle\n- Support reactif\n\n## Aller plus loin\nDecouvrez [notre catalogue](/catalogue) ou [contactez-nous](/contact).`,
    },
    en: {
      title: "About Althea Systems",
      description:
        "Althea Systems helps organizations with a scalable and reliable e-commerce platform.",
      markdown: `## Our mission\nAlthea Systems supports healthcare organizations with a reliable buying experience.\n\n## Our commitments\n- Service quality\n- Operational rigor\n- Responsive support\n\n## Learn more\nDiscover [our catalog](/catalogue) or [contact us](/contact).`,
    },
    es: {
      title: "Acerca de Althea Systems",
      description:
        "Althea Systems acompana a las organizaciones con una plataforma de e-commerce fiable y escalable.",
      markdown: `## Nuestra mision\nAlthea Systems acompana a las organizaciones de salud con una experiencia de compra fiable.\n\n## Nuestros compromisos\n- Calidad de servicio\n- Rigor operativo\n- Soporte rapido\n\n## Mas informacion\nDescubra [nuestro catalogo](/catalogue) o [contactenos](/contact).`,
    },
    ar: {
      title: "A propos de Althea Systems",
      description:
        "Althea Systems accompagne les entreprises avec une plateforme e-commerce performante et evolutive.",
      markdown: `## Notre mission\nAlthea Systems accompagne les structures de sante avec une experience d'achat fiable.\n\n## Notre engagement\n- Qualite de service\n- Rigueur operationnelle\n- Support reactif\n\n## Aller plus loin\nDecouvrez [notre catalogue](/catalogue) ou [contactez-nous](/contact).`,
    },
  },
}

export function getStaticPageFallbackContent(params: {
  slug: StaticPageSlug
  locale: AppLocale
}): FallbackPageLocaleContent {
  const contentByLocale = FALLBACK_CONTENT_BY_SLUG[params.slug]

  return contentByLocale[params.locale] ?? contentByLocale.fr
}
