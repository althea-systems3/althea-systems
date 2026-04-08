const CENTS_MULTIPLIER = 100;

export function roundCurrency(value: number): number {
  return Math.round(value * CENTS_MULTIPLIER) / CENTS_MULTIPLIER;
}

export function formatEuros(value: number): string {
  return `${value.toFixed(2)} €`;
}
