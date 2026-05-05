# Document de Cadrage – Althea Systems E-Commerce

## Table des matières

1. Présentation du projet et reformulation du besoin
   - 1.1 Contexte et enjeux
   - 1.2 Périmètre fonctionnel
2. Analyse des besoins
   - 2.1 Identification des besoins fonctionnels
   - 2.2 Objectifs techniques
   - 2.3 Contraintes techniques
3. Choix technologiques
   - 3.1 Stack retenue et justification
   - 3.2 Architecture technique globale
   - 3.3 Besoins couverts par la stack
   - 3.4 Impact à long terme
4. Approche méthodologique
   - 4.1 Méthodologie retenue
   - 4.2 Outils de gestion et de collaboration
   - 4.3 Répartition des rôles et responsabilités
5. Planification du projet
   - 5.1 Phases et jalons
   - 5.2 Dépendances critiques
6. Plan de projet détaillé et livrables par phase
   - 6.1 Découpage en étapes et livrables attendus
7. Veille technologique
   - 7.1 Technologie clé surveillée
   - 7.2 Exemple concurrentiel
   - 7.3 Norme essentielle applicable
8. Conclusion


## 1. Présentation du projet et reformulation du besoin

### 1.1 Contexte et enjeux

Althea Systems est une entreprise spécialisée dans la distribution de matériel médical de pointe à destination des professionnels de santé : cabinets médicaux, cliniques et établissements spécialisés. Dans un contexte de digitalisation accélérée des achats B2B dans le secteur médical, Althea Systems entreprend la refonte complète de sa présence en ligne en remplacement du site vitrine existant althea-group.com, lequel ne répondait plus aux exigences d'un parcours d'achat professionnel moderne : absence de tunnel d'achat en ligne, impossibilité de gérer un catalogue produit dynamique, aucun support multilingue, et interface non adaptée aux terminaux mobiles. En adressant directement ces lacunes, la nouvelle plateforme vise à convertir une audience professionnelle qualifiée en acheteurs actifs et à ouvrir des marchés à l'international, avec un impact direct attendu sur le chiffre d'affaires d'Althea Systems.

Le projet consiste à concevoir et développer de zéro une plateforme e-commerce B2B mobile-first, adossée à un backoffice de gestion intégré permettant aux équipes d'Althea Systems d'administrer de façon autonome l'intégralité du contenu, des commandes et des utilisateurs. La plateforme vise les marchés francophones, anglophones, arabophones et hispanophones, imposant une architecture multilingue avec support natif du sens de lecture droite-à-gauche (RTL) pour le marché arabophone.

**Enjeux business**

La refonte répond à trois enjeux stratégiques majeurs. La digitalisation du processus de vente B2B transforme un catalogue statique en une plateforme transactionnelle complète : recherche avancée, panier persistant, paiement sécurisé, génération automatique de factures et d'avoirs. La captation de nouveaux marchés s'appuie sur la disponibilité de la plateforme en quatre langues avec des URL localisées, permettant un référencement organique dans chaque zone géographique. L'autonomie opérationnelle des équipes internes est garantie par un backoffice complet ne nécessitant aucune intervention technique pour les opérations courantes.

**Enjeux techniques**

La plateforme doit garantir des performances de recherche inférieures à 100 ms pour satisfaire les exigences de productivité des acheteurs professionnels. La sécurité des données personnelles et des transactions doit respecter le RGPD, les recommandations de la CNIL et la norme PCI-DSS pour le traitement des paiements. L'architecture doit être scalable pour absorber une montée en charge liée à l'expansion internationale, et l'accessibilité WCAG 2.1 niveau AA est requise pour satisfaire aux politiques d'achat des établissements de santé publics.

### 1.2 Périmètre fonctionnel

Le périmètre fonctionnel est organisé par module. La mention (MVP) indique une fonctionnalité critique sans laquelle la plateforme ne peut pas être livrée ; la mention (Secondaire) indique une fonctionnalité planifiée au-delà du premier jalon livrable.

**Module Authentification**

- Inscription utilisateur avec vérification d'adresse e-mail (MVP)
- Connexion et déconnexion (MVP)
- Réinitialisation de mot de passe par lien tokenisé SHA256 (MVP)
- Authentification administrateur avec double facteur par e-mail — code à 6 chiffres (MVP)

**Module Catalogue**

- Liste paginée des produits par catégorie avec tri et filtres (MVP)
- Page détail produit avec spécifications techniques en champ JSONB libre (MVP)
- Produits similaires sur la fiche produit — 6 références de la même catégorie (Secondaire)

**Module Recherche**

- Recherche plein texte avec scoring multi-niveaux (MVP)
- Facettes de filtrage : catégorie, fourchette de prix, disponibilité (MVP)

**Module Panier**

- Panier persistant pour utilisateur connecté et invité via cookie signé HMAC (MVP)
- Fusion automatique du panier invité dans le panier utilisateur à la connexion (MVP)

**Module Checkout**

- Processus de commande multi-étapes : adresse, paiement, confirmation (MVP)
- Paiement sécurisé par carte bancaire via Stripe avec tokenisation (MVP)
- Génération automatique de facture PDF à la confirmation de commande (MVP)

**Module Compte client**

- Espace compte : profil, adresses, moyens de paiement enregistrés (MVP)
- Historique des commandes avec suivi et détail de statut (MVP)
- Téléchargement des factures et avoirs en PDF (MVP)

**Module Backoffice Admin**

- Gestion des produits : CRUD, import CSV, export CSV/JSON, images Firebase (MVP)
- Gestion des catégories : CRUD, réordonnancement, images (MVP)
- Gestion des commandes et workflow de statut (MVP)
- Gestion des utilisateurs : liste, profil, reset de mot de passe (MVP)
- Tableau de bord KPI : revenus, commandes, utilisateurs actifs (MVP)
- Gestion des factures et avoirs : PDF, envoi e-mail (Secondaire)
- Carrousel éditorial avec rich text et images (Secondaire)
- Grille « Top produits » sur la page d'accueil (Secondaire)
- Textes fixes de la page d'accueil éditables par locale (Secondaire)
- Éditeur des pages statiques par locale (Secondaire)
- Configuration et gestion du chatbot IA (Secondaire)

**Module Chatbot IA**

- Chatbot IA avec base de connaissances produits médicaux et RAG (Secondaire)
- Escalade vers un opérateur humain depuis le chatbot (Secondaire)

**Module Internationalisation**

- Prise en charge de 4 langues : français, anglais, arabe, espagnol (MVP)
- Support RTL automatique pour la langue arabe (MVP)
- URLs localisées par préfixe de locale (MVP)

**Module Layout et Navigation**

- En-tête, menu de navigation mobile-first et pied de page responsifs (MVP)
- Pages statiques localisées : CGU, Mentions légales, À propos (MVP)
- Formulaire de contact avec stockage en base et notification admin (MVP)

**Conformité transversale**

- Accessibilité WCAG 2.1 niveau AA (MVP)
- Conformité RGPD et recommandations CNIL (MVP)
- Documentation API interactive Swagger / OpenAPI (Secondaire)


## 2. Analyse des besoins

### 2.1 Identification des besoins fonctionnels

Les besoins fonctionnels sont détaillés ci-dessous par module. Chaque description s'appuie sur le schéma de base de données effectivement implémenté (15 tables Supabase) et sur les endpoints API réalisés.

**Module Catalogue**

Le catalogue constitue le cœur de l'expérience d'achat. Les produits sont organisés en catégories (`categorie`), chacune disposant d'un `slug` URL unique. La liste des produits d'une catégorie est paginée à 12 éléments par page et triée selon trois niveaux calculés côté serveur : tier 0 (produits en stock avec `priorite > 0`), tier 1 (produits en stock sans priorité explicite), tier 2 (produits en rupture de stock). Au sein de chaque tier, le classement s'effectue par valeur de `priorite` décroissante. Les images de catégorie sont stockées dans Firebase Storage et référencées en base Supabase en fallback via le champ `image_url`. Ce module est priorité MVP, de complexité moyenne, et constitue la première surface visible pour tout visiteur de la plateforme.

**Module Produit**

Chaque fiche produit expose le nom, la description, les caractéristiques techniques (champ `JSONB` permettant un schéma libre adapté à chaque gamme de matériel médical : dimensions, compatibilités, certifications), le prix HT, le taux de TVA applicable (0 %, 5,5 %, 10 % ou 20 %), le prix TTC calculé, le statut de disponibilité et six références similaires issues de la même catégorie. Ce module est priorité MVP pour la fiche de base, de complexité moyenne ; l'affichage des produits similaires est planifié en secondaire.

**Module Recherche**

La recherche plein texte couvre les champs `nom` et `description` des produits. Le scoring est multi-niveaux : correspondance exacte, différence d'un caractère (tolérance typographique), correspondance en début de mot, occurrence dans la chaîne. Les facettes disponibles sont : catégorie, fourchette de prix, disponibilité. Un endpoint dédié `/api/search/facets` retourne dynamiquement les options disponibles. La cible de performance est inférieure à 100 ms hors latence réseau. Ce module est priorité MVP, de complexité élevée, et représente l'un des investissements techniques les plus significatifs du projet.

**Module Panier**

Le panier supporte deux modes simultanés. Le mode invité identifie la session par un `session_id` dans un cookie `httpOnly` signé HMAC, persisté dans la table `panier` avec index sur `session_id`. Le mode authentifié lie le panier à l'`id_utilisateur`. La contrainte `UNIQUE (id_panier, id_produit)` sur `ligne_panier` empêche les doublons, et l'endpoint `/api/auth/merge-cart` fusionne le panier invité dans le panier utilisateur à la connexion. Ce module est priorité MVP, de complexité élevée, car son bon fonctionnement conditionne l'ensemble du tunnel de conversion.

**Module Authentification**

L'inscription via `/api/auth/signup` crée un enregistrement dans Supabase Auth et une entrée dans `utilisateur` avec `email_verifie = false`. Une vérification par e-mail est requise avant la première connexion. La réinitialisation de mot de passe repose sur un token hashé (SHA256) dans `mot_de_passe_reset_token` avec expiration. Les administrateurs sont soumis à un second facteur : code à 6 chiffres généré par `crypto.randomInt()`, hashé, transmis par e-mail, valide 10 minutes, avec verrouillage après 5 tentatives et cookie 2FA HMAC-SHA256 de 8 heures. Ce module est priorité MVP intégral, de complexité élevée pour la partie 2FA admin.

**Module Checkout**

Le processus est multi-étapes : sélection ou saisie d'une adresse, sélection d'un moyen de paiement Stripe, confirmation. Une `PaymentIntent` Stripe est créée côté serveur ; la tokenisation de la carte s'effectue exclusivement par Stripe.js dans le navigateur. À la confirmation, un numéro au format `YYYYMMDD-XXXXXX` est généré, la commande est persistée dans `commande` et `ligne_commande`, une facture PDF est générée via pdfkit, et un e-mail est envoyé via Resend. Ce module est priorité MVP, de complexité élevée, et constitue le jalon le plus structurant du Sprint 3.

**Module Compte client**

L'espace compte expose le profil, la gestion des adresses postales (CRUD), les moyens de paiement Stripe enregistrés, l'historique des commandes avec statuts, et le téléchargement des factures et avoirs en PDF. Les préférences de langue sont stockées en base. Ce module est priorité MVP, de complexité moyenne, et représente la vitrine de la relation post-achat entre Althea et ses clients professionnels.

**Module Backoffice Admin**

Accessible uniquement après Supabase Auth + 2FA validé, le backoffice couvre la gestion complète des produits (CRUD, import CSV, images Firebase, spécifications JSONB, stock, marquage « top produit »), des catégories (CRUD, réordonnancement), du carrousel, des commandes (workflow en_attente → en_cours → terminée avec historique), des utilisateurs, des factures et avoirs, des messages de contact, de la configuration du chatbot, des pages statiques et des textes fixes de la page d'accueil. Un tableau de bord KPI synthétise les métriques clés. Le cœur du module (produits, catégories, commandes, utilisateurs, KPI) est MVP, les fonctionnalités éditoriales sont secondaires, la complexité globale est élevée.

**Module Chatbot IA**

Développé par Killian (QA/PO), le chatbot repose sur le modèle Groq `llama-3.1-8b-instant` accessible via le SDK Groq 1.1.2. Les conversations sont persistées dans Firebase Firestore (modèle document : conversation → messages). Une base de connaissances produits est interrogée selon une approche RAG. L'escalade vers un opérateur humain est disponible depuis l'interface chatbot et gérable depuis le backoffice. La fonctionnalité est entièrement optionnelle : l'absence de `GROQ_API_KEY` la désactive sans impact sur le reste de la plateforme. Ce module est secondaire, de complexité élevée, et représente la contribution distinctive de Killian au projet.

**Module i18n**

Quatre locales sont supportées : `fr` (par défaut), `en`, `ar`, `es`. La locale arabe active automatiquement l'attribut `dir="rtl"` sur le document HTML. Les URLs sont préfixées par la locale. Les fichiers JSON totalisent plus de 3 500 lignes de traductions. Les pages statiques et textes fixes sont stockés en base avec une clé `(slug, locale)` unique. Ce module est MVP intégral et d'une complexité moyenne à élevée, le support RTL nécessitant une attention particulière lors des phases de recette visuelle.

### 2.2 Objectifs techniques

Le tableau ci-dessous liste les objectifs techniques mesurables dont l'atteinte conditionne la réception du projet.

| Objectif | Indicateur | Cible |
|---|---|---|
| Performance de la recherche | Temps de réponse `/api/search` | < 100 ms |
| Temps de chargement (LCP) | Lighthouse LCP mobile | < 2,5 s |
| Accessibilité | Score Lighthouse Accessibility | ≥ 90 / 100 |
| Conformité RGPD / CNIL | Audit légal des traitements | 100 % documenté |
| Sécurité du paiement | Audit PCI-DSS SAQ A | Zéro PAN côté Althea |
| Rendu RTL | Recette visuelle arabe multi-navigateurs | Zéro anomalie |
| Disponibilité de la plateforme | Uptime 30 jours Vercel + Supabase | ≥ 99,5 % |
| Sécurité applicative | Audit OWASP Top 10 | Zéro vulnérabilité critique |
| Couverture de tests | Tests Vitest passants en CI | 115 tests verts |
| Durée du pipeline CI | Workflow `ci.yml` complet | < 20 minutes |

Précisions sur les indicateurs :

- **Performance recherche :** temps mesuré sur l'endpoint `/api/search` en environnement CI, hors latence réseau.
- **LCP mobile :** mesuré via Lighthouse Core Web Vitals sur connexion 4G simulée, pages home, catalogue et fiche produit.
- **Accessibilité :** score mesuré sur les pages principales (home, catalogue, fiche produit, checkout, compte).
- **RGPD / CNIL :** audit couvrant collecte minimale, droit à l'effacement, hashage des mots de passe et durées de conservation documentées.
- **Rendu RTL :** absence de régression de mise en page en arabe sur Chrome, Firefox et Safari mobile en version N-1.
- **Tests automatisés :** 115 tests Vitest verts à chaque pull request ; merge dans `main` bloqué si un test échoue.

### 2.3 Contraintes techniques

**Contraintes client**

Althea Systems a posé quatre contraintes de stack dès le cadrage initial, validées formellement avant le démarrage des développements : un framework unique pour le front-end et la couche API, un framework unique pour le back-end, une base de données NoSQL pour les images et les conversations chatbot, et une base de données relationnelle pour l'ensemble des données métier. Ces contraintes ont directement conduit aux choix de Next.js, Supabase PostgreSQL et Firebase Firestore/Storage. Aucun développement n'a débuté avant la validation écrite de cette stack.

**Contraintes légales et normatives**

Le RGPD (Règlement UE 2016/679) impose une collecte limitée au strict nécessaire, un consentement explicite pour les usages non contractuels, le droit à l'effacement et une durée de conservation documentée. Les recommandations CNIL imposent le hashage des mots de passe (Supabase Auth utilise bcrypt) et l'interdiction de les stocker ou transmettre en clair. La norme PCI-DSS SAQ A impose que les données de carte bancaire ne transitent jamais par les serveurs Althea : la tokenisation est intégralement déléguée à Stripe.js dans le navigateur. La conformité WCAG 2.1 niveau AA impose des ratios de contraste ≥ 4,5:1, la navigation complète au clavier, des alternatives textuelles aux images fonctionnelles et la compatibilité avec les lecteurs d'écran.

**Contraintes de performance et de compatibilité**

Le design est mobile-first avec des breakpoints définis à xs (480 px), sm (640 px), md (768 px), lg (1 024 px) et xl (1 280 px). Le support RTL pour l'arabe est obligatoire sans dégradation de la mise en page. La compatibilité navigateurs couvre Chrome, Firefox, Safari (desktop et mobile) et Edge en version N-1. Les résultats de recherche doivent être disponibles en moins de 100 ms hors latence réseau. Toutes les routes GET publiques renvoient des données de fallback éditorial en cas d'indisponibilité de Supabase, sans exposer d'erreur 500 au client.


## 3. Choix technologiques

### 3.1 Stack retenue et justification

La stack technologique a été validée par le client avant le démarrage des développements, conformément aux contraintes exposées en section 2.3. Chaque technologie retenue répond à un besoin concret du projet et s'articule avec les autres pour former une architecture cohérente.

**Next.js**

Next.js 16.1.6 est le framework full-stack central du projet, répondant directement à la contrainte client d'un seul framework pour le front-end et la couche API. Il héberge les 97 endpoints REST dans ses API routes et gère le rendu des pages via l'App Router. Le React Compiler activé (`reactCompiler: true` dans `next.config.ts`) optimise automatiquement les re-renders des listes de produits et des tableaux de bord admin. Les Server Components (RSC) réduisent le LCP mobile et le bundle JavaScript envoyé au client. Les headers de sécurité (CSP, HSTS 2 ans, X-Frame-Options, Referrer-Policy) sont configurés nativement dans le fichier de configuration.

**React**

React 19.2.3 est requis par Next.js 16. Cette version apporte les actions serveur stables, le React Compiler et une gestion optimisée des transitions de rendu. Les composants React encapsulent la logique UI en unités indépendantes et réutilisables entre le catalogue public et le backoffice admin, réduisant la surface d'attaque XSS par le modèle de rendu contrôlé. La compatibilité avec shadcn/ui et les composants Radix UI est garantie sur React 19, préservant la cohérence du système de design sur toute la plateforme.

**TypeScript**

TypeScript 5.x en mode strict est activé sur l'intégralité du codebase. Le typage statique détecte à la compilation les erreurs sur les réponses API Supabase, les props de composants et les paramètres de route, ce qui est critique sur un projet de 97 endpoints et 15 tables. Il prévient les erreurs null/undefined sur les données sensibles comme les commandes, les factures et les tokens 2FA, et rend les refactorings sécurisés par inférence de types.

**Tailwind CSS**

Tailwind CSS 3.4.17 génère uniquement les classes CSS utilisées (purge automatique), garantissant un bundle minimal en production. Il gère nativement le sens de lecture droite-à-gauche via l'attribut `dir="rtl"` sans surcoût de style, répondant à l'exigence RTL pour le marché arabophone. Les plugins `@tailwindcss/typography` et `@tailwindcss/forms` couvrent respectivement le rendu des contenus Markdown des pages statiques et les formulaires d'administration. Les tokens de design (`brand-cta #00a8b5`, `brand-nav #003d5c`, breakpoint xs à 480 px) sont déclarés une seule fois dans `tailwind.config.ts`.

**shadcn/ui**

shadcn/ui (new-york / neutral) est une bibliothèque de composants dont le code source est copié dans le projet plutôt que publié en dépendance npm, permettant une personnalisation totale sans risque de rupture de version. Les composants sont construits sur Radix UI, qui fournit l'accessibilité par défaut : gestion du focus, navigation au clavier, attributs ARIA — répondant directement à l'exigence WCAG 2.1. Les composants Dialog, Dropdown, Toast, Sheet et Table sont utilisés de manière intensive dans le backoffice admin.

**Supabase**

Supabase (supabase-js 2.98) répond à la contrainte client « une base relationnelle ». Il fournit en une seule plateforme PostgreSQL (15 tables métier), Row-Level Security activée sur toutes les tables, Supabase Auth avec JWT, refresh tokens, vérification e-mail et reset de mot de passe, et des sessions via cookies httpOnly. Quatorze index de performance sont définis sur les colonnes critiques — recherche, panier, commandes, historique de statut. Le cloisonnement des données par `auth.uid()` via RLS empêche tout accès inter-utilisateurs sans code applicatif supplémentaire.

**Firebase**

Firebase (firebase-admin 13.7) répond à la contrainte client « une base NoSQL ». Firebase Storage héberge les images produits, catégories et carrousel, distribuées via le CDN mondial Firebase avec faible latence internationale. Firestore stocke les conversations chatbot dans un modèle document naturellement adapté aux données non structurées (conversation → collection de messages). Le SDK Firebase Admin est utilisé côté serveur uniquement, via les clés de service stockées en variables d'environnement.

**Stripe**

Stripe 22.0.0 est le prestataire de paiement retenu pour sa certification PCI-DSS Level 1 en mode tokenisation complète : la carte est tokenisée par Stripe.js dans le navigateur, sans que les données de carte (PAN, CVV, date d'expiration) ne transitent jamais par les serveurs Althea. Les PaymentIntents sont créés côté serveur via la clé secrète ; les identifiants de cartes enregistrées sont stockés comme `stripe_payment_id`, jamais en données brutes.

**Resend**

Resend 6.10.0 assure l'envoi de tous les e-mails transactionnels depuis le domaine `commandes@althea-systems.fr` : confirmations de commande, factures, codes 2FA admin, liens de reset de mot de passe. La délivrabilité est garantie par DKIM, SPF et DMARC. Les templates HTML sont systématiquement protégés par la fonction `escapeHtml()` pour prévenir toute injection de contenu. La dépendance au prestataire se réduit à une variable d'environnement (`RESEND_API_KEY`), rendant un éventuel remplacement transparent pour le reste du codebase.

**next-intl**

next-intl 4.8.3 s'intègre nativement avec l'App Router de Next.js : middleware de détection et de redirection de locale, traductions côté serveur via `getTranslations`, traductions côté client via `useTranslations`, URLs préfixées par locale, et détection RTL via `isRtlLocale()`. Les 3 510 lignes de traductions réparties sur quatre fichiers JSON couvrent les marchés francophone, anglophone, arabophone et hispanophone. L'ajout d'une cinquième locale se résume à la création d'un fichier JSON et une ligne de configuration, sans modification de code.

**Groq SDK**

Le SDK Groq 1.1.2 donne accès au modèle `llama-3.1-8b-instant` sur l'infrastructure GroqCloud, dont le temps d'inférence est inférieur à 200 ms — essentiel pour une expérience chatbot fluide. Le chatbot interroge une base de connaissances produits médicaux selon une approche RAG avant chaque génération. Les entrées utilisateur sont sanitisées avant transmission au modèle. La fonctionnalité est optionnelle : l'absence de la variable `GROQ_API_KEY` désactive silencieusement le chatbot sans impact sur le reste de la plateforme.

**pdfkit**

pdfkit 0.18.0 génère les factures et avoirs PDF directement en stream depuis les API routes Next.js, sans dépendance à un navigateur headless. La génération est synchrone en mémoire, ce qui évite les coûts de démarrage d'un processus externe dans un environnement serverless. L'URL du PDF généré est stockée dans le champ `facture.url_pdf` et disponible immédiatement pour téléchargement depuis l'espace compte client.

**Vitest**

Vitest 4.0.18 est le framework de tests retenu pour sa compatibilité native avec l'écosystème ESM de Next.js. Les 115 tests couvrent les endpoints API, les utilitaires de sécurité (CSRF, sanitize, rateLimiter, 2FA), les flux de checkout complets, la génération PDF, le scoring de recherche et les validations de formulaires. Les vecteurs d'attaque (injection, CSRF, brute force, vol de session) sont explicitement testés. La suite s'exécute en parallèle en moins de 2 minutes et est intégrée au pipeline CI, bloquant tout merge en cas d'échec.

**GitHub Actions**

Deux workflows automatisent la validation du code. Le workflow `ci.yml` s'exécute à chaque pull request et à chaque push sur `main` : lint ESLint, puis 115 tests Vitest, puis build Next.js, en moins de 20 minutes. Le workflow `nightly-full-tests.yml` exécute chaque nuit à 2 h UTC la suite complète avec pnpm sur Node.js 20, avec un timeout de 45 minutes. Les secrets d'environnement sont gérés par GitHub Secrets et jamais exposés dans le dépôt.

**Vercel**

Vercel est la plateforme d'hébergement native Next.js retenue pour ses déploiements automatiques sur push, son CDN mondial pour les assets statiques, ses serverless functions pour les 97 API routes et ses preview deployments automatiques sur chaque pull request. Le cold start des fonctions serverless est inférieur à 500 ms. Le scaling est automatique à la demande sans aucune gestion d'infrastructure, ce qui convient à une équipe de trois personnes sans opérateur dédié.

### 3.2 Architecture technique globale

L'architecture d'Althea Systems est une architecture serverless full-stack mono-dépôt dans laquelle Next.js joue le rôle d'orchestrateur central entre le navigateur client et les services tiers. La plateforme repose sur cinq couches distinctes : le navigateur exécute les composants React interactifs et Stripe.js pour la tokenisation des cartes ; Next.js déployé sur Vercel orchestre le rendu côté serveur via les Server Components et expose les 97 API routes serverless ; Supabase héberge les 15 tables PostgreSQL avec RLS et gère l'authentification ; Firebase Storage distribue les images produits et carrousel via CDN mondial tandis que Firestore persiste les conversations chatbot ; les services tiers — Stripe pour le paiement, Resend pour les e-mails transactionnels, Groq pour l'inférence LLM — sont appelés exclusivement depuis la couche Next.js, sans exposition directe au navigateur client.

**Couche présentation — Navigateur**

Le navigateur exécute les composants React marqués `"use client"` (formulaires, panier interactif, backoffice, chatbot). Les composants purement d'affichage (catalogue, fiche produit, page d'accueil) sont des Server Components rendus côté serveur, réduisant le JavaScript envoyé au client. Les requêtes sont transmises aux API routes via `fetch` avec `AbortController` pour annuler les requêtes obsolètes lors d'une navigation rapide dans le catalogue. Stripe.js est chargé côté client exclusivement pour la tokenisation des cartes bancaires.

**Couche applicative — Next.js sur Vercel**

Les 97 API routes exposent les endpoints REST organisés en domaines fonctionnels : authentification, panier, catalogue, checkout, compte, admin, chatbot, contact. Chaque route valide les entrées (sanitisation XSS via `sanitizeText()`, vérification CSRF via contrôle des en-têtes Origin/Host, rate limiting par IP), interroge Supabase ou Firebase via les clients admin, puis retourne une réponse JSON. Les routes GET publiques renvoient systématiquement des données de fallback éditorial en cas d'erreur base de données, sans exposer d'erreur 500.

**Couche données — Supabase (PostgreSQL)**

Supabase héberge les 15 tables métier avec RLS activée sur toutes : utilisateurs, catégories, produits, paniers et lignes de panier, commandes et lignes de commande, factures, avoirs, adresses, moyens de paiement, carrousel, pages statiques, textes fixes, messages de contact, tokens de reset et historique de statut. Les opérations admin utilisent le client service role (bypassant RLS) uniquement depuis les routes protégées par `verifyAdminAccess()`.

**Couche données — Firebase**

Firebase Storage héberge les images produits, catégories et carrousel, distribuées via le CDN Firebase mondial. Firestore stocke les conversations chatbot selon un modèle document : chaque conversation contient une collection de messages horodatés. Le SDK Firebase Admin est utilisé côté serveur uniquement, les clés de service étant stockées dans les variables d'environnement.

**Services tiers**

Stripe gère la tokenisation des cartes via Stripe.js côté client et la confirmation des PaymentIntents côté serveur. Resend envoie les e-mails transactionnels depuis `commandes@althea-systems.fr`. Groq fournit l'inférence LLM pour le chatbot via appel API REST depuis les routes serveur.

**Flux de données principal — Commande complète**

L'utilisateur consulte le catalogue (RSC → Supabase) et ajoute un produit au panier (POST `/api/cart/items` → table `ligne_panier`). Il initie le checkout (GET `/api/checkout/addresses` → table `adresse`). Un PaymentIntent est créé côté serveur (POST `/api/checkout/payment-intent` → Stripe API). L'utilisateur soumet le paiement (Stripe.js confirme le PaymentIntent dans le navigateur). Le serveur confirme la commande (POST `/api/checkout/confirm` → tables `commande` + `ligne_commande` + `facture`). Une facture PDF est générée via pdfkit et un e-mail de confirmation est envoyé via Resend.

### 3.3 Besoins couverts par la stack

Le tableau ci-dessous met en correspondance les principaux besoins identifiés en partie 2 avec les solutions techniques retenues et leur mode de couverture.

| Besoin identifié | Solution retenue | Couverture |
|---|---|---|
| Catalogue multilingue, URLs localisées | Next.js App Router + next-intl 4.8.3 | Middleware de locale, routes `[locale]`, 3 510 lignes de traductions |
| Support RTL arabe | next-intl `isRtlLocale()` + Tailwind CSS | `dir="rtl"` automatique ; Tailwind gère les variantes RTL |
| Recherche plein texte < 100 ms | PostgreSQL index full-text + scoring JS | Index sur `nom` et `description` ; scoring multi-niveaux en mémoire |
| Panier invité persistant | Cookie HMAC signé + table `panier` | `session_id` en base avec index ; fusion via `/api/auth/merge-cart` |
| Paiement sécurisé PCI-DSS | Stripe tokenisation + HTTPS HSTS 2 ans | Zéro PAN côté Althea ; PCI-DSS L1 délégué à Stripe |
| Factures PDF automatisées | pdfkit + API routes Next.js | Stream serveur ; URL dans `facture.url_pdf` |
| E-mails transactionnels | Resend `@althea-systems.fr` | DKIM/SPF/DMARC ; templates protégés par `escapeHtml()` |
| Images produits avec CDN | Firebase Storage | URLs publiques CDN ; fallback `image_url` Supabase |
| Chatbot IA avec RAG | Groq SDK + Firestore | Inférence < 200 ms ; optionnel si clé absente |
| Backoffice sécurisé 2FA | Supabase Auth + 2FA Resend + HMAC | Cookie 2FA 8 h ; verrouillage 5 tentatives ; `verifyAdminAccess()` |
| Conformité RGPD | Supabase Auth bcrypt + RLS + régions EU | Mots de passe en clair impossibles ; données cloisonnées |
| Tests automatisés en CI | Vitest 4 + GitHub Actions | 115 tests ; merge bloqué si échec |
| Accessibilité WCAG 2.1 AA | shadcn/ui Radix UI + Tailwind | ARIA et navigation clavier natifs ; contrastes brand tokens |

### 3.4 Impact à long terme

**Maintenabilité**

Le codebase suit des conventions strictes documentées dans `docs/CONVENTIONS_CODE.md` : camelCase pour les variables et fonctions, PascalCase pour les composants, SCREAMING_SNAKE_CASE pour les constantes, fonctions de moins de 20 lignes à responsabilité unique, principe DRY via les hooks et utilitaires partagés. Chaque module fonctionnel dans `features/domain/` contient ses propres types, constantes, utilitaires, hooks et composants, rendant la localisation d'un bug ou l'ajout d'une fonctionnalité immédiatement prévisible.

**Évolutivité**

L'architecture serverless permet d'ajouter des endpoints API sans modifier l'infrastructure. L'ajout d'une cinquième locale se résume à créer un fichier JSON et une ligne de configuration. Le schéma PostgreSQL est versionné en 15 migrations : chaque évolution passe par une nouvelle migration sans régression. Stripe supporte nativement les abonnements, paiements en plusieurs fois et remboursements partiels sans refonte de l'architecture de paiement.

**Risques techniques et atténuations**

Le tableau suivant identifie les quatre risques techniques principaux et les stratégies d'atténuation mises en place.

| Risque | Probabilité | Impact | Atténuation |
|---|---|---|---|
| Dépendance Vercel pour l'hébergement | Faible | Moyen | Next.js déployable sur tout provider Node.js ; migration possible sans modification du code |
| Indisponibilité Supabase | Faible | Élevé | Fallback éditorial sur toutes les routes GET publiques ; SLA Supabase 99,9 % |
| Modification de l'API Stripe | Faible | Élevé | SDK fixé à `^22.0.0` ; veille changelog ; tests checkout en CI |
| Dérive du LLM Groq | Moyenne | Faible | Chatbot optionnel ; escalade humaine disponible ; base de connaissances contrôlée |

**Synthèse des décisions architecturales structurantes**

Deux décisions d'architecture dominent l'avenir de la plateforme. La première est le choix de Supabase comme socle relationnel avec RLS activée sur toutes les tables : cette décision garantit un cloisonnement des données robuste sans code applicatif supplémentaire et rend l'ajout de nouvelles tables ou de nouvelles règles d'accès prévisible et sûr. La seconde est l'architecture serverless sur Vercel, qui élimine la gestion d'infrastructure pour une équipe de trois personnes tout en offrant un scaling automatique ; le prix à payer est une dépendance à un fournisseur tiers, atténuée par la portabilité native de Next.js. Ces deux décisions ont été privilégiées parce qu'elles réduisent la complexité opérationnelle au profit de la vélocité de développement, ce qui est cohérent avec le contexte d'un projet certifiant à durée fixe.


## 4. Approche méthodologique

### 4.1 Méthodologie retenue

Le projet Althea Systems est conduit en **méthodologie Agile Scrum adaptée**, avec des sprints de deux à cinq semaines calés sur les jalons pédagogiques imposés par SUP DE VINCI, lesquels font office de revues de sprint formelles.

Ce choix repose sur plusieurs raisons directement liées au contexte du projet. L'équipe est composée de trois personnes aux rôles distincts et complémentaires : Marc (Front-end), Nicolas (Back-end) et Killian (QA / Product Owner). Killian assure le rôle de Product Owner en gérant le backlog, la priorisation des fonctionnalités, la définition des critères d'acceptance et la validation des livrables à chaque fin de sprint. La durée fixe du projet et les jalons non négociables s'alignent naturellement sur un découpage en sprints, permettant de détecter les dérives tôt et de réajuster les priorités en cours de route.

L'approche Scrum pur a été adaptée en raison de l'absence de Scrum Master dédié et du contexte scolaire certifiant. Les cérémonies sont simplifiées : standup asynchrone via GitHub, revue informelle en fin de phase, rétrospective toutes les deux semaines. Le Kanban pur a été écarté car il ne fournit pas de cadence temporelle permettant d'anticiper les jalons pédagogiques. Le cycle en V a été écarté car il impose une spécification exhaustive initiale incompatible avec un projet dont le périmètre a évolué en cours de développement (ajout du chatbot IA, affinement du périmètre des avoirs).

**Un sprint type sur le projet Althea Systems**

Un sprint dure en moyenne trois à quatre semaines et démarre par une réunion de planification courte (30 minutes) au cours de laquelle Killian présente les user stories prioritaires et les critères d'acceptance associés, Marc et Nicolas estiment les charges et s'attribuent les tâches. Pendant le sprint, chaque membre renseigne son avancement via des commentaires de commit et des mises à jour dans GitHub Projects, alimentant un standup asynchrone quotidien. Un sprint se termine lorsque toutes les tâches planifiées sont mergées dans `main`, que le pipeline CI est vert (115 tests, lint, build) et que Killian a validé les critères d'acceptance sur l'environnement Vercel de preview. La rétrospective de fin de sprint dure 15 minutes et produit au moins un point d'amélioration appliqué dès le sprint suivant.

### 4.2 Outils de gestion et de collaboration

Les outils ci-dessous ont été sélectionnés pour leur intégration naturelle avec le dépôt GitHub et leur faible friction pour une équipe de trois personnes.

| Outil | Usage | Justification |
|---|---|---|
| **Git + GitHub** | Versioning, branches de feature, code review, protection de `main` | Mono-repo avec branches de feature, branche `preprod` et `main` protégée. Plus de 93 commits documentant l'évolution du projet. |
| **GitHub Projects (Kanban)** | Suivi du backlog et des tâches en cours | Kanban natif GitHub en colonnes To Do / In Progress / Done, lié directement aux commits et pull requests. |
| **GitHub Actions** | CI/CD automatisé | `ci.yml` sur chaque PR et `nightly-full-tests.yml` quotidien à 2 h UTC. Qualité garantie sans intervention manuelle. |
| **Vitest** | Tests automatisés unitaires et d'intégration | 115 tests ; exécution parallèle en < 2 minutes ; intégré au pipeline CI. |
| **ESLint** | Qualité et homogénéité du code | `eslint-config-next` + TypeScript strict ; exécuté en CI avant chaque merge. |
| **Vercel** | Déploiement continu et preview deployments | Preview deployment automatique sur chaque PR ; déploiement production sur merge dans `main`. |
| **Supabase Studio** | Administration de la base de données | Interface graphique pour la consultation des données et l'exécution de migrations SQL. |
| **Figma** *(hypothèse)* | Maquettes haute-fidélité et design system | Tokens de design documentés dans `docs/CONTEXTE.md` et reflétés dans `tailwind.config.ts`. |
| **Discord** | Communication synchrone et asynchrone | Standup quotidien asynchrone, canaux dédiés par module (front, back, qa/chatbot). |

### 4.3 Répartition des rôles et responsabilités

L'équipe est composée de trois membres aux profils complémentaires : Marc (Front-end), Nicolas (Back-end) et Killian (QA / Product Owner). La répartition est organisée par domaine technique, chaque membre étant référent principal sur son périmètre tout en contribuant aux phases transversales.

**Marc — Développeur Front-end**
- Développement des composants React et de l'interface utilisateur
- Intégration de l'internationalisation next-intl et du support RTL
- Réalisation des maquettes et du design system
- Contribution au support de soutenance

**Nicolas — Développeur Back-end**
- Développement des 97 API routes et des migrations Supabase
- Intégration Stripe, Resend et configuration Firebase
- Mise en place du CI/CD GitHub Actions et déploiement Vercel
- Rédaction de la documentation technique (DCT)

**Killian — QA & Product Owner**
- Gestion du backlog, priorisation et critères d'acceptance
- Recette fonctionnelle et validation des livrables
- Développement du chatbot IA (Groq, RAG, Firestore)
- Rédaction de l'analyse de dynamique de projet


## 5. Planification du projet

### 5.1 Phases et jalons

Le planning ci-dessous est construit à partir du jalon de rendu du document de cadrage (02 mai 2025), avec un démarrage estimé en octobre 2024 et une livraison finale en juin 2025. Les colonnes Responsable principal et Description détaillée sont traitées en section 6.1.

| Phase | Durée | Période | Jalon associé |
|---|---|---|---|
| Phase 0 — Cadrage & Setup | 4 semaines | 01/10/2024 – 28/10/2024 | Stack validée par le client |
| Phase 1 — Conception | 4 semaines | 29/10/2024 – 25/11/2024 | Maquettes + Schéma BDD + Backlog livrés |
| Phase 2 — Sprint 1 : Fondations | 4 semaines | 26/11/2024 – 23/12/2024 | Authentification et panier fonctionnels |
| Phase 3 — Sprint 2 : Catalogue & Recherche | 5 semaines | 06/01/2025 – 09/02/2025 | Catalogue consultable en 4 langues |
| Phase 4 — Sprint 3 : Checkout & Compte | 5 semaines | 10/02/2025 – 16/03/2025 | Commande complète de bout en bout |
| Phase 5 — Sprint 4 : Backoffice & Chatbot | 5 semaines | 17/03/2025 – 20/04/2025 | Backoffice opérationnel — Chatbot déployé |
| Phase 6 — Stabilisation & Document de cadrage | 2 semaines | 21/04/2025 – 02/05/2025 | **Document de cadrage livré — 02/05/2025** |
| Phase 7 — Recette & Préparation soutenance | 4 semaines | 05/05/2025 – 01/06/2025 | Support de soutenance finalisé |
| Phase 8 — Soutenance & Livraison finale | 2 semaines | 02/06/2025 – 15/06/2025 | **Livrable final remis — 15/06/2025** |

### 5.2 Dépendances critiques

Le tableau suivant identifie les dépendances entre phases dont le blocage aurait un impact direct sur le calendrier ou sur la qualité du livrable final.

| Phase amont | Phase aval | Nature de la dépendance | Risque |
|---|---|---|---|
| Phase 0 — Cadrage & Setup | Phase 1 — Conception | Stack non validée : impossibilité de démarrer maquettes et schéma BDD | Élevé |
| Phase 1 — Conception | Phase 2 — Sprint 1 | Schéma BDD ou maquettes non approuvés : développements sur bases instables, refactorings coûteux | Élevé |
| Phase 2 — Sprint 1 (Auth + Panier) | Phase 4 — Sprint 3 (Checkout) | Checkout dépend d'une authentification et d'un panier fonctionnels | Élevé |
| Phase 3 — Sprint 2 (Catalogue) | Phase 4 — Sprint 3 (Checkout) | Lignes de commande référencent `id_produit` : pas de test checkout sans catalogue | Moyen |
| Phase 4 — Sprint 3 (Checkout) | Phase 5 — Sprint 4 (Backoffice) | Backoffice commandes vide sans commandes existantes : workflow de statut non testable | Moyen |
| Phase 5 — Sprint 4 (Backoffice) | Phase 6 — Stabilisation | Backoffice incomplet : document de cadrage incomplet sur ce périmètre | Faible |
| Phase 6 — Stabilisation | Phase 7 — Recette | Bugs critiques non corrigés : soutenance avec régressions bloquantes identifiées par le jury | Moyen |


## 6. Plan de projet détaillé et livrables par phase

### 6.1 Découpage en étapes et livrables attendus

Chaque phase est détaillée ci-dessous sous forme de fiche. Les livrables marqués **(déjà réalisé)** ont été produits avant la rédaction du présent document de cadrage.

### Phase 0 — Cadrage & Setup

**Étapes :**
- Analyse du besoin client et benchmark de solutions concurrentes
- Définition de la stack technique et validation formelle par le client
- Création du dépôt GitHub mono-repo avec protection de la branche `main`
- Configuration des environnements de développement : Node.js, pnpm, Vercel, Supabase, Firebase

**Livrables :**
- Dépôt GitHub initialisé — GitHub repo — Nicolas / Killian
- Compte-rendu de validation de stack par le client — Document texte — Killian

### Phase 1 — Conception

**Étapes :**
- Réalisation des maquettes haute-fidélité desktop et mobile pour toutes les pages principales
- Modélisation du schéma de base de données : 15 tables, contraintes, index, politiques RLS
- Rédaction du backlog détaillé avec user stories et critères d'acceptance
- Conception de l'architecture des 97 endpoints API

**Livrables :**
- Maquettes Figma **(déjà réalisées)** — Figma — Marc
- Schéma BDD **(déjà réalisé)** — 15 fichiers SQL de migration — Nicolas
- Backlog **(déjà réalisé)** — GitHub Projects — Killian

### Phase 2 — Sprint 1 : Fondations

**Étapes :**
- Développement de l'authentification : inscription, connexion, vérification e-mail, reset de mot de passe, middleware de protection de routes
- Développement du panier invité (cookie signé HMAC) et authentifié (Supabase), fusion à la connexion
- Mise en place du layout global : header, menu mobile, footer
- Internationalisation de base fr / en avec next-intl

**Livrables :**
- Code source versionné (branches feature mergées dans `main`) — GitHub — Marc / Nicolas
- Tests Vitest auth et panier (sous-ensemble des 115 tests) — Vitest CI — Nicolas

### Phase 3 — Sprint 2 : Catalogue & Recherche

**Étapes :**
- Développement de la page d'accueil : carousel, grille top produits, textes fixes éditables
- Développement du catalogue catégorie : liste paginée, tri par tiers, filtres
- Développement de la fiche produit : spécifications JSONB, disponibilité, produits similaires
- Développement de la recherche plein texte avec scoring et facettes
- Ajout des locales ar et es ; intégration du RTL arabe

**Livrables :**
- Code source versionné — GitHub — Marc / Nicolas
- Pages catalogue fonctionnelles et testables en 4 langues — Vercel preview — Marc / Nicolas

### Phase 4 — Sprint 3 : Checkout & Compte

**Étapes :**
- Développement du processus de commande multi-étapes : adresse, paiement Stripe, confirmation
- Intégration Stripe PaymentIntents et sauvegarde de cartes
- Génération de factures PDF via pdfkit et envoi e-mail via Resend
- Développement de l'espace compte client : profil, adresses CRUD, commandes, factures, avoirs, téléchargement PDF

**Livrables :**
- Code source versionné — GitHub — Nicolas / Marc
- Flux de commande de bout en bout testable en recette — Vercel preview + Vitest — Nicolas

### Phase 5 — Sprint 4 : Backoffice & Chatbot

**Étapes :**
- Développement du backoffice admin complet : CRUD produits avec import CSV, CRUD catégories, commandes, utilisateurs, carousel, pages statiques, textes fixes, KPI, factures et avoirs
- Implémentation de l'authentification 2FA admin (Resend + HMAC-SHA256, verrouillage 5 tentatives)
- Développement du chatbot IA : Groq, RAG, Firestore, escalade opérateur — Killian
- Intégration de la documentation API Swagger

**Livrables :**
- Code source versionné — GitHub — Marc / Nicolas / Killian
- Backoffice admin opérationnel — Vercel preview — Marc / Nicolas
- Chatbot déployé et testable — Vercel preview — Killian

### Phase 6 — Stabilisation & Document de cadrage

**Étapes :**
- Recette interne de toutes les fonctionnalités : golden path et edge cases
- Correction des bugs bloquants et régressions identifiées
- Finalisation de la suite de tests : 115 tests Vitest verts en CI
- Audit de sécurité interne OWASP Top 10
- Rédaction intégrale du document de cadrage

**Livrables :**
- Document de cadrage (livrable actuel) — Markdown → Word → PDF — Killian / Marc / Nicolas
- Suite de tests complète (115 tests verts) — GitHub CI badge vert — Nicolas

### Phase 7 — Recette & Préparation soutenance

**Étapes :**
- Tests fonctionnels exhaustifs par module : catalogue, panier, checkout, compte, admin, chatbot, i18n, RTL, accessibilité
- Corrections des dernières régressions détectées
- Rédaction de la documentation technique complète (DCT : architecture, API, déploiement, sécurité)
- Préparation du support de soutenance et rédaction de l'analyse de dynamique de projet

**Livrables :**
- Documentation technique (DCT) — Word / PDF — Nicolas / Marc
- Support de soutenance — PowerPoint / PDF — Marc / Killian
- Analyse de dynamique de projet — Document texte — Killian

### Phase 8 — Soutenance & Livraison finale

**Étapes :**
- Soutenance devant jury SUP DE VINCI avec démonstration live de la plateforme
- Réponses aux questions du jury
- Intégration des retours et corrections post-jury
- Remise du livrable final complet

**Livrables :**
- Code source final tagué — GitHub tag de version — Toute l'équipe
- Livrable final complet : code + DCT + document de cadrage + support soutenance + analyse de dynamique — Archive ZIP + PDF — Toute l'équipe


## 7. Veille technologique

### 7.1 Technologie clé surveillée

**React Server Components (RSC) et React 19 — Maturité de l'écosystème**

React Server Components est stable depuis React 19 (mars 2025) et pleinement intégré dans Next.js 16. Althea Systems utilise déjà App Router et RSC activés, avec le React Compiler configuré dans `next.config.ts`.

L'opportunité concrète pour Althea Systems est l'élimination du bundle JavaScript client pour les composants purement d'affichage (listes de produits, fiches produit, pages statiques). La migration des composants `"use client"` existants vers des RSC là où l'interactivité n'est pas requise constitue un levier d'optimisation du LCP mobile de 20 à 40 % selon les benchmarks Next.js 2024, sans modification d'architecture.

Le risque concret est la frontière `"use client"` imposée par les bibliothèques tierces, notamment les primitives Radix UI encapsulées dans shadcn/ui (Dialog, Dropdown, Sheet). Une mauvaise qualification d'un composant comme RSC alors qu'il contient des hooks React génère des erreurs d'hydratation difficiles à diagnostiquer sur une plateforme multilingue avec SSR.

Recommandation : **surveiller** — planifier un audit des composants `"use client"` lors de la prochaine phase de stabilisation pour identifier ceux convertibles en RSC sans perte fonctionnelle.

### 7.2 Exemple concurrentiel

**Medline Industries — plateforme e-commerce B2B médical (medline.com)**

Medline Industries est le principal distributeur américain de matériel médical B2B, opérant une plateforme à destination des hôpitaux, cliniques et cabinets médicaux avec plusieurs centaines de milliers de références.

Les points directement transposables à Althea Systems sont nombreux. Le catalogue structuré par spécialité médicale avec filtres avancés (référence, compatibilité, disponibilité) est structurellement identique à la recherche à facettes d'Althea. La génération automatique de bons de commande et de factures PDF est implémentée via pdfkit. L'espace compte client avec historique de commandes et téléchargement des factures est en place dans le module `account`. Le chatbot de support à l'achat avec escalade vers un conseiller commercial est structurellement identique à la solution Groq + Firestore + escalade développée par Killian.

Les points non transposables concernent l'échelle : Medline utilise un moteur Elasticsearch dédié et un ERP SAP pour ses centaines de milliers de références. La solution Supabase PostgreSQL d'Althea est adaptée au volume actuel mais devra être réévaluée au-delà de 10 000 références actives. Les workflows de validation multi-niveaux et la facturation EDI hospitalière sont hors scope du périmètre Althea, qui vise des cabinets médicaux privés à décisionnaire unique.

L'enseignement principal à retenir pour l'équipe est double : concevoir dès maintenant la couche de recherche de façon à pouvoir substituer PostgreSQL par un moteur dédié (Elasticsearch, Typesense) sans toucher au reste de l'architecture, et investir dans la qualité de l'espace compte client, qui est le facteur de fidélisation le plus cité par les acheteurs B2B médicaux.

### 7.3 Norme essentielle applicable

**RGPD — Règlement Général sur la Protection des Données (Règlement UE 2016/679)**

Le RGPD est la norme ayant le plus d'impact sur les décisions techniques et organisationnelles du projet. La norme PCI-DSS est couverte par délégation à Stripe (certifié PCI-DSS Level 1), et la conformité WCAG 2.1 est adressée par les primitives Radix UI. Le RGPD, en revanche, impose des choix d'architecture, de code et d'hébergement actifs dès la Phase 0.

**Périmètre exact pour Althea Systems**

Le RGPD s'applique à tout traitement de données personnelles de résidents de l'Union européenne. Althea Systems collecte et traite : noms et prénoms, adresses e-mail, adresses postales, numéros de téléphone (livraison), historique de commandes, préférences de langue, conversations de chatbot. Ces données sont des données personnelles au sens de l'article 4 du règlement.

**Implications concrètes sur l'architecture**

La minimisation des données (article 5) se traduit par l'absence de numéro de téléphone dans la table `utilisateur`, présent uniquement dans `adresse` pour les besoins de livraison. Le hashage des mots de passe (article 32) est assuré par Supabase Auth (bcrypt) ; aucun mot de passe n'est stocké ou transmis en clair. Les tokens de réinitialisation sont hashés en SHA256 dans `mot_de_passe_reset_token` avec expiration explicite. La durée de conservation différenciée distingue les données de facturation (10 ans, obligation comptable française) des conversations chatbot (durée limitée dans le registre des traitements). Le droit à l'effacement (article 17) est supporté par l'architecture RLS : la suppression d'un utilisateur peut cascader sur ses adresses, moyens de paiement, panier et conversations via des règles de cascade dans les migrations SQL. L'hébergement en Union européenne est une contrainte d'architecture imposée par le RGPD : Supabase en région `eu-west`, Firebase Storage en `europe-west`. Les cookies de session et de panier sont `httpOnly`, `secure` et `sameSite`, limitant les obligations de consentement aux seuls cookies strictement nécessaires.

**Implications organisationnelles**

Althea Systems est responsable de traitement au sens de l'article 4(7). En cas de violation de données personnelles, la CNIL doit être notifiée dans les 72 heures (article 33). Supabase et Firebase sont des sous-traitants au sens de l'article 28 : des clauses contractuelles de protection des données (DPA) doivent être signées avant la mise en production. La démonstration de l'accountability exigée par l'article 5(2) s'appuie sur la documentation technique des mesures mises en place — RLS, hashage, HTTPS, minimisation, durées de conservation — documentées dans `docs/SECURITE.md` et dans les migrations SQL du dépôt.


## Conclusion

Le présent document de cadrage repose sur trois piliers solidaires qui structurent l'ensemble de la démarche Althea Systems.

Le premier pilier est l'ambition fonctionnelle. La plateforme couvre un périmètre complet de bout en bout : du catalogue multilingue au tunnel d'achat sécurisé, en passant par un backoffice autonome pour les équipes internes et un chatbot IA développé en interne. Ce périmètre a été priorisé en deux niveaux — MVP et secondaire — pour garantir une première livraison cohérente et testable, avant d'enrichir la plateforme de fonctionnalités différenciantes.

Le deuxième pilier est la rigueur technique. Chaque choix technologique est ancré dans un besoin concret : Next.js pour satisfaire la contrainte client d'un framework unique, Supabase pour la robustesse relationnelle et le cloisonnement des données par RLS, Stripe pour la conformité PCI-DSS sans gestion de données de carte, Firebase pour le CDN d'images et la persistance des conversations chatbot. L'architecture est sécurisée en profondeur — CSRF, rate limiting, 2FA admin, hashage, HTTPS — et validée par 115 tests automatisés exécutés à chaque pull request.

Le troisième pilier est l'organisation d'équipe. La répartition claire des rôles (Marc sur le front-end, Nicolas sur le back-end et l'infrastructure, Killian sur le QA, le Product Ownership et le chatbot IA) est formalisée en section 4.3 et opérationnalisée par une méthodologie Scrum adaptée. Les jalons pédagogiques de SUP DE VINCI servent de revues de sprint formelles, assurant une cadence régulière et mesurable.

Ce document de cadrage constitue le contrat technique et organisationnel de référence pour la réponse à l'appel d'offre Althea Systems. Il garantit à toutes les parties prenantes — client, équipe de développement et jury — une vision complète, cohérente et vérifiable de ce que la plateforme sera, comment elle sera construite, et dans quels délais elle sera livrée.
