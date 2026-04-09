// --- Helpers ---

export function normalizeString(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

// --- Validation adresse ---

const ADDRESS_REQUIRED_FIELDS: Array<[string, string]> = [
  ['firstName', 'first_name_required'],
  ['lastName', 'last_name_required'],
  ['address1', 'address_1_required'],
  ['city', 'city_required'],
  ['postalCode', 'postal_code_required'],
  ['country', 'country_required'],
  ['phone', 'phone_required'],
];

export function getAddressValidationError(body: unknown): string | null {
  const parsed = body as Record<string, unknown> | null;

  if (!parsed || typeof parsed !== 'object') {
    return 'invalid_payload';
  }

  for (const [key, code] of ADDRESS_REQUIRED_FIELDS) {
    if (!normalizeString(parsed[key])) {
      return code;
    }
  }

  return null;
}

// --- Validation profil ---

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+\d\s().-]{6,20}$/;

export function getProfileValidationError(body: unknown): string | null {
  const parsed = body as Record<string, unknown> | null;

  if (!parsed || typeof parsed !== 'object') {
    return 'invalid_payload';
  }

  const firstName = normalizeString(parsed.firstName);
  const lastName = normalizeString(parsed.lastName);
  const email = normalizeString(parsed.email).toLowerCase();
  const phone = normalizeString(parsed.phone);

  if (!firstName) {
    return 'first_name_required';
  }

  if (!lastName) {
    return 'last_name_required';
  }

  if (!email) {
    return 'email_required';
  }

  if (!EMAIL_PATTERN.test(email)) {
    return 'email_invalid';
  }

  if (phone && !PHONE_PATTERN.test(phone)) {
    return 'phone_invalid';
  }

  return null;
}

// --- Validation méthode de paiement ---

const EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/(\d{2})$/;
const LAST4_PATTERN = /^\d{4}$/;

export function getPaymentMethodValidationError(
  body: unknown,
): string | null {
  const parsed = body as Record<string, unknown> | null;

  if (!parsed || typeof parsed !== 'object') {
    return 'invalid_payload';
  }

  const cardHolder = normalizeString(parsed.cardHolder);
  const last4 = normalizeString(parsed.last4);
  const expiry = normalizeString(parsed.expiry);
  const stripePaymentId = normalizeString(parsed.stripePaymentId);

  if (!cardHolder) {
    return 'card_holder_required';
  }

  if (!last4 || !LAST4_PATTERN.test(last4)) {
    return 'last4_invalid';
  }

  if (!expiry || !EXPIRY_PATTERN.test(expiry)) {
    return 'expiry_invalid';
  }

  if (!stripePaymentId) {
    return 'stripe_payment_id_required';
  }

  return null;
}

export function getPaymentMethodUpdateValidationError(
  body: unknown,
): string | null {
  const parsed = body as Record<string, unknown> | null;

  if (!parsed || typeof parsed !== 'object') {
    return 'invalid_payload';
  }

  const cardHolder = normalizeString(parsed.cardHolder);
  const expiry = normalizeString(parsed.expiry);
  const isDefault = parsed.isDefault === true;

  if (!cardHolder && !expiry && !isDefault) {
    return 'no_changes_requested';
  }

  if (expiry && !EXPIRY_PATTERN.test(expiry)) {
    return 'expiry_invalid';
  }

  return null;
}

// --- Pagination ---

export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaultLimit: number,
  maxLimit: number,
): { limit: number; offset: number } {
  const rawLimit = searchParams.get('limit');
  const rawOffset = searchParams.get('offset');

  let limit = defaultLimit;
  let offset = 0;

  if (rawLimit) {
    const parsed = parseInt(rawLimit, 10);

    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, maxLimit);
    }
  }

  if (rawOffset) {
    const parsed = parseInt(rawOffset, 10);

    if (!isNaN(parsed) && parsed >= 0) {
      offset = parsed;
    }
  }

  return { limit, offset };
}
