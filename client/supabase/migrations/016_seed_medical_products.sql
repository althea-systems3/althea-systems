-- ============================================================================
-- Migration 016 : Seed produits médicaux (B2B équipement médical)
-- ============================================================================
--
-- ATTENTION : Cette migration est DESTRUCTIVE.
-- Elle supprime TOUS les produits actuels et leurs dépendances (paniers, etc.)
-- avant de seeder un catalogue d'équipement médical professionnel.
--
-- Ne PAS exécuter en production sans backup préalable.
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Nettoyage : supprimer dépendances + produits + catégories existants
-- ────────────────────────────────────────────────────────────────────────────

-- Lignes de panier (cascade depuis ligne_panier sur produit déjà géré)
DELETE FROM ligne_panier WHERE id_produit IN (SELECT id_produit FROM produit);

-- Liaisons produit-catégorie (cascade géré par FK)
-- Lignes de commande (laissées intactes pour préserver l'historique commercial)
-- → Si tu veux aussi nettoyer les commandes, décommente :
-- DELETE FROM avoir;
-- DELETE FROM facture;
-- DELETE FROM ligne_commande;
-- DELETE FROM commande;

-- Suppression produits (cascade vers produit_categorie)
DELETE FROM produit;

-- Suppression catégories
DELETE FROM categorie;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Seed catégories (équipement médical B2B)
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO categorie (id_categorie, nom, description, slug, ordre_affiche, statut, image_url) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Diagnostic',          'Stéthoscopes, tensiomètres, oxymètres et instruments d''auscultation pour cabinets médicaux.', 'diagnostic',          1, 'active', NULL),
  ('11111111-1111-1111-1111-111111111102', 'Mobilier médical',    'Tables d''examen, fauteuils de soins, chariots et mobilier ergonomique pour établissements de santé.', 'mobilier-medical',    2, 'active', NULL),
  ('11111111-1111-1111-1111-111111111103', 'Hygiène & Stérilisation', 'Autoclaves, désinfectants, équipements de stérilisation conformes aux normes hospitalières.', 'hygiene-sterilisation', 3, 'active', NULL),
  ('11111111-1111-1111-1111-111111111104', 'Consommables',        'Gants, masques, compresses, pansements et dispositifs à usage unique.', 'consommables',        4, 'active', NULL),
  ('11111111-1111-1111-1111-111111111105', 'Imagerie médicale',   'Échographes portables, ECG, dispositifs d''imagerie pour diagnostic et suivi.', 'imagerie-medicale',   5, 'active', NULL),
  ('11111111-1111-1111-1111-111111111106', 'Urgence & Premiers secours', 'Défibrillateurs, trousses d''urgence, équipements de réanimation.', 'urgence-premiers-secours', 6, 'active', NULL);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Seed produits (~20 produits médicaux représentatifs)
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO produit (id_produit, nom, description, caracteristique_tech, prix_ht, tva, prix_ttc, quantite_stock, statut, slug, priorite, est_top_produit) VALUES
  -- Diagnostic
  ('22222222-2222-2222-2222-222222222201',
   'Stéthoscope cardiologique professionnel',
   'Stéthoscope double pavillon haute performance pour auscultation cardiaque et pulmonaire. Membrane réglable, tubulure latex-free.',
   '{"Marque": "MedPro", "Type": "Cardiologie", "Pavillon": "Double", "Tubulure": "Latex-free", "Garantie": "5 ans"}',
   145.00, '20', 174.00, 50, 'publie', 'stethoscope-cardiologique-pro', 10, true),

  ('22222222-2222-2222-2222-222222222202',
   'Tensiomètre électronique brassard',
   'Tensiomètre automatique avec brassard ajustable 22-42 cm. Mémoire 99 mesures, détection arythmie, écran LCD rétroéclairé.',
   '{"Marque": "MedPro", "Type": "Électronique", "Brassard": "22-42 cm", "Mémoire": "99 mesures", "Alimentation": "4 piles AA + secteur"}',
   89.00, '20', 106.80, 80, 'publie', 'tensiometre-electronique-brassard', 9, true),

  ('22222222-2222-2222-2222-222222222203',
   'Oxymètre de pouls professionnel',
   'Oxymètre de pouls portable avec écran OLED. Mesure SpO2 et fréquence cardiaque, certification CE Médical.',
   '{"Plage SpO2": "70-100%", "Plage FC": "30-250 bpm", "Précision SpO2": "±2%", "Autonomie": "30 heures", "Certification": "CE Médical Classe IIa"}',
   55.00, '20', 66.00, 120, 'publie', 'oxymetre-pouls-professionnel', 8, false),

  ('22222222-2222-2222-2222-222222222204',
   'Otoscope LED avec spéculums',
   'Otoscope diagnostic à éclairage LED haute intensité. Inclut 10 spéculums réutilisables (2,5/4/5 mm) et étui rigide.',
   '{"Éclairage": "LED 3500 lux", "Grossissement": "x3", "Spéculums inclus": "10", "Tailles": "2.5/4/5 mm", "Garantie": "3 ans"}',
   175.00, '20', 210.00, 35, 'publie', 'otoscope-led-speculums', 7, false),

  ('22222222-2222-2222-2222-222222222205',
   'Thermomètre médical infrarouge sans contact',
   'Thermomètre frontal infrarouge à mesure rapide (1 seconde). Mode adulte/enfant/objet, mémoire 30 mesures.',
   '{"Type": "Infrarouge", "Distance": "3-5 cm", "Précision": "±0,2°C", "Mode": "Adulte/Enfant/Objet", "Garantie": "2 ans"}',
   42.00, '20', 50.40, 200, 'publie', 'thermometre-infrarouge-sans-contact', 6, true),

  -- Mobilier médical
  ('22222222-2222-2222-2222-222222222206',
   'Table d''examen médicale 2 plans',
   'Table d''examen avec dossier inclinable et repose-jambes ajustable. Structure acier époxy, revêtement skaï médical.',
   '{"Plans": "2", "Charge max": "200 kg", "Hauteur": "75 cm", "Revêtement": "Skaï médical PU", "Coloris": "Bleu clinique"}',
   780.00, '20', 936.00, 12, 'publie', 'table-examen-medicale-2-plans', 5, false),

  ('22222222-2222-2222-2222-222222222207',
   'Fauteuil de prélèvement réglable',
   'Fauteuil de prélèvement sanguin avec accoudoirs ajustables. Réglage hauteur hydraulique, repose-bras pivotants.',
   '{"Hauteur": "Réglable 50-75 cm", "Charge max": "180 kg", "Accoudoirs": "Ajustables 360°", "Mécanisme": "Hydraulique"}',
   620.00, '20', 744.00, 18, 'publie', 'fauteuil-prelevement-reglable', 5, false),

  ('22222222-2222-2222-2222-222222222208',
   'Chariot de soins inox 3 plateaux',
   'Chariot médical en inox 304 avec 3 plateaux et tiroir verrouillable. Roulettes pivotantes silencieuses (2 avec frein).',
   '{"Matériau": "Inox 304", "Plateaux": "3", "Charge max": "60 kg", "Roulettes": "Ø 100 mm avec freins", "Tiroir": "Verrouillable"}',
   295.00, '20', 354.00, 25, 'publie', 'chariot-soins-inox-3-plateaux', 4, false),

  -- Hygiène & Stérilisation
  ('22222222-2222-2222-2222-222222222209',
   'Autoclave de classe B 18 litres',
   'Autoclave de stérilisation classe B conforme EN 13060. Cuve 18 L, cycles préprogrammés, traçabilité USB.',
   '{"Capacité": "18 L", "Classe": "B", "Norme": "EN 13060", "Cycles": "Préprogrammés + personnalisables", "Traçabilité": "USB + impression"}',
   2450.00, '20', 2940.00, 6, 'publie', 'autoclave-classe-b-18l', 3, true),

  ('22222222-2222-2222-2222-222222222210',
   'Désinfectant surfaces médical 5L',
   'Solution désinfectante prête à l''emploi pour surfaces médicales. Bactéricide, virucide, fongicide. Bidon 5L.',
   '{"Volume": "5 L", "Action": "Bactéricide/Virucide/Fongicide", "Norme": "EN 14476", "Délai action": "1 minute", "Compatibilité": "Tous matériaux médicaux"}',
   28.50, '20', 34.20, 150, 'publie', 'desinfectant-surfaces-medical-5l', 2, false),

  ('22222222-2222-2222-2222-222222222211',
   'Distributeur de gel hydroalcoolique automatique',
   'Distributeur mural automatique avec capteur infrarouge. Capacité 1L, fonctionnement sur piles.',
   '{"Capacité": "1 L", "Détection": "Infrarouge sans contact", "Alimentation": "4 piles AA", "Autonomie": "~50000 utilisations", "Fixation": "Murale"}',
   95.00, '20', 114.00, 40, 'publie', 'distributeur-gel-hydroalcoolique-auto', 2, false),

  -- Consommables
  ('22222222-2222-2222-2222-222222222212',
   'Gants nitrile non poudrés (boîte de 100)',
   'Gants d''examen nitrile bleu, sans poudre, sans latex. Conforme norme EN 455. Boîte 100 unités. Tailles S/M/L/XL.',
   '{"Matériau": "Nitrile", "Poudre": "Non", "Latex": "Non", "Norme": "EN 455", "Quantité": "100 par boîte", "Tailles": "S, M, L, XL"}',
   12.50, '5.5', 13.19, 500, 'publie', 'gants-nitrile-non-poudres-100', 1, true),

  ('22222222-2222-2222-2222-222222222213',
   'Masque chirurgical Type IIR (boîte 50)',
   'Masque chirurgical 3 plis avec filtration BFE >98%. Conforme EN 14683 Type IIR. Boîte de 50 masques.',
   '{"Type": "IIR", "Filtration BFE": ">98%", "Norme": "EN 14683", "Plis": "3", "Quantité": "50 par boîte", "Élastiques": "Souples"}',
   8.90, '5.5', 9.39, 800, 'publie', 'masque-chirurgical-type-iir-50', 1, true),

  ('22222222-2222-2222-2222-222222222214',
   'Compresses stériles non tissées 10x10 cm (200)',
   'Compresses stériles non tissées, 4 plis, 30 g/m². Stérilisées par rayons gamma. Sachet de 200 unités.',
   '{"Dimensions": "10x10 cm", "Plis": "4", "Grammage": "30 g/m²", "Stérilisation": "Rayons gamma", "Quantité": "200 par sachet"}',
   18.00, '5.5', 18.99, 350, 'publie', 'compresses-steriles-non-tissees-10x10', 1, false),

  ('22222222-2222-2222-2222-222222222215',
   'Pansements adhésifs hypoallergéniques (boîte 100)',
   'Pansements adhésifs en non-tissé hypoallergénique, micro-aéré. Boîte de 100 pansements assortis.',
   '{"Matériau": "Non-tissé hypoallergénique", "Aération": "Micro-aérée", "Tailles": "Assorties", "Quantité": "100 par boîte"}',
   9.50, '5.5', 10.02, 400, 'publie', 'pansements-adhesifs-hypoallergeniques-100', 1, false),

  -- Imagerie médicale
  ('22222222-2222-2222-2222-222222222216',
   'Échographe portable multi-fréquences',
   'Échographe portable Doppler couleur. 3 sondes incluses (linéaire, convexe, cardiaque). Écran 12" tactile, batterie 4h.',
   '{"Sondes incluses": "3 (linéaire, convexe, cardiaque)", "Écran": "12'' tactile", "Mode Doppler": "Couleur, pulsé, énergie", "Autonomie": "4h", "Mémoire": "256 GB SSD"}',
   8500.00, '20', 10200.00, 3, 'publie', 'echographe-portable-multi-frequences', 4, true),

  ('22222222-2222-2222-2222-222222222217',
   'Électrocardiographe 12 dérivations',
   'ECG 12 dérivations avec interprétation automatique. Imprimante thermique intégrée, écran couleur 7", connexion USB/LAN.',
   '{"Dérivations": "12 simultanées", "Écran": "7'' couleur", "Imprimante": "Thermique intégrée", "Connectique": "USB, LAN, Bluetooth", "Mémoire": "200 ECG"}',
   1850.00, '20', 2220.00, 8, 'publie', 'electrocardiographe-12-derivations', 3, false),

  -- Urgence & Premiers secours
  ('22222222-2222-2222-2222-222222222218',
   'Défibrillateur automatique externe (DAE)',
   'Défibrillateur entièrement automatique avec instructions vocales multilingues. Batterie 5 ans, électrodes adultes incluses.',
   '{"Type": "Entièrement automatique", "Instructions": "Vocales multilingues", "Batterie": "5 ans / 200 chocs", "Électrodes": "Adultes incluses", "Indice protection": "IP55"}',
   1290.00, '20', 1548.00, 10, 'publie', 'defibrillateur-automatique-externe', 2, true),

  ('22222222-2222-2222-2222-222222222219',
   'Trousse de premiers secours professionnelle',
   'Trousse de secours complète conforme à la réglementation pour entreprises et établissements. 80+ articles inclus.',
   '{"Conformité": "DIN 13157", "Articles inclus": "80+", "Capacité": "Entreprise jusqu''à 20 personnes", "Sac": "Imperméable", "Fixation": "Murale ou portable"}',
   78.00, '20', 93.60, 30, 'publie', 'trousse-premiers-secours-pro', 1, false),

  ('22222222-2222-2222-2222-222222222220',
   'Insufflateur manuel BAVU adulte',
   'Ballon auto-remplisseur à valve unidirectionnelle (BAVU) pour ventilation manuelle adulte. Réservoir oxygène inclus.',
   '{"Cible": "Adulte", "Volume ballon": "1500 mL", "Réservoir O2": "Inclus 2600 mL", "Stérilisable": "Autoclave 134°C", "Matériau": "Silicone médical"}',
   165.00, '20', 198.00, 15, 'publie', 'insufflateur-manuel-bavu-adulte', 1, false);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Liaisons produit ↔ catégorie
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO produit_categorie (id_produit, id_categorie) VALUES
  -- Diagnostic
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101'),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111101'),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111101'),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111101'),
  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111101'),
  -- Mobilier
  ('22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111102'),
  ('22222222-2222-2222-2222-222222222207', '11111111-1111-1111-1111-111111111102'),
  ('22222222-2222-2222-2222-222222222208', '11111111-1111-1111-1111-111111111102'),
  -- Hygiène
  ('22222222-2222-2222-2222-222222222209', '11111111-1111-1111-1111-111111111103'),
  ('22222222-2222-2222-2222-222222222210', '11111111-1111-1111-1111-111111111103'),
  ('22222222-2222-2222-2222-222222222211', '11111111-1111-1111-1111-111111111103'),
  -- Consommables
  ('22222222-2222-2222-2222-222222222212', '11111111-1111-1111-1111-111111111104'),
  ('22222222-2222-2222-2222-222222222213', '11111111-1111-1111-1111-111111111104'),
  ('22222222-2222-2222-2222-222222222214', '11111111-1111-1111-1111-111111111104'),
  ('22222222-2222-2222-2222-222222222215', '11111111-1111-1111-1111-111111111104'),
  -- Imagerie
  ('22222222-2222-2222-2222-222222222216', '11111111-1111-1111-1111-111111111105'),
  ('22222222-2222-2222-2222-222222222217', '11111111-1111-1111-1111-111111111105'),
  -- Urgence
  ('22222222-2222-2222-2222-222222222218', '11111111-1111-1111-1111-111111111106'),
  ('22222222-2222-2222-2222-222222222219', '11111111-1111-1111-1111-111111111106'),
  ('22222222-2222-2222-2222-222222222220', '11111111-1111-1111-1111-111111111106');

COMMIT;
