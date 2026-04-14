# Althea Systems Frontend (client)

Frontend e-commerce multilingue construit avec Next.js App Router, TypeScript, next-intl, Supabase et Firebase.

## Demarrage local

1. Dupliquer `.env.example` en `.env.local`.
2. Completer les variables obligatoires (sections ci-dessous).
3. Lancer:

```bash
pnpm install
pnpm dev
```

Application locale: `http://localhost:3000/fr`

## Variables d'environnement obligatoires

Utiliser `.env.example` comme base. Les variables ci-dessous sont requises par feature en production.

### 1) Noyau Supabase (auth/session/cart/static pages)

- `NEXT_PUBLIC_SUPABASE_URL`
  : URL du projet Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  : Cle publique utilisee par les flux auth serveur (signin/signup/session).
- `SUPABASE_SERVICE_ROLE_KEY`
  : Cle serveur pour endpoints admin/serveur (register legacy, panier, catalogue, pages statiques, administration).

### 2) Authentification

- `NEXT_PUBLIC_APP_URL`
  : URL publique de l'application pour generer les liens de verification e-mail (endpoint register legacy).
- `RESEND_API_KEY`
  : Cle API Resend pour envoi des e-mails transactionnels.
- `RESEND_FROM_EMAIL`
  : Adresse expediteur des e-mails transactionnels.

### 3) Panier (guest + compte connecte)

- `CART_COOKIE_SECRET`
  : Secret obligatoire pour signer le cookie de session panier guest (`cart_session_id`).

Si cette variable est absente, les APIs panier renvoient `503` avec `code: "configuration_missing"`.

### 4) Pages statiques publiques (CGU, Mentions legales, A propos)

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Si la base n'est pas joignable ou la config absente, un contenu editorial de fallback est servi cote serveur.

### 5) Images (Firestore / Firebase Admin)

- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (necessaire si usage Storage)

Ces variables alimentent les images categories/produits (home, catalogue, panier, top produits) via Firebase Admin.

### 6) Checkout paiement

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### 7) Chatbot

- `GROQ_API_KEY` (requis pour l'appel LLM)
- `GROQ_MODEL` (optionnel, valeur par defaut possible)

## Comportements de robustesse config

- Les routes critiques (`/api/cart`, `/api/cart/items`, `/api/cart/items/[id]`, `/api/cart/count`, `/api/auth/signup`) valident maintenant la config requise.
- En cas de config manquante:
  - logs serveur actionnables (variables manquantes et feature cible),
  - reponse API explicite `503` avec `code: "configuration_missing"`,
  - message front comprehensible (signup et panier).

## Endpoint legacy

- Endpoint cible unique: `/api/auth/signup`.
- `/api/auth/register` est deprecie et conserve uniquement pour retrocompatibilite externe.
- Sunset planifie: `31 Dec 2026 23:59:59 GMT`.
- A partir du sunset, `/api/auth/register` renvoie `410 endpoint_sunset` avec l'endpoint de remplacement.

## Verification avant merge

```bash
pnpm lint
pnpm test -- tests/api/authSignup.test.ts tests/api/authRegister.test.ts tests/api/cart.test.ts tests/api/cartItems.test.ts tests/api/cartItemsId.test.ts tests/api/staticPagesPublic.test.ts
pnpm build
```

Routes smoke recommandees:

- `/fr`
- `/fr/cgu`
- `/fr/mentions-legales`
- `/fr/a-propos`
- `/fr/panier`
- `/fr/inscription`
- `/fr/connexion`
- `/fr/contact`
- `/fr/recherche`
- `/fr/catalogue`
