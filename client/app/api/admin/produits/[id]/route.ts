import { NextResponse } from 'next/server';

import {
  extractMainImageUrl,
  fetchProductImages,
} from '@/lib/admin/productImages';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import {
  normalizeString,
  parseFiniteNumber,
  slugify,
  toOptionalString,
} from '@/lib/admin/common';
import {
  computePrices,
  parseCategoryIds,
  parseProductStatus,
  parseTechnicalCharacteristics,
  parseTva,
  roundToTwoDecimals,
  type ProductStatus,
} from '@/lib/admin/productValidators';
import { getCurrentUser } from '@/lib/auth/session';
import { logAdminActivity } from '@/lib/firebase/logActivity';
import { createAdminClient } from '@/lib/supabase/admin';

type ProductUpdatePayload = {
  nom?: unknown;
  description?: unknown;
  prix_ht?: unknown;
  prix_ttc?: unknown;
  tva?: unknown;
  quantite_stock?: unknown;
  statut?: unknown;
  slug?: unknown;
  categoryIds?: unknown;
  caracteristique_tech?: unknown;
};

type ProductRow = {
  id_produit: string;
  nom: string;
  description: string | null;
  caracteristique_tech: Record<string, unknown> | null;
  prix_ht: number;
  tva: string;
  prix_ttc: number;
  quantite_stock: number;
  statut: ProductStatus;
  slug: string;
  [key: string]: unknown;
};

type CategoryRow = {
  id_categorie: string;
  nom: string;
};

function hasMeaningfulValue(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    return false;
  }

  return true;
}

function extractProductCreatedAt(product: ProductRow): string | null {
  const dateCreationField = product.date_creation;

  if (
    typeof dateCreationField === 'string' &&
    !Number.isNaN(new Date(dateCreationField).getTime())
  ) {
    return dateCreationField;
  }

  const createdAtField = product.created_at;

  if (
    typeof createdAtField === 'string' &&
    !Number.isNaN(new Date(createdAtField).getTime())
  ) {
    return createdAtField;
  }

  return null;
}

async function ensureSlugIsAvailable(
  slug: string,
  excludedProductId: string,
): Promise<boolean> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from('produit')
    .select('id_produit')
    .eq('slug', slug)
    .neq('id_produit', excludedProductId)
    .limit(1);

  if (error) {
    return false;
  }

  return !Array.isArray(data) || data.length === 0;
}

async function fetchProductById(productId: string): Promise<ProductRow | null> {
  const supabaseAdmin = createAdminClient();

  const { data, error } = await supabaseAdmin
    .from('produit')
    .select('*')
    .eq('id_produit', productId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ProductRow;
}

async function fetchCategoriesByProductId(
  productId: string,
): Promise<CategoryRow[]> {
  const supabaseAdmin = createAdminClient();

  const [linksResult, categoriesResult] = await Promise.all([
    supabaseAdmin
      .from('produit_categorie')
      .select('id_categorie')
      .eq('id_produit', productId),
    supabaseAdmin
      .from('categorie')
      .select('id_categorie, nom')
      .order('nom', { ascending: true }),
  ]);

  const links =
    (linksResult.data as Array<{ id_categorie: string }> | null) ?? [];
  const categories = (categoriesResult.data as CategoryRow[] | null) ?? [];
  const categoryIds = new Set(links.map((link) => link.id_categorie));

  return categories.filter((category) =>
    categoryIds.has(category.id_categorie),
  );
}

async function mapProductPayload(product: ProductRow) {
  const [categories, images] = await Promise.all([
    fetchCategoriesByProductId(product.id_produit),
    fetchProductImages(product.id_produit),
  ]);

  return {
    ...product,
    tva: parseTva(product.tva),
    prix_ht: roundToTwoDecimals(Number(product.prix_ht ?? 0)),
    prix_ttc: roundToTwoDecimals(Number(product.prix_ttc ?? 0)),
    date_creation: extractProductCreatedAt(product),
    image_principale_url: extractMainImageUrl(images),
    images,
    categories,
  };
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess();

  if (deniedResponse) {
    return deniedResponse;
  }

  try {
    const { id } = await params;
    const productId = normalizeString(id);

    if (!productId) {
      return NextResponse.json(
        { error: 'Identifiant produit invalide.', code: 'id_invalid' },
        { status: 400 },
      );
    }

    const product = await fetchProductById(productId);

    if (!product) {
      return NextResponse.json(
        {
          error: 'Produit introuvable.',
          code: 'product_not_found',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      product: await mapProductPayload(product),
    });
  } catch (error) {
    console.error('Erreur inattendue detail produit admin', { error });

    return NextResponse.json(
      {
        error: 'Erreur serveur',
        code: 'server_error',
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess();

  if (deniedResponse) {
    return deniedResponse;
  }

  try {
    const { id } = await params;
    const productId = normalizeString(id);

    if (!productId) {
      return NextResponse.json(
        { error: 'Identifiant produit invalide.', code: 'id_invalid' },
        { status: 400 },
      );
    }

    const body = (await request
      .json()
      .catch(() => null)) as ProductUpdatePayload | null;

    const existingProduct = await fetchProductById(productId);

    if (!existingProduct) {
      return NextResponse.json(
        {
          error: 'Produit introuvable.',
          code: 'product_not_found',
        },
        { status: 404 },
      );
    }

    const updatePayload: Record<string, unknown> = {};

    const name = normalizeString(body?.nom);

    if (name) {
      updatePayload.nom = name;
    }

    if (body?.description !== undefined) {
      updatePayload.description = toOptionalString(body.description);
    }

    if (body?.statut !== undefined) {
      updatePayload.statut = parseProductStatus(body.statut);
    }

    const hasRawPriceHt = hasMeaningfulValue(body?.prix_ht);
    const hasRawPriceTtc = hasMeaningfulValue(body?.prix_ttc);
    const hasRawTva = hasMeaningfulValue(body?.tva);

    const parsedPriceHt = parseFiniteNumber(body?.prix_ht);
    const parsedPriceTtc = parseFiniteNumber(body?.prix_ttc);
    const updatedTva = parseTva(body?.tva, parseTva(existingProduct.tva));

    if (hasRawPriceHt && parsedPriceHt === null) {
      return NextResponse.json(
        {
          error: 'Le prix HT doit être un nombre positif.',
          code: 'price_ht_invalid',
        },
        { status: 400 },
      );
    }

    if (hasRawPriceTtc && parsedPriceTtc === null) {
      return NextResponse.json(
        {
          error: 'Le prix TTC doit être un nombre positif.',
          code: 'price_ttc_invalid',
        },
        { status: 400 },
      );
    }

    if (hasRawTva) {
      updatePayload.tva = updatedTva;
    }

    if (hasRawPriceHt || hasRawPriceTtc || hasRawTva) {
      const computedPrices = computePrices(
        hasRawPriceHt ? parsedPriceHt : null,
        hasRawPriceTtc
          ? parsedPriceTtc
          : hasRawPriceHt
            ? null
            : Number(existingProduct.prix_ttc),
        updatedTva,
      );

      if (!computedPrices) {
        return NextResponse.json(
          {
            error: 'Les prix doivent être des nombres positifs.',
            code: 'price_invalid',
          },
          { status: 400 },
        );
      }

      updatePayload.prix_ht = computedPrices.priceHt;
      updatePayload.prix_ttc = computedPrices.priceTtc;
      updatePayload.tva = updatedTva;
    }

    if (body?.quantite_stock !== undefined) {
      const stockQuantity = parseFiniteNumber(body.quantite_stock);

      if (stockQuantity === null || stockQuantity < 0) {
        return NextResponse.json(
          {
            error: 'Le stock doit être positif.',
            code: 'stock_invalid',
          },
          { status: 400 },
        );
      }

      updatePayload.quantite_stock = Math.round(stockQuantity);
    }

    if (body?.caracteristique_tech !== undefined) {
      const technicalCharacteristicsResult = parseTechnicalCharacteristics(
        body.caracteristique_tech,
      );

      if (technicalCharacteristicsResult.hasInvalidFormat) {
        return NextResponse.json(
          {
            error:
              'Les caractéristiques techniques doivent être un objet JSON valide.',
            code: 'technical_characteristics_invalid',
          },
          { status: 400 },
        );
      }

      updatePayload.caracteristique_tech =
        technicalCharacteristicsResult.technicalCharacteristics;
    }

    const customSlug = normalizeString(body?.slug);
    const generatedSlug = name ? slugify(name) : '';
    const desiredSlug = customSlug || generatedSlug;

    if (desiredSlug && desiredSlug !== existingProduct.slug) {
      const isSlugAvailable = await ensureSlugIsAvailable(
        desiredSlug,
        productId,
      );

      if (!isSlugAvailable) {
        return NextResponse.json(
          {
            error: 'Ce slug est déjà utilisé par un autre produit.',
            code: 'slug_already_used',
          },
          { status: 400 },
        );
      }

      updatePayload.slug = desiredSlug;
    }

    const supabaseAdmin = createAdminClient();

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('produit')
        .update(updatePayload as never)
        .eq('id_produit', productId);

      if (updateError) {
        console.error('Erreur mise a jour produit admin', { updateError });

        return NextResponse.json(
          {
            error: 'Erreur lors de la mise à jour du produit.',
            code: 'admin_product_update_failed',
          },
          { status: 500 },
        );
      }
    }

    if (body?.categoryIds !== undefined) {
      const categoryIds = parseCategoryIds(body.categoryIds);

      const { error: deleteLinksError } = await supabaseAdmin
        .from('produit_categorie')
        .delete()
        .eq('id_produit', productId);

      if (deleteLinksError) {
        console.error('Erreur suppression categories produit', {
          deleteLinksError,
        });
      }

      if (categoryIds.length > 0) {
        const linkRows = categoryIds.map((categoryId) => ({
          id_produit: productId,
          id_categorie: categoryId,
        }));

        const { error: insertLinksError } = await supabaseAdmin
          .from('produit_categorie')
          .insert(linkRows as never);

        if (insertLinksError) {
          console.error('Erreur insertion categories produit', {
            insertLinksError,
          });
        }
      }
    }

    const updatedProduct = await fetchProductById(productId);

    if (!updatedProduct) {
      return NextResponse.json(
        {
          error: 'Produit introuvable.',
          code: 'product_not_found',
        },
        { status: 404 },
      );
    }

    const currentUser = await getCurrentUser();

    if (currentUser) {
      await logAdminActivity(currentUser.user.id, 'products.update', {
        productId,
        updatedFields: Object.keys(updatePayload),
      });
    }

    return NextResponse.json({
      product: await mapProductPayload(updatedProduct),
    });
  } catch (error) {
    console.error('Erreur inattendue mise a jour produit admin', { error });

    return NextResponse.json(
      {
        error: 'Erreur serveur',
        code: 'server_error',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const deniedResponse = await verifyAdminAccess();

  if (deniedResponse) {
    return deniedResponse;
  }

  try {
    const { id } = await params;
    const productId = normalizeString(id);

    if (!productId) {
      return NextResponse.json(
        { error: 'Identifiant produit invalide.', code: 'id_invalid' },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();

    const { error: deleteError } = await supabaseAdmin
      .from('produit')
      .delete()
      .eq('id_produit', productId);

    if (deleteError) {
      console.error('Erreur suppression produit admin', { deleteError });

      return NextResponse.json(
        {
          error:
            'Impossible de supprimer ce produit. Il est probablement lié à des commandes.',
          code: 'admin_product_delete_failed',
        },
        { status: 400 },
      );
    }

    const currentUser = await getCurrentUser();

    if (currentUser) {
      await logAdminActivity(currentUser.user.id, 'products.delete', {
        productId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur inattendue suppression produit admin', { error });

    return NextResponse.json(
      {
        error: 'Erreur serveur',
        code: 'server_error',
      },
      { status: 500 },
    );
  }
}
