# Althea Systems - Schema Base de Donnees

## Architecture

- **Supabase (PostgreSQL)** : Donnees relationnelles (users, catalogue, commandes, panier)
- **Firebase Firestore** : Donnees non-relationnelles (images, chatbot, logs)
- **Firebase Storage** : Fichiers (images produits/categories, PDFs factures/avoirs, carousel)
- **Authentification** : Supabase Auth (gere les sessions, JWT, cookies HTTPOnly)

---

## SUPABASE (PostgreSQL)

---

### Table : utilisateur

Profil applicatif lie a Supabase Auth. Cree automatiquement via trigger a l'inscription.

| Colonne            | Type        | Contraintes                                      |
|--------------------|-------------|--------------------------------------------------|
| id_utilisateur     | UUID        | PK, FK vers auth.users(id), ON DELETE CASCADE    |
| email              | TEXT        | UNIQUE, NOT NULL                                 |
| nom_complet        | TEXT        | NOT NULL, defaut ''                              |
| statut             | TEXT        | NOT NULL, defaut 'en_attente'                    |
| est_admin          | BOOLEAN     | NOT NULL, defaut FALSE                           |
| email_verifie      | BOOLEAN     | NOT NULL, defaut FALSE                           |
| date_inscription   | TIMESTAMPTZ | NOT NULL, defaut NOW()                           |

**Enum statut** : actif | inactif | en_attente

**RLS** : Lecture propre profil uniquement (auth.uid() = id_utilisateur)

**Trigger** : `on_auth_user_created` -- insert automatique dans utilisateur quand un user s'inscrit via Supabase Auth.

---

### Table : adresse

Adresses de livraison/facturation liees a un utilisateur.

| Colonne         | Type   | Contraintes                                         |
|-----------------|--------|-----------------------------------------------------|
| id_adresse      | UUID   | PK, defaut uuid_generate_v4()                       |
| id_utilisateur  | UUID   | FK vers utilisateur(id_utilisateur), NOT NULL        |
| prenom          | TEXT   | NOT NULL                                             |
| nom             | TEXT   | NOT NULL                                             |
| adresse_1       | TEXT   | NOT NULL                                             |
| adresse_2       | TEXT   | Nullable                                             |
| ville           | TEXT   | NOT NULL                                             |
| code_postal     | TEXT   | NOT NULL                                             |
| pays            | TEXT   | NOT NULL                                             |
| telephone       | TEXT   | Nullable                                             |

**Relation** : Utilisateur 1 --> 0..* Adresse

---

### Table : methode_paiement

Methodes de paiement sauvegardees (Stripe).

| Colonne              | Type    | Contraintes                                      |
|----------------------|---------|--------------------------------------------------|
| id_paiement          | UUID    | PK, defaut uuid_generate_v4()                    |
| id_utilisateur       | UUID    | FK vers utilisateur(id_utilisateur), NOT NULL     |
| nom_carte            | TEXT    | NOT NULL                                          |
| derniers_4_chiffres  | TEXT    | NOT NULL                                          |
| date_expiration      | TEXT    | NOT NULL                                          |
| stripe_payment_id    | TEXT    | NOT NULL                                          |
| est_defaut           | BOOLEAN | NOT NULL, defaut FALSE                            |

**Relation** : Utilisateur 1 --> 0..* MethodePaiement

---

### Table : categorie

Categories de produits pour le catalogue et le menu de navigation.

| Colonne        | Type    | Contraintes                          |
|----------------|---------|--------------------------------------|
| id_categorie   | UUID    | PK, defaut uuid_generate_v4()       |
| nom            | TEXT    | NOT NULL                             |
| description    | TEXT    | Nullable                             |
| slug           | TEXT    | UNIQUE, NOT NULL                     |
| ordre_affiche  | INTEGER | NOT NULL, defaut 0                   |
| statut         | TEXT    | NOT NULL, defaut 'active'            |
| image_url      | TEXT    | Nullable                             |

**Enum statut** : active | inactive

**Index** : `idx_categorie_menu` sur (statut, ordre_affiche) WHERE statut = 'active' -- optimise la requete menu nav.

**RLS** : Lecture publique (tout le monde peut lire les categories).

---

### Table : produit

Produits du catalogue.

| Colonne               | Type         | Contraintes                          |
|-----------------------|--------------|--------------------------------------|
| id_produit            | UUID         | PK, defaut uuid_generate_v4()       |
| nom                   | TEXT         | NOT NULL                             |
| description           | TEXT         | Nullable                             |
| caracteristique_tech  | JSONB        | Nullable                             |
| prix_ht               | NUMERIC(10,2)| NOT NULL                            |
| tva                   | TEXT         | NOT NULL, defaut '20'                |
| prix_ttc              | NUMERIC(10,2)| NOT NULL                            |
| quantite_stock        | INTEGER      | NOT NULL, defaut 0                   |
| statut                | TEXT         | NOT NULL, defaut 'brouillon'         |
| slug                  | TEXT         | UNIQUE, NOT NULL                     |
| priorite              | INTEGER      | NOT NULL, defaut 0                   |
| est_top_produit       | BOOLEAN      | NOT NULL, defaut FALSE               |

**Enum tva** : 20 | 10 | 5.5 | 0

**Enum statut** : publie | brouillon

**RLS** : Lecture publique pour les produits publies (statut = 'publie').

---

### Table : produit_categorie

Table de jointure many-to-many entre produits et categories.

| Colonne       | Type | Contraintes                                          |
|---------------|------|------------------------------------------------------|
| id_produit    | UUID | FK vers produit(id_produit), ON DELETE CASCADE        |
| id_categorie  | UUID | FK vers categorie(id_categorie), ON DELETE CASCADE    |

**PK composite** : (id_produit, id_categorie)

---

### Table : panier

Panier d'achat. Supporte les guests (via session_id cookie) et les users connectes.

| Colonne         | Type        | Contraintes                                          |
|-----------------|-------------|------------------------------------------------------|
| id_panier       | UUID        | PK, defaut uuid_generate_v4()                        |
| id_utilisateur  | UUID        | FK vers utilisateur(id_utilisateur), Nullable         |
| session_id      | TEXT        | Nullable                                              |
| date_creation   | TIMESTAMPTZ | NOT NULL, defaut NOW()                                |

**Contrainte CHECK** : id_utilisateur IS NOT NULL OR session_id IS NOT NULL (chaque panier a un proprietaire)

**Index** :
- `idx_panier_session` sur (session_id) WHERE session_id IS NOT NULL
- `idx_panier_user` sur (id_utilisateur) WHERE id_utilisateur IS NOT NULL

**Fusion guest -> user** : A la connexion, le panier guest (session_id) est fusionne dans le panier user. Le panier guest est ensuite supprime.

---

### Table : ligne_panier

Lignes d'un panier (produits + quantites).

| Colonne          | Type    | Contraintes                                        |
|------------------|---------|----------------------------------------------------|
| id_ligne_panier  | UUID    | PK, defaut uuid_generate_v4()                      |
| id_panier        | UUID    | FK vers panier(id_panier), ON DELETE CASCADE        |
| id_produit       | UUID    | FK vers produit(id_produit), ON DELETE CASCADE       |
| quantite         | INTEGER | NOT NULL, CHECK (quantite > 0)                      |

**Contrainte UNIQUE** : (id_panier, id_produit) -- un produit ne peut apparaitre qu'une fois par panier.

**Index** : `idx_ligne_panier_panier` sur (id_panier)

---

### Table : commande

Commandes validees.

| Colonne           | Type         | Contraintes                                       |
|-------------------|--------------|---------------------------------------------------|
| id_commande       | UUID         | PK, defaut uuid_generate_v4()                     |
| numero_commande   | TEXT         | UNIQUE, NOT NULL                                   |
| id_utilisateur    | UUID         | FK vers utilisateur(id_utilisateur), NOT NULL       |
| id_adresse        | UUID         | FK vers adresse(id_adresse), NOT NULL               |
| date_commande     | TIMESTAMPTZ  | NOT NULL, defaut NOW()                              |
| montant_ht        | NUMERIC(10,2)| NOT NULL                                           |
| montant_tva       | NUMERIC(10,2)| NOT NULL                                           |
| montant_ttc       | NUMERIC(10,2)| NOT NULL                                           |
| statut            | TEXT         | NOT NULL, defaut 'en_attente'                       |
| statut_paiement   | TEXT         | NOT NULL, defaut 'en_attente'                       |

**Enum statut** : en_attente | en_cours | terminee | annulee

**Enum statut_paiement** : valide | en_attente | echoue | rembourse

---

### Table : ligne_commande

Lignes d'une commande (snapshot du produit au moment de l'achat).

| Colonne           | Type         | Contraintes                                       |
|-------------------|--------------|---------------------------------------------------|
| id_ligne          | UUID         | PK, defaut uuid_generate_v4()                     |
| id_commande       | UUID         | FK vers commande(id_commande), ON DELETE CASCADE    |
| id_produit        | UUID         | FK vers produit(id_produit), NOT NULL               |
| quantite          | INTEGER      | NOT NULL                                            |
| prix_unitaire_ht  | NUMERIC(10,2)| NOT NULL                                           |
| prix_total_ttc    | NUMERIC(10,2)| NOT NULL                                           |

**Relation** : Commande 1 --> 1..* LigneCommande

---

### Table : historique_statut

Historique des changements de statut d'une commande.

| Colonne            | Type        | Contraintes                                       |
|--------------------|-------------|---------------------------------------------------|
| id_historique      | UUID        | PK, defaut uuid_generate_v4()                     |
| id_commande        | UUID        | FK vers commande(id_commande), ON DELETE CASCADE    |
| statut_precedent   | TEXT        | NOT NULL                                            |
| nouveau_statut     | TEXT        | NOT NULL                                            |
| date_changement    | TIMESTAMPTZ | NOT NULL, defaut NOW()                              |

**Relation** : Commande 1 --> 0..* HistoriqueStatut

---

### Table : facture

Factures liees aux commandes.

| Colonne          | Type         | Contraintes                                       |
|------------------|--------------|---------------------------------------------------|
| id_facture       | UUID         | PK, defaut uuid_generate_v4()                     |
| numero_facture   | TEXT         | UNIQUE, NOT NULL                                   |
| id_commande      | UUID         | FK vers commande(id_commande), NOT NULL             |
| date_emission    | TIMESTAMPTZ  | NOT NULL, defaut NOW()                              |
| montant_ttc      | NUMERIC(10,2)| NOT NULL                                           |
| statut           | TEXT         | NOT NULL, defaut 'en_attente'                       |
| pdf_url          | TEXT         | Nullable (URL Firebase Storage)                     |

**Enum statut** : payee | en_attente | annule

**Relation** : Commande 1 --> 0..1 Facture

---

### Table : avoir

Avoirs (remboursements partiels) lies a une facture.

| Colonne         | Type         | Contraintes                                       |
|-----------------|--------------|---------------------------------------------------|
| id_avoir        | UUID         | PK, defaut uuid_generate_v4()                     |
| numero_avoir    | TEXT         | UNIQUE, NOT NULL                                   |
| id_facture      | UUID         | FK vers facture(id_facture), NOT NULL               |
| date_emission   | TIMESTAMPTZ  | NOT NULL, defaut NOW()                              |
| montant         | NUMERIC(10,2)| NOT NULL                                           |
| motif           | TEXT         | NOT NULL                                            |
| pdf_url         | TEXT         | Nullable (URL Firebase Storage)                     |

**Enum motif** : annulation | remboursement | erreur

**Relation** : Facture 1 --> 0..* Avoir

---

### Table : message_contact

Messages du formulaire de contact.

| Colonne              | Type        | Contraintes                          |
|----------------------|-------------|--------------------------------------|
| id_message           | UUID        | PK, defaut uuid_generate_v4()       |
| email                | TEXT        | NOT NULL                             |
| sujet                | TEXT        | NOT NULL                             |
| contenu              | TEXT        | NOT NULL                             |
| date_envoie          | TIMESTAMPTZ | NOT NULL, defaut NOW()               |
| est_traite           | BOOLEAN     | NOT NULL, defaut FALSE               |
| id_admin_traitement  | UUID        | FK vers utilisateur, Nullable        |

---

### Table : carrousel

Slides du carrousel de la page d'accueil.

| Colonne           | Type    | Contraintes                          |
|-------------------|---------|--------------------------------------|
| id_slide          | UUID    | PK, defaut uuid_generate_v4()       |
| titre             | TEXT    | NOT NULL                             |
| texte             | TEXT    | Nullable                             |
| lien_redirection  | TEXT    | Nullable                             |
| ordre             | INTEGER | NOT NULL, defaut 0                   |
| actif             | BOOLEAN | NOT NULL, defaut TRUE                |
| image_url         | TEXT    | Nullable                             |

---

## FIREBASE FIRESTORE

---

### Collection : ImagesProduits

Images associees aux produits. Stockees dans Firestore car structure JSON flexible.

| Champ       | Type   | Description                                              |
|-------------|--------|----------------------------------------------------------|
| product_id  | string | ID du produit (reference vers produit.id_produit)        |
| images      | json   | Array d'objets image                                     |

**Structure images[] :**
| Champ          | Type    | Description                    |
|----------------|---------|--------------------------------|
| url            | string  | URL Firebase Storage           |
| ordre          | integer | Ordre d'affichage              |
| est_principale | boolean | Image principale du produit    |
| alt_text       | string  | Texte alternatif (a11y)        |

---

### Collection : ImagesCategories

Images associees aux categories.

| Champ         | Type   | Description                                               |
|---------------|--------|-----------------------------------------------------------|
| category_id   | string | ID de la categorie (reference vers categorie.id_categorie)|
| image_url     | string | URL image principale                                      |
| thumbnail_url | string | URL miniature                                             |

---

### Collection : ImagesCarrousel

Images du carrousel (versions desktop et mobile).

| Champ             | Type   | Description                                       |
|-------------------|--------|---------------------------------------------------|
| slide_id          | string | ID du slide (reference vers carrousel.id_slide)   |
| image_desktop_url | string | URL image desktop                                 |
| image_mobile_url  | string | URL image mobile                                  |

---

### Collection : ConversationsChatBot

Historique des conversations du chatbot.

| Champ           | Type      | Description                           |
|-----------------|-----------|---------------------------------------|
| conversation_id | string    | ID unique de la conversation          |
| user_id         | string?   | Nullable, ID utilisateur si connecte  |
| session_id      | string    | ID session (guest ou connecte)        |
| created_at      | timestamp | Date de creation                      |
| message         | json      | Array de messages                     |

**Structure message[] :**
| Champ     | Type      | Description                |
|-----------|-----------|----------------------------|
| role      | string    | "user" ou "bot"            |
| content   | string    | Contenu du message         |
| timestamp | timestamp | Date du message            |

---

### Collection : LogsActivite

Logs d'activite pour audit et analytics.

| Champ     | Type      | Description                           |
|-----------|-----------|---------------------------------------|
| log_id    | string    | ID unique du log                      |
| timestamp | timestamp | Date de l'action                      |
| user_id   | string    | ID utilisateur                        |
| action    | string    | Description de l'action               |

---

## FIREBASE STORAGE

Organisation des buckets :

```
/products/          --> Images produits
/categories/        --> Images categories
/invoices/          --> PDFs factures et avoirs
/carousel/          --> Images carousel (desktop + mobile)
```

---

## RELATIONS (resume)

```
utilisateur 1 ---> 0..* adresse
utilisateur 1 ---> 0..* methode_paiement
utilisateur 1 ---> 0..* commande
utilisateur 1 ---> 0..1 panier

categorie 1 ---> * produit_categorie * <--- 1 produit

commande 1 ---> 1..* ligne_commande
commande 1 ---> 0..* historique_statut
commande 1 ---> 0..1 facture

facture 1 ---> 0..* avoir

panier 1 ---> 0..* ligne_panier
ligne_panier *..1 ---> produit
```

---

## ENUMS (resume)

| Enum                  | Valeurs                                       |
|-----------------------|-----------------------------------------------|
| StatutUser            | actif, inactif, en_attente                    |
| StatutCategorie       | active, inactive                              |
| StatutProduit         | publie, brouillon                             |
| TVA                   | 20, 10, 5.5, 0                                |
| StatutCommande        | en_attente, en_cours, terminee, annulee       |
| StatutPaiement        | valide, en_attente, echoue, rembourse         |
| StatutFacture         | payee, en_attente, annule                     |
| MotifAvoir            | annulation, remboursement, erreur             |
