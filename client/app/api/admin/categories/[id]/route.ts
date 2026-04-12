import { NextRequest, NextResponse } from 'next/server';

import { normalizeString } from '@/lib/admin/common';
import {
  extractMainImageUrl,
  fetchProductImagesByIds,
} from '@/lib/admin/productImages';
import { fetchCategoryImageById } from '@/lib/admin/categoryImages';
import { createAdminClient } from '@/lib/supabase/admin';
import { getFirestoreClient, getStorageClient } from '@/lib/firebase/admin';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { getCurrentUser } from '@/lib/auth/session';
import { logAdminActivity } from '@/lib/firebase/logActivity';
import {
  validateNom,
  validateDescription,
  validateSlug,
} from '@/lib/categories/validation';
import {
  FIRESTORE_IMAGES_CATEGORIES,
  CATEGORIES_STORAGE_PATH,
} from '@/lib/categories/constants';
import type { Categorie } from '@/lib/supabase/types';

type RouteParams = { params: Promise<{ id: string }> };

type AssociatedProductRow = {
  id_produit: string;
  nom: string;
  statut: 'publie' | 'brouillon';
  quantite_stock: number;
  slug: string;
};

type ProductCategoryLinkRow = {
  id_produit: string;
};

async function fetchCategoryById(
  categoryId: string,
): Promise<Categorie | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('categorie')
    .select('*')
    .eq('id_categorie', categoryId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Categorie;
}

async function isSlugUsedByOther(
  slug: string,
  excludeId: string,
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('categorie')
    .select('id_categorie')
    .eq('slug', slug)
    .neq('id_categorie', excludeId)
    .limit(1);

  return Array.isArray(data) && data.length > 0;
}

async function countLinkedProducts(categoryId: string): Promise<number> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from('produit_categorie')
    .select('*', { count: 'exact', head: true })
    .eq('id_categorie', categoryId);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

async function fetchAssociatedProducts(
  categoryId: string,
): Promise<
  Array<AssociatedProductRow & { image_principale_url: string | null }>
> {
  const supabase = createAdminClient();

  const { data: rawLinks, error: linksError } = await supabase
    .from('produit_categorie')
    .select('id_produit')
    .eq('id_categorie', categoryId);

  if (linksError) {
    console.error('Erreur chargement produits liés catégorie', { linksError });
    return [];
  }

  const links = (rawLinks ?? []) as ProductCategoryLinkRow[];
  const productIds = Array.from(
    new Set(links.map((link) => link.id_produit).filter(Boolean)),
  );

  if (productIds.length === 0) {
    return [];
  }

  const { data: rawProducts, error: productsError } = await supabase
    .from('produit')
    .select('id_produit, nom, statut, quantite_stock, slug')
    .in('id_produit', productIds)
    .order('nom', { ascending: true });

  if (productsError) {
    console.error('Erreur chargement détails produits liés catégorie', {
      productsError,
    });
    return [];
  }

  const products = (rawProducts ?? []) as AssociatedProductRow[];
  const productImagesById = await fetchProductImagesByIds(productIds);

  return products.map((product) => {
    const productImages = productImagesById.get(product.id_produit) ?? [];

    return {
      ...product,
      image_principale_url: extractMainImageUrl(productImages),
    };
  });
}

async function deleteFirestoreImages(categoryId: string): Promise<void> {
  const firestore = getFirestoreClient();

  const snapshot = await firestore
    .collection(FIRESTORE_IMAGES_CATEGORIES)
    .where('categorie_id', '==', categoryId)
    .get();

  const deletePromises = snapshot.docs.map((doc) => doc.ref.delete());
  await Promise.all(deletePromises);
}

async function deleteStorageFiles(categoryId: string): Promise<void> {
  const storage = getStorageClient();
  const bucket = storage.bucket();
  const prefix = `${CATEGORIES_STORAGE_PATH}/${categoryId}/`;

  const [files] = await bucket.getFiles({ prefix });
  const deletePromises = files.map((file) => file.delete());
  await Promise.all(deletePromises);
}

async function reindexOrdresAffiche(): Promise<void> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('categorie')
    .select('id_categorie')
    .order('ordre_affiche', { ascending: true });

  if (!data || data.length === 0) {
    return;
  }

  const categories = data as { id_categorie: string }[];

  const updatePromises = categories.map((category, index) => {
    return supabase
      .from('categorie')
      .update({ ordre_affiche: index + 1 } as never)
      .eq('id_categorie', category.id_categorie);
  });

  await Promise.all(updatePromises);
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const denied = await verifyAdminAccess();
  if (denied) {
    return denied;
  }

  const { id } = await params;
  const categoryId = normalizeString(id);

  if (!categoryId) {
    return NextResponse.json(
      { error: 'Identifiant catégorie invalide.' },
      { status: 400 },
    );
  }

  const category = await fetchCategoryById(categoryId);

  if (!category) {
    return NextResponse.json(
      { error: 'Catégorie introuvable.' },
      { status: 404 },
    );
  }

  const [linkedProductsCount, linkedProducts, firestoreImageUrl] =
    await Promise.all([
      countLinkedProducts(categoryId),
      fetchAssociatedProducts(categoryId),
      fetchCategoryImageById(categoryId),
    ]);

  return NextResponse.json({
    category: {
      ...category,
      image_url: firestoreImageUrl ?? category.image_url,
      nombre_produits: linkedProductsCount,
    },
    products: linkedProducts,
  });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const denied = await verifyAdminAccess();
  if (denied) {
    return denied;
  }

  const { id } = await params;
  const existingCategory = await fetchCategoryById(id);

  if (!existingCategory) {
    return NextResponse.json(
      { error: 'Catégorie introuvable.' },
      { status: 404 },
    );
  }

  const body = await request.json();

  if (body.nom !== undefined) {
    const nomError = validateNom(body.nom);
    if (nomError) {
      return NextResponse.json({ error: nomError }, { status: 400 });
    }
  }

  if (body.slug !== undefined) {
    const slugError = validateSlug(body.slug);
    if (slugError) {
      return NextResponse.json({ error: slugError }, { status: 400 });
    }

    const slugUsed = await isSlugUsedByOther(body.slug, id);
    if (slugUsed) {
      return NextResponse.json(
        { error: 'Ce slug est déjà utilisé par une autre catégorie.' },
        { status: 400 },
      );
    }
  }

  if (body.description !== undefined) {
    const descriptionError = validateDescription(body.description);
    if (descriptionError) {
      return NextResponse.json({ error: descriptionError }, { status: 400 });
    }
  }

  const updateFields: Record<string, unknown> = {};

  if (body.nom !== undefined) {
    updateFields.nom = body.nom.trim();
  }
  if (body.slug !== undefined) {
    updateFields.slug = body.slug.trim();
  }
  if (body.description !== undefined) {
    updateFields.description = body.description;
  }
  if (body.statut !== undefined) {
    updateFields.statut = body.statut;
  }
  if (body.image_url !== undefined) {
    updateFields.image_url = body.image_url;
  }

  const supabase = createAdminClient();

  const { data: updatedCategory, error: updateError } = await supabase
    .from('categorie')
    .update(updateFields as never)
    .eq('id_categorie', id)
    .select()
    .single();

  if (updateError) {
    console.error('Erreur modification catégorie', { updateError });
    return NextResponse.json(
      { error: 'Erreur lors de la modification de la catégorie.' },
      { status: 500 },
    );
  }

  const category = updatedCategory as Categorie;

  const currentUser = await getCurrentUser();
  if (currentUser) {
    await logAdminActivity(currentUser.user.id, 'categories.update', {
      categoryId: id,
      updatedFields: Object.keys(updateFields),
    });
  }

  return NextResponse.json({ category });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const denied = await verifyAdminAccess();
  if (denied) {
    return denied;
  }

  const { id } = await params;
  const existingCategory = await fetchCategoryById(id);

  if (!existingCategory) {
    return NextResponse.json(
      { error: 'Catégorie introuvable.' },
      { status: 404 },
    );
  }

  // NOTE: Suppression interdite si des produits sont liés
  const linkedProducts = await countLinkedProducts(id);
  if (linkedProducts > 0) {
    return NextResponse.json(
      {
        error: `Impossible de supprimer : ${linkedProducts} produit(s) lié(s) à cette catégorie.`,
      },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { error: deleteError } = await supabase
    .from('categorie')
    .delete()
    .eq('id_categorie', id);

  if (deleteError) {
    console.error('Erreur suppression catégorie', { deleteError });
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la catégorie.' },
      { status: 500 },
    );
  }

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

  try {
    await reindexOrdresAffiche();
  } catch (reindexError) {
    console.error('Erreur réindexation ordres', { reindexError });
  }

  const currentUser = await getCurrentUser();
  if (currentUser) {
    await logAdminActivity(currentUser.user.id, 'categories.delete', {
      categoryId: id,
      nom: existingCategory.nom,
    });
  }

  return NextResponse.json({ success: true });
}
