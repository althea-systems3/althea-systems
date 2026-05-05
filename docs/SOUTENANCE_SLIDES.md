# Contenu des slides — Soutenance Althea Systems

---

## Slide 1 — Page de garde

**Titre : Althea Systems**
**Sous-titre : Plateforme e-commerce B2B Médical**

SUP DE VINCI — Projet d'étude fil rouge B3 — 2024 / 2025

Marc AWAD · Nicolas · Killian

---

## Slide 2 — Sommaire

**Titre : Au programme**

1. Présentation de l'équipe
2. Présentation du projet
3. Cahier des charges
4. Technologies utilisées
5. Description fonctionnelle du Back-Office
6. Méthodologie & Organisation
7. Conception de l'interface graphique
8. Conception de l'application
9. Conception de la base de données
10. Architecture MVC & 3 tiers
11. Sécurité
12. Déploiements & Mise en production
13. Conclusion

---

## Slide 3 — Présentation Personnelle

**Titre : Notre équipe**

**Marc AWAD**
Développeur Front-end
Interface utilisateur, expérience client, design

**Nicolas**
Développeur Back-end
Serveur, données, paiement, infrastructure

**Killian**
Chef de Produit & QA
Pilotage du projet, validation, assistant IA

---

## Slide 4 — Présentation du projet

**Titre : Althea Systems — Une nouvelle plateforme pour un nouveau marché**

Althea Systems est une entreprise spécialisée dans la distribution de matériel médical haut de gamme auprès des professionnels de santé : cabinets médicaux, cliniques et établissements spécialisés.

**Le constat de départ :**
Le site existant ne permettait ni de vendre en ligne, ni de gérer un catalogue produit, ni de servir une clientèle internationale.

**Notre mission :**
Concevoir et livrer une plateforme e-commerce complète, disponible en 4 langues, avec un espace d'administration autonome pour les équipes Althea.

---

## Slide 5 — Cahier des charges

**Titre : Ce que le client nous a demandé**

Althea Systems nous a confié une mission claire : remplacer leur site vitrine statique par une plateforme transactionnelle moderne, capable de vendre, de gérer les commandes et de s'administrer sans intervention technique.

**Le projet en quelques chiffres :**

- 4 langues supportées (français, anglais, arabe, espagnol)
- Un catalogue produit administrable en temps réel
- Un tunnel d'achat complet avec paiement sécurisé
- Un espace client avec suivi de commandes et factures
- Un back-office pour gérer l'intégralité de la plateforme

---

## Slide 6 — Objectifs principaux

**Titre : Trois objectifs stratégiques**

**1 — Digitaliser la vente**
Permettre aux professionnels de santé de commander en ligne, de recevoir leurs factures automatiquement et de suivre leurs commandes depuis leur espace personnel.

**2 — Conquérir de nouveaux marchés**
Rendre la plateforme disponible en français, anglais, arabe et espagnol, avec des adresses web localisées pour chaque zone géographique.

**3 — Donner l'autonomie aux équipes Althea**
Offrir un back-office complet qui permet de gérer produits, commandes et contenus sans faire appel à un développeur.

---

## Slide 7 — Principes directeurs

**Titre : Nos lignes directrices**

**Mobile d'abord**
La plateforme est conçue pour être parfaitement utilisable sur smartphone, tablette et ordinateur.

**Sécurité à chaque étape**
Chaque donnée client est protégée. Les paiements sont traités selon les standards bancaires internationaux. Aucune donnée de carte bancaire ne transite par nos serveurs.

**Accessibilité**
La plateforme respecte les standards d'accessibilité web (WCAG 2.1) pour être utilisable par tous, y compris les personnes en situation de handicap.

**Conformité légale**
Respect du RGPD, des recommandations de la CNIL et des normes de protection des données personnelles.

---

## Slide 8 — Cible

**Titre : À qui s'adresse la plateforme ?**

**Les utilisateurs finaux**
Professionnels de santé en exercice libéral : médecins, chirurgiens, infirmiers, directeurs d'établissements médicaux.
Des acheteurs exigeants qui recherchent rapidité, fiabilité et simplicité.

**Les marchés visés**
France et marché francophone — marché principal
Marchés anglophones
Marchés arabophones (interface adaptée au sens de lecture droite-gauche)
Marchés hispanophones

**Les administrateurs**
Les équipes internes d'Althea Systems, qui gèrent le catalogue, les commandes et les contenus au quotidien.

---

## Slide 9 — Fonctionnalités principales

**Titre : Ce que la plateforme permet de faire**

**Pour le client final :**
- Parcourir un catalogue de produits médicaux organisé par catégorie
- Rechercher un produit par nom ou caractéristiques
- Ajouter au panier et commander en quelques étapes
- Payer en ligne de façon sécurisée
- Recevoir une facture par e-mail automatiquement
- Consulter l'historique des commandes depuis son espace personnel

**Pour les équipes Althea :**
- Ajouter, modifier, archiver des produits
- Gérer les commandes et informer les clients de leur statut
- Éditer les contenus du site sans intervention technique
- Consulter les indicateurs de performance (revenus, commandes, clients actifs)

**En plus :**
Un assistant IA intégré pour accompagner les clients dans leur recherche de produits.

---

## Slide 10 — Technologies utilisées

**Titre : Les outils que nous avons choisis — et pourquoi**

Les technologies ont été validées avec le client avant le démarrage du projet.

**Ce qui fait tourner la plateforme :**
- **Next.js** — Le moteur de la plateforme, un seul outil pour l'interface et le serveur
- **Supabase** — La base de données relationnelle qui stocke produits, commandes et clients
- **Firebase** — Le stockage des images, distribué mondialement pour une vitesse maximale

**Ce qui sécurise les transactions :**
- **Stripe** — Le prestataire de paiement bancaire, certifié au plus haut niveau de sécurité
- **Resend** — L'envoi d'e-mails (confirmations, factures, réinitialisation de mot de passe)

**Ce qui garantit la qualité :**
- 115 tests automatisés exécutés à chaque mise à jour
- Un pipeline de validation qui bloque tout déploiement défectueux

---

## Slide 11 — Description fonctionnelle du Back-Office

**Titre : Le back-office — piloter la plateforme sans intervention technique**

Le back-office est l'outil de gestion réservé aux équipes Althea. Il est accessible uniquement après une double authentification sécurisée.

**Ce qu'il permet :**

| Module | Ce que fait l'équipe Althea |
|--------|---------------------------|
| Tableau de bord | Visualiser les revenus, les commandes et les clients actifs |
| Produits | Ajouter, modifier, archiver des produits, importer un catalogue CSV |
| Catégories | Organiser et réordonner les catégories du catalogue |
| Commandes | Suivre et mettre à jour le statut de chaque commande |
| Clients | Consulter les profils et réinitialiser les accès si besoin |
| Factures | Générer et envoyer des factures et avoirs en PDF |
| Contenu | Modifier le carrousel, les textes de la page d'accueil, les pages légales |
| Assistant IA | Configurer la base de connaissances du chatbot |

---

## Slide 12 — Méthodologie et organisation

**Titre : Comment nous avons travaillé**

Nous avons adopté une méthode de travail **Agile**, organisée en cycles courts appelés **sprints**, chacun se terminant par une livraison testable et validée.

**Notre rythme :**
- Planification en début de sprint — chaque fonctionnalité est définie avec ses critères de validation
- Avancement suivi en continu via GitHub
- Validation à la fin de chaque sprint par Killian (chef de produit)
- Rétrospective courte pour améliorer le sprint suivant

**Pourquoi cette méthode ?**
Elle nous a permis de livrer régulièrement, d'ajuster les priorités en cours de route (notamment l'ajout du chatbot IA) et de respecter les jalons imposés par SUP DE VINCI.

**Le projet en 8 phases** d'octobre 2024 à juin 2025, avec un jalon de livraison formel à chaque étape.

---

## Slide 13 — Conception de l'interface graphique

**Titre : Concevoir avant de coder**

Avant d'écrire la première ligne de code, nous avons consacré une phase entière à la conception visuelle de la plateforme.

**Notre démarche en 4 étapes :**

1. **Zoning** — Définir la structure de chaque page (quelles zones, dans quel ordre)
2. **Wireframes** — Dessiner l'architecture fonctionnelle sans couleurs ni images
3. **Maquettage** — Créer les maquettes haute-fidélité sur Figma avec les vraies couleurs et contenus
4. **Charte graphique** — Définir l'identité visuelle complète (couleurs, typographie, composants)

Chaque étape a été validée avant de passer à la suivante, garantissant que le résultat final correspond exactement à ce qui avait été prévu.

---

## Slide 14 — Zoning

**Titre : Zoning — La structure de chaque page**

Le zoning définit les grandes zones d'une page, sans entrer dans les détails visuels. C'est la première étape de la conception.

> **[Insérer ici les schémas de zoning — blocs rectangulaires nommés par page]**

**Exemple — Page d'accueil :**
- En-tête avec navigation, sélecteur de langue, accès panier et compte
- Carrousel éditorial pleine largeur
- Grille des catégories (4 colonnes)
- Grille des produits phares (4 colonnes)
- Pied de page avec liens légaux

**Exemple — Page catalogue :**
- Fil d'Ariane
- Bannière de la catégorie avec description
- Liste de produits paginée avec filtres
- Navigation entre les pages

---

## Slide 15 — Wireframes

**Titre : Wireframes — L'architecture fonctionnelle**

Les wireframes sont des maquettes en niveaux de gris qui représentent la disposition des éléments sans mise en forme finale.

> **[Insérer ici les wireframes en niveaux de gris]**

**Pages couvertes :**
- Page d'accueil (version bureau et mobile)
- Catalogue et liste de produits
- Fiche produit détaillée
- Panier et processus de commande (3 étapes)
- Espace client (tableau de bord, commandes, factures)
- Interface back-office

L'objectif du wireframe est de valider l'organisation de chaque page avec le client **avant** d'investir du temps dans le design final.

---

## Slide 16 — Maquettage

**Titre : Maquettes — La version finale avant développement**

Les maquettes haute-fidélité représentent exactement ce que l'utilisateur verra sur la plateforme : couleurs, typographie, images, boutons.

> **[Insérer ici les captures d'écran des maquettes Figma]**

**Réalisées sur Figma par Marc :**
- Toutes les pages principales en version bureau et mobile
- Les versions dans les 4 langues, y compris la version arabe (sens de lecture droite-gauche)
- L'interface back-office complète

**Bénéfice client :**
Les maquettes ont été présentées et approuvées par le client avant le démarrage du développement, ce qui a évité les corrections coûteuses en cours de réalisation.

---

## Slide 17 — Charte graphique

**Titre : Charte graphique — L'identité visuelle d'Althea Systems**

> **[Insérer ici les éléments visuels de la charte : palette, typographies, exemples de composants]**

**Palette de couleurs :**

| Couleur | Valeur | Usage |
|---------|--------|-------|
| Bleu pétrole | #003d5c | Navigation, titres, éléments structurants |
| Turquoise | #00a8b5 | Boutons d'action, appels à l'action |
| Vert | #10b981 | Confirmations, disponibilité, succès |
| Rouge | #ef4444 | Erreurs, alertes |

**Typographie :**
- Titres : Poppins — moderne, lisible, professionnel
- Corps de texte : Inter — neutre, confortable à la lecture

**Composants visuels :**
Boutons, cartes produits, formulaires et icônes conçus pour être cohérents sur toute la plateforme, adaptés au mobile et conformes aux normes d'accessibilité.

---

## Slide 18 — Conception de l'application

**Titre : Concevoir l'application — au-delà de l'apparence**

La conception de l'application va plus loin que le design visuel : elle définit **comment la plateforme fonctionne**, quels scénarios elle doit gérer, et dans quel ordre les actions se déroulent.

**Nos outils de conception fonctionnelle :**

- **Diagramme de cas d'utilisation** — Qui peut faire quoi sur la plateforme ?
- **Diagramme de séquence** — Dans quel ordre se déroule une action clé (ex : passer une commande) ?
- **Gestion de versions** — Comment organisons-nous le travail à plusieurs en parallèle sans se bloquer ?

---

## Slide 19 — Diagramme de cas d'utilisation

**Titre : Qui fait quoi — Les profils utilisateurs**

> **[Insérer ici le diagramme de cas d'utilisation UML]**

**Trois profils sur la plateforme :**

**Le Visiteur** (non connecté)
Consulter le catalogue · Rechercher un produit · Ajouter au panier · Créer un compte

**Le Client connecté**
Tout ce que fait le visiteur · Passer une commande · Payer en ligne · Accéder à ses factures · Suivre ses livraisons

**L'Administrateur**
Gérer le catalogue et les commandes · Consulter les indicateurs · Administrer les comptes clients · Configurer les contenus du site

---

## Slide 20 — Diagramme de séquence

**Titre : Comment se déroule une commande — étape par étape**

> **[Insérer ici le diagramme de séquence]**

**Scénario : un professionnel de santé passe une commande**

1. Le client parcourt le catalogue et ajoute un produit à son panier
2. Il lance le processus de commande et saisit son adresse de livraison
3. Il renseigne ses informations de paiement — traitées directement par Stripe
4. La commande est enregistrée, une facture PDF est générée automatiquement
5. Un e-mail de confirmation avec la facture est envoyé immédiatement
6. Le client retrouve sa commande dans son espace personnel

**Point clé :** À aucun moment les données bancaires du client ne transitent par nos serveurs.

---

## Slide 21 — Versionning

**Titre : Travailler à trois sans se marcher dessus**

Le versionning est la méthode qui nous a permis de travailler en parallèle sur la même plateforme, sans risquer d'écraser le travail des autres.

**Notre organisation :**
- Chaque développeur travaille sur une branche indépendante
- Le code est fusionné dans la version principale uniquement après validation automatique et revue par un autre membre de l'équipe
- La version en production ne change que lorsque tout est validé

**Ce que ça garantit au client :**
- La version en ligne est toujours stable
- Chaque évolution est tracée et réversible
- Plus de 93 mises à jour documentées tout au long du projet

**Outil utilisé :** GitHub — avec protection de la branche principale et validation obligatoire avant toute mise en production

---

## Slide 22 — Conception de la base de données

**Titre : La base de données — Le coeur de la plateforme**

La base de données est l'endroit où toutes les informations de la plateforme sont stockées de façon organisée et sécurisée : produits, clients, commandes, factures...

**Nos choix :**
- **Base de données relationnelle** (Supabase / PostgreSQL) pour les données métier — fiabilité, cohérence, requêtes complexes
- **Base de données NoSQL** (Firebase) pour les images et les conversations du chatbot — rapidité, flexibilité

**Ce que ça stocke :**
Produits · Catégories · Clients · Paniers · Commandes · Factures · Adresses · Pages du site · Conversations chatbot

**Sécurité des données :**
Chaque client ne peut voir que ses propres données. Cette règle est appliquée au niveau de la base de données elle-même, pas seulement dans le code.

---

## Slide 23 — Diagramme de cas d'utilisation (Use Case)

**Titre : Use Case — La base de données vue par ses utilisateurs**

> **[Insérer ici le diagramme Use Case côté base de données]**

**Les quatre acteurs qui interagissent avec la base :**

**Le Client** — Lire les produits, créer une commande, accéder à ses factures

**L'Administrateur** — Créer, modifier, supprimer des produits et catégories, mettre à jour les statuts de commande

**Le Système** — Générer automatiquement les factures, envoyer les e-mails, calculer les totaux

**Le Chatbot IA** — Lire la base de connaissances produits, sauvegarder les conversations

---

## Slide 24 — Diagramme de Classe

**Titre : Diagramme de classe — Comment les données sont organisées**

> **[Insérer ici le diagramme de classe UML]**

**Les entités principales et leurs relations :**

- Un **Client** peut passer plusieurs **Commandes**
- Une **Commande** contient plusieurs **Lignes de commande**
- Chaque **Ligne de commande** correspond à un **Produit**
- Un **Produit** appartient à une ou plusieurs **Catégories**
- Chaque **Commande** génère une **Facture**
- Un **Client** peut avoir plusieurs **Adresses**

**À noter :**
Les spécifications techniques des produits médicaux (dimensions, certifications, compatibilités) sont stockées dans un format flexible qui s'adapte à chaque gamme de produit.

---

## Slide 25 — Conception Multicouche : MVC

**Titre : Comment la plateforme est structurée — Le modèle MVC**

Notre application est organisée selon le modèle **MVC** (Modèle - Vue - Contrôleur), une architecture qui sépare clairement les responsabilités.

**Pourquoi cette séparation ?**
- Elle facilite la maintenance : chaque partie peut évoluer sans impacter les autres
- Elle améliore la sécurité : les données ne sont jamais accessibles directement depuis l'interface
- Elle rend le code plus lisible et testable

**Les 3 composants :**

| Composant | Rôle | Analogie |
|-----------|------|----------|
| **Modèle** | Les données | Le classeur de dossiers |
| **Vue** | L'interface | La vitrine |
| **Contrôleur** | La logique | Le vendeur |

---

## Slide 26 — Le Modèle

**Titre : Le Modèle — Les données de la plateforme**

Le Modèle représente l'ensemble des données stockées et les règles qui les gouvernent.

**Ce qu'il contient :**
- Les 15 tables de la base de données (produits, clients, commandes, factures...)
- Les règles d'intégrité (un produit doit avoir un prix, une commande doit avoir un client)
- Les règles de sécurité (un client ne peut lire que ses propres commandes)

**Son rôle dans la plateforme :**
Le Modèle est la seule source de vérité. Toute information affichée à l'écran provient du Modèle. Toute action du client (commande, modification du profil) modifie le Modèle.

Il ne sait pas comment s'afficher — c'est la Vue qui s'en charge.
Il ne sait pas quand agir — c'est le Contrôleur qui le pilote.

---

## Slide 27 — La Vue

**Titre : La Vue — Ce que voit l'utilisateur**

La Vue est tout ce qui est visible à l'écran : les pages, les formulaires, les boutons, les listes de produits, le panier, l'espace client.

**Ce qu'elle fait :**
- Afficher les données transmises par le Contrôleur
- Réagir aux actions de l'utilisateur (clic, saisie, navigation)
- S'adapter à toutes les tailles d'écran (mobile, tablette, bureau)
- Changer de langue selon la préférence de l'utilisateur

**Notre approche :**
Certaines pages sont pré-calculées côté serveur (catalogue, accueil) pour un chargement ultra-rapide. Les pages interactives (panier, formulaires, backoffice) s'exécutent dans le navigateur pour une expérience fluide.

La Vue ne contient aucune logique métier et n'accède jamais directement aux données — c'est le Contrôleur qui fait le lien.

---

## Slide 28 — Le Contrôleur

**Titre : Le Contrôleur — Le chef d'orchestre**

Le Contrôleur est la couche intermédiaire entre l'interface (Vue) et les données (Modèle). C'est lui qui traite chaque demande de l'utilisateur.

**Son fonctionnement :**
1. L'utilisateur effectue une action (ajouter un produit au panier, passer une commande)
2. Le Contrôleur reçoit la demande
3. Il vérifie que la demande est légitime (l'utilisateur est-il connecté ? les données sont-elles valides ?)
4. Il interroge le Modèle pour récupérer ou modifier les données
5. Il retourne le résultat à la Vue

Notre plateforme compte **97 points d'entrée**, chacun dédié à une action précise : consulter une commande, ajouter au panier, confirmer un paiement, télécharger une facture...

---

## Slide 29 — Communication entre nos 3 composants

**Titre : Comment les 3 composants fonctionnent ensemble**

> **[Insérer ici un schéma de flux simple — 3 blocs reliés par des flèches]**

**Exemple concret : un client passe une commande**

1. L'utilisateur clique sur "Confirmer la commande" — la Vue envoie la demande
2. Le Contrôleur vérifie l'identité et valide le paiement
3. Le Contrôleur demande au Modèle d'enregistrer la commande
4. Le Modèle sauvegarde la commande et génère la facture
5. Le Contrôleur retourne la confirmation — la Vue affiche la page de succès
6. Un e-mail de confirmation est envoyé automatiquement

**Ce que cette architecture garantit au client :**
Chaque action est tracée, validée et sécurisée avant d'affecter les données.

---

## Slide 30 — L'architecture 3 tiers

**Titre : L'architecture 3 tiers — Une plateforme robuste et scalable**

> **[Insérer ici un schéma d'architecture avec 3 niveaux verticaux]**

Notre plateforme repose sur 3 niveaux indépendants :

**Niveau 1 — Le navigateur du client**
Ce que voit et utilise le professionnel de santé : pages web, formulaires, panier, espace personnel.

**Niveau 2 — Le serveur applicatif (Vercel)**
Le moteur de la plateforme : traitement des commandes, calcul des prix, génération des factures, envoi des e-mails. S'adapte automatiquement à la charge sans intervention.

**Niveau 3 — Les données et services externes**
La base de données clients/produits/commandes (Supabase), les images (Firebase), le paiement (Stripe), les e-mails (Resend).

**Avantage pour Althea Systems :**
Si le trafic double ou triple, le niveau 2 s'adapte automatiquement — aucune gestion d'infrastructure nécessaire.

---

## Slide 31 — Sécurité

**Titre : La sécurité — Une priorité dès la conception**

La plateforme gère des données professionnelles sensibles et des transactions financières. La sécurité n'a pas été ajoutée après coup : elle a été intégrée à chaque décision dès le départ.

**Notre posture :**
Aucune couche de protection unique ne suffit. Nous avons mis en place plusieurs niveaux de défense complémentaires.

**Les 3 menaces web les plus courantes que nous avons traitées :**
- Les injections de contenu malveillant dans les pages (XSS)
- La manipulation de la base de données via les formulaires (Injection SQL)
- L'exécution d'actions à l'insu de l'utilisateur connecté (CSRF)

**En complément :**
Authentification renforcée pour les administrateurs, chiffrement des données sensibles, conformité RGPD, zéro donnée bancaire sur nos serveurs.

---

## Slide 32 — Les attaques XSS (Cross-Site Scripting)

**Titre : XSS — Empêcher l'injection de code malveillant**

**Qu'est-ce que c'est ?**
Une attaque XSS consiste à injecter du code malveillant dans une page web pour voler des informations de session ou rediriger l'utilisateur vers un site frauduleux.

**Exemple concret :**
Un utilisateur malveillant saisit du code dans un champ de commentaire. Sans protection, ce code s'exécute dans le navigateur de tous les visiteurs.

**Comment nous nous en protégeons :**
- Notre interface échappe automatiquement tout contenu affiché — aucun code saisi ne peut s'exécuter
- Toutes les données saisies par les utilisateurs sont nettoyées avant traitement côté serveur
- Les e-mails générés automatiquement (factures, confirmations) sont également protégés
- Un en-tête de sécurité interdit l'exécution de tout script non autorisé sur la plateforme

---

## Slide 33 — Les injections SQL

**Titre : Injection SQL — Protéger la base de données**

**Qu'est-ce que c'est ?**
Une injection SQL consiste à manipuler les formulaires d'un site pour envoyer des instructions malveillantes à la base de données et accéder à des données confidentielles ou les supprimer.

**Exemple concret :**
Saisir du code dans un champ de recherche pour tenter d'extraire ou de détruire des données.

**Comment nous nous en protégeons :**
- Notre base de données n'accepte jamais les requêtes construites à partir d'une saisie utilisateur directe — toutes les requêtes sont préparées à l'avance et paramétrées
- Les règles de sécurité au niveau de la base de données garantissent qu'un client ne peut jamais accéder aux données d'un autre client, même en cas de faille applicative
- Le typage strict du code empêche de passer une valeur inattendue aux fonctions d'accès aux données

---

## Slide 34 — Les attaques CSRF (Cross-Site Request Forgery)

**Titre : CSRF — Protéger les actions des utilisateurs connectés**

**Qu'est-ce que c'est ?**
Une attaque CSRF consiste à tromper un utilisateur connecté pour lui faire effectuer une action sur la plateforme à son insu — par exemple, passer une commande ou modifier son adresse depuis un site externe malveillant.

**Exemple concret :**
Un utilisateur connecté visite un site piégé. Ce site envoie une fausse requête à notre plateforme en utilisant la session active de l'utilisateur.

**Comment nous nous en protégeons :**
- Chaque action sensible vérifie que la demande provient bien de notre propre site — toute requête externe est automatiquement rejetée
- Les cookies de session sont configurés pour ne jamais être transmis en dehors de notre domaine
- Les formulaires critiques incluent un jeton de sécurité unique, validé côté serveur avant toute action

---

## Slide 35 — Déploiements et Mise en production

**Titre : De notre ordinateur à vos utilisateurs**

**Un processus de mise en ligne entièrement automatisé :**

Chaque modification du code passe par une chaîne de validation avant d'être visible sur la plateforme en ligne.

Développement → Validation automatique → Aperçu → Production

**Les 4 étapes automatiques avant toute mise en ligne :**
1. Vérification de la qualité du code
2. Exécution des 115 tests automatisés
3. Compilation complète de l'application
4. Déploiement sur un environnement de prévisualisation pour validation finale

**Ce que ça garantit à Althea Systems :**
- La version en production est toujours stable
- Chaque mise à jour est testée et approuvée avant d'être visible par les clients
- En cas de problème, un retour à la version précédente est possible en quelques secondes

**Hébergement :** Vercel (serveur applicatif mondial) + Supabase (base de données Europe, conformité RGPD)

---

## Slide 36 — Conclusion

**Titre : Ce que nous avons livré**

**Une plateforme e-commerce B2B complète pour Althea Systems :**

- Un catalogue produit en 4 langues, navigable et recherchable par des professionnels de santé exigeants
- Un tunnel d'achat sécurisé, de la sélection du produit à la réception de la facture
- Un espace client pour suivre les commandes et télécharger les documents comptables
- Un back-office autonome pour que les équipes Althea pilotent l'intégralité de la plateforme
- Un assistant IA intégré pour accompagner les clients dans leur navigation

**Ce qui nous a guidés du premier au dernier jour :**
Livrer une solution à la hauteur des ambitions d'Althea Systems — solide techniquement, sécurisée, conforme, et pensée avant tout pour ses utilisateurs.

---

## Slide 37 — Remerciements

**Titre : Merci**

Merci à l'équipe pédagogique de **SUP DE VINCI** pour l'encadrement de ce projet tout au long de l'année.

Merci à **Althea Systems** pour la confiance accordée et les échanges constructifs qui ont façonné le produit final.

---

Nous sommes à votre disposition pour répondre à vos questions
et vous présenter la plateforme en démonstration live.

---

## Répartition du temps recommandée (60 min)

| Section | Durée |
|---------|-------|
| Page de garde + Sommaire | 1 min |
| Présentation de l'équipe | 1 min |
| Présentation du projet | 2 min |
| Cahier des charges (4 slides) | 6 min |
| Technologies + Back-Office | 5 min |
| Méthodologie | 4 min |
| Interface graphique (4 slides) | 6 min |
| Conception application (3 slides) | 5 min |
| Base de données (3 slides) | 5 min |
| MVC (4 slides) + Architecture 3 tiers | 8 min |
| Sécurité (4 slides) | 6 min |
| Déploiement | 3 min |
| Conclusion + Remerciements | 2 min |
| **Total présentation** | **~54 min** |
| Questions / Réponses + Demo | temps restant |
