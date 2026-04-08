import {
  ORDER_NUMBER_PREFIX,
  INVOICE_NUMBER_PREFIX,
  CREDIT_NOTE_NUMBER_PREFIX,
} from '@/lib/checkout/constants';

const RANDOM_PART_LENGTH = 8;

function buildDateSegment(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');

  return `${year}${month}`;
}

function buildRandomSegment(): string {
  return crypto.randomUUID().slice(0, RANDOM_PART_LENGTH).toUpperCase();
}

function buildPrefixedNumber(prefix: string): string {
  return `${prefix}-${buildDateSegment()}-${buildRandomSegment()}`;
}

export function buildOrderNumber(): string {
  return buildPrefixedNumber(ORDER_NUMBER_PREFIX);
}

export function buildInvoiceNumber(): string {
  return buildPrefixedNumber(INVOICE_NUMBER_PREFIX);
}

export function buildCreditNoteNumber(): string {
  return buildPrefixedNumber(CREDIT_NOTE_NUMBER_PREFIX);
}
