import PDFDocument from 'pdfkit';

// --- Types ---

export type InvoiceLineData = {
  productName: string;
  quantity: number;
  unitPriceHt: number;
  totalTtc: number;
};

export type InvoicePdfData = {
  invoiceNumber: string;
  orderNumber: string;
  issueDate: string;
  customerName: string;
  customerEmail: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  country: string;
  lines: InvoiceLineData[];
  totalHt: number;
  totalTva: number;
  totalTtc: number;
};

export type CreditNotePdfData = {
  creditNoteNumber: string;
  invoiceNumber: string;
  issueDate: string;
  amount: number;
  reason: string;
  customerName: string;
  customerEmail: string;
};

// --- Constantes PDF ---

const COMPANY_NAME = 'Althea Systems';
const COMPANY_ADDRESS = 'Paris, France';
const FONT_SIZE_TITLE = 20;
const FONT_SIZE_SUBTITLE = 14;
const FONT_SIZE_BODY = 10;
const FONT_SIZE_SMALL = 8;
const PAGE_MARGIN = 50;
const TABLE_START_Y = 320;
const TABLE_ROW_HEIGHT = 20;
const COLUMN_PRODUCT_X = 50;
const COLUMN_QUANTITY_X = 300;
const COLUMN_UNIT_PRICE_X = 370;
const COLUMN_TOTAL_X = 460;

// --- Helpers formatage ---

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatAmount(value: number): string {
  return `${value.toFixed(2)} €`;
}

// --- Génération buffer PDF ---

function collectPdfBuffer(pdfDocument: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    pdfDocument.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    pdfDocument.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    pdfDocument.on('error', reject);
  });
}

// --- En-tête commun ---

function renderCompanyHeader(pdfDocument: PDFKit.PDFDocument): void {
  pdfDocument
    .fontSize(FONT_SIZE_TITLE)
    .text(COMPANY_NAME, PAGE_MARGIN, PAGE_MARGIN)
    .fontSize(FONT_SIZE_SMALL)
    .text(COMPANY_ADDRESS, PAGE_MARGIN, PAGE_MARGIN + 25);
}

// --- Facture PDF ---

function renderInvoiceHeader(
  pdfDocument: PDFKit.PDFDocument,
  invoiceData: InvoicePdfData,
): void {
  renderCompanyHeader(pdfDocument);

  pdfDocument
    .fontSize(FONT_SIZE_SUBTITLE)
    .text(`Facture ${invoiceData.invoiceNumber}`, PAGE_MARGIN, 120)
    .fontSize(FONT_SIZE_BODY)
    .text(`Commande : ${invoiceData.orderNumber}`, PAGE_MARGIN, 145)
    .text(`Date : ${formatDate(invoiceData.issueDate)}`, PAGE_MARGIN, 160);
}

function renderCustomerBlock(
  pdfDocument: PDFKit.PDFDocument,
  invoiceData: InvoicePdfData,
): void {
  pdfDocument
    .fontSize(FONT_SIZE_BODY)
    .text('Facturer à :', PAGE_MARGIN, 200)
    .text(invoiceData.customerName, PAGE_MARGIN, 215)
    .text(invoiceData.customerEmail, PAGE_MARGIN, 230)
    .text(invoiceData.addressLine1, PAGE_MARGIN, 245)
    .text(
      `${invoiceData.postalCode} ${invoiceData.city}, ${invoiceData.country}`,
      PAGE_MARGIN,
      260,
    );
}

function renderTableHeader(pdfDocument: PDFKit.PDFDocument): void {
  const headerY = TABLE_START_Y - TABLE_ROW_HEIGHT;

  pdfDocument
    .fontSize(FONT_SIZE_BODY)
    .text('Produit', COLUMN_PRODUCT_X, headerY)
    .text('Qté', COLUMN_QUANTITY_X, headerY)
    .text('P.U. HT', COLUMN_UNIT_PRICE_X, headerY)
    .text('Total TTC', COLUMN_TOTAL_X, headerY);

  pdfDocument
    .moveTo(PAGE_MARGIN, TABLE_START_Y - 5)
    .lineTo(560, TABLE_START_Y - 5)
    .stroke();
}

function renderTableLines(
  pdfDocument: PDFKit.PDFDocument,
  lines: InvoiceLineData[],
): number {
  let currentY = TABLE_START_Y;

  for (const line of lines) {
    pdfDocument
      .fontSize(FONT_SIZE_BODY)
      .text(line.productName, COLUMN_PRODUCT_X, currentY, { width: 240 })
      .text(String(line.quantity), COLUMN_QUANTITY_X, currentY)
      .text(formatAmount(line.unitPriceHt), COLUMN_UNIT_PRICE_X, currentY)
      .text(formatAmount(line.totalTtc), COLUMN_TOTAL_X, currentY);

    currentY += TABLE_ROW_HEIGHT;
  }

  return currentY;
}

function renderTotals(
  pdfDocument: PDFKit.PDFDocument,
  invoiceData: InvoicePdfData,
  startY: number,
): void {
  const totalsY = startY + 20;

  pdfDocument
    .moveTo(PAGE_MARGIN, totalsY - 5)
    .lineTo(560, totalsY - 5)
    .stroke();

  pdfDocument
    .fontSize(FONT_SIZE_BODY)
    .text(`Total HT : ${formatAmount(invoiceData.totalHt)}`, COLUMN_UNIT_PRICE_X, totalsY)
    .text(`TVA : ${formatAmount(invoiceData.totalTva)}`, COLUMN_UNIT_PRICE_X, totalsY + 15)
    .text(`Total TTC : ${formatAmount(invoiceData.totalTtc)}`, COLUMN_UNIT_PRICE_X, totalsY + 30);
}

export async function generateInvoicePdf(
  invoiceData: InvoicePdfData,
): Promise<Buffer> {
  const pdfDocument = new PDFDocument({ margin: PAGE_MARGIN });
  const bufferPromise = collectPdfBuffer(pdfDocument);

  renderInvoiceHeader(pdfDocument, invoiceData);
  renderCustomerBlock(pdfDocument, invoiceData);
  renderTableHeader(pdfDocument);
  const tableEndY = renderTableLines(pdfDocument, invoiceData.lines);
  renderTotals(pdfDocument, invoiceData, tableEndY);

  pdfDocument.end();

  return bufferPromise;
}

// --- Avoir PDF ---

export async function generateCreditNotePdf(
  creditNoteData: CreditNotePdfData,
): Promise<Buffer> {
  const pdfDocument = new PDFDocument({ margin: PAGE_MARGIN });
  const bufferPromise = collectPdfBuffer(pdfDocument);

  renderCompanyHeader(pdfDocument);

  pdfDocument
    .fontSize(FONT_SIZE_SUBTITLE)
    .text(`Avoir ${creditNoteData.creditNoteNumber}`, PAGE_MARGIN, 120)
    .fontSize(FONT_SIZE_BODY)
    .text(
      `Facture d'origine : ${creditNoteData.invoiceNumber}`,
      PAGE_MARGIN,
      145,
    )
    .text(
      `Date : ${formatDate(creditNoteData.issueDate)}`,
      PAGE_MARGIN,
      160,
    );

  pdfDocument
    .text(`Client : ${creditNoteData.customerName}`, PAGE_MARGIN, 200)
    .text(creditNoteData.customerEmail, PAGE_MARGIN, 215);

  pdfDocument
    .fontSize(FONT_SIZE_SUBTITLE)
    .text(
      `Montant : ${formatAmount(creditNoteData.amount)}`,
      PAGE_MARGIN,
      260,
    )
    .fontSize(FONT_SIZE_BODY)
    .text(`Motif : ${creditNoteData.reason}`, PAGE_MARGIN, 285);

  pdfDocument.end();

  return bufferPromise;
}
