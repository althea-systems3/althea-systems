import { normalizeString } from '@/lib/admin/common';

export type ProductStatus = 'publie' | 'brouillon';

export const ALLOWED_TVA_VALUES = new Set(['20', '10', '5.5', '0']);

export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseProductStatus(value: unknown): ProductStatus {
  return value === 'publie' ? 'publie' : 'brouillon';
}

export function parseTva(value: unknown, fallbackValue = '20'): string {
  const normalizedValue = normalizeString(value);

  if (ALLOWED_TVA_VALUES.has(normalizedValue)) {
    return normalizedValue;
  }

  return fallbackValue;
}

export function parseCategoryIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.map((item) => normalizeString(item)).filter(Boolean)),
  );
}

export function computePrices(
  priceHtInput: number | null,
  priceTtcInput: number | null,
  tva: string,
): {
  priceHt: number;
  priceTtc: number;
} | null {
  const vatRate = Number.parseFloat(tva.replace(',', '.'));

  if (!Number.isFinite(vatRate) || vatRate < 0) {
    return null;
  }

  const vatMultiplier = 1 + vatRate / 100;

  if (priceHtInput !== null) {
    if (priceHtInput < 0) {
      return null;
    }

    const priceHt = roundToTwoDecimals(priceHtInput);
    return {
      priceHt,
      priceTtc: roundToTwoDecimals(priceHt * vatMultiplier),
    };
  }

  if (priceTtcInput !== null) {
    if (priceTtcInput < 0) {
      return null;
    }

    const priceTtc = roundToTwoDecimals(priceTtcInput);
    return {
      priceHt: roundToTwoDecimals(priceTtc / vatMultiplier),
      priceTtc,
    };
  }

  return null;
}

export function parseTechnicalCharacteristics(value: unknown): {
  technicalCharacteristics: Record<string, unknown> | null;
  hasInvalidFormat: boolean;
} {
  if (value === null || value === undefined) {
    return {
      technicalCharacteristics: null,
      hasInvalidFormat: false,
    };
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      return {
        technicalCharacteristics: null,
        hasInvalidFormat: false,
      };
    }

    try {
      const parsedValue = JSON.parse(normalizedValue) as unknown;

      if (
        parsedValue &&
        typeof parsedValue === 'object' &&
        !Array.isArray(parsedValue)
      ) {
        return {
          technicalCharacteristics: parsedValue as Record<string, unknown>,
          hasInvalidFormat: false,
        };
      }

      return {
        technicalCharacteristics: null,
        hasInvalidFormat: true,
      };
    } catch {
      return {
        technicalCharacteristics: null,
        hasInvalidFormat: true,
      };
    }
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return {
      technicalCharacteristics: value as Record<string, unknown>,
      hasInvalidFormat: false,
    };
  }

  return {
    technicalCharacteristics: null,
    hasInvalidFormat: true,
  };
}
