import {
  cguAcceptationSchema,
  emailSchema,
  nomCompletSchema,
  passwordSchema,
  registrationSchema,
} from '@/lib/validation/authSchemas';

type RegistrationData = {
  email: string;
  password: string;
  nomComplet: string;
  cguAcceptee: boolean;
};

type ValidationSuccess = { data: RegistrationData };
type ValidationFailure = { errors: string[] };
type ValidationResult = ValidationSuccess | ValidationFailure;

function firstError(result: {
  success: false;
  error: { issues: Array<{ message: string }> };
}): string {
  return result.error.issues[0]?.message ?? 'Valeur invalide.';
}

export function validateEmail(email: unknown): string | null {
  const result = emailSchema.safeParse(email);
  return result.success ? null : firstError(result);
}

export function validatePassword(password: unknown): string | null {
  const result = passwordSchema.safeParse(password);
  return result.success ? null : firstError(result);
}

export function validateNomComplet(nom: unknown): string | null {
  const result = nomCompletSchema.safeParse(nom);
  return result.success ? null : firstError(result);
}

export function validateCguAcceptation(accepted: unknown): string | null {
  const result = cguAcceptationSchema.safeParse(accepted);
  return result.success ? null : firstError(result);
}

export function validateRegistrationPayload(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { errors: ['Payload invalide.'] };
  }

  const result = registrationSchema.safeParse(body);

  if (result.success) {
    return {
      data: {
        email: result.data.email,
        password: result.data.mot_de_passe,
        nomComplet: result.data.nom_complet,
        cguAcceptee: true,
      },
    };
  }

  const passwordHasOwnIssue = result.error.issues.some(
    (issue) => issue.path[0] === 'mot_de_passe',
  );

  const errors = result.error.issues
    .filter((issue) => {
      if (
        passwordHasOwnIssue &&
        issue.path[0] === 'mot_de_passe_confirmation' &&
        issue.message === 'Les mots de passe ne correspondent pas.'
      ) {
        return false;
      }
      return true;
    })
    .map((issue) => issue.message);

  return { errors };
}
