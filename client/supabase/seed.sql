-- =============================================================
-- Althea Systems — Seed Data
-- Exécuter dans Supabase SQL Editor (ou via psql)
-- =============================================================

-- NOTE: Désactiver temporairement RLS pour le seed
ALTER TABLE categorie DISABLE ROW LEVEL SECURITY;
ALTER TABLE produit DISABLE ROW LEVEL SECURITY;
ALTER TABLE produit_categorie DISABLE ROW LEVEL SECURITY;
ALTER TABLE carrousel DISABLE ROW LEVEL SECURITY;

-- =============================================================
-- 1. CATEGORIES
-- =============================================================

INSERT INTO categorie (id_categorie, nom, description, slug, ordre_affiche, statut, image_url) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Audio Professionnel', 'Equipements audio haut de gamme pour studios, salles de conference et espaces publics.', 'audio-professionnel', 1, 'active', NULL),
  ('a1b2c3d4-0001-4000-8000-000000000002', 'Reseaux Industriels', 'Solutions réseau robustes pour environnements industriels exigeants.', 'reseaux-industriels', 2, 'active', NULL),
  ('a1b2c3d4-0001-4000-8000-000000000003', 'Automatismes', 'Composants et systemes d automatisation pour lignes de production.', 'automatismes', 3, 'active', NULL),
  ('a1b2c3d4-0001-4000-8000-000000000004', 'Support Technique', 'Outils de diagnostic, maintenance et support a distance.', 'support-technique', 4, 'active', NULL),
  ('a1b2c3d4-0001-4000-8000-000000000005', 'Cablage Structuré', 'Cables, connecteurs et baies de brassage pour infrastructures IT.', 'cablage-structure', 5, 'active', NULL),
  ('a1b2c3d4-0001-4000-8000-000000000006', 'Sécurité Electronique', 'Cameras IP, controle d acces et systemes de videosurveillance.', 'securite-electronique', 6, 'active', NULL)
ON CONFLICT (id_categorie) DO NOTHING;

-- =============================================================
-- 2. PRODUITS
-- =============================================================

INSERT INTO produit (id_produit, nom, description, caracteristique_tech, prix_ht, tva, prix_ttc, quantite_stock, statut, slug, priorite, est_top_produit) VALUES

  -- Audio Professionnel
  ('b2c3d4e5-0001-4000-8000-000000000001', 'Interface Audio DSP-24', 'Interface audio 24 canaux avec traitement DSP integre. Ideale pour les studios professionnels et les installations live.', '{"canaux": 24, "frequence_echantillonnage": "192 kHz", "connectique": "USB-C / Dante", "latence": "< 1ms"}', 541.67, '20', 649.99, 12, 'publie', 'interface-audio-dsp-24', 1, true),

  ('b2c3d4e5-0001-4000-8000-000000000002', 'Amplificateur Multizone MZ-400', 'Amplificateur 4 zones independantes, 100W par zone. Gestion par application mobile et interface web.', '{"puissance": "4x100W", "impedance": "4-16 ohms", "entrees": "4 stereo + 2 micro", "pilotage": "Ethernet / WiFi"}', 749.17, '20', 899.00, 8, 'publie', 'amplificateur-multizone-mz-400', 2, true),

  ('b2c3d4e5-0001-4000-8000-000000000003', 'Micro Conference MC-360', 'Micro de conference omnidirectionnel avec annulation d echo. Capture 360 degres, portee 6 metres.', '{"type": "Omnidirectionnel", "portee": "6m", "connectique": "USB-C", "compatibilite": "Teams / Zoom / Meet"}', 249.17, '20', 299.00, 25, 'publie', 'micro-conference-mc-360', 0, false),

  ('b2c3d4e5-0001-4000-8000-000000000004', 'Enceinte Encastrable Plafond EP-6', 'Enceinte encastrable 6 pouces pour faux plafond. Son clair et homogene dans les espaces ouverts.', '{"taille": "6 pouces", "puissance": "30W RMS", "impedance": "8 ohms", "indice_protection": "IP44"}', 74.17, '20', 89.00, 50, 'publie', 'enceinte-encastrable-plafond-ep-6', 0, false),

  -- Reseaux Industriels
  ('b2c3d4e5-0001-4000-8000-000000000005', 'Switch Industriel Redondant SIR-16', 'Switch 16 ports Gigabit manageable avec redondance anneau ERPS. Boitier DIN rail, -40 a +75 degres C.', '{"ports": "16x Gigabit", "protocole": "ERPS / RSTP", "alimentation": "24-48V DC double", "temperature": "-40 a +75°C"}', 749.17, '20', 899.00, 6, 'publie', 'switch-industriel-redondant-sir-16', 3, true),

  ('b2c3d4e5-0001-4000-8000-000000000006', 'Convertisseur Fibre Optique CFO-2', 'Media converter Gigabit cuivre vers fibre monomode. Distance max 20 km, boitier DIN rail.', '{"debit": "1 Gbps", "fibre": "Monomode SC", "distance": "20 km", "alimentation": "12-48V DC"}', 166.67, '20', 200.00, 18, 'publie', 'convertisseur-fibre-optique-cfo-2', 0, false),

  ('b2c3d4e5-0001-4000-8000-000000000007', 'Point d Acces WiFi 6 Industriel WAP-6I', 'Point d acces WiFi 6 durci pour environnements industriels. IP67, antennes externes MIMO.', '{"norme": "WiFi 6 (802.11ax)", "debit": "1.8 Gbps", "protection": "IP67", "antennes": "4x4 MIMO externes"}', 415.83, '20', 499.00, 10, 'publie', 'point-acces-wifi-6-industriel-wap-6i', 0, false),

  -- Automatismes
  ('b2c3d4e5-0001-4000-8000-000000000008', 'Automate Programmable AP-200', 'Automate compact 200 E/S avec serveur web integre. Programmation IEC 61131-3.', '{"entrees_sorties": 200, "protocoles": "Modbus TCP/IP, EtherNet/IP", "programmation": "IEC 61131-3", "memoire": "256 Mo"}', 1249.17, '20', 1499.00, 4, 'publie', 'automate-programmable-ap-200', 4, true),

  ('b2c3d4e5-0001-4000-8000-000000000009', 'Variateur de Frequence VF-15', 'Variateur 15 kW triphase avec controle vectoriel. Interface HMI integree.', '{"puissance": "15 kW", "alimentation": "380-480V triphase", "controle": "Vectoriel sans capteur", "protection": "IP20"}', 624.17, '20', 749.00, 7, 'publie', 'variateur-frequence-vf-15', 0, false),

  ('b2c3d4e5-0001-4000-8000-000000000010', 'Capteur de Temperature Industriel CTI-PT100', 'Sonde PT100 classe A, plongeur inox 316L. Plage -200 a +600 degres C.', '{"type": "PT100 Classe A", "plage": "-200 a +600°C", "materiau": "Inox 316L", "longueur": "150mm"}', 45.83, '20', 55.00, 120, 'publie', 'capteur-temperature-industriel-cti-pt100', 0, false),

  -- Support Technique
  ('b2c3d4e5-0001-4000-8000-000000000011', 'Module Support Telemetrie MST-1', 'Module de telemetrie pour surveillance a distance d equipements industriels. Alertes SMS/email.', '{"connectivite": "4G LTE / Ethernet", "protocoles": "MQTT / HTTP", "entrees": "4 analogiques + 8 digitales", "alertes": "SMS / Email / Push"}', 249.17, '20', 299.00, 15, 'publie', 'module-support-telemetrie-mst-1', 5, true),

  ('b2c3d4e5-0001-4000-8000-000000000012', 'Kit Diagnostic Reseau KDR-Pro', 'Testeur de cable et analyseur reseau portable. Test PoE, debit, latence, cartographie.', '{"tests": "Cable / PoE / Debit / Latence", "ecran": "7 pouces tactile", "autonomie": "8h", "connectique": "RJ45 / SFP / WiFi"}', 832.50, '20', 999.00, 3, 'publie', 'kit-diagnostic-reseau-kdr-pro', 0, false),

  -- Cablage Structure
  ('b2c3d4e5-0001-4000-8000-000000000013', 'Baie de Brassage 19 pouces 42U', 'Baie serveur 42U 600x800mm. Portes ventilees, panneaux lateraux amovibles, gestion de cables integree.', '{"hauteur": "42U", "dimensions": "600x800mm", "charge_max": "800 kg", "ventilation": "4 ventilateurs toit"}', 582.50, '20', 699.00, 5, 'publie', 'baie-brassage-19-pouces-42u', 6, true),

  ('b2c3d4e5-0001-4000-8000-000000000014', 'Cable Cat6A F/UTP 305m', 'Bobine 305m cable Cat6A F/UTP LSZH. Bande passante 500 MHz, 10 Gbps.', '{"categorie": "6A F/UTP", "longueur": "305m", "bande_passante": "500 MHz", "gaine": "LSZH"}', 199.17, '20', 239.00, 30, 'publie', 'cable-cat6a-futp-305m', 0, false),

  ('b2c3d4e5-0001-4000-8000-000000000015', 'Panneau de Brassage 24 Ports Cat6A', 'Panneau 1U 24 ports Cat6A blinde. Montage toolless, etiquetage integre.', '{"ports": 24, "categorie": "6A blinde", "format": "1U 19 pouces", "montage": "Toolless"}', 74.17, '20', 89.00, 40, 'publie', 'panneau-brassage-24-ports-cat6a', 0, false),

  -- Securite Electronique
  ('b2c3d4e5-0001-4000-8000-000000000016', 'Camera IP Dome 4K CI-D4K', 'Camera dome 4K avec IR 30m, WDR et compression H.265+. PoE integre.', '{"resolution": "4K (8 MP)", "infrarouge": "30m", "compression": "H.265+", "alimentation": "PoE (802.3af)"}', 207.50, '20', 249.00, 20, 'publie', 'camera-ip-dome-4k-ci-d4k', 0, false),

  ('b2c3d4e5-0001-4000-8000-000000000017', 'Enregistreur NVR 32 Canaux', 'NVR 32 canaux 4K, 4 baies HDD, bande passante 256 Mbps. Interface web et appli mobile.', '{"canaux": 32, "resolution_max": "4K", "baies_hdd": 4, "bande_passante": "256 Mbps"}', 665.83, '20', 799.00, 6, 'publie', 'enregistreur-nvr-32-canaux', 0, false),

  -- Produits en rupture
  ('b2c3d4e5-0001-4000-8000-000000000018', 'Dalle Tactile Industrielle DTI-15', 'Ecran tactile 15 pouces capacitif, IP65 face avant. Ideal pour pupitre de commande.', '{"taille": "15 pouces", "tactile": "Capacitif 10 points", "protection": "IP65 face avant", "luminosite": "1000 cd/m2"}', 832.50, '20', 999.00, 0, 'publie', 'dalle-tactile-industrielle-dti-15', 0, false),

  -- Produit brouillon (non visible publiquement)
  ('b2c3d4e5-0001-4000-8000-000000000019', 'Passerelle IoT Gateway GW-100', 'Passerelle edge computing pour collecte de donnees IoT. En cours de certification.', '{"processeur": "ARM Cortex-A72", "ram": "4 Go", "stockage": "64 Go eMMC", "connectivite": "4G / WiFi / BLE / Zigbee"}', 416.67, '20', 500.00, 20, 'brouillon', 'passerelle-iot-gateway-gw-100', 0, false)

ON CONFLICT (id_produit) DO NOTHING;

-- =============================================================
-- 3. PRODUIT_CATEGORIE (liens many-to-many)
-- =============================================================

INSERT INTO produit_categorie (id_produit, id_categorie) VALUES
  -- Audio Professionnel
  ('b2c3d4e5-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001'),
  ('b2c3d4e5-0001-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001'),
  ('b2c3d4e5-0001-4000-8000-000000000003', 'a1b2c3d4-0001-4000-8000-000000000001'),
  ('b2c3d4e5-0001-4000-8000-000000000004', 'a1b2c3d4-0001-4000-8000-000000000001'),

  -- Reseaux Industriels
  ('b2c3d4e5-0001-4000-8000-000000000005', 'a1b2c3d4-0001-4000-8000-000000000002'),
  ('b2c3d4e5-0001-4000-8000-000000000006', 'a1b2c3d4-0001-4000-8000-000000000002'),
  ('b2c3d4e5-0001-4000-8000-000000000007', 'a1b2c3d4-0001-4000-8000-000000000002'),

  -- Automatismes
  ('b2c3d4e5-0001-4000-8000-000000000008', 'a1b2c3d4-0001-4000-8000-000000000003'),
  ('b2c3d4e5-0001-4000-8000-000000000009', 'a1b2c3d4-0001-4000-8000-000000000003'),
  ('b2c3d4e5-0001-4000-8000-000000000010', 'a1b2c3d4-0001-4000-8000-000000000003'),

  -- Support Technique
  ('b2c3d4e5-0001-4000-8000-000000000011', 'a1b2c3d4-0001-4000-8000-000000000004'),
  ('b2c3d4e5-0001-4000-8000-000000000012', 'a1b2c3d4-0001-4000-8000-000000000004'),

  -- Cablage Structure
  ('b2c3d4e5-0001-4000-8000-000000000013', 'a1b2c3d4-0001-4000-8000-000000000005'),
  ('b2c3d4e5-0001-4000-8000-000000000014', 'a1b2c3d4-0001-4000-8000-000000000005'),
  ('b2c3d4e5-0001-4000-8000-000000000015', 'a1b2c3d4-0001-4000-8000-000000000005'),

  -- Securite Electronique
  ('b2c3d4e5-0001-4000-8000-000000000016', 'a1b2c3d4-0001-4000-8000-000000000006'),
  ('b2c3d4e5-0001-4000-8000-000000000017', 'a1b2c3d4-0001-4000-8000-000000000006'),

  -- Produits multi-categories
  ('b2c3d4e5-0001-4000-8000-000000000018', 'a1b2c3d4-0001-4000-8000-000000000003'),  -- Dalle tactile -> Automatismes
  ('b2c3d4e5-0001-4000-8000-000000000012', 'a1b2c3d4-0001-4000-8000-000000000002'),  -- Kit diagnostic -> aussi Reseaux
  ('b2c3d4e5-0001-4000-8000-000000000006', 'a1b2c3d4-0001-4000-8000-000000000005')   -- Convertisseur fibre -> aussi Cablage
ON CONFLICT DO NOTHING;

-- =============================================================
-- 4. CARROUSEL (slides home)
-- =============================================================

INSERT INTO carrousel (id_slide, titre, texte, lien_redirection, ordre, actif, image_url) VALUES
  ('c3d4e5f6-0001-4000-8000-000000000001', 'Audio Pro Nouvelle Generation', 'Equipez vos espaces avec une qualite sonore premium et une installation simplifiee.', '/fr/catalogue/audio-professionnel', 1, true, NULL),
  ('c3d4e5f6-0001-4000-8000-000000000002', 'Reseaux Industriels Fiables', 'Optimisez vos infrastructures avec des solutions robustes concues pour la performance.', '/fr/catalogue/reseaux-industriels', 2, true, NULL),
  ('c3d4e5f6-0001-4000-8000-000000000003', 'Support Technique 24/7', 'Beneficiez d un accompagnement continu pour garantir la disponibilite de vos systemes.', '/fr/contact', 3, true, NULL)
ON CONFLICT (id_slide) DO NOTHING;

-- =============================================================
-- 5. Réactiver RLS
-- =============================================================

ALTER TABLE categorie ENABLE ROW LEVEL SECURITY;
ALTER TABLE produit ENABLE ROW LEVEL SECURITY;
ALTER TABLE produit_categorie ENABLE ROW LEVEL SECURITY;
ALTER TABLE carrousel ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- Résumé :
--   6 catégories actives
--  19 produits (18 publiés + 1 brouillon, 1 en rupture)
--   6 top produits (priorite 1 a 6)
--  20 liens produit-categorie (dont 3 multi-categories)
--   3 slides carrousel actifs
-- =============================================================
