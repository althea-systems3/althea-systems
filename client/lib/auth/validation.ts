import { PASSWORD_MIN_LENGTH } from '@/lib/auth/constants';

// --- Types ---

type RegistrationData = {
  email: string;
  password: string;
  nomComplet: string;
  cguAcceptee: boolean;
};

type ValidationSuccess = { data: RegistrationData };
type ValidationFailure = { errors: string[] };
type ValidationResult = ValidationSuccess | ValidationFailure;

// --- Helpers ---

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const DIGIT_REGEX = /\d/;
const NOM_COMPLET_MAX_LENGTH = 200;

function normalizeString(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

// --- Validateurs unitaires ---

export function validateEmail(email: unknown): string | null {
  const normalized = normalizeString(email);

  if (!normalized) {
    return 'Email requis.';
  }

  if (!EMAIL_REGEX.test(normalized)) {
    return 'Format email invalide.';
  }

  return null;
}

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || !password) {
    return 'Mot de passe requis.';
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }

  if (!UPPERCASE_REGEX.test(password)) {
    return 'Le mot de passe doit contenir au moins une majuscule.';
  }

  if (!LOWERCASE_REGEX.test(password)) {
    return 'Le mot de passe doit contenir au moins une minuscule.';
  }

  if (!DIGIT_REGEX.test(password)) {
    return 'Le mot de passe doit contenir au moins un chiffre.';
  }

  return null;
}

export function validateNomComplet(nom: unknown): string | null {
  const normalized = normalizeString(nom);

  if (!normalized) {
    return 'Nom complet requis.';
  }

  if (normalized.length > NOM_COMPLET_MAX_LENGTH) {
    return `Le nom ne doit pas dépasser ${NOM_COMPLET_MAX_LENGTH} caractères.`;
  }

  return null;
}

export function validateCguAcceptation(accepted: unknown): string | null {
  if (accepted !== true) {
    return 'Vous devez accepter les conditions générales.';
  }

  return null;
}

// --- Validateur agrégé ---

export function validateRegistrationPayload(
  body: unknown,
): ValidationResult {
  const parsed = body as Record<string, unknown> | null;

  if (!parsed || typeof parsed !== 'object') {
    return { errors: ['Payload invalide.'] };
  }

  const errors: string[] = [];

  const emailError = validateEmail(parsed.email);
  const passwordError = validatePassword(parsed.mot_de_passe);
  const nomError = validateNomComplet(parsed.nom_complet);
  const cguError = validateCguAcceptation(parsed.cgu_acceptee);

  if (emailError) errors.push(emailError);
  if (passwordError) errors.push(passwordError);
  if (nomError) errors.push(nomError);
  if (cguError) errors.push(cguError);

  // NOTE: Vérification confirmation mot de passe
  if (
    !passwordError &&
    parsed.mot_de_passe !== parsed.mot_de_passe_confirmation
  ) {
    errors.push('Les mots de passe ne correspondent pas.');
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    data: {
      email: normalizeString(parsed.email),
      password: parsed.mot_de_passe as string,
      nomComplet: normalizeString(parsed.nom_complet),
      cguAcceptee: true,
    },
  };
}
