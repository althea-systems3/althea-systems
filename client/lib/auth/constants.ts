// --- Vérification email ---

export const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

// --- Politique mot de passe ---

export const PASSWORD_MIN_LENGTH = 8;

// --- Rate limiting ---

export const RATE_LIMIT_REGISTER_MAX = 5;
export const RATE_LIMIT_REGISTER_WINDOW_MS = 15 * 60 * 1000;

export const RATE_LIMIT_RESEND_MAX = 3;
export const RATE_LIMIT_RESEND_WINDOW_MS = 15 * 60 * 1000;

// --- Statuts utilisateur ---

export const USER_STATUS_PENDING = 'en_attente';
export const USER_STATUS_ACTIVE = 'actif';

// --- Anti-énumération ---

export const ANTI_ENUMERATION_MESSAGE =
  'Si un compte existe avec cet email, un lien de vérification a été envoyé.';

// --- Messages ---

export const REGISTER_SUCCESS_MESSAGE =
  'Compte créé. Vérifiez votre email pour activer votre compte.';
export const INVALID_TOKEN_MESSAGE = 'Lien invalide ou expiré.';
