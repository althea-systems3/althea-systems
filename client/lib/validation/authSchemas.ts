import { z } from 'zod';

import { PASSWORD_MIN_LENGTH } from '@/lib/auth/constants';

const NOM_COMPLET_MAX_LENGTH = 200;

export const emailSchema = z
  .string({ error: 'Email requis.' })
  .trim()
  .min(1, 'Email requis.')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Format email invalide.');

export const passwordSchema = z
  .string({ error: 'Mot de passe requis.' })
  .min(1, 'Mot de passe requis.')
  .min(
    PASSWORD_MIN_LENGTH,
    `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`,
  )
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule.')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule.')
  .regex(/\d/, 'Le mot de passe doit contenir au moins un chiffre.');

export const nomCompletSchema = z
  .string({ error: 'Nom complet requis.' })
  .trim()
  .min(1, 'Nom complet requis.')
  .max(
    NOM_COMPLET_MAX_LENGTH,
    `Le nom ne doit pas dépasser ${NOM_COMPLET_MAX_LENGTH} caractères.`,
  );

export const cguAcceptationSchema = z.literal(true, {
  error: 'Vous devez accepter les conditions générales.',
});

export const registrationSchema = z
  .object({
    email: emailSchema,
    mot_de_passe: passwordSchema,
    mot_de_passe_confirmation: z.string(),
    nom_complet: nomCompletSchema,
    cgu_acceptee: cguAcceptationSchema,
  })
  .refine(
    (data) => data.mot_de_passe === data.mot_de_passe_confirmation,
    {
      path: ['mot_de_passe_confirmation'],
      message: 'Les mots de passe ne correspondent pas.',
    },
  );

export type RegistrationInput = z.input<typeof registrationSchema>;
export type RegistrationOutput = z.output<typeof registrationSchema>;

// --- SignIn ---

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mot de passe requis.'),
  rememberSession: z.boolean().default(false),
});

export type SignInInput = z.input<typeof signInSchema>;
export type SignInOutput = z.output<typeof signInSchema>;

// --- Forgot password ---

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;

// --- Reset password ---

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'Les mots de passe ne correspondent pas.',
  });

export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;

// --- Admin 2FA ---

export const adminTwoFactorSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Code requis.')
    .regex(/^\d{6}$/, 'Le code doit contenir 6 chiffres.'),
});

export type AdminTwoFactorInput = z.input<typeof adminTwoFactorSchema>;

// --- SignUp (frontend form shape, différent du payload API registration) ---

export const signUpFormSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, 'Prénom requis.')
      .max(100, 'Le prénom ne doit pas dépasser 100 caractères.'),
    lastName: z
      .string()
      .trim()
      .min(1, 'Nom requis.')
      .max(100, 'Le nom ne doit pas dépasser 100 caractères.'),
    email: emailSchema,
    phone: z
      .string()
      .trim()
      .optional()
      .transform((value) => value ?? '')
      .refine(
        (value) => value === '' || /^[+0-9\s()-]{6,20}$/.test(value),
        'Format téléphone invalide.',
      ),
    password: passwordSchema,
    passwordConfirmation: z.string(),
    acceptTerms: z.literal(true, {
      error: 'Vous devez accepter les conditions générales.',
    }),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'Les mots de passe ne correspondent pas.',
  });

export type SignUpFormInput = z.input<typeof signUpFormSchema>;
export type SignUpFormOutput = z.output<typeof signUpFormSchema>;
