import { describe, expect, it } from 'vitest';

import {
  buildOrderNumber,
  buildInvoiceNumber,
  buildCreditNoteNumber,
} from '@/lib/checkout/numberGenerator';

describe('buildOrderNumber', () => {
  it('commence par le préfixe ALT', () => {
    const orderNumber = buildOrderNumber();

    expect(orderNumber).toMatch(/^ALT-/);
  });

  it('contient le segment date YYYYMM', () => {
    const orderNumber = buildOrderNumber();
    const now = new Date();
    const expectedMonth = String(now.getUTCMonth() + 1).padStart(2, '0');
    const expectedYear = now.getUTCFullYear();

    expect(orderNumber).toContain(`${expectedYear}${expectedMonth}`);
  });

  it('a le format ALT-YYYYMM-XXXXXXXX', () => {
    const orderNumber = buildOrderNumber();

    expect(orderNumber).toMatch(/^ALT-\d{6}-[A-Z0-9]{8}$/);
  });

  it('génère des numéros uniques', () => {
    const firstNumber = buildOrderNumber();
    const secondNumber = buildOrderNumber();

    expect(firstNumber).not.toBe(secondNumber);
  });
});

describe('buildInvoiceNumber', () => {
  it('commence par le préfixe FAC', () => {
    const invoiceNumber = buildInvoiceNumber();

    expect(invoiceNumber).toMatch(/^FAC-\d{6}-[A-Z0-9]{8}$/);
  });
});

describe('buildCreditNoteNumber', () => {
  it('commence par le préfixe AVO', () => {
    const creditNoteNumber = buildCreditNoteNumber();

    expect(creditNoteNumber).toMatch(/^AVO-\d{6}-[A-Z0-9]{8}$/);
  });
});
