import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getFirestoreClient, getStorageClient } from '@/lib/firebase/admin';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { getCurrentUser } from '@/lib/auth/session';
import { logAdminActivity } from '@/lib/firebase/logActivity';
import {
  isValidImageMimeType,
  isImageWithinSizeLimit,
} from '@/lib/carousel/validation';
import { generateSecureFileName } from '@/lib/categories/validation';
import { FIRESTORE_IMAGES_CATEGORIES } from '@/lib/categories/constants';

type RouteParams = { params: Promise<{ id: string }> };

async function categoryExists(categoryId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('categorie')
    .select('id_categorie')
    .eq('id_categorie', categoryId)
    .single();

  return Boolean(data);
}

async function uploadFileToStorage(
  fileBuffer: Buffer,
  filePath: string,
  mimeType: string,
): Promise<string> {
  const storage = getStorageClient();
  const bucket = storage.bucket();
  const fileRef = bucket.file(filePath);

  await fileRef.save(fileBuffer, {
    metadata: { contentType: mimeType },
  });

  await fileRef.makePublic();

  return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
}

async function updateFirestoreImageUrl(
  categoryId: string,
  imageUrl: string,
): Promise<void> {
  const firestore = getFirestoreClient();

  const snapshot = await firestore
    .collection(FIRESTORE_IMAGES_CATEGORIES)
    .where('categorie_id', '==', categoryId)
    .get();

  if (snapshot.empty) {
    await firestore.collection(FIRESTORE_IMAGES_CATEGORIES).add({
      categorie_id: categoryId,
      image_url: imageUrl,
    });
    return;
  }

  const docRef = snapshot.docs[0].ref;
  await docRef.update({ image_url: imageUrl });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const denied = await verifyAdminAccess();
  if (denied) {
    return denied;
  }

  const { id } = await params;

  const isExistingCategory = await categoryExists(id);
  if (!isExistingCategory) {
    return NextResponse.json(
      { error: 'Catégorie introuvable.' },
      { status: 404 },
    );
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json(
      { error: 'Aucun fichier fourni.' },
      { status: 400 },
    );
  }

  if (!isValidImageMimeType(file.type)) {
    return NextResponse.json(
      { error: 'Type de fichier non autorisé (jpeg, png, webp uniquement).' },
      { status: 400 },
    );
  }

  if (!isImageWithinSizeLimit(file.size)) {
    return NextResponse.json(
      { error: 'Le fichier dépasse la taille maximale de 5 Mo.' },
      { status: 400 },
    );
  }

  const filePath = generateSecureFileName(file.name, id);
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  try {
    const publicUrl = await uploadFileToStorage(
      fileBuffer,
      filePath,
      file.type,
    );

    await updateFirestoreImageUrl(id, publicUrl);

    // NOTE: Mise à jour image_url Supabase comme fallback
    const supabase = createAdminClient();
    await supabase
      .from('categorie')
      .update({ image_url: publicUrl } as never)
      .eq('id_categorie', id);

    const currentUser = await getCurrentUser();
    if (currentUser) {
      await logAdminActivity(
        currentUser.user.id,
        'categories.upload',
        { categoryId: id, filePath },
      );
    }

    return NextResponse.json({ url: publicUrl });
  } catch (uploadError) {
    console.error('Erreur upload image', { uploadError });
    return NextResponse.json(
      { error: 'Erreur lors de l upload de l image.' },
      { status: 500 },
    );
  }
}
