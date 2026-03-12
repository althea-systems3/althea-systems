import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getFirestoreClient, getStorageClient } from '@/lib/firebase/admin';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { getCurrentUser } from '@/lib/auth/session';
import { logAdminActivity } from '@/lib/firebase/logActivity';
import {
  validateTitre,
  validateLienRedirection,
} from '@/lib/carousel/validation';
import {
  FIRESTORE_IMAGES_CARROUSEL,
  CAROUSEL_STORAGE_PATH,
} from '@/lib/carousel/constants';
import type { Carrousel } from '@/lib/supabase/types';

type RouteParams = { params: Promise<{ id: string }> };

async function fetchSlideById(slideId: string): Promise<Carrousel | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('carrousel')
    .select('*')
    .eq('id_slide', slideId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Carrousel;
}

async function deleteFirestoreImages(slideId: string): Promise<void> {
  const firestore = getFirestoreClient();

  const snapshot = await firestore
    .collection(FIRESTORE_IMAGES_CARROUSEL)
    .where('slide_id', '==', slideId)
    .get();

  const deletePromises = snapshot.docs.map((doc) => doc.ref.delete());
  await Promise.all(deletePromises);
}

async function deleteStorageFiles(slideId: string): Promise<void> {
  const storage = getStorageClient();
  const bucket = storage.bucket();
  const prefix = `${CAROUSEL_STORAGE_PATH}/${slideId}/`;

  const [files] = await bucket.getFiles({ prefix });
  const deletePromises = files.map((file) => file.delete());
  await Promise.all(deletePromises);
}

async function reindexOrdres(): Promise<void> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('carrousel')
    .select('id_slide')
    .order('ordre', { ascending: true });

  if (!data || data.length === 0) {
    return;
  }

  const slides = data as { id_slide: string }[];

  const updatePromises = slides.map((slide, index) => {
    return supabase
      .from('carrousel')
      .update({ ordre: index + 1 } as never)
      .eq('id_slide', slide.id_slide);
  });

  await Promise.all(updatePromises);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const denied = await verifyAdminAccess();
  if (denied) {
    return denied;
  }

  const { id } = await params;
  const existingSlide = await fetchSlideById(id);

  if (!existingSlide) {
    return NextResponse.json(
      { error: 'Slide introuvable.' },
      { status: 404 },
    );
  }

  const body = await request.json();

  if (body.titre !== undefined) {
    const titreError = validateTitre(body.titre);
    if (titreError) {
      return NextResponse.json({ error: titreError }, { status: 400 });
    }
  }

  if (body.lien_redirection !== undefined) {
    const lienError = validateLienRedirection(body.lien_redirection);
    if (lienError) {
      return NextResponse.json({ error: lienError }, { status: 400 });
    }
  }

  const updateFields: Record<string, unknown> = {};

  if (body.titre !== undefined) {
    updateFields.titre = body.titre.trim();
  }
  if (body.texte !== undefined) {
    updateFields.texte = body.texte;
  }
  if (body.lien_redirection !== undefined) {
    updateFields.lien_redirection = body.lien_redirection;
  }
  if (body.actif !== undefined) {
    updateFields.actif = body.actif;
  }
  if (body.image_url !== undefined) {
    updateFields.image_url = body.image_url;
  }

  const supabase = createAdminClient();

  const { data: updatedSlide, error: updateError } = await supabase
    .from('carrousel')
    .update(updateFields as never)
    .eq('id_slide', id)
    .select()
    .single();

  if (updateError) {
    console.error('Erreur modification slide', { updateError });
    return NextResponse.json(
      { error: 'Erreur lors de la modification du slide.' },
      { status: 500 },
    );
  }

  const slide = updatedSlide as Carrousel;

  const currentUser = await getCurrentUser();
  if (currentUser) {
    await logAdminActivity(
      currentUser.user.id,
      'carousel.update',
      { slideId: id, updatedFields: Object.keys(updateFields) },
    );
  }

  return NextResponse.json({ slide });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const denied = await verifyAdminAccess();
  if (denied) {
    return denied;
  }

  const { id } = await params;
  const existingSlide = await fetchSlideById(id);

  if (!existingSlide) {
    return NextResponse.json(
      { error: 'Slide introuvable.' },
      { status: 404 },
    );
  }

  // Suppression Supabase
  const supabase = createAdminClient();
  const { error: deleteError } = await supabase
    .from('carrousel')
    .delete()
    .eq('id_slide', id);

  if (deleteError) {
    console.error('Erreur suppression slide', { deleteError });
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du slide.' },
      { status: 500 },
    );
  }

  // Suppression Firestore + Storage
  try {
    await deleteFirestoreImages(id);
  } catch (firestoreError) {
    console.error('Erreur suppression Firestore', { firestoreError });
  }

  try {
    await deleteStorageFiles(id);
  } catch (storageError) {
    console.error('Erreur suppression Storage', { storageError });
  }

  // Réindexation des ordres restants
  try {
    await reindexOrdres();
  } catch (reindexError) {
    console.error('Erreur réindexation ordres', { reindexError });
  }

  const currentUser = await getCurrentUser();
  if (currentUser) {
    await logAdminActivity(
      currentUser.user.id,
      'carousel.delete',
      { slideId: id, titre: existingSlide.titre },
    );
  }

  return NextResponse.json({ success: true });
}
