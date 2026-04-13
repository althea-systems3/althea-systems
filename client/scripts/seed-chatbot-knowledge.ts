/**
 * Script de seed de la base de connaissances du chatbot IA.
 *
 * Usage :
 *   npx ts-node --project tsconfig.json scripts/seed-chatbot-knowledge.ts
 *
 * Variables d'environnement requises :
 *   NEXT_PUBLIC_FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 */

import admin from "firebase-admin"

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY

if (!projectId || !clientEmail || !privateKey) {
  console.error("Variables Firebase manquantes.")
  process.exit(1)
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  })
}

const db = admin.firestore()
const COLLECTION = "BaseConnaissancesChatBot"

type KnowledgeEntry = {
  categorie: string
  titre: string
  contenu: string
  mots_cles: string[]
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // ─── FAQ ────────────────────────────────────────────────────────────────────
  {
    categorie: "faq",
    titre: "Comment créer un compte ?",
    contenu: `Pour créer un compte sur Althea Systems :
1. Cliquez sur "S'inscrire" en haut à droite de la page.
2. Renseignez votre adresse e-mail et choisissez un mot de passe sécurisé.
3. Validez votre inscription via le lien de confirmation envoyé par e-mail.
4. Complétez votre profil (nom, adresse de livraison) pour finaliser votre compte.`,
    mots_cles: ["créer", "compte", "inscription", "register", "signup", "s'inscrire"],
  },
  {
    categorie: "faq",
    titre: "Comment se connecter ?",
    contenu: `Pour vous connecter à votre compte :
1. Cliquez sur "Se connecter" en haut à droite.
2. Entrez votre adresse e-mail et votre mot de passe.
3. Cliquez sur "Connexion".
Si vous avez oublié votre mot de passe, utilisez le lien "Mot de passe oublié ?" sur la page de connexion.`,
    mots_cles: ["connexion", "connecter", "login", "se connecter", "accès"],
  },
  {
    categorie: "faq",
    titre: "Mot de passe oublié",
    contenu: `Si vous avez oublié votre mot de passe :
1. Rendez-vous sur la page de connexion.
2. Cliquez sur "Mot de passe oublié ?".
3. Entrez votre adresse e-mail.
4. Vous recevrez un e-mail avec un lien de réinitialisation valable 1 heure.
5. Cliquez sur ce lien et choisissez un nouveau mot de passe.`,
    mots_cles: ["mot de passe", "oublié", "réinitialisation", "reset", "password"],
  },
  {
    categorie: "faq",
    titre: "Comment modifier mon adresse e-mail ?",
    contenu: `Pour modifier votre adresse e-mail :
1. Connectez-vous à votre compte.
2. Accédez à "Mon compte" > "Mes paramètres".
3. Cliquez sur "Modifier l'e-mail".
4. Entrez votre nouvelle adresse et confirmez avec votre mot de passe actuel.
5. Un e-mail de vérification sera envoyé à la nouvelle adresse.`,
    mots_cles: ["email", "adresse", "modifier", "changer", "e-mail"],
  },
  {
    categorie: "faq",
    titre: "Comment modifier mon adresse de livraison ?",
    contenu: `Pour ajouter ou modifier une adresse de livraison :
1. Connectez-vous à votre compte.
2. Accédez à "Mon compte" > "Mes adresses".
3. Cliquez sur "Ajouter une adresse" ou modifiez une adresse existante.
4. Renseignez les informations et sauvegardez.
Vous pouvez enregistrer plusieurs adresses et en choisir une par défaut.`,
    mots_cles: ["adresse", "livraison", "modifier", "ajouter", "changer", "adresses"],
  },
  {
    categorie: "faq",
    titre: "Comment ajouter un moyen de paiement ?",
    contenu: `Pour ajouter un moyen de paiement :
1. Connectez-vous à votre compte.
2. Accédez à "Mon compte" > "Moyens de paiement".
3. Cliquez sur "Ajouter une carte".
4. Renseignez vos informations bancaires de façon sécurisée (Stripe).
Vos données bancaires sont traitées directement par Stripe et ne sont jamais stockées sur nos serveurs.`,
    mots_cles: ["paiement", "carte", "bancaire", "moyen", "ajouter", "stripe"],
  },
  {
    categorie: "faq",
    titre: "Comment supprimer mon compte ?",
    contenu: `Pour supprimer votre compte Althea Systems, veuillez contacter notre service support via le formulaire de contact en indiquant "Suppression de compte" comme sujet. Notre équipe traitera votre demande dans les 72h conformément au RGPD. Toutes vos données personnelles seront effacées.`,
    mots_cles: ["supprimer", "compte", "suppression", "fermer", "effacer", "rgpd"],
  },
  {
    categorie: "faq",
    titre: "Quels sont les moyens de paiement acceptés ?",
    contenu: `Althea Systems accepte les moyens de paiement suivants :
- Carte bancaire Visa, Mastercard, American Express
- Carte de débit
- Paiements sécurisés via Stripe
Tous les paiements sont traités de façon sécurisée (chiffrement SSL). Nous n'acceptons pas les virements bancaires ou les chèques pour les commandes en ligne.`,
    mots_cles: ["paiement", "carte", "visa", "mastercard", "moyens", "acceptés", "stripe"],
  },
  {
    categorie: "faq",
    titre: "Ma commande est-elle confirmée ?",
    contenu: `Une fois votre commande passée, vous recevrez un e-mail de confirmation avec le récapitulatif et le numéro de commande. Si vous ne recevez pas cet e-mail dans les 10 minutes, vérifiez vos spams. Vous pouvez également consulter l'état de vos commandes dans "Mon compte" > "Mes commandes".`,
    mots_cles: ["commande", "confirmée", "confirmation", "e-mail", "validation"],
  },
  {
    categorie: "faq",
    titre: "Comment télécharger ma facture ?",
    contenu: `Pour télécharger votre facture :
1. Connectez-vous à votre compte.
2. Accédez à "Mon compte" > "Mes commandes".
3. Cliquez sur la commande concernée.
4. Cliquez sur "Télécharger la facture" (format PDF).
Les factures sont disponibles dès validation du paiement.`,
    mots_cles: ["facture", "télécharger", "pdf", "invoice", "download"],
  },
  {
    categorie: "faq",
    titre: "Comment contacter le support ?",
    contenu: `Vous pouvez contacter notre équipe support via :
- Le formulaire de contact sur la page "Contact" du site
- En demandant à être mis en relation avec un agent humain via ce chatbot
Notre équipe répond dans un délai de 24 à 48h ouvrées.`,
    mots_cles: ["contact", "support", "aide", "assistance", "joindre", "équipe"],
  },
  {
    categorie: "faq",
    titre: "Le panier pour les visiteurs non connectés",
    contenu: `Vous pouvez ajouter des produits à votre panier sans être connecté. Votre panier est conservé dans votre navigateur. Lors de votre connexion ou création de compte, votre panier de visiteur sera automatiquement fusionné avec votre compte.`,
    mots_cles: ["panier", "visiteur", "non connecté", "invité", "session", "fusionner"],
  },
  {
    categorie: "faq",
    titre: "Commander sans créer de compte",
    contenu: `Pour le moment, la finalisation d'une commande nécessite la création d'un compte. Cela permet de suivre vos commandes et d'accéder à vos factures à tout moment. La création de compte est rapide et gratuite.`,
    mots_cles: ["commander", "sans compte", "invité", "guest", "inscription obligatoire"],
  },

  // ─── NAVIGATION ────────────────────────────────────────────────────────────
  {
    categorie: "navigation",
    titre: "Page de recherche de produits",
    contenu: `La page de recherche est accessible via l'icône loupe en haut de chaque page, ou directement à l'URL /recherche. Vous pouvez rechercher par nom de produit, référence ou mots-clés. Des filtres par catégorie et fourchette de prix sont disponibles.`,
    mots_cles: ["recherche", "trouver", "produit", "chercher", "search", "filtrer"],
  },
  {
    categorie: "navigation",
    titre: "Accéder au catalogue par catégorie",
    contenu: `Pour naviguer par catégorie, utilisez le menu principal en haut de page ou la page "Catalogue". Les catégories de produits médicaux y sont organisées par type d'équipement. Cliquez sur une catégorie pour voir tous les produits correspondants.`,
    mots_cles: ["catalogue", "catégorie", "menu", "navigation", "parcourir", "liste"],
  },
  {
    categorie: "navigation",
    titre: "Accéder à mon espace personnel",
    contenu: `Votre espace personnel est accessible en cliquant sur l'icône profil (ou "Mon compte") en haut à droite de la page. Vous y trouverez vos informations, adresses, commandes et moyens de paiement.`,
    mots_cles: ["espace personnel", "mon compte", "profil", "accéder", "compte"],
  },
  {
    categorie: "navigation",
    titre: "Voir mes commandes passées",
    contenu: `Pour accéder à votre historique de commandes :
1. Connectez-vous à votre compte.
2. Cliquez sur "Mon compte" en haut à droite.
3. Sélectionnez "Mes commandes".
Vous y trouverez toutes vos commandes avec leur statut et la possibilité de télécharger les factures.`,
    mots_cles: ["commandes", "historique", "passées", "suivi", "voir", "mes commandes"],
  },
  {
    categorie: "navigation",
    titre: "Page Contact",
    contenu: `La page Contact est accessible via le menu principal ou le pied de page du site. Vous pouvez y remplir un formulaire pour toute demande spécifique ou demande de devis. Notre équipe répond sous 24-48h ouvrées.`,
    mots_cles: ["contact", "page", "formulaire", "joindre", "accéder"],
  },

  // ─── POLITIQUE ─────────────────────────────────────────────────────────────
  {
    categorie: "politique",
    titre: "Délais de livraison",
    contenu: `Les délais de livraison standard chez Althea Systems sont de 3 à 7 jours ouvrés pour la France métropolitaine. Pour les commandes urgentes ou les livraisons en dehors de la France, veuillez contacter notre équipe via le formulaire de contact pour obtenir un devis personnalisé.`,
    mots_cles: ["livraison", "délais", "expédition", "délai", "jours", "livrer"],
  },
  {
    categorie: "politique",
    titre: "Politique de retour",
    contenu: `Notre politique de retour permet de retourner un produit sous 30 jours suivant la réception, sous réserve que le produit soit en état d'origine non utilisé et dans son emballage d'origine. Pour initier un retour, contactez notre service support via le formulaire de contact en indiquant votre numéro de commande.`,
    mots_cles: ["retour", "rembourser", "retourner", "échange", "30 jours", "return"],
  },
  {
    categorie: "politique",
    titre: "Sécurité des paiements",
    contenu: `Tous les paiements sur Althea Systems sont sécurisés par le protocole SSL/TLS. Nous utilisons Stripe, leader mondial du paiement en ligne, pour traiter les transactions. Vos données bancaires ne transitent jamais par nos serveurs et sont traitées directement par Stripe dans un environnement certifié PCI-DSS.`,
    mots_cles: ["sécurité", "paiement", "ssl", "stripe", "bancaire", "securisé"],
  },
  {
    categorie: "politique",
    titre: "Protection des données personnelles (RGPD)",
    contenu: `Althea Systems respecte le Règlement Général sur la Protection des Données (RGPD). Vos données personnelles sont utilisées uniquement pour la gestion de vos commandes et votre relation client. Vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Pour exercer ces droits, contactez-nous via le formulaire de contact.`,
    mots_cles: ["données", "rgpd", "vie privée", "confidentialité", "protection", "personnel"],
  },
  {
    categorie: "politique",
    titre: "Rupture de stock",
    contenu: `Si un produit est en rupture de stock, cela est indiqué sur sa fiche produit. Vous pouvez contacter notre équipe pour connaître le délai de réapprovisionnement ou pour commander en avance. Nous vous contacterons dès que le produit est de nouveau disponible.`,
    mots_cles: ["rupture", "stock", "disponibilité", "indisponible", "réapprovisionnement"],
  },
  {
    categorie: "politique",
    titre: "Facturation",
    contenu: `Une facture au format PDF est générée automatiquement pour chaque commande validée. Elle est disponible dans votre espace "Mes commandes" et envoyée par e-mail. Les factures sont conformes aux exigences légales françaises et incluent la TVA.`,
    mots_cles: ["facturation", "facture", "tva", "pdf", "comptabilité"],
  },
  {
    categorie: "politique",
    titre: "Annulation d'une commande",
    contenu: `Une commande peut être annulée tant qu'elle n'a pas été expédiée. Pour demander une annulation, contactez notre service support rapidement via le formulaire de contact en indiquant votre numéro de commande. Une fois expédiée, la procédure de retour s'applique.`,
    mots_cles: ["annuler", "annulation", "commande", "cancel", "modifier"],
  },

  // ─── COMPTE ────────────────────────────────────────────────────────────────
  {
    categorie: "compte",
    titre: "Changer de mot de passe",
    contenu: `Pour changer votre mot de passe :
1. Connectez-vous à votre compte.
2. Accédez à "Mon compte" > "Mes paramètres".
3. Cliquez sur "Modifier le mot de passe".
4. Entrez votre mot de passe actuel puis votre nouveau mot de passe.
5. Confirmez et sauvegardez.`,
    mots_cles: ["mot de passe", "changer", "modifier", "sécurité", "password"],
  },
  {
    categorie: "compte",
    titre: "Historique de mes commandes",
    contenu: `Pour consulter l'historique de vos commandes :
1. Connectez-vous à votre compte.
2. Accédez à "Mon compte" > "Mes commandes".
Vous y trouverez toutes vos commandes passées avec leur statut (en attente, en cours, terminée), les détails et les factures téléchargeables.`,
    mots_cles: ["historique", "commandes", "voir", "passées", "suivi"],
  },
  {
    categorie: "compte",
    titre: "Gérer mes adresses enregistrées",
    contenu: `Pour gérer vos adresses :
1. Connectez-vous à votre compte.
2. Accédez à "Mon compte" > "Mes adresses".
Vous pouvez y ajouter, modifier ou supprimer des adresses, et en définir une par défaut pour accélérer vos futures commandes.`,
    mots_cles: ["adresses", "gérer", "enregistrées", "livraison", "facturation"],
  },
  {
    categorie: "compte",
    titre: "Définir un moyen de paiement par défaut",
    contenu: `Pour définir un moyen de paiement par défaut :
1. Connectez-vous à votre compte.
2. Accédez à "Mon compte" > "Moyens de paiement".
3. Cliquez sur "Définir par défaut" à côté de la carte souhaitée.
Ce moyen de paiement sera présélectionné lors de vos prochaines commandes.`,
    mots_cles: ["paiement", "défaut", "carte", "principal", "moyen de paiement"],
  },
  {
    categorie: "compte",
    titre: "Se déconnecter",
    contenu: `Pour vous déconnecter :
1. Cliquez sur l'icône de votre profil en haut à droite.
2. Sélectionnez "Se déconnecter" dans le menu déroulant.
Vous serez déconnecté immédiatement et redirigé vers la page d'accueil.`,
    mots_cles: ["déconnecter", "déconnexion", "logout", "quitter", "se déconnecter"],
  },
]

async function seedKnowledgeBase() {
  console.log("Démarrage du seed de la base de connaissances...")

  const batch = db.batch()
  const collectionRef = db.collection(COLLECTION)
  const now = new Date().toISOString()

  for (const entry of KNOWLEDGE_BASE) {
    const docRef = collectionRef.doc()
    batch.set(docRef, {
      ...entry,
      actif: true,
      updated_at: now,
    })
  }

  await batch.commit()
  console.log(`✓ ${KNOWLEDGE_BASE.length} blocs de connaissance créés dans "${COLLECTION}".`)
}

seedKnowledgeBase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Erreur seed:", err)
    process.exit(1)
  })
