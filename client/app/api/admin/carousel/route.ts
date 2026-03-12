import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getFirestoreClient } from '@/lib/firebase/admin';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { getCurrentUser } from '@/lib/auth/session';
import { logAdminActivity } from '@/lib/firebase/logActivity';
import { isValidRedirectUrl } from '@/lib/carousel/validation';
import {
  MAX_CAROUSEL_SLIDES,
  FIRESTORE_IMAGES_CARROUSEL,
} from '@/lib/carousel/constants';
import type { Carrousel } from '@/lib/supabase/types';

const TITRE_MAX_LENGTH = 100;

async function fetchAllSlides(): Promise<Carrousel[] | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('carrousel')
    .select('*')
    .order('ordre', { ascending: true });

  if (error) {
    console.error('Erreur chargement slides admin', { error });
    return null;
  }

  return (data ?? []) as Carrousel[];
}

async function countExistingSlides(): Promise<number | null> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from('carrousel')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Erreur comptage slides', { error });
    return null;
  }

  return count ?? 0;
}

async function computeNextOrdre(): Promise<number> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('carrousel')
    .select('ordre')
    .order('ordre', { ascending: false })
    .limit(1)
    .single();

  const lastSlide = data as { ordre: number } | null;
  return lastSlide ? lastSlide.ordre + 1 : 1;
}

function validateTitre(titre: unknown): string | null {
  if (!titre || typeof titre !== 'string' || titre.trim().length === 0) {
    return 'Le titre est obligatoire.';
  }

  if (titre.length > TITRE_MAX_LENGTH) {
    return `Le titre ne doit pas dépasser ${TITRE_MAX_LENGTH} caractères.`;
  }

  return null;
}

function validateLienRedirection(lien: unknown): string | null {
  if (!lien) {
    return null;
  }

  if (typeof lien !== 'string' || !isValidRedirectUrl(lien)) {
    return 'Le lien doit être une URL interne (commençant par /).';
  }

  return null;
}

async function createFirestoreImageDoc(
  slideId: string,
  imageUrl: string,
): Promise<void> {
  const firestore = getFirestoreClient();

  await firestore.collection(FIRESTORE_IMAGES_CARROUSEL).add({
    slide_id: slideId,
    image_desktop_url: imageUrl,
    image_mobile_url: imageUrl,
  });
}

export async function GET() {
  const denied = await verifyAdminAccess();
  if (denied) {
    return denied;
  }

  const slides = await fetchAllSlides();

  if (!slides) {
    return NextResponse.json(
      { error: 'Erreur lors du chargement des slides.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ slides });
}

export async function POST(request: NextRequest) {
  const denied = await verifyAdminAccess();
  if (denied) {
    return denied;
  }

  const body = await request.json();

  const titreError = validateTitre(body.titre);
  if (titreError) {
    return NextResponse.json({ error: titreError }, { status: 400 });
  }

  const lienError = validateLienRedirection(body.lien_redirection);
  if (lienError) {
    return NextResponse.json({ error: lienError }, { status: 400 });
  }

  const slideCount = await countExistingSlides();

  if (slideCount === null) {
    return NextResponse.json(
      { error: 'Erreur serveur.' },
      { status: 500 },
    );
  }

  if (slideCount >= MAX_CAROUSEL_SLIDES) {
    return NextResponse.json(
      { error: `Limite de ${MAX_CAROUSEL_SLIDES} slides atteinte.` },
      { status: 400 },
    );
  }

  const nextOrdre = await computeNextOrdre();
  const supabase = createAdminClient();

  const { data: newSlide, error: insertError } = await supabase
    .from('carrousel')
    .insert({
      titre: body.titre.trim(),
      texte: body.texte ?? null,
      lien_redirection: body.lien_redirection ?? null,
      ordre: nextOrdre,
      actif: body.actif ?? false,
      image_url: body.image_url ?? null,
    } as never)
    .select()
    .single();

  if (insertError) {
    console.error('Erreur création slide', { insertError });
    return NextResponse.json(
      { error: 'Erreur lors de la création du slide.' },
      { status: 500 },
    );
  }

  const slide = newSlide as Carrousel;

  try {
    await createFirestoreImageDoc(slide.id_slide, body.image_url ?? '');
  } catch (firestoreError) {
    console.error('Erreur création document Firestore', { firestoreError });
  }

  const currentUser = await getCurrentUser();
  if (currentUser) {
    await logAdminActivity(
      currentUser.user.id,
      'carousel.create',
      { slideId: slide.id_slide, titre: slide.titre },
    );
  }

  return NextResponse.json({ slide }, { status: 201 });
}
