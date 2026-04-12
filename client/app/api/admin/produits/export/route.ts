import { NextRequest } from 'next/server';

import { normalizeString } from '@/lib/admin/common';
import { verifyAdminAccess } from '@/lib/auth/adminGuard';
import { getCurrentUser } from '@/lib/auth/session';
import { logAdminActivity } from '@/lib/firebase/logActivity';
import { createAdminClient } from '@/lib/supabase/admin';

type ExportFormat = 'csv' | 'excel';
type ProductStatus = 'publie' | 'brouillon';
type ProductAvailability = 'all' | 'in_stock' | 'out_of_stock';
type ProductSortBy =
  | 'nom'
  | 'prix_ht'
  | 'prix_ttc'
  | 'quantite_stock'
  | 'statut'
  | 'date_creation';
type ProductSortDirection = 'asc' | 'desc';

type ExportFilters = {
  search: string;
  status: 'all' | ProductStatus;
  categoryId: string;
  availability: ProductAvailability;
  createdFrom: Date | null;
  createdTo: Date | null;
  priceMin: number | null;
  priceMax: number | null;
  sortBy: ProductSortBy;
  sortDirection: ProductSortDirection;
};

type ProductRow = {
  id_produit: string;
  nom: string;
  description: string | null;
  prix_ht: number;
  tva: string;
  prix_ttc: number;
  quantite_stock: number;
  statut: ProductStatus;
  slug: string;
  [key: string]: unknown;
};

type ProductCategoryLink = {
  id_produit: string;
  id_categorie: string;
};

type CategoryRow = {
  id_categorie: string;
  nom: string;
};

type ExportProduct = {
  id_produit: string;
  nom: string;
  description: string | null;
  categories: string;
  prix_ht: string;
  tva: string;
  prix_ttc: string;
  quantite_stock: string;
  statut: string;
  date_creation: string;
};

const MAX_EXPORT_ROWS = 10000;

function parseExportFormat(value: string | null): ExportFormat {
  return value === 'excel' ? 'excel' : 'csv';
}

function parseNumberParam(value: string | null): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsedValue = Number.parseFloat(value);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return parsedValue;
}

function parseDateParam(value: string | null, endOfDay: boolean): Date | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  if (endOfDay) {
    parsedDate.setHours(23, 59, 59, 999);
  } else {
    parsedDate.setHours(0, 0, 0, 0);
  }

  return parsedDate;
}

function parseSortBy(value: string | null): ProductSortBy {
  if (
    value === 'nom' ||
    value === 'prix_ht' ||
    value === 'prix_ttc' ||
    value === 'quantite_stock' ||
    value === 'statut' ||
    value === 'date_creation'
  ) {
    return value;
  }

  return 'nom';
}

function parseSortDirection(value: string | null): ProductSortDirection {
  return value === 'desc' ? 'desc' : 'asc';
}

function parseAvailability(value: string | null): ProductAvailability {
  if (value === 'in_stock' || value === 'out_of_stock') {
    return value;
  }

  return 'all';
}

function buildExportFilters(searchParams: URLSearchParams): ExportFilters {
  return {
    search: normalizeString(searchParams.get('search')),
    status:
      searchParams.get('status') === 'publie'
        ? 'publie'
        : searchParams.get('status') === 'brouillon'
          ? 'brouillon'
          : 'all',
    categoryId: normalizeString(searchParams.get('categoryId')),
    availability: parseAvailability(searchParams.get('availability')),
    createdFrom: parseDateParam(searchParams.get('createdFrom'), false),
    createdTo: parseDateParam(searchParams.get('createdTo'), true),
    priceMin: parseNumberParam(searchParams.get('priceMin')),
    priceMax: parseNumberParam(searchParams.get('priceMax')),
    sortBy: parseSortBy(searchParams.get('sortBy')),
    sortDirection: parseSortDirection(searchParams.get('sortDirection')),
  };
}

function extractProductCreatedAt(rawProduct: ProductRow): string | null {
  const dateCreationField = rawProduct.date_creation;

  if (
    typeof dateCreationField === 'string' &&
    !Number.isNaN(new Date(dateCreationField).getTime())
  ) {
    return dateCreationField;
  }

  const createdAtField = rawProduct.created_at;

  if (
    typeof createdAtField === 'string' &&
    !Number.isNaN(new Date(createdAtField).getTime())
  ) {
    return createdAtField;
  }

  return null;
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function escapeCsvCell(cellValue: string): string {
  const normalizedValue = cellValue.replaceAll('"', '""');
  return `"${normalizedValue}"`;
}

function escapeXmlCell(cellValue: string): string {
  return cellValue
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function mapProductToExportCells(product: ExportProduct): string[] {
  return [
    product.id_produit,
    product.nom,
    product.description ?? '',
    product.categories,
    product.prix_ht,
    product.tva,
    product.prix_ttc,
    product.quantite_stock,
    product.statut,
    product.date_creation,
  ];
}

const EXPORT_HEADERS = [
  'ID',
  'Nom',
  'Description',
  'Catégories',
  'Prix HT',
  'TVA',
  'Prix TTC',
  'Quantité en stock',
  'Statut',
  'Date de création',
];

function buildCsvContent(products: ExportProduct[]): string {
  const csvLines = [
    EXPORT_HEADERS.map((header) => escapeCsvCell(header)).join(','),
    ...products.map((product) => {
      return mapProductToExportCells(product)
        .map((cellValue) => escapeCsvCell(cellValue))
        .join(',');
    }),
  ];

  return csvLines.join('\n');
}

function buildExcelXmlContent(products: ExportProduct[]): string {
  const headersRowXml = EXPORT_HEADERS.map(
    (header) =>
      `<Cell><Data ss:Type="String">${escapeXmlCell(header)}</Data></Cell>`,
  ).join('');

  const rowsXml = products
    .map((product) => {
      const rowCellsXml = mapProductToExportCells(product)
        .map((cellValue) => {
          return `<Cell><Data ss:Type="String">${escapeXmlCell(cellValue)}</Data></Cell>`;
        })
        .join('');

      return `<Row>${rowCellsXml}</Row>`;
    })
    .join('');

  return [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:o="urn:schemas-microsoft-com:office:office"',
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:html="http://www.w3.org/TR/REC-html40">',
    ' <Worksheet ss:Name="Produits">',
    '  <Table>',
    `   <Row>${headersRowXml}</Row>`,
    `   ${rowsXml}`,
    '  </Table>',
    ' </Worksheet>',
    '</Workbook>',
  ].join('');
}

export async function GET(request: NextRequest) {
  const deniedResponse = await verifyAdminAccess();

  if (deniedResponse) {
    return deniedResponse;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const format = parseExportFormat(searchParams.get('format'));
    const filters = buildExportFilters(searchParams);
    const supabaseAdmin = createAdminClient();

    let query = supabaseAdmin.from('produit').select('*');

    if (filters.status === 'publie' || filters.status === 'brouillon') {
      query = query.eq('statut', filters.status);
    }

    if (filters.search) {
      query = query.or(
        `nom.ilike.%${filters.search}%,slug.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
      );
    }

    if (filters.availability === 'in_stock') {
      query = query.gt('quantite_stock', 0);
    }

    if (filters.availability === 'out_of_stock') {
      query = query.lte('quantite_stock', 0);
    }

    if (filters.priceMin !== null) {
      query = query.gte('prix_ttc', filters.priceMin);
    }

    if (filters.priceMax !== null) {
      query = query.lte('prix_ttc', filters.priceMax);
    }

    query = query.limit(MAX_EXPORT_ROWS);

    const { data, error } = await query;

    if (error) {
      console.error('Erreur chargement produits export admin', { error });

      return new Response(
        JSON.stringify({
          error: 'Erreur lors du chargement des produits.',
          code: 'admin_products_export_failed',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    let rawProducts = (data as ProductRow[] | null) ?? [];

    if (filters.categoryId) {
      const { data: categoryLinks } = await supabaseAdmin
        .from('produit_categorie')
        .select('id_produit')
        .eq('id_categorie', filters.categoryId);

      const productIdsInCategory = new Set(
        ((categoryLinks as Array<{ id_produit: string }>) ?? []).map(
          (row) => row.id_produit,
        ),
      );

      rawProducts = rawProducts.filter((product) =>
        productIdsInCategory.has(product.id_produit),
      );
    }

    const productsWithDates = rawProducts.map((product) => ({
      ...product,
      createdAt: extractProductCreatedAt(product),
      createdAtTimestamp: extractProductCreatedAt(product)
        ? new Date(extractProductCreatedAt(product)!).getTime()
        : 0,
    }));

    let filteredProducts = productsWithDates;

    if (filters.createdFrom || filters.createdTo) {
      filteredProducts = filteredProducts.filter((product) => {
        if (!product.createdAt) {
          return false;
        }

        const productTimestamp = new Date(product.createdAt).getTime();

        if (
          filters.createdFrom &&
          productTimestamp < filters.createdFrom.getTime()
        ) {
          return false;
        }

        if (
          filters.createdTo &&
          productTimestamp > filters.createdTo.getTime()
        ) {
          return false;
        }

        return true;
      });
    }

    const directionMultiplier = filters.sortDirection === 'asc' ? 1 : -1;

    filteredProducts.sort((productA, productB) => {
      let comparison = 0;

      if (filters.sortBy === 'prix_ht') {
        comparison = productA.prix_ht - productB.prix_ht;
      } else if (filters.sortBy === 'prix_ttc') {
        comparison = productA.prix_ttc - productB.prix_ttc;
      } else if (filters.sortBy === 'quantite_stock') {
        comparison = productA.quantite_stock - productB.quantite_stock;
      } else if (filters.sortBy === 'statut') {
        comparison = productA.statut.localeCompare(productB.statut);
      } else if (filters.sortBy === 'date_creation') {
        comparison =
          productA.createdAtTimestamp - productB.createdAtTimestamp;
      } else {
        comparison = productA.nom.localeCompare(productB.nom, 'fr');
      }

      if (comparison !== 0) {
        return comparison * directionMultiplier;
      }

      return productA.nom.localeCompare(productB.nom, 'fr');
    });

    const productIds = filteredProducts.map((product) => product.id_produit);

    const { data: categoryLinksData } = productIds.length > 0
      ? await supabaseAdmin
          .from('produit_categorie')
          .select('id_produit, id_categorie')
          .in('id_produit', productIds)
      : { data: [] };

    const categoryLinks =
      (categoryLinksData as ProductCategoryLink[] | null) ?? [];

    const uniqueCategoryIds = [
      ...new Set(categoryLinks.map((link) => link.id_categorie)),
    ];

    const { data: categoriesData } = uniqueCategoryIds.length > 0
      ? await supabaseAdmin
          .from('categorie')
          .select('id_categorie, nom')
          .in('id_categorie', uniqueCategoryIds)
      : { data: [] };

    const categories = (categoriesData as CategoryRow[] | null) ?? [];
    const categoriesById = new Map(
      categories.map((category) => [category.id_categorie, category]),
    );

    const categoryNamesByProductId = new Map<string, string[]>();

    categoryLinks.forEach((link) => {
      const category = categoriesById.get(link.id_categorie);

      if (category) {
        const names = categoryNamesByProductId.get(link.id_produit) ?? [];
        names.push(category.nom);
        categoryNamesByProductId.set(link.id_produit, names);
      }
    });

    const exportProducts: ExportProduct[] = filteredProducts.map((product) => ({
      id_produit: product.id_produit,
      nom: product.nom,
      description: product.description,
      categories: (categoryNamesByProductId.get(product.id_produit) ?? []).join(
        ', ',
      ),
      prix_ht: roundToTwoDecimals(Number(product.prix_ht ?? 0)).toFixed(2),
      tva: product.tva,
      prix_ttc: roundToTwoDecimals(Number(product.prix_ttc ?? 0)).toFixed(2),
      quantite_stock: String(product.quantite_stock),
      statut: product.statut,
      date_creation: product.createdAt ?? '',
    }));

    const content =
      format === 'excel'
        ? buildExcelXmlContent(exportProducts)
        : buildCsvContent(exportProducts);

    const contentType =
      format === 'excel'
        ? 'application/vnd.ms-excel'
        : 'text/csv; charset=utf-8';

    const fileExtension = format === 'excel' ? 'xls' : 'csv';
    const fileName = `produits-export.${fileExtension}`;

    const currentUser = await getCurrentUser();

    if (currentUser) {
      await logAdminActivity(currentUser.user.id, 'products.export', {
        format,
        exportedCount: exportProducts.length,
      });
    }

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Erreur inattendue export produits admin', { error });

    return new Response(
      JSON.stringify({
        error: 'Erreur serveur',
        code: 'server_error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
