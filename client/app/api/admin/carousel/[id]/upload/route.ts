import { NextRequest, NextResponse } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getFirestoreClient, getStorageClient } from '@/lib/firebase/admin';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { getCurrentUser } from '@/lib/auth/session';
import { logAdminActivity } from '@/lib/firebase/logActivity';
import {
  isValidImageMimeType,
  isImageWithinSizeLimit,
  generateSecureFileName,
} from '@/lib/carousel/validation';
import { FIRESTORE_IMAGES_CARROUSEL } from '@/lib/carousel/constants';

type RouteParams = { params: Promise<{ id: string }> };

async function slideExists(slideId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('carrousel')
    .select('id_slide')
    .eq('id_slide', slideId)
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
  slideId: string,
  variant: 'desktop' | 'mobile',
  imageUrl: string,
): Promise<void> {
  const firestore = getFirestoreClient();

  const snapshot = await firestore
    .collection(FIRESTORE_IMAGES_CARROUSEL)
    .where('slide_id', '==', slideId)
    .get();

  const fieldName = variant === 'desktop'
    ? 'image_desktop_url'
    : 'image_mobile_url';

  if (snapshot.empty) {
    await firestore.collection(FIRESTORE_IMAGES_CARROUSEL).add({
      slide_id: slideId,
      image_desktop_url: variant === 'desktop' ? imageUrl : '',
      image_mobile_url: variant === 'mobile' ? imageUrl : '',
    });
    return;
  }

  const docRef = snapshot.docs[0].ref;
  await docRef.update({ [fieldName]: imageUrl });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const denied = await verifyAdminAccess();
  if (denied) {
    return denied;
  }

  const { id } = await params;

  const isExistingSlide = await slideExists(id);
  if (!isExistingSlide) {
    return NextResponse.json(
      { error: 'Slide introuvable.' },
      { status: 404 },
    );
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const variant = formData.get('variant') as string | null;

  if (!file) {
    return NextResponse.json(
      { error: 'Aucun fichier fourni.' },
      { status: 400 },
    );
  }

  if (variant !== 'desktop' && variant !== 'mobile') {
    return NextResponse.json(
      { error: 'Le variant doit être "desktop" ou "mobile".' },
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

  const filePath = generateSecureFileName(file.name, id, variant);
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  try {
    const publicUrl = await uploadFileToStorage(
      fileBuffer,
      filePath,
      file.type,
    );

    await updateFirestoreImageUrl(id, variant, publicUrl);

    // Mise à jour image_url fallback si desktop
    if (variant === 'desktop') {
      const supabase = createAdminClient();
      await supabase
        .from('carrousel')
        .update({ image_url: publicUrl } as never)
        .eq('id_slide', id);
    }

    const currentUser = await getCurrentUser();
    if (currentUser) {
      await logAdminActivity(
        currentUser.user.id,
        'carousel.upload',
        { slideId: id, variant, filePath },
      );
    }

    return NextResponse.json({ url: publicUrl, variant });
  } catch (uploadError) {
    console.error('Erreur upload image', { uploadError });
    return NextResponse.json(
      { error: 'Erreur lors de l upload de l image.' },
      { status: 500 },
    );
  }
}
