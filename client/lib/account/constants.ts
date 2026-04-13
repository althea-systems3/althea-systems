// --- Authentification account ---

export const SESSION_EXPIRED_MESSAGE = 'Session expiree';
export const SESSION_EXPIRED_CODE = 'session_expired';

// --- Erreurs génériques ---

export const SERVER_ERROR_MESSAGE = 'Erreur serveur';
export const SERVER_ERROR_CODE = 'server_error';

// --- Pagination commandes ---

export const ORDERS_DEFAULT_LIMIT = 10;
export const ORDERS_MAX_LIMIT = 50;

// --- Statuts commande actifs (bloquent suppression adresse) ---

export const ACTIVE_ORDER_STATUSES = ['en_attente', 'en_cours'];

// --- Historique commandes ---

export const ORDER_STATUSES = [
  'en_attente',
  'en_cours',
  'terminee',
  'annulee',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const HISTORY_DEFAULT_PAGE_SIZE = 10;
export const HISTORY_MAX_PAGE_SIZE = 50;
export const HISTORY_SEARCH_MAX_LENGTH = 100;
