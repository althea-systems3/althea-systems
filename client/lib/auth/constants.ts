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

// --- Connexion ---

export const RATE_LIMIT_LOGIN_MAX = 5;
export const RATE_LIMIT_LOGIN_WINDOW_MS = 15 * 60 * 1000;

export const LOGIN_ACCOUNT_INACTIVE_MESSAGE = 'Ce compte est désactivé.';

// --- Session / Remember me ---

export const SHORT_SESSION_DURATION_MS = 2 * 60 * 60 * 1000;
export const REMEMBER_ME_COOKIE_NAME = 'remember_me';
export const REMEMBER_ME_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// --- Réinitialisation mot de passe ---

export const RESET_TOKEN_EXPIRY_HOURS = 1;

export const RATE_LIMIT_FORGOT_PASSWORD_MAX = 3;
export const RATE_LIMIT_FORGOT_PASSWORD_WINDOW_MS = 15 * 60 * 1000;

export const RATE_LIMIT_RESET_PASSWORD_MAX = 5;
export const RATE_LIMIT_RESET_PASSWORD_WINDOW_MS = 15 * 60 * 1000;

export const ANTI_ENUMERATION_RESET_MESSAGE =
  'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.';

// --- Messages ---

export const REGISTER_SUCCESS_MESSAGE =
  'Compte créé. Vérifiez votre email pour activer votre compte.';
export const INVALID_TOKEN_MESSAGE = 'Lien invalide ou expiré.';
