export function validateIdProduit(idProduit: unknown): string | null {
  if (!idProduit || typeof idProduit !== 'string' || idProduit.trim().length === 0) {
    return 'L identifiant du produit est obligatoire.';
  }

  return null;
}

export function validatePriorite(priorite: unknown): string | null {
  if (priorite === undefined || priorite === null) {
    return null;
  }

  if (!Number.isInteger(priorite) || (priorite as number) < 1) {
    return 'La priorité doit être un entier positif.';
  }

  return null;
}
