// --- Numérotation ---

export const ORDER_NUMBER_PREFIX = 'ALT';
export const INVOICE_NUMBER_PREFIX = 'FAC';
export const CREDIT_NOTE_NUMBER_PREFIX = 'AVO';

// --- Statuts commande ---

export const ORDER_STATUS_PENDING = 'en_attente';
export const ORDER_STATUS_IN_PROGRESS = 'en_cours';
export const ORDER_STATUS_COMPLETED = 'terminee';
export const ORDER_STATUS_CANCELLED = 'annulee';

// --- Statuts paiement ---

export const PAYMENT_STATUS_PENDING = 'en_attente';
export const PAYMENT_STATUS_VALID = 'valide';
export const PAYMENT_STATUS_FAILED = 'echoue';
export const PAYMENT_STATUS_REFUNDED = 'rembourse';

// --- Statuts facture ---

export const INVOICE_STATUS_PENDING = 'en_attente';
export const INVOICE_STATUS_PAID = 'payee';
export const INVOICE_STATUS_CANCELLED = 'annule';

// --- Motifs avoir ---

export const CREDIT_NOTE_REASON_CANCELLATION = 'annulation';
export const CREDIT_NOTE_REASON_REFUND = 'remboursement';
export const CREDIT_NOTE_REASON_ERROR = 'erreur';

// --- Limites ---

export const MAX_ADDRESSES_PER_USER = 10;

// --- Firebase Storage ---

export const INVOICES_STORAGE_PATH = 'invoices';

// --- Devise ---

export const CURRENCY_CODE = 'eur';
export const CURRENCY_LABEL = 'EUR';

// --- Guest checkout ---

export const GUEST_USER_DEFAULT_STATUS = 'actif';
export const GUEST_USER_DEFAULT_NAME = 'Invité';
