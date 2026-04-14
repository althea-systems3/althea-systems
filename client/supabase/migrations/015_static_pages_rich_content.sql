-- ============================================================
-- Migration 015 : Enrichissement contenu pages statiques FR
-- ============================================================

INSERT INTO page_statique (
  slug,
  locale,
  titre,
  description,
  contenu_markdown,
  date_mise_a_jour
)
VALUES
  (
    'cgu',
    'fr',
    $$Conditions Generales d'Utilisation$$,
    $$Ces CGU precisent les regles d'acces, de commande et de responsabilite applicables a la plateforme Althea Systems.$$,
    $$## Objet et champ d'application
Les presentes Conditions Generales d'Utilisation (CGU) definissent les regles d'acces et d'utilisation du site Althea Systems. Elles s'appliquent a tout utilisateur naviguant sur le site, qu'il dispose d'un compte client ou non.

## Definitions
- Site: la plateforme web Althea Systems et ses pages associees.
- Client: toute personne physique ou morale utilisant les services proposes.
- Compte: l'espace authentifie permettant de gerer les informations client et les commandes.
- Services: les fonctionnalites de consultation, recherche, panier, commande et support.

## Acces au site
Le site est accessible en continu, sous reserve des operations de maintenance, des mises a jour techniques et des evenements independants de notre volonte. Althea Systems peut suspendre temporairement certaines fonctionnalites pour garantir la securite, la qualite de service ou la conformite reglementaire.

## Compte client et securite
- Les informations saisies lors de la creation du compte doivent etre exactes et tenues a jour.
- L'utilisateur est responsable de la confidentialite de ses identifiants.
- Toute action effectuee depuis un compte est presumee realisee par son titulaire.
- En cas d'acces suspect, l'utilisateur doit demander une assistance via [la page de contact](/contact).

## Produits, disponibilite et prix
Les fiches produits, stocks et tarifs sont mis a jour regulierement pour offrir une information fiable. Malgre ce suivi, une variation ponctuelle de disponibilite ou de prix peut intervenir entre la consultation d'un article et la validation finale de la commande.

- Les prix affiches sur le site sont indiques dans la devise et les conditions commerciales applicables.
- Les frais additionnels eventuels sont presentes avant la confirmation de commande.
- Les visuels et descriptions ont une finalite informative et peuvent evoluer avec les mises a jour catalogue.

## Processus de commande
Le parcours de commande suit les etapes suivantes:
1. Selection des produits et ajout au panier.
2. Verification des quantites, des disponibilites et des informations de livraison.
3. Validation du recapitulatif et du mode de paiement.
4. Confirmation de la commande et emission d'un numero de suivi.

La commande est consideree comme enregistree apres validation technique du paiement et disponibilite des references.

## Paiement et facturation
Le paiement s'effectue via des canaux securises compatibles avec les standards en vigueur. Les donnees sensibles de paiement sont traitees par des prestataires techniques specialises et ne sont pas conservees en clair par Althea Systems.

## Livraison, reception et incidents
Les delais annonces sont communiques a titre indicatif selon la zone de livraison et la disponibilite des produits. A reception, le client est invite a verifier l'etat du colis et la conformite des references recues afin de faciliter le traitement d'une eventuelle anomalie.

## Reclamations et support
Pour toute demande relative a une commande, une livraison ou un article, le client peut contacter l'equipe support via [la page de contact](/contact). Afin d'accelerer le traitement, il est recommande de preciser le numero de commande et le contexte de la demande.

## Donnees personnelles et cookies
Les donnees necessaires au fonctionnement du service sont traitees dans le respect de la reglementation applicable. Les informations detaillees sur les traitements, les droits des utilisateurs et les bases legales figurent dans [les mentions legales](/mentions-legales).

## Propriete intellectuelle
Les contenus du site (textes, elements visuels, logos, structure editoriale) sont proteges par les regles de propriete intellectuelle. Toute reproduction, adaptation ou diffusion non autorisee est interdite.

## Limitation de responsabilite
Althea Systems met en oeuvre des moyens raisonnables pour assurer la fiabilite du service, sans garantie d'absence totale d'interruption ou d'erreur. L'utilisateur reste responsable de l'usage qu'il fait des informations publiees et des actions engagees depuis son compte.

## Evolution du service et des CGU
Le site et ses fonctionnalites peuvent evoluer pour repondre aux besoins metier, techniques et reglementaires. Les presentes CGU peuvent etre mises a jour en consequence. La version en ligne fait foi a la date de consultation.

## Droit applicable
Les presentes CGU sont soumises au droit applicable au siege d'exploitation d'Althea Systems, sous reserve des dispositions imperatives eventuellement applicables.

## Contact
Pour toute question sur ces CGU ou sur l'utilisation du site, consultez [la page de contact](/contact).$$,
    NOW()
  ),
  (
    'mentions-legales',
    'fr',
    $$Mentions legales$$,
    $$Consultez les informations juridiques, techniques et editoriales encadrant l'exploitation du site Althea Systems.$$,
    $$## Editeur du site
Le site Althea Systems est exploite par Althea Systems, societe a vocation e-commerce B2B.

- Raison sociale: Althea Systems
- Forme juridique: SAS
- Activite principale: vente en ligne et accompagnement de clients professionnels
- Contact operationnel: [formulaire de contact](/contact)

## Direction de la publication
La direction de la publication et de la redaction est assuree par l'equipe de direction Althea Systems.

## Hebergement et infrastructure
Le site est heberge sur une infrastructure cloud securisee, avec surveillance technique et mesures de continuite de service adaptees a une plateforme transactionnelle.

## Objet du site
Le site permet de consulter un catalogue de produits, de gerer un panier, de passer commande et d'acceder a des contenus editoriaux utiles au parcours d'achat professionnel.

## Conditions d'utilisation
L'utilisation du site est soumise aux [Conditions Generales d'Utilisation](/cgu). En naviguant sur la plateforme, l'utilisateur reconnait avoir pris connaissance des regles applicables.

## Propriete intellectuelle
Les marques, logos, textes, compositions graphiques, visuels, structures de pages et contenus editoriaux du site sont proteges. Toute reutilisation non autorisee, totale ou partielle, est interdite.

## Liens hypertextes
Le site peut contenir des liens vers des ressources tierces. Althea Systems ne peut etre tenue responsable des contenus ou politiques de ces sites externes.

## Donnees personnelles
Les donnees strictement necessaires a la gestion des comptes, commandes et echanges de support sont traitees avec un niveau de securite adapte. Les demandes d'information ou d'exercice des droits peuvent etre adressees via [la page de contact](/contact).

## Cookies et mesures d'audience
Le site peut utiliser des cookies techniques indispensables au fonctionnement, ainsi que des outils de mesure d'usage permettant d'ameliorer l'experience utilisateur et la qualite de service.

## Disponibilite du service
Althea Systems s'efforce d'assurer une disponibilite continue de la plateforme, tout en se reservant la possibilite d'interrompre temporairement l'acces pour maintenance, securite ou evolution technique.

## Responsabilite
Malgre les controles operationnels mis en place, Althea Systems ne garantit pas l'absence totale d'anomalie sur l'ensemble des contenus et fonctionnalites. L'utilisateur est invite a signaler toute incoherence via [la page de contact](/contact).

## Droit applicable
Les presentes mentions legales sont regies par le droit applicable au siege d'exploitation d'Althea Systems, sous reserve des dispositions d'ordre public eventuellement applicables.

## Contact
Pour toute question juridique, editoriale ou technique, utilisez [la page de contact](/contact).$$,
    NOW()
  ),
  (
    'a-propos',
    'fr',
    $$A propos de Althea Systems$$,
    $$Althea Systems accompagne les professionnels avec une plateforme e-commerce fiable, claire et orientee resultats.$$,
    $$## Notre mission
Althea Systems aide les structures professionnelles a acheter plus efficacement, avec un parcours clair, des informations produit exploitables et un service operationnel fiable.

## Ce que nous apportons aux equipes metier
- Un catalogue structure et maintenu avec exigence.
- Une recherche rapide pour trouver la bonne reference sans perte de temps.
- Des informations de stock et de disponibilite visibles au moment utile.
- Un parcours de commande concu pour reduire les frictions.

## Notre methode de travail
Nous faisons evoluer la plateforme de facon continue, en combinant exigences metier, retour terrain et qualite technique.

1. Qualification des besoins fonctionnels et des contraintes de nos clients.
2. Structuration des contenus catalogue et des informations de commande.
3. Mise en production progressive, avec mesures de robustesse et de securite.
4. Amelioration continue basee sur l'usage reel de la plateforme.

## Une experience pensee pour la confiance
Chaque composant du parcours est concu pour favoriser la lisibilite et la maitrise:
- navigation simple entre categories et produits,
- verification explicite des etapes de checkout,
- communication transparente sur l'etat des commandes,
- acces direct a l'assistance en cas de besoin.

## Engagements de service
- Clarte: presenter des informations utiles et actionnables.
- Fiabilite: reduire les incoherences et maintenir un haut niveau de disponibilite.
- Reactivite: traiter les demandes clients avec un suivi concret.
- Evolution: faire progresser la plateforme au rythme des besoins professionnels.

## Pour qui nous travaillons
Nous accompagnons principalement des organisations ayant des attentes fortes en continuite de service, tracabilite et qualite d'execution: equipes achats, operations, support et directions fonctionnelles.

## Accompagnement et support
Notre equipe support intervient pour faciliter la prise en main, repondre aux questions operationnelles et aider a resoudre rapidement les situations bloquantes.

## Vision a long terme
Nous construisons une plateforme e-commerce durable, capable de s'adapter aux exigences des organisations professionnelles, a la croissance des catalogues et a l'evolution des usages numeriques.

## Continuer la visite
Decouvrez [notre catalogue](/catalogue), utilisez [la recherche](/recherche) ou [contactez-nous](/contact) pour echanger avec notre equipe.$$,
    NOW()
  )
ON CONFLICT (slug, locale) DO UPDATE
SET
  titre = EXCLUDED.titre,
  description = EXCLUDED.description,
  contenu_markdown = EXCLUDED.contenu_markdown,
  date_mise_a_jour = NOW();
