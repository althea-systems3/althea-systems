import { describe, expect, it } from 'vitest';

import {
  generateInvoicePdf,
  generateCreditNotePdf,
} from '@/lib/checkout/pdf';
import type { InvoicePdfData, CreditNotePdfData } from '@/lib/checkout/pdf';

const SAMPLE_INVOICE_DATA: InvoicePdfData = {
  invoiceNumber: 'FAC-202604-ABCD1234',
  orderNumber: 'ALT-202604-EFGH5678',
  issueDate: '2026-04-08T12:00:00Z',
  customerName: 'Jean Dupont',
  customerEmail: 'jean@example.com',
  addressLine1: '12 rue de la Paix',
  addressLine2: '',
  city: 'Paris',
  postalCode: '75002',
  country: 'France',
  lines: [
    {
      productName: 'Interface Audio DSP-24',
      quantity: 2,
      unitPriceHt: 541.66,
      totalTtc: 1299.98,
    },
    {
      productName: 'Switch Industriel',
      quantity: 1,
      unitPriceHt: 749.17,
      totalTtc: 899.00,
    },
  ],
  totalHt: 1832.49,
  totalTva: 366.49,
  totalTtc: 2198.98,
};

const SAMPLE_CREDIT_NOTE_DATA: CreditNotePdfData = {
  creditNoteNumber: 'AVO-202604-ABCD1234',
  invoiceNumber: 'FAC-202604-EFGH5678',
  issueDate: '2026-04-08T14:00:00Z',
  amount: 2198.98,
  reason: 'annulation',
  customerName: 'Jean Dupont',
  customerEmail: 'jean@example.com',
};

describe('generateInvoicePdf', () => {
  it('retourne un Buffer non vide', async () => {
    const pdfBuffer = await generateInvoicePdf(SAMPLE_INVOICE_DATA);

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
  });

  it('commence par la signature PDF', async () => {
    const pdfBuffer = await generateInvoicePdf(SAMPLE_INVOICE_DATA);
    const pdfHeader = pdfBuffer.subarray(0, 5).toString();

    expect(pdfHeader).toBe('%PDF-');
  });
});

describe('generateCreditNotePdf', () => {
  it('retourne un Buffer non vide', async () => {
    const pdfBuffer = await generateCreditNotePdf(SAMPLE_CREDIT_NOTE_DATA);

    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
  });

  it('commence par la signature PDF', async () => {
    const pdfBuffer = await generateCreditNotePdf(SAMPLE_CREDIT_NOTE_DATA);
    const pdfHeader = pdfBuffer.subarray(0, 5).toString();

    expect(pdfHeader).toBe('%PDF-');
  });
});
