# Architecture sécurité — Althea Systems

## 1. Authentification et sessions

**Provider :** Supabase Auth (JWT + cookies httpOnly)

- Sessions gérées par Supabase avec refresh tokens automatiques
- Cookies : `httpOnly`, `secure` (production), `sameSite: lax`
- Session courte (2h) sans cookie "remember me", 30 jours avec
- Middleware `proxy.ts` vérifie la session sur les routes protégées (`/compte/*`, `/admin/*`)
- Déconnexion via `supabaseClient.auth.signOut()` côté serveur

**Fichiers clés :**
- `lib/auth/session.ts` — `getCurrentUser()`
- `lib/auth/constants.ts` — durées de session
- `proxy.ts` — middleware de vérification

## 2. Authentification 2FA admin

**Stratégie :** code email à 6 chiffres, signé HMAC-SHA256

- Obligatoire pour tous les comptes `est_admin = true`
- Code généré avec `crypto.randomInt()`, hashé SHA256 avec nonce
- Challenge cookie signé HMAC-SHA256, validité 10 minutes
- Comparaison timing-safe (`timingSafeEqual`) contre attaques temporelles
- Verrouillage après 5 tentatives échouées
- Cookie vérifié valable 8 heures (`httpOnly`, `secure`, `sameSite: strict`)
- `verifyAdminAccess()` vérifie : auth + est_admin + cookie 2FA valide

**Fichiers clés :**
- `lib/auth/adminTwoFactor.ts` — génération, vérification, signature
- `lib/auth/adminGuard.ts` — garde d'accès admin
- `app/api/auth/admin-2fa/challenge/route.ts` — envoi du code
- `app/api/auth/admin-2fa/verify/route.ts` — vérification du code

## 3. Protection CSRF

**Stratégie :** vérification Origin/Host header

- Appliquée sur les requêtes mutatives (POST, PUT, PATCH, DELETE)
- Bypass pour GET/HEAD (safe methods)
- Vérifie que l'en-tête `Origin` correspond au `Host` (ou `x-forwarded-host`)
- Retourne 403 en cas de mismatch ou d'absence d'Origin

**Routes protégées :**
- `/api/admin/*`
- `/api/account/*`
- `/api/checkout/*`
- `/api/contact/*`
- `/api/chatbot/*`

**Fichiers clés :**
- `lib/auth/csrf.ts` — logique de vérification
- `proxy.ts` — application du middleware CSRF
- `lib/http/secureFetch.ts` — côté client, ajout du header CSRF

## 4. Protection XSS

**Stratégie multicouche :**

1. **React** — échappement automatique à l'affichage (défense principale)
2. **`sanitizeText()`** — défense en profondeur côté input
   - Suppression des balises HTML (`<[^>]*>`)
   - Collapse des espaces excessifs
   - Troncature à longueur maximale
   - Appliqué sur : formulaire contact (sujet, message)
3. **`escapeHtml()`** — échappement dans les emails HTML générés côté serveur
4. **`sanitizeChatContent()`** — nettoyage des messages chatbot

**Fichiers clés :**
- `lib/auth/sanitize.ts` — `sanitizeText()`
- `lib/auth/email.ts` — `escapeHtml()`
- `lib/contact/chatbot.ts` — `sanitizeChatContent()`

## 5. Protection injection SQL

**Stratégie :** requêtes paramétrées exclusivement

- Supabase client utilise des requêtes paramétrées (pas de SQL brut)
- Validation par whitelist des colonnes triables dans les routes admin
- `normalizeString()` appliqué sur tous les paramètres de recherche
- Pas de concaténation de requêtes SQL nulle part dans le codebase

**Fichiers clés :**
- `lib/admin/common.ts` — `normalizeString()`, whitelists de tri
- Routes admin — validation stricte des paramètres de filtre/tri

## 6. Rate limiting

**Stratégie :** compteur en mémoire par IP avec fenêtres temporelles

| Endpoint | Limite | Fenêtre |
|----------|--------|---------|
| Inscription | 5 requêtes | 15 min |
| Connexion | 5 requêtes | 15 min |
| Renvoi email | 3 requêtes | 15 min |
| Mot de passe oublié | 3 requêtes | 15 min |
| Reset mot de passe | 5 requêtes | 15 min |

- Identification par `x-forwarded-for` (premier IP) ou `x-real-ip`
- Reset automatique après expiration de la fenêtre

**Fichier clé :** `lib/auth/rateLimiter.ts`

## 7. Row-Level Security (RLS)

Toutes les tables Supabase ont RLS activé avec des policies basées sur `auth.uid()` :

| Table | Policy |
|-------|--------|
| `utilisateur` | Lecture propre profil uniquement |
| `categorie` | Lecture publique |
| `produit` | Lecture publique (publiés seulement) |
| `adresse` | Lecture/écriture propriétaire |
| `methode_paiement` | Lecture/écriture propriétaire |
| `commande` | Lecture propriétaire |
| `ligne_commande` | Via propriétaire commande |
| `facture` | Via propriétaire commande |
| `avoir` | Via propriétaire facture/commande |
| `panier` | Lecture/écriture propriétaire |
| `ligne_panier` | Via propriétaire panier |
| `carrousel` | Lecture publique (actifs) |
| `message_contact` | Pas de lecture publique (admin service role) |

Les opérations admin utilisent le service role Supabase (`createAdminClient`) qui bypass RLS.

**Fichiers clés :** `supabase/migrations/001_layout_tables.sql`, `002_remaining_tables.sql`

## 8. Headers de sécurité

Configurés dans `next.config.ts` via `async headers()` :

| Header | Valeur |
|--------|--------|
| Content-Security-Policy | `default-src 'self'` + Stripe + Supabase + Firestore |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` |

## 9. Gestion des secrets

- Variables d'environnement via `.env.local` (jamais commité)
- Supabase service role key : usage serveur uniquement (`createAdminClient`)
- Clés Stripe : server-side uniquement
- Tokens (email validation, reset password) : UUID hashés SHA256 en base, valeur brute dans l'URL email
- Secrets 2FA admin : signés HMAC-SHA256 avec clé secrète serveur

## 10. HTTPS / SSL

- HTTPS obligatoire en production (Vercel / hébergeur)
- Header HSTS avec `max-age=63072000` et `preload`
- Cookies `secure: true` en production
- Redirection HTTP → HTTPS gérée par l'infrastructure

## 11. Validation des mots de passe

| Règle | Valeur |
|-------|--------|
| Longueur minimale | 8 caractères |
| Majuscule | Au moins 1 |
| Minuscule | Au moins 1 |
| Chiffre | Au moins 1 |
| Confirmation | Doit correspondre |

Stockage : bcrypt via Supabase Auth (jamais en clair).

**Fichier clé :** `lib/auth/validation.ts`

## 12. Audit et journalisation

**Firestore collection `LogsActivite` :**

Actions journalisées :
- Login admin / échecs significatifs
- Validation 2FA admin
- Changements de statut utilisateur
- Désactivation / suppression RGPD
- Reset mot de passe
- Modification profil
- Changements de statut commande
- Opérations facture/avoir (annulation, envoi email)
- Changement de préférence langue

**Fichiers clés :**
- `lib/firebase/logActivity.ts` — `logAdminActivity()`
- `lib/auth/logAuthActivity.ts` — `logAuthActivity()`

## 13. Sécurité du panier (session guest)

- Session ID signée HMAC-SHA256 avec clé secrète
- Cookie `cart_session_id` : `httpOnly`, `sameSite: lax`, 30 jours
- Comparaison timing-safe de la signature
- Fusion panier guest → utilisateur après login

**Fichier clé :** `lib/auth/cartSession.ts`

## 14. Tests de sécurité

Tests automatisés existants :
- `tests/lib/csrf.test.ts` — vérification CSRF (8 tests)
- `tests/lib/rateLimiter.test.ts` — rate limiting (4 tests)
- `tests/lib/adminGuard.test.ts` — garde admin (4 tests)
- `tests/lib/adminTwoFactor.test.ts` — 2FA crypto (6 tests)
- `tests/api/authAdminTwoFactor.test.ts` — endpoints 2FA (8 tests)
- `tests/lib/cartSession.test.ts` — session panier (5 tests)
- `tests/lib/secureFetch.test.ts` — fetch sécurisé (4 tests)
- `tests/lib/sanitize.test.ts` — sanitisation XSS (8 tests)
- `tests/api/securityAccess.test.ts` — accès non autorisé
- `tests/api/securityInjection.test.ts` — tentatives d'injection
