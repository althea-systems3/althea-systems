# CONTEXTE FRONT — Althea Systems E-commerce

> Ce fichier est le contexte de référence à fournir à une IA lors du développement des tâches front-end du projet Althea Systems.

---

## 1. Présentation du projet

**Althea Systems** est une entreprise spécialisée dans la vente de matériel médical de pointe pour cabinets médicaux. Le projet consiste en une refonte complète de leur plateforme e-commerce, orientée **mobile-first**, avec un back-office séparé.

Le site cible une **clientèle professionnelle internationale** (cabinets médicaux).

---

## 2. Charte Graphique

### Couleurs

| Usage | Couleur | Hex |
|---|---|---|
| CTA, liens, badges | Turquoise principal | `#00a8b5` |
| Backgrounds légers | Bleu clair | `#d4f4f7` |
| Disponibilité / En stock | Vert | `#10b981` |
| Erreurs / Rupture de stock | Rouge | `#ef4444` |
| Hover states | Turquoise hover | `#33bfc9` |
| Alertes / Stock faible | Orange | `#F59E0B` |
| Titres, navigation, footer | Bleu marine | `#003d5c` |

### Typographie

- **Titres** : `Poppins` SemiBold
- **Corps de texte** : `Inter` Regular 400

### Logo

Deux versions du logo existent : une version **mobile** et une version **desktop**. Prévoir un affichage conditionnel selon le breakpoint.

---

## 3. Architecture des pages (Sitemap)

### Pages principales
- `/` — Accueil
- `/categories/:slug` — Catalogue d'une catégorie
- `/produits/:slug` — Page produit
- `/recherche` — Recherche avancée
- `/contact` — Formulaire de contact + Chatbot

### Pages commande
- `/panier` — Panier
- `/checkout` — Processus de commande (multi-étapes)
- `/checkout/confirmation` — Confirmation de commande

### Pages compte utilisateur
- `/compte` — Dashboard utilisateur
- `/compte/parametres` — Modification du profil
- `/compte/commandes` — Historique des commandes
- `/inscription` — Créer un compte
- `/connexion` — Se connecter
- `/mot-de-passe-oublie` — Réinitialisation du mot de passe

---

## 4. Layout global (toutes les pages)

### Header (visible sur toutes les pages)
- Logo à gauche (version mobile ou desktop selon breakpoint)
- Barre de recherche centrale
- Icône panier à droite avec **badge point** si articles présents
- Menu burger (mobile ET desktop)

### Menu burger — état NON connecté
- Se connecter
- S'inscrire
- CGU
- Mentions légales
- Contact
- À propos de Althea Systems

### Menu burger — état CONNECTÉ
- Mes paramètres
- Mes commandes
- CGU
- Mentions légales
- Contact
- À propos de Althea Systems
- Se déconnecter

### Footer (desktop uniquement)
Sur mobile, le contenu du footer est intégré dans le menu burger.
- Mentions légales
- CGU
- Contact
- Liens réseaux sociaux (Facebook, Twitter, LinkedIn…)

---

## 5. Pages — Détail front

### 5.1 Page d'accueil `/`

**Composants dans l'ordre :**

1. **Carrousel** (3 sections max)
   - Chaque slide : image de fond + texte superposé + lien de redirection
   - Texte avec formatage possible (gras, italique, couleurs)
   - Navigation entre slides (points ou flèches)

2. **Bloc texte fixe**
   - Texte éditorial sous le carrousel
   - Contenu provenant de l'API

3. **Grille de catégories**
   - Cards avec image + nom de la catégorie
   - Cliquable → redirige vers `/categories/:slug`
   - Ordre configurable (par l'admin)

4. **Section "Top Produits du moment"**
   - Titre fixe : *"Les Top Produits du moment"*
   - Grille de cards produit : image + nom uniquement
   - Produits sélectionnés et ordonnés par l'admin

5. **Footer** (desktop uniquement)

---

### 5.2 Page catalogue `/categories/:slug`

**Composants dans l'ordre :**

1. **Image de catégorie** (pleine largeur) avec **surimpression du nom de la catégorie**
2. **Description de la catégorie** (texte sous l'image)
3. **Liste/Grille de produits**
   - Mobile : liste verticale
   - Desktop : grille

**Chaque card produit affiche :**
- Nom du produit
- Prix
- Mention "En rupture de stock" si indisponible (couleur différente / grisée)

**Ordre d'affichage des produits :**
1. Produits prioritaires (définis par l'admin)
2. Produits normaux disponibles
3. Produits épuisés (toujours en dernier)

---

### 5.3 Page produit `/produits/:slug`

**Composants :**

1. **Carrousel d'images** du produit (plusieurs vues)
2. **Nom du produit** (grand, gras)
3. **Description** complète
4. **Caractéristiques techniques** (section dédiée)
5. **Prix** (bien visible)
6. **Disponibilité**
   - Badge vert "En stock" si disponible
   - Badge rouge "Rupture de stock" si indisponible

7. **CTA principal**
   - Bouton **"Ajouter au panier"** ou **"Acheter maintenant"** si disponible → couleur `#00a8b5`
   - Bouton **désactivé** avec mention "En rupture de stock" si indisponible

8. **Section "Produits similaires"**
   - 6 produits de la même catégorie
   - Tirés aléatoirement, priorité aux produits disponibles
   - Affichage en grille horizontale scrollable (mobile) ou grille (desktop)

---

### 5.4 Page de recherche `/recherche`

**Facettes de filtre (sidebar ou drawer mobile) :**
- Recherche par texte du titre
- Recherche par texte de la description
- Filtre par caractéristiques techniques
- Filtre prix min / prix max (range slider ou double input)
- Filtre par catégorie(s) (multi-select)
- Toggle "Uniquement produits disponibles"

**Tri des résultats :**
- Par prix (asc / desc)
- Par nouveauté (asc / desc)
- Par disponibilité (asc / desc)

**Affichage des résultats :**
- Grille ou liste selon préférence/device
- Même card produit que le catalogue
- Résultats mis à jour en temps réel (< 100ms côté API)

**Règles de pertinence de recherche texte (gérées par l'API, à respecter dans l'affichage) :**
1. Correspondance exacte
2. 1 caractère de différence
3. Commence par
4. Contient

---

### 5.5 Page panier `/panier`

**Accessible à tous (connecté ou non)**

**Composants :**

1. **Liste des produits** ajoutés
   - Nom du produit
   - Quantité (modifiable avec +/-)
   - Prix unitaire
   - Prix total ligne (calculé automatiquement)
   - Bouton supprimer l'article

2. **Total général** mis à jour en temps réel (taxes incluses)

3. **Rappel connexion** si l'utilisateur n'est pas connecté
   - Message non bloquant invitant à se connecter / créer un compte pour sauvegarder le panier

4. **Gestion des produits indisponibles**
   - Badge "Indisponible" sur le produit concerné
   - Total ajusté automatiquement
   - Message d'alerte bloquant le passage en caisse

5. **CTA "Passer à la caisse"**
   - Redirige vers `/checkout`
   - Si non connecté : propose connexion / inscription / continuer en invité

---

### 5.6 Checkout `/checkout` (multi-étapes)

**Étape 1 — Connexion / Inscription** (si non connecté)
- Formulaire de connexion
- Lien vers inscription
- Option "Continuer en tant qu'invité"

**Étape 2 — Adresse de facturation/livraison**
- Sélection d'une adresse existante (si connecté et adresses enregistrées)
- Formulaire nouvelle adresse :
  - Prénom, Nom
  - Adresse 1 (rue, numéro)
  - Adresse 2 (optionnel)
  - Ville, Région, Code postal, Pays
  - Numéro de téléphone mobile

**Étape 3 — Informations de paiement**
- Sélection d'une carte enregistrée (si disponible)
- Formulaire nouvelle carte :
  - Nom sur la carte
  - Numéro de carte (16 chiffres)
  - Date d'expiration (MM/AA)
  - CVV (3 chiffres)
- Interface sécurisée (Stripe ou PayPal — intégration via composant dédié)

**Étape 4 — Confirmation**
- Récapitulatif complet : produits, prix, taxes, adresse, mode de paiement
- Bouton **"Confirmer l'achat"**
- Après confirmation : email envoyé + redirection page de succès

**Fonctionnalités supplémentaires :**
- Possibilité de modifier la commande avant confirmation
- Génération facture PDF disponible post-commande
- Avoir automatique si facture supprimée

---

### 5.7 Inscription `/inscription`

**Formulaire :**
- Nom complet (prénom + nom)
- Adresse e-mail
- Mot de passe (avec indicateur de force, règles CNIL/RGPD)
- Confirmation mot de passe

**Comportements :**
- Validation côté client en temps réel (messages d'erreur inline)
- Après soumission : email de confirmation envoyé
- Compte inactif tant que l'email n'est pas validé (navigation possible, accès compte limité)
- Lien de validation valable 24h

---

### 5.8 Connexion `/connexion`

**Formulaire :**
- Adresse e-mail
- Mot de passe
- Checkbox "Se souvenir de moi"
- Lien "Mot de passe oublié" → `/mot-de-passe-oublie`

**Comportements :**
- Message d'erreur générique si email ou mot de passe incorrect (ne pas distinguer les deux pour la sécurité)
- Si compte non confirmé : message invitant à vérifier l'email
- Redirection automatique vers la page privée initialement demandée après connexion réussie

---

### 5.9 Mot de passe oublié `/mot-de-passe-oublie`

- Champ email
- Bouton envoyer
- Message de confirmation (même message si email inconnu, pour la sécurité)
- Lien de réinitialisation valable 24h

---

### 5.10 Compte utilisateur `/compte`

**Sous-section : Paramètres `/compte/parametres`**

Formulaires de modification :
- Nom complet
- Adresse e-mail (confirmation par email après changement)
- Mot de passe (saisie de l'ancien mot de passe obligatoire)

**Carnet d'adresses :**
- Liste des adresses enregistrées
- Ajouter / Modifier / Supprimer une adresse
- Formulaire identique à celui du checkout

**Méthodes de paiement :**
- Liste des cartes enregistrées (afficher uniquement les 4 derniers chiffres)
- Ajouter / Supprimer une carte
- Définir une carte par défaut

---

### 5.11 Historique des commandes `/compte/commandes`

**Affichage :**
- Commandes regroupées par année (titre par année)
- Ordre chronologique décroissant dans chaque groupe
- Chaque ligne : nom du produit, date, montant total, statut (badge coloré)

**Statuts avec couleurs :**
| Statut | Couleur |
|---|---|
| En attente | Orange `#F59E0B` |
| En cours | Bleu `#00a8b5` |
| Terminée | Vert `#10b981` |
| Annulée | Rouge `#ef4444` |

**Fonctionnalités :**
- Clic sur une commande → détail complet (produit, mode de paiement masqué à 4 derniers chiffres, adresse de facturation)
- Lien téléchargement facture PDF
- Barre de recherche (par nom produit ou date)
- Filtres : par année, par type de commande, par statut

---

### 5.12 Contact / Chatbot `/contact`

**Formulaire de contact :**
- Adresse e-mail (obligatoire)
- Sujet du message
- Texte du message
- Bouton "Envoyer"
- Message de confirmation visuel après envoi

**Chatbot :**
- Bouton "Contact Me" flottant ou fixe sur la page
- Fenêtre de chat en overlay (type widget)
- Réponses automatiques aux questions fréquentes
- Option "Parler à un agent" si besoin d'escalade
- Capture email/sujet en début de conversation si utilisateur non connecté

---

## 6. Comportements transversaux

### Responsive / Mobile-first
- Breakpoints à définir : mobile (< 768px), tablet (768–1024px), desktop (> 1024px)
- Approche **mobile-first** : styles de base pour mobile, overrides pour desktop
- Footer masqué sur mobile (contenu déplacé dans le menu burger)

### Pagination
- Présente sur toutes les listes de produits
- Navigation par pages (précédent / suivant + numéros de pages)
- Options : 10 / 25 / 50 produits par page

### Internationalisation (i18n)
- Site multilingue
- Support des langues **RTL** (arabe, hébreu) — prévoir `dir="rtl"` sur le `<html>` et styles miroirs
- Sélecteur de langue dans le menu
- Le back-office peut être en anglais uniquement

### Accessibilité (a11y)
- Conformité **WCAG 2.1**
- Tous les éléments interactifs utilisables au clavier
- Labels ARIA sur les formulaires et boutons
- Contrastes de couleurs suffisants (vérifier avec les couleurs de la charte)
- Compatible lecteurs d'écran

### Sécurité (côté front)
- Validation des formulaires côté client (avant envoi)
- Ne jamais afficher de données sensibles (numéros de carte complets, etc.)
- Sessions gérées via tokens (pas de données sensibles dans le localStorage)
- CSRF tokens sur les formulaires POST

---

## 7. Composants réutilisables à prévoir

| Composant | Usage |
|---|---|
| `<ProductCard>` | Catalogue, accueil, recherche, produits similaires |
| `<CategoryCard>` | Grille catégories accueil |
| `<Carousel>` | Accueil (slides promo) + page produit (images) |
| `<Badge>` | Statuts stock, statuts commande |
| `<SearchBar>` | Header + page recherche |
| `<CartIcon>` | Header avec badge compteur |
| `<Pagination>` | Toutes les listes |
| `<FilterPanel>` | Recherche, catalogue |
| `<AddressForm>` | Checkout, compte/paramètres |
| `<PaymentForm>` | Checkout, compte/paramètres |
| `<OrderCard>` | Historique commandes |
| `<ChatWidget>` | Page contact |
| `<StepIndicator>` | Checkout multi-étapes |

---

## 8. Choix techniques imposés

- **1 framework frontend** (à valider avec Althea Systems)
- **SPA** (Single Page Application)
- Communication avec une **API REST** (backend séparé)
- Intégration paiement : **Stripe** ou **PayPal**
- Génération PDF factures : côté serveur (front déclenche le téléchargement)

---

## 9. Ce qui N'est PAS dans le scope front

- Logique back-end / base de données
- Gestion des emails transactionnels (envoi)
- Génération des PDFs (côté serveur)
- Back-office administrateur (interface séparée)
- Authentification à deux facteurs (côté serveur)
