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
      title: "Conditions Générales d'Utilisation",
      description:
        "Ces CGU précisent les règles d'accès, de commande et de responsabilité applicables à la plateforme Althea Systems.",
      markdown: `## 1. Objet et champ d'application
Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») ont pour objet de définir les modalités et conditions dans lesquelles Althea Systems (ci-après « la Société ») met à disposition son site internet et ses services à destination des professionnels du secteur médical et paramédical (ci-après « l'Utilisateur »).

L'utilisation du site implique l'acceptation pleine et entière des présentes CGU. La Société se réserve le droit de modifier les CGU à tout moment, les modifications étant opposables dès leur mise en ligne.

## 2. Définitions
- **Site** : la plateforme web Althea Systems accessible à l'adresse principale et l'ensemble de ses pages associées.
- **Utilisateur** : toute personne physique ou morale, professionnel du secteur médical, naviguant ou commandant sur le Site.
- **Compte** : l'espace authentifié permettant à l'Utilisateur de gérer ses informations, ses commandes et son historique d'achat.
- **Produits** : l'ensemble des équipements médicaux, dispositifs médicaux et consommables proposés à la vente sur le Site.
- **Services** : les fonctionnalités de consultation du catalogue, recherche, panier, commande, suivi et support proposées sur le Site.

## 3. Accès au Site
Le Site est accessible 24h/24 et 7j/7, sous réserve des opérations de maintenance, des mises à jour techniques et des évènements indépendants de la volonté de la Société (panne réseau, défaillance matérielle, force majeure).

La Société peut suspendre temporairement certaines fonctionnalités pour garantir la sécurité, la qualité de service ou la conformité réglementaire, sans que cela puisse engager sa responsabilité.

## 4. Création et gestion du compte
L'accès aux fonctionnalités de commande nécessite la création d'un compte. L'Utilisateur s'engage à :
- Fournir des informations exactes, complètes et à jour lors de la création de son compte.
- Maintenir la confidentialité de ses identifiants de connexion (e-mail et mot de passe).
- Notifier sans délai toute utilisation non autorisée de son compte.
- Respecter les conditions d'usage professionnel : seuls les professionnels habilités peuvent acquérir certains dispositifs médicaux soumis à réglementation.

Toute action effectuée depuis un compte est présumée réalisée par son titulaire. La Société se réserve le droit de suspendre ou supprimer tout compte ne respectant pas les CGU.

## 5. Produits, disponibilité et prix
Les fiches produits, stocks et tarifs sont mis à jour régulièrement pour offrir une information fiable. Toutefois :
- Les prix affichés sur le Site sont indiqués hors taxes (HT) et toutes taxes comprises (TTC), en euros.
- Les frais de livraison éventuels sont précisés avant validation de la commande.
- Les visuels et descriptions ont une finalité informative et peuvent évoluer en fonction des mises à jour catalogue ou des évolutions réglementaires.
- Une variation ponctuelle de disponibilité ou de prix peut intervenir entre la consultation d'un article et la validation finale de la commande.

Certains produits sont des **dispositifs médicaux** au sens du règlement (UE) 2017/745 (MDR). Leur acquisition et utilisation sont strictement réservées aux professionnels habilités.

## 6. Processus de commande
Le parcours de commande comprend les étapes suivantes :
1. Sélection des produits et ajout au panier.
2. Vérification des quantités, des disponibilités et des informations de livraison.
3. Saisie ou validation de l'adresse de livraison et de facturation.
4. Choix du mode de paiement et confirmation du récapitulatif.
5. Validation finale et émission d'un numéro de commande de suivi.

La commande est considérée comme enregistrée après validation technique du paiement et confirmation de disponibilité des références. Un courriel de confirmation est adressé à l'Utilisateur.

## 7. Paiement et facturation
Le paiement s'effectue par carte bancaire via un prestataire technique sécurisé (Stripe). Les données sensibles de paiement sont traitées exclusivement par ce prestataire et ne sont jamais conservées en clair par la Société.

Une facture électronique est émise et mise à disposition dans l'espace client dès validation de la commande.

## 8. Livraison et réception
Les délais de livraison annoncés sont communiqués à titre indicatif selon la zone de livraison et la disponibilité des produits.

À réception du colis, l'Utilisateur est invité à :
- Vérifier l'état apparent du colis avant signature.
- Contrôler la conformité des références reçues avec le bon de livraison.
- Signaler toute anomalie via le formulaire de contact dans un délai de 48 heures.

## 9. Droit de rétractation
Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation ne s'applique pas aux contrats conclus entre professionnels (B2B). Toutefois, en cas de produit défectueux ou non conforme, l'Utilisateur dispose des garanties légales de conformité et des vices cachés.

## 10. Réclamations et support
Pour toute demande relative à une commande, une livraison ou un produit, l'Utilisateur peut contacter le support via [la page de contact](/contact). Pour accélérer le traitement, il est recommandé de préciser :
- Le numéro de commande concerné.
- Le contexte précis de la demande.
- Toute pièce justificative utile (photos, captures, etc.).

## 11. Données personnelles et cookies
Les données nécessaires au fonctionnement du service sont collectées et traitées dans le respect du Règlement Général sur la Protection des Données (RGPD) et de la loi Informatique et Libertés.

Les informations détaillées sur les traitements, les finalités, les durées de conservation et les droits des utilisateurs (accès, rectification, suppression, opposition, portabilité) sont accessibles dans [les mentions légales](/mentions-legales).

## 12. Propriété intellectuelle
L'ensemble des éléments du Site (textes, images, logos, photographies, structure éditoriale, code source, base de données) est protégé par les dispositions du Code de la propriété intellectuelle.

Toute reproduction, représentation, modification, adaptation ou diffusion, totale ou partielle, sans autorisation écrite préalable de la Société est strictement interdite et constitue une contrefaçon sanctionnée par les articles L335-2 et suivants du Code de la propriété intellectuelle.

## 13. Limitation de responsabilité
La Société met en œuvre les moyens raisonnables pour assurer la fiabilité du Site et la qualité des informations diffusées, sans pour autant garantir une absence totale d'interruption ou d'erreur.

L'Utilisateur reste responsable :
- De l'usage qu'il fait des informations publiées sur le Site.
- Des actions effectuées depuis son compte.
- Du respect de la réglementation applicable à l'usage des produits acquis (notamment dispositifs médicaux).

La Société ne saurait être tenue responsable des dommages indirects, pertes d'exploitation ou préjudices commerciaux résultant de l'utilisation du Site.

## 14. Évolution du service et des CGU
Le Site et ses fonctionnalités peuvent évoluer pour répondre aux besoins métier, techniques et réglementaires. Les présentes CGU peuvent être mises à jour en conséquence. La version en ligne fait foi à la date de consultation.

L'Utilisateur est invité à consulter régulièrement cette page. La poursuite de l'utilisation du Site après modification vaut acceptation des nouvelles CGU.

## 15. Droit applicable et juridiction compétente
Les présentes CGU sont soumises au droit français. En cas de litige et à défaut de résolution amiable, les tribunaux français seront seuls compétents, sous réserve des dispositions impératives applicables.

## 16. Contact
Pour toute question relative aux présentes CGU ou à l'utilisation du Site, vous pouvez nous contacter via [la page de contact](/contact).

*Dernière mise à jour : 2026.*`,
    },
    en: {
      title: "Terms of Use",
      description:
        "Read the terms governing access and use of the Althea Systems platform.",
      markdown: `## 1. Purpose
These Terms of Use govern the access and use of the Althea Systems website (hereinafter "the Site") for healthcare and paramedical professionals.

## 2. Account
- Users must provide accurate information and keep credentials confidential.
- Actions performed through an account are deemed authorized by its owner.
- The company may suspend any account violating these terms.

## 3. Products and pricing
Prices are displayed in euros, both excluding (HT) and including taxes (TTC). Some products are regulated medical devices under EU Regulation 2017/745 (MDR) and may only be acquired by qualified professionals.

## 4. Order process
1. Add products to cart.
2. Verify quantities and delivery details.
3. Provide billing/shipping address.
4. Confirm payment method.
5. Receive order number and email confirmation.

## 5. Payment
Payments are processed via Stripe. Sensitive card data is never stored by Althea Systems.

## 6. Delivery
Delivery times are indicative. Users must verify package condition upon receipt and report any anomaly within 48 hours.

## 7. Right of withdrawal
B2B transactions are not eligible for the consumer right of withdrawal. Legal warranties for defects apply.

## 8. Liability
The company makes reasonable efforts to ensure service reliability but cannot guarantee uninterrupted access. Users remain responsible for the use of acquired products.

## 9. Personal data
Data processing complies with GDPR. See the [legal notice](/mentions-legales) for details on data processing.

## 10. Intellectual property
All website content is protected. Unauthorized reproduction is strictly prohibited.

## 11. Governing law
These Terms are governed by French law. French courts have exclusive jurisdiction.

## Contact
For any question, visit the [contact page](/contact).`,
    },
    es: {
      title: "Condiciones Generales de Uso",
      description:
        "Consulte las condiciones aplicables al acceso y uso de la plataforma Althea Systems.",
      markdown: `## 1. Objeto
Estas Condiciones Generales de Uso regulan el acceso y uso del sitio Althea Systems para profesionales sanitarios.

## 2. Cuenta
- El usuario debe proporcionar información precisa y mantener sus credenciales confidenciales.
- Las acciones realizadas desde la cuenta se consideran autorizadas por su titular.
- La empresa puede suspender toda cuenta que infrinja estas condiciones.

## 3. Productos y precios
Los precios se muestran en euros, sin IVA (HT) y con IVA incluido (TTC). Algunos productos son dispositivos médicos regulados por el Reglamento (UE) 2017/745 (MDR) y solo pueden ser adquiridos por profesionales habilitados.

## 4. Proceso de pedido
1. Añadir productos al carrito.
2. Verificar cantidades y entrega.
3. Proporcionar dirección de facturación/envío.
4. Confirmar método de pago.
5. Recibir número de pedido y confirmación por correo.

## 5. Pago
Los pagos se procesan a través de Stripe. Los datos bancarios sensibles nunca son almacenados por Althea Systems.

## 6. Entrega
Los plazos de entrega son indicativos. El usuario debe verificar el estado del paquete al recibirlo e informar cualquier anomalía en un plazo de 48 horas.

## 7. Derecho de desistimiento
Las transacciones B2B no son elegibles para el derecho de desistimiento del consumidor. Se aplican las garantías legales por defectos.

## 8. Responsabilidad
La empresa hace esfuerzos razonables para garantizar la fiabilidad del servicio pero no puede garantizar un acceso ininterrumpido. El usuario sigue siendo responsable del uso de los productos adquiridos.

## 9. Datos personales
El tratamiento de datos cumple con el RGPD. Consulte el [aviso legal](/mentions-legales) para más información.

## 10. Propiedad intelectual
Todo el contenido del sitio está protegido. La reproducción no autorizada está estrictamente prohibida.

## 11. Ley aplicable
Estas condiciones se rigen por la ley francesa. Los tribunales franceses tienen jurisdicción exclusiva.

## Contacto
Para cualquier pregunta, consulte la [página de contacto](/contact).`,
    },
    ar: {
      title: "شروط الاستخدام العامة",
      description:
        "اطلع على الشروط التي تحكم الوصول واستخدام منصة Althea Systems.",
      markdown: `## 1. الموضوع
تحكم شروط الاستخدام هذه الوصول إلى موقع Althea Systems واستخدامه من قبل المهنيين الصحيين.

## 2. الحساب
- يجب على المستخدم تقديم معلومات دقيقة والحفاظ على سرية بيانات الاعتماد.
- الإجراءات المنفذة من خلال الحساب تعتبر مصرحاً بها من قبل صاحبها.
- يجوز للشركة تعليق أي حساب يخالف هذه الشروط.

## 3. المنتجات والأسعار
الأسعار معروضة باليورو، شاملة وغير شاملة الضريبة. بعض المنتجات هي أجهزة طبية منظمة ولا يمكن اقتناؤها إلا من قبل المهنيين المؤهلين.

## 4. عملية الطلب
1. إضافة المنتجات إلى السلة.
2. التحقق من الكميات والتسليم.
3. تقديم عنوان الفوترة/الشحن.
4. تأكيد طريقة الدفع.
5. استلام رقم الطلب والتأكيد عبر البريد الإلكتروني.

## 5. الدفع
تتم معالجة المدفوعات عبر Stripe. لا يتم تخزين بيانات البطاقة الحساسة من قبل Althea Systems.

## 6. التسليم
أوقات التسليم تقديرية. يجب على المستخدم التحقق من حالة الطرد عند الاستلام والإبلاغ عن أي شذوذ خلال 48 ساعة.

## 7. حق الانسحاب
معاملات B2B غير مؤهلة لحق الانسحاب الاستهلاكي. تطبق الضمانات القانونية للعيوب.

## 8. المسؤولية
تبذل الشركة جهوداً معقولة لضمان موثوقية الخدمة ولكن لا يمكنها ضمان وصول غير متقطع. يظل المستخدم مسؤولاً عن استخدام المنتجات المقتناة.

## 9. البيانات الشخصية
تتوافق معالجة البيانات مع اللائحة العامة لحماية البيانات. راجع [الإشعار القانوني](/mentions-legales) للحصول على التفاصيل.

## 10. الملكية الفكرية
جميع محتويات الموقع محمية. يحظر الاستنساخ غير المصرح به منعاً باتاً.

## 11. القانون المعمول به
تخضع هذه الشروط للقانون الفرنسي. للمحاكم الفرنسية اختصاص حصري.

## الاتصال
لأي سؤال، تفضل بزيارة [صفحة الاتصال](/contact).`,
    },
  },
  "mentions-legales": {
    fr: {
      title: "Mentions légales",
      description:
        "Informations juridiques, techniques et éditoriales encadrant l'exploitation du site Althea Systems.",
      markdown: `## 1. Éditeur du site
Le site Althea Systems est édité par :

- **Raison sociale** : Althea Systems
- **Forme juridique** : Société par Actions Simplifiée (SAS)
- **Capital social** : à compléter
- **Siège social** : à compléter (adresse complète)
- **RCS** : à compléter (ex. : RCS Paris XXX XXX XXX)
- **N° SIRET** : à compléter
- **N° TVA intracommunautaire** : à compléter (FR XX XXXXXXXXX)
- **Activité principale** : vente en ligne d'équipements médicaux et paramédicaux à destination des professionnels de santé
- **Code APE/NAF** : à compléter

> **Note importante** : ces informations doivent être complétées avant la mise en production avec les données légales réelles de la société.

## 2. Directeur de la publication
Le directeur de la publication du site est le représentant légal d'Althea Systems.

- **Nom** : à compléter
- **Qualité** : Président / Directeur Général
- **Contact** : via le [formulaire de contact](/contact)

## 3. Hébergeur du site
Le site est hébergé par :

- **Hébergeur** : Vercel Inc.
- **Adresse** : 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis
- **Site web** : https://vercel.com

Les données de la base sont hébergées chez :
- **Supabase, Inc.** — 970 Toa Payoh North #07-04, Singapour 318992

## 4. Contact
Pour toute question, demande d'information ou réclamation :
- **Formulaire de contact** : [accéder au formulaire](/contact)
- **E-mail support** : à compléter
- **Téléphone** : à compléter

## 5. Activité du site
Le site Althea Systems est une plateforme e-commerce B2B spécialisée dans la commercialisation d'équipements médicaux, dispositifs médicaux et consommables sanitaires destinés aux :
- Cabinets médicaux et paramédicaux
- Établissements hospitaliers et cliniques
- Laboratoires et structures de recherche
- Pharmacies et officines
- Entreprises et collectivités (équipements de premiers secours)

## 6. Conditions d'utilisation
L'accès et l'utilisation du site sont soumis aux [Conditions Générales d'Utilisation](/cgu). Toute navigation sur la plateforme implique l'acceptation pleine et entière de ces conditions.

## 7. Propriété intellectuelle
L'ensemble du contenu présent sur le site Althea Systems (textes, photographies, logos, marques, vidéos, sons, structures de pages, codes sources, bases de données) est la propriété exclusive d'Althea Systems ou de ses partenaires. Il est protégé par le droit d'auteur, le droit des marques et plus généralement par les dispositions du Code de la propriété intellectuelle.

Toute reproduction, représentation, modification, adaptation, traduction ou diffusion, totale ou partielle, sans autorisation écrite préalable d'Althea Systems est strictement interdite et constitue une contrefaçon sanctionnée par les articles L335-2 et suivants du Code de la propriété intellectuelle.

## 8. Liens hypertextes
Le site peut contenir des liens hypertextes vers des sites tiers. Althea Systems n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu, leurs politiques de confidentialité ou leurs pratiques.

L'établissement de liens hypertextes vers le site Althea Systems est autorisé sous réserve d'une mention claire de la source et de l'absence d'utilisation à des fins commerciales ou trompeuses.

## 9. Données personnelles (RGPD)

### 9.1 Responsable du traitement
Althea Systems, en sa qualité d'éditeur du site, est responsable du traitement des données personnelles collectées via la plateforme.

### 9.2 Données collectées
Les données collectées concernent :
- **Identification** : nom, prénom, e-mail, téléphone
- **Adresse** : adresse postale (livraison et facturation)
- **Compte** : identifiants de connexion (e-mail + mot de passe haché)
- **Commandes** : historique d'achat, factures
- **Navigation** : cookies techniques, données de session

### 9.3 Finalités du traitement
- Création et gestion du compte client
- Traitement et suivi des commandes
- Émission des factures et obligations comptables
- Communication transactionnelle (confirmations, suivi)
- Support client et réponse aux demandes
- Amélioration du service et statistiques anonymisées

### 9.4 Base légale
- Exécution du contrat de vente (commandes, facturation)
- Obligation légale (conservation comptable)
- Intérêt légitime (sécurité, statistiques anonymes)
- Consentement (cookies non essentiels)

### 9.5 Durée de conservation
- Compte client : durée de vie du compte + 3 ans après dernière activité
- Factures : 10 ans (obligation comptable et fiscale)
- Logs techniques : 12 mois maximum
- Cookies : 13 mois maximum

### 9.6 Destinataires des données
Les données sont destinées exclusivement à Althea Systems et à ses sous-traitants techniques :
- **Supabase** (base de données + authentification)
- **Stripe** (traitement des paiements)
- **Resend** (envoi d'e-mails transactionnels)
- **Vercel** (hébergement de l'application)
- **Firebase / Google Cloud** (stockage des images et documents)

Aucune donnée n'est revendue ou cédée à des tiers à des fins commerciales.

### 9.7 Vos droits
Conformément aux articles 15 à 22 du RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants :
- **Droit d'accès** : connaître les données vous concernant
- **Droit de rectification** : corriger les données inexactes
- **Droit à l'effacement** (« droit à l'oubli ») : supprimer vos données
- **Droit à la limitation** du traitement
- **Droit à la portabilité** : récupérer vos données dans un format structuré
- **Droit d'opposition** au traitement
- **Droit de retirer votre consentement** à tout moment

Pour exercer ces droits, contactez-nous via [le formulaire de contact](/contact). Une réponse vous sera apportée dans un délai maximum d'un mois.

### 9.8 Réclamation auprès de la CNIL
En cas de manquement constaté, vous pouvez introduire une réclamation auprès de la Commission Nationale de l'Informatique et des Libertés (CNIL) :
- **Site web** : https://www.cnil.fr
- **Adresse** : 3 Place de Fontenoy, TSA 80715, 75334 PARIS CEDEX 07

## 10. Cookies et traceurs
Le site utilise différents types de cookies :

### 10.1 Cookies strictement nécessaires
Indispensables au fonctionnement du site (session, panier, authentification, sécurité). Ils ne nécessitent pas de consentement.

### 10.2 Cookies de mesure d'audience
Utilisés pour analyser la fréquentation et améliorer la navigation. Ils sont anonymisés.

### 10.3 Gestion des cookies
Vous pouvez à tout moment configurer vos préférences cookies via les paramètres de votre navigateur ou en utilisant les outils dédiés sur le site.

## 11. Sécurité
Althea Systems met en œuvre les mesures techniques et organisationnelles appropriées pour protéger les données personnelles contre la destruction, la perte, l'altération, la divulgation ou l'accès non autorisé :
- Chiffrement HTTPS de l'ensemble des communications
- Hachage des mots de passe (bcrypt)
- Protection CSRF sur les formulaires
- Limitation des tentatives de connexion (rate limiting)
- Authentification à double facteur pour les comptes administrateurs
- Audits de sécurité réguliers

## 12. Disponibilité du service
Althea Systems s'efforce d'assurer une disponibilité continue de la plateforme, tout en se réservant la possibilité d'interrompre temporairement l'accès pour des raisons de maintenance, de sécurité ou d'évolution technique. Aucune garantie de disponibilité ininterrompue ne peut être donnée.

## 13. Limitation de responsabilité
Althea Systems ne saurait être tenue responsable :
- Des dommages directs ou indirects résultant de l'utilisation du site
- Des contenus de sites tiers vers lesquels des liens sont proposés
- Des éventuels dysfonctionnements techniques imputables à des tiers (FAI, hébergeur, navigateur)
- D'un usage non conforme des produits acquis (notamment pour les dispositifs médicaux soumis à réglementation)

## 14. Droit applicable et juridiction
Les présentes mentions légales sont régies par le droit français. En cas de litige et à défaut de résolution amiable, les tribunaux français seront seuls compétents.

## 15. Modifications
Althea Systems se réserve le droit de modifier les présentes mentions légales à tout moment. La version en vigueur est celle accessible en ligne à la date de consultation.

*Dernière mise à jour : 2026.*`,
    },
    en: {
      title: "Legal notice",
      description:
        "Legal, technical and editorial information for the Althea Systems platform.",
      markdown: `## 1. Publisher
Althea Systems SAS, registered with the French Trade Register.

## 2. Hosting
The website is hosted by Vercel Inc. (340 S Lemon Ave #4133, Walnut, CA 91789, USA). Database hosted by Supabase, Inc. (Singapore).

## 3. Activity
B2B e-commerce platform specialized in medical equipment and supplies for healthcare professionals.

## 4. Intellectual property
All website content is protected by intellectual property law. Unauthorized reproduction is strictly prohibited.

## 5. Personal data (GDPR)
Data processing complies with the General Data Protection Regulation (EU) 2016/679 and French Data Protection Act.

You have rights to access, rectify, erase, restrict processing, and port your personal data. Contact us via the [contact form](/contact) to exercise these rights.

You may also lodge a complaint with the French Data Protection Authority (CNIL): https://www.cnil.fr

## 6. Data sub-processors
- Supabase (database)
- Stripe (payments)
- Resend (transactional emails)
- Vercel (hosting)
- Firebase (file storage)

## 7. Cookies
Strictly necessary cookies are used for site functionality. Audience measurement cookies are anonymized.

## 8. Security
HTTPS encryption, bcrypt password hashing, CSRF protection, rate limiting, admin 2FA.

## 9. Liability
Althea Systems is not liable for indirect damages, third-party site content or technical issues attributable to third parties.

## 10. Governing law
These terms are governed by French law. French courts have exclusive jurisdiction.

## Contact
For any inquiry, use the [contact form](/contact).`,
    },
    es: {
      title: "Aviso legal",
      description:
        "Información legal, técnica y editorial de la plataforma Althea Systems.",
      markdown: `## 1. Editor
Althea Systems SAS, registrada en el Registro Mercantil francés.

## 2. Alojamiento
El sitio está alojado por Vercel Inc. (Estados Unidos). La base de datos por Supabase, Inc. (Singapur).

## 3. Actividad
Plataforma de comercio electrónico B2B especializada en equipos médicos y suministros sanitarios para profesionales de la salud.

## 4. Propiedad intelectual
Todo el contenido del sitio está protegido por la ley de propiedad intelectual. La reproducción no autorizada está estrictamente prohibida.

## 5. Datos personales (RGPD)
El tratamiento de datos cumple con el Reglamento General de Protección de Datos (UE) 2016/679.

Tiene derecho de acceso, rectificación, supresión, limitación y portabilidad de sus datos personales. Contáctenos a través del [formulario de contacto](/contact).

Puede presentar una reclamación ante la AEPD (España) o la CNIL (Francia).

## 6. Subencargados del tratamiento
- Supabase (base de datos)
- Stripe (pagos)
- Resend (correos transaccionales)
- Vercel (alojamiento)
- Firebase (almacenamiento de archivos)

## 7. Cookies
Las cookies estrictamente necesarias se utilizan para el funcionamiento del sitio. Las cookies de medición de audiencia están anonimizadas.

## 8. Seguridad
Cifrado HTTPS, hash bcrypt de contraseñas, protección CSRF, limitación de intentos, 2FA para administradores.

## 9. Responsabilidad
Althea Systems no se hace responsable de daños indirectos, contenidos de sitios de terceros o problemas técnicos imputables a terceros.

## 10. Ley aplicable
Estas condiciones se rigen por la ley francesa. Los tribunales franceses tienen jurisdicción exclusiva.

## Contacto
Para cualquier consulta, utilice el [formulario de contacto](/contact).`,
    },
    ar: {
      title: "الإشعار القانوني",
      description:
        "المعلومات القانونية والتقنية والتحريرية لمنصة Althea Systems.",
      markdown: `## 1. الناشر
Althea Systems SAS، مسجلة في السجل التجاري الفرنسي.

## 2. الاستضافة
الموقع مستضاف من قبل Vercel Inc. (الولايات المتحدة). قاعدة البيانات من قبل Supabase, Inc. (سنغافورة).

## 3. النشاط
منصة تجارة إلكترونية B2B متخصصة في المعدات الطبية والمستلزمات الصحية للمهنيين الصحيين.

## 4. الملكية الفكرية
جميع محتويات الموقع محمية بقانون الملكية الفكرية. يحظر الاستنساخ غير المصرح به منعاً باتاً.

## 5. البيانات الشخصية (اللائحة العامة لحماية البيانات)
تتوافق معالجة البيانات مع اللائحة العامة لحماية البيانات (الاتحاد الأوروبي) 2016/679.

لديك حقوق الوصول والتصحيح والمحو والتقييد والنقل لبياناتك الشخصية. اتصل بنا عبر [نموذج الاتصال](/contact).

## 6. المعالجون الفرعيون للبيانات
- Supabase (قاعدة البيانات)
- Stripe (المدفوعات)
- Resend (البريد الإلكتروني المعاملاتي)
- Vercel (الاستضافة)
- Firebase (تخزين الملفات)

## 7. ملفات تعريف الارتباط
تُستخدم ملفات تعريف الارتباط الضرورية لوظائف الموقع. ملفات تعريف ارتباط قياس الجمهور مجهولة الهوية.

## 8. الأمان
تشفير HTTPS، تجزئة كلمات المرور bcrypt، حماية CSRF، الحد من المحاولات، المصادقة الثنائية للمشرفين.

## 9. المسؤولية
Althea Systems غير مسؤولة عن الأضرار غير المباشرة أو محتوى مواقع الجهات الخارجية أو المشكلات التقنية المنسوبة إلى أطراف ثالثة.

## 10. القانون المعمول به
تخضع هذه الشروط للقانون الفرنسي. للمحاكم الفرنسية اختصاص حصري.

## الاتصال
لأي استفسار، استخدم [نموذج الاتصال](/contact).`,
    },
  },
  "a-propos": {
    fr: {
      title: "À propos d'Althea Systems",
      description:
        "Althea Systems accompagne les professionnels de santé avec une plateforme e-commerce fiable, claire et orientée résultats.",
      markdown: `## Notre mission
Althea Systems est une plateforme e-commerce B2B dédiée aux professionnels du secteur médical et paramédical. Notre mission : simplifier l'approvisionnement en équipements et consommables médicaux pour permettre aux soignants de se concentrer sur l'essentiel — leurs patients.

Nous mettons à disposition un catalogue rigoureusement sélectionné, des informations produit fiables et un parcours d'achat conçu pour la rapidité et la transparence.

## Notre vision
Devenir le partenaire e-commerce de référence pour les professionnels de santé en Europe, en combinant exigence qualité, conformité réglementaire et excellence opérationnelle.

## Pour qui nous travaillons
Althea Systems s'adresse aux structures professionnelles ayant des exigences fortes en matière de continuité de service, traçabilité et qualité d'exécution :
- **Cabinets médicaux** : médecins généralistes, spécialistes, dentistes, kinésithérapeutes
- **Établissements de santé** : hôpitaux, cliniques, EHPAD, centres de soins
- **Laboratoires** d'analyses médicales et de recherche
- **Pharmacies** et officines
- **Entreprises** : équipements de premiers secours, défibrillateurs
- **Organismes de formation** médicale et paramédicale

## Notre catalogue
Nous proposons une gamme complète d'équipements médicaux organisée en catégories métier :

- **Diagnostic** : stéthoscopes, tensiomètres, oxymètres, otoscopes, thermomètres
- **Mobilier médical** : tables d'examen, fauteuils, chariots de soins
- **Hygiène & stérilisation** : autoclaves, désinfectants, distributeurs
- **Consommables** : gants, masques, compresses, pansements
- **Imagerie médicale** : échographes portables, ECG
- **Urgence & premiers secours** : défibrillateurs (DAE), trousses, BAVU

Tous les produits référencés respectent les normes européennes en vigueur (CE Médical, EN, ISO) et sont conformes au règlement (UE) 2017/745 (MDR) lorsque applicable.

## Ce qui nous distingue

### 1. Une expertise métier
Notre équipe comprend les contraintes spécifiques du secteur médical : conformité réglementaire, traçabilité des dispositifs, exigences de qualité, gestion des stocks critiques.

### 2. Une plateforme conçue pour les professionnels
- Recherche rapide pour trouver la bonne référence sans perte de temps
- Information de stock et de disponibilité en temps réel
- Fiches produit détaillées avec caractéristiques techniques complètes
- Parcours de commande optimisé pour les achats récurrents
- Espace client avec historique, factures téléchargeables et adresses sauvegardées

### 3. Une fiabilité opérationnelle
- Disponibilité continue de la plateforme
- Sauvegardes quotidiennes des données
- Sécurité renforcée (HTTPS, 2FA admin, conformité RGPD)
- Support réactif via formulaire de contact

### 4. Une démarche d'amélioration continue
La plateforme évolue de manière continue, en combinant exigences métier, retours terrain et qualité technique. Nous écoutons nos clients pour faire progresser nos services.

## Nos engagements

### Qualité produit
Sélection rigoureuse de fournisseurs reconnus, conformité aux normes européennes, contrôle qualité à réception.

### Transparence des prix
Affichage clair des prix HT et TTC, pas de frais cachés, factures détaillées et téléchargeables.

### Disponibilité de l'information
Stock visible en temps réel, fiches produit complètes, photos et caractéristiques techniques détaillées.

### Service client
Réponse rapide aux demandes, support multilingue (français, anglais, espagnol, arabe), suivi personnalisé des commandes complexes.

### Conformité réglementaire
Respect strict du RGPD pour vos données, conformité aux directives européennes sur les dispositifs médicaux, obligations comptables et fiscales.

## Notre méthode de travail
Nous faisons évoluer la plateforme de manière itérative :

1. **Écoute** : qualification des besoins fonctionnels et contraintes métier
2. **Conception** : structuration des contenus catalogue et des informations de commande
3. **Mise en production** progressive, avec mesures de robustesse et de sécurité
4. **Amélioration continue** basée sur l'usage réel et les retours utilisateurs

## Sécurité et confidentialité
Vos données et celles de vos patients sont sensibles. Nous les protégeons avec un niveau de sécurité élevé :
- Chiffrement de bout en bout (HTTPS)
- Mots de passe hachés avec bcrypt
- Authentification à double facteur pour les administrateurs
- Sauvegardes chiffrées
- Audits de sécurité réguliers
- Conformité RGPD complète

Pour plus de détails, consultez nos [mentions légales](/mentions-legales).

## Notre équipe
Althea Systems est portée par une équipe pluridisciplinaire combinant :
- Expertise du secteur médical et paramédical
- Compétences techniques en e-commerce et infrastructure cloud
- Spécialistes du support client et de la logistique

## Vision long terme
Nous construisons une plateforme e-commerce durable, capable de s'adapter aux exigences des organisations professionnelles, à la croissance des catalogues et à l'évolution des usages numériques. Notre engagement : faire d'Althea Systems une référence dans l'approvisionnement médical professionnel.

## Vous accompagner au quotidien
Que vous soyez un cabinet libéral en quête de fiabilité ou un établissement hospitalier nécessitant des volumes importants, notre plateforme s'adapte à vos besoins :
- **Tarifs préférentiels** pour les commandes récurrentes (sur demande)
- **Devis personnalisés** pour les achats en volume
- **Conditions de paiement** adaptées aux structures professionnelles
- **Suivi dédié** pour les comptes clés

## Continuer la visite
Découvrez [notre catalogue](/catalogue), utilisez [la recherche](/recherche) ou [contactez-nous](/contact) pour échanger avec notre équipe.

*Althea Systems — L'équipement médical professionnel, simplifié.*`,
    },
    en: {
      title: "About Althea Systems",
      description:
        "Althea Systems supports healthcare professionals with a reliable, transparent and result-oriented e-commerce platform.",
      markdown: `## Our mission
Althea Systems is a B2B e-commerce platform dedicated to medical and paramedical professionals. Our mission: simplify the procurement of medical equipment and supplies, allowing healthcare providers to focus on what matters most — their patients.

## Who we serve
- Medical practices (GPs, specialists, dentists, physiotherapists)
- Healthcare facilities (hospitals, clinics, nursing homes)
- Medical and research laboratories
- Pharmacies
- Companies (first aid kits, defibrillators)
- Medical training organizations

## Our catalog
Comprehensive range of medical equipment organized by category:
- **Diagnostics**: stethoscopes, blood pressure monitors, oximeters
- **Medical furniture**: examination tables, chairs, trolleys
- **Hygiene & sterilization**: autoclaves, disinfectants
- **Consumables**: gloves, masks, dressings
- **Medical imaging**: portable ultrasound, ECG
- **Emergency & first aid**: AEDs, first aid kits

All products comply with European standards (CE Medical, EN, ISO) and EU MDR (2017/745) where applicable.

## Our commitments
- **Product quality**: rigorous supplier selection, compliance with European standards
- **Price transparency**: clear HT/TTC display, no hidden fees
- **Information availability**: real-time stock, detailed product sheets
- **Customer service**: fast response, multilingual support
- **Regulatory compliance**: GDPR, MDR, accounting obligations

## Security and privacy
Your data is protected with HTTPS encryption, bcrypt password hashing, admin 2FA, encrypted backups, regular security audits, and full GDPR compliance.

## Continue exploring
Browse [our catalog](/catalogue), use the [search](/recherche), or [contact us](/contact).

*Althea Systems — Professional medical equipment, simplified.*`,
    },
    es: {
      title: "Acerca de Althea Systems",
      description:
        "Althea Systems acompaña a los profesionales sanitarios con una plataforma de comercio electrónico fiable, transparente y orientada a resultados.",
      markdown: `## Nuestra misión
Althea Systems es una plataforma de comercio electrónico B2B dedicada a los profesionales médicos y paramédicos. Nuestra misión: simplificar el aprovisionamiento de equipos y suministros médicos para que los profesionales sanitarios se concentren en lo esencial: sus pacientes.

## A quién servimos
- Consultorios médicos (médicos generales, especialistas, dentistas, fisioterapeutas)
- Centros sanitarios (hospitales, clínicas, residencias)
- Laboratorios médicos y de investigación
- Farmacias
- Empresas (botiquines, desfibriladores)
- Organismos de formación médica

## Nuestro catálogo
Gama completa de equipos médicos organizada por categorías:
- **Diagnóstico**: estetoscopios, tensiómetros, oxímetros
- **Mobiliario médico**: camillas, sillones, carros
- **Higiene y esterilización**: autoclaves, desinfectantes
- **Consumibles**: guantes, mascarillas, gasas
- **Imagen médica**: ecógrafos portátiles, ECG
- **Urgencias y primeros auxilios**: DEAs, botiquines

Todos los productos cumplen con las normas europeas (CE Médico, EN, ISO) y el Reglamento UE 2017/745 (MDR) cuando aplica.

## Nuestros compromisos
- **Calidad del producto**: selección rigurosa de proveedores, cumplimiento normativo
- **Transparencia de precios**: visualización clara HT/TTC, sin costes ocultos
- **Disponibilidad de información**: stock en tiempo real, fichas detalladas
- **Atención al cliente**: respuesta rápida, soporte multilingüe
- **Cumplimiento normativo**: RGPD, MDR, obligaciones contables

## Seguridad y privacidad
Sus datos están protegidos con cifrado HTTPS, hash bcrypt, 2FA para administradores, copias de seguridad cifradas, auditorías de seguridad regulares y cumplimiento completo del RGPD.

## Continuar la visita
Descubra [nuestro catálogo](/catalogue), use la [búsqueda](/recherche) o [contáctenos](/contact).

*Althea Systems — Equipamiento médico profesional, simplificado.*`,
    },
    ar: {
      title: "حول Althea Systems",
      description:
        "تدعم Althea Systems المهنيين الصحيين بمنصة تجارة إلكترونية موثوقة وشفافة وموجهة نحو النتائج.",
      markdown: `## مهمتنا
Althea Systems هي منصة تجارة إلكترونية B2B مخصصة للمهنيين الطبيين. مهمتنا: تبسيط شراء المعدات والمستلزمات الطبية للسماح لمقدمي الرعاية الصحية بالتركيز على الأهم — مرضاهم.

## من نخدم
- العيادات الطبية (الأطباء العامون والأخصائيون وأطباء الأسنان)
- المرافق الصحية (المستشفيات والعيادات ودور الرعاية)
- المختبرات الطبية والبحثية
- الصيدليات
- الشركات (مجموعات الإسعافات الأولية، مزيلات الرجفان)
- منظمات التدريب الطبي

## كتالوجنا
مجموعة شاملة من المعدات الطبية منظمة حسب الفئة:
- **التشخيص**: سماعات الطبيب، أجهزة قياس الضغط، مقاييس الأكسجين
- **الأثاث الطبي**: طاولات الفحص، الكراسي، العربات
- **النظافة والتعقيم**: الأوتوكلاف، المطهرات
- **المستهلكات**: القفازات، الأقنعة، الضمادات
- **التصوير الطبي**: أجهزة الموجات فوق الصوتية المحمولة، تخطيط القلب
- **الطوارئ والإسعافات الأولية**: مزيلات الرجفان، مجموعات الإسعافات الأولية

جميع المنتجات تتوافق مع المعايير الأوروبية (CE Medical, EN, ISO) ولائحة الاتحاد الأوروبي 2017/745 (MDR) حيثما ينطبق.

## التزاماتنا
- **جودة المنتج**: اختيار صارم للموردين، الامتثال للمعايير الأوروبية
- **شفافية الأسعار**: عرض واضح للأسعار، بدون رسوم خفية
- **توفر المعلومات**: المخزون في الوقت الفعلي، أوراق المنتج التفصيلية
- **خدمة العملاء**: استجابة سريعة، دعم متعدد اللغات
- **الامتثال التنظيمي**: اللائحة العامة لحماية البيانات، MDR

## الأمان والخصوصية
بياناتك محمية بتشفير HTTPS، تجزئة كلمات المرور bcrypt، المصادقة الثنائية للمشرفين، النسخ الاحتياطية المشفرة، عمليات تدقيق الأمان المنتظمة، والامتثال الكامل للائحة العامة لحماية البيانات.

## مواصلة الزيارة
اكتشف [كتالوجنا](/catalogue)، استخدم [البحث](/recherche) أو [اتصل بنا](/contact).

*Althea Systems — المعدات الطبية المهنية، مبسّطة.*`,
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
