import {
  RELEVANCE_SCORE_EXACT,
  RELEVANCE_SCORE_ONE_DIFF,
  RELEVANCE_SCORE_STARTS_WITH,
  RELEVANCE_SCORE_CONTAINS,
  RELEVANCE_SCORE_NONE,
  TITLE_WEIGHT,
  DESCRIPTION_WEIGHT,
} from './constants';

/**
 * Calcule la distance de Levenshtein entre deux chaînes.
 * Utilisée pour détecter les termes à "1 caractère de différence".
 */
export function levenshteinDistance(stringA: string, stringB: string): number {
  const lengthA = stringA.length;
  const lengthB = stringB.length;

  const matrix: number[][] = [];

  for (let rowIndex = 0; rowIndex <= lengthA; rowIndex++) {
    matrix[rowIndex] = [rowIndex];
  }

  for (let colIndex = 0; colIndex <= lengthB; colIndex++) {
    matrix[0][colIndex] = colIndex;
  }

  for (let rowIndex = 1; rowIndex <= lengthA; rowIndex++) {
    for (let colIndex = 1; colIndex <= lengthB; colIndex++) {
      const substitutionCost =
        stringA[rowIndex - 1] === stringB[colIndex - 1] ? 0 : 1;

      matrix[rowIndex][colIndex] = Math.min(
        matrix[rowIndex - 1][colIndex] + 1,
        matrix[rowIndex][colIndex - 1] + 1,
        matrix[rowIndex - 1][colIndex - 1] + substitutionCost,
      );
    }
  }

  return matrix[lengthA][lengthB];
}

/**
 * Calcule le score de pertinence d'un champ texte par rapport au terme recherché.
 * Ordre : exact (400) → 1 diff (300) → starts with (200) → contains (100) → 0
 */
export function computeTextRelevanceScore(
  fieldValue: string | null,
  searchTerm: string,
): number {
  if (!fieldValue || !searchTerm) {
    return RELEVANCE_SCORE_NONE;
  }

  const normalizedField = fieldValue.toLowerCase().trim();
  const normalizedTerm = searchTerm.toLowerCase().trim();

  if (normalizedField === normalizedTerm) {
    return RELEVANCE_SCORE_EXACT;
  }

  if (levenshteinDistance(normalizedField, normalizedTerm) <= 1) {
    return RELEVANCE_SCORE_ONE_DIFF;
  }

  if (normalizedField.startsWith(normalizedTerm)) {
    return RELEVANCE_SCORE_STARTS_WITH;
  }

  if (normalizedField.includes(normalizedTerm)) {
    return RELEVANCE_SCORE_CONTAINS;
  }

  // NOTE: Vérifier aussi les mots individuels du champ
  const fieldWords = normalizedField.split(/\s+/);
  const hasWordStartingWith = fieldWords.some(
    (word) => word.startsWith(normalizedTerm),
  );

  if (hasWordStartingWith) {
    return RELEVANCE_SCORE_CONTAINS;
  }

  const hasCloseWord = fieldWords.some(
    (word) => levenshteinDistance(word, normalizedTerm) <= 1,
  );

  if (hasCloseWord) {
    return RELEVANCE_SCORE_ONE_DIFF;
  }

  return RELEVANCE_SCORE_NONE;
}

type ProductForScoring = {
  nom: string;
  description: string | null;
};

/**
 * Calcule le score combiné titre + description.
 * Le titre a un poids 2x supérieur à la description.
 */
export function computeProductRelevanceScore(
  product: ProductForScoring,
  searchTerm: string,
): number {
  const titleScore = computeTextRelevanceScore(product.nom, searchTerm);
  const descriptionScore = computeTextRelevanceScore(
    product.description,
    searchTerm,
  );

  return titleScore * TITLE_WEIGHT + descriptionScore * DESCRIPTION_WEIGHT;
}
