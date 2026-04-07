/**
 * Seed Firestore — Données de base pour les collections images.
 *
 * Exécuter depuis client/ :
 *   npx tsx scripts/seed-firestore.ts
 *
 * Nécessite les variables d'environnement Firebase dans .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// NOTE: Charger .env.local avant tout import Firebase
config({ path: resolve(__dirname, '../.env.local') });

import admin from 'firebase-admin';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

if (!projectId || !clientEmail || !privateKey) {
  console.error('Variables Firebase manquantes dans .env.local');
  process.exit(1);
}

const app = admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  }),
  storageBucket,
});

const db = app.firestore();

// =============================================================
// IDs Supabase (doivent correspondre au seed.sql)
// =============================================================

const CATEGORY_IDS = {
  audio: 'a1b2c3d4-0001-4000-8000-000000000001',
  reseaux: 'a1b2c3d4-0001-4000-8000-000000000002',
  automatismes: 'a1b2c3d4-0001-4000-8000-000000000003',
  support: 'a1b2c3d4-0001-4000-8000-000000000004',
  cablage: 'a1b2c3d4-0001-4000-8000-000000000005',
  securite: 'a1b2c3d4-0001-4000-8000-000000000006',
};

const PRODUCT_IDS = {
  interfaceAudio: 'b2c3d4e5-0001-4000-8000-000000000001',
  ampliMultizone: 'b2c3d4e5-0001-4000-8000-000000000002',
  microConference: 'b2c3d4e5-0001-4000-8000-000000000003',
  enceintePlafond: 'b2c3d4e5-0001-4000-8000-000000000004',
  switchIndustriel: 'b2c3d4e5-0001-4000-8000-000000000005',
  convertisseurFibre: 'b2c3d4e5-0001-4000-8000-000000000006',
  wifiIndustriel: 'b2c3d4e5-0001-4000-8000-000000000007',
  automate: 'b2c3d4e5-0001-4000-8000-000000000008',
  variateur: 'b2c3d4e5-0001-4000-8000-000000000009',
  capteurTemp: 'b2c3d4e5-0001-4000-8000-000000000010',
  moduleTelemetrie: 'b2c3d4e5-0001-4000-8000-000000000011',
  kitDiagnostic: 'b2c3d4e5-0001-4000-8000-000000000012',
  baieBrassage: 'b2c3d4e5-0001-4000-8000-000000000013',
  cableCat6a: 'b2c3d4e5-0001-4000-8000-000000000014',
  panneauBrassage: 'b2c3d4e5-0001-4000-8000-000000000015',
  cameraDome: 'b2c3d4e5-0001-4000-8000-000000000016',
  nvr32: 'b2c3d4e5-0001-4000-8000-000000000017',
  dalleTactile: 'b2c3d4e5-0001-4000-8000-000000000018',
};

const SLIDE_IDS = {
  audio: 'c3d4e5f6-0001-4000-8000-000000000001',
  reseaux: 'c3d4e5f6-0001-4000-8000-000000000002',
  support: 'c3d4e5f6-0001-4000-8000-000000000003',
};

// =============================================================
// Seed functions
// =============================================================

async function seedImagesCategories() {
  const collection = db.collection('ImagesCategories');

  const docs = [
    { categorie_id: CATEGORY_IDS.audio, image_url: '/carousel/pro-audio.svg', thumbnail_url: '/carousel/pro-audio.svg' },
    { categorie_id: CATEGORY_IDS.reseaux, image_url: '/carousel/industrial-network.svg', thumbnail_url: '/carousel/industrial-network.svg' },
    { categorie_id: CATEGORY_IDS.automatismes, image_url: '/carousel/smart-support.svg', thumbnail_url: '/carousel/smart-support.svg' },
    { categorie_id: CATEGORY_IDS.support, image_url: '/carousel/smart-support.svg', thumbnail_url: '/carousel/smart-support.svg' },
    { categorie_id: CATEGORY_IDS.cablage, image_url: '/carousel/industrial-network.svg', thumbnail_url: '/carousel/industrial-network.svg' },
    { categorie_id: CATEGORY_IDS.securite, image_url: '/carousel/pro-audio.svg', thumbnail_url: '/carousel/pro-audio.svg' },
  ];

  for (const doc of docs) {
    await collection.add(doc);
  }

  console.log(`ImagesCategories : ${docs.length} documents créés`);
}

async function seedImagesProduits() {
  const collection = db.collection('ImagesProduits');

  const docs = [
    {
      produit_id: PRODUCT_IDS.interfaceAudio,
      images: [
        { url: '/carousel/pro-audio.svg', ordre: 1, est_principale: true, alt_text: 'Interface Audio DSP-24 vue de face' },
      ],
    },
    {
      produit_id: PRODUCT_IDS.ampliMultizone,
      images: [
        { url: '/carousel/pro-audio.svg', ordre: 1, est_principale: true, alt_text: 'Amplificateur Multizone MZ-400' },
      ],
    },
    {
      produit_id: PRODUCT_IDS.microConference,
      images: [
        { url: '/carousel/pro-audio.svg', ordre: 1, est_principale: true, alt_text: 'Micro Conference MC-360' },
      ],
    },
    {
      produit_id: PRODUCT_IDS.switchIndustriel,
      images: [
        { url: '/carousel/industrial-network.svg', ordre: 1, est_principale: true, alt_text: 'Switch Industriel Redondant SIR-16' },
      ],
    },
    {
      produit_id: PRODUCT_IDS.convertisseurFibre,
      images: [
        { url: '/carousel/industrial-network.svg', ordre: 1, est_principale: true, alt_text: 'Convertisseur Fibre Optique CFO-2' },
      ],
    },
    {
      produit_id: PRODUCT_IDS.wifiIndustriel,
      images: [
        { url: '/carousel/industrial-network.svg', ordre: 1, est_principale: true, alt_text: 'Point d Acces WiFi 6 Industriel' },
      ],
    },
    {
      produit_id: PRODUCT_IDS.automate,
      images: [
        { url: '/carousel/smart-support.svg', ordre: 1, est_principale: true, alt_text: 'Automate Programmable AP-200' },
      ],
    },
    {
      produit_id: PRODUCT_IDS.moduleTelemetrie,
      images: [
        { url: '/carousel/smart-support.svg', ordre: 1, est_principale: true, alt_text: 'Module Support Telemetrie MST-1' },
      ],
    },
    {
      produit_id: PRODUCT_IDS.baieBrassage,
      images: [
        { url: '/carousel/industrial-network.svg', ordre: 1, est_principale: true, alt_text: 'Baie de Brassage 19 pouces 42U' },
      ],
    },
    {
      produit_id: PRODUCT_IDS.cameraDome,
      images: [
        { url: '/carousel/pro-audio.svg', ordre: 1, est_principale: true, alt_text: 'Camera IP Dome 4K CI-D4K' },
      ],
    },
  ];

  for (const doc of docs) {
    await collection.add(doc);
  }

  console.log(`ImagesProduits : ${docs.length} documents créés`);
}

async function seedImagesCarrousel() {
  const collection = db.collection('ImagesCarrousel');

  const docs = [
    { slide_id: SLIDE_IDS.audio, image_desktop_url: '/carousel/pro-audio.svg', image_mobile_url: '/carousel/pro-audio.svg' },
    { slide_id: SLIDE_IDS.reseaux, image_desktop_url: '/carousel/industrial-network.svg', image_mobile_url: '/carousel/industrial-network.svg' },
    { slide_id: SLIDE_IDS.support, image_desktop_url: '/carousel/smart-support.svg', image_mobile_url: '/carousel/smart-support.svg' },
  ];

  for (const doc of docs) {
    await collection.add(doc);
  }

  console.log(`ImagesCarrousel : ${docs.length} documents créés`);
}

// =============================================================
// Main
// =============================================================

async function main() {
  console.log('Seed Firestore — Althea Systems\n');

  await seedImagesCategories();
  await seedImagesProduits();
  await seedImagesCarrousel();

  console.log('\nSeed terminé avec succès.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Erreur seed Firestore :', error);
  process.exit(1);
});
