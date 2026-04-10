import { getResendClient, getFromEmail } from "@/lib/email/client"

// --- Types vérification ---

export type VerificationEmailData = {
  recipientEmail: string
  customerName: string
  verificationUrl: string
}

// --- Constantes ---

const EXPIRY_NOTICE = "24 heures"
const EMAIL_SUBJECT = "Vérifiez votre adresse email — Althea Systems"

// --- Construction HTML ---

function buildVerificationHtml(data: VerificationEmailData): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h1 style="color:#1a1a1a;font-size:24px">Bienvenue chez Althea Systems !</h1>
      <p>Bonjour ${data.customerName},</p>
      <p>Merci pour votre inscription. Pour activer votre compte, veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous :</p>

      <div style="text-align:center;margin:30px 0">
        <a href="${data.verificationUrl}"
           style="background:#2563eb;color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block">
          Vérifier mon email
        </a>
      </div>

      <p style="color:#666;font-size:14px">
        Ce lien est valable pendant ${EXPIRY_NOTICE}. Passé ce délai, vous pourrez demander un nouveau lien depuis la page de connexion.
      </p>

      <p style="color:#666;font-size:14px">
        Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.
      </p>

      <p style="color:#999;font-size:12px;margin-top:30px;border-top:1px solid #eee;padding-top:15px">
        Althea Systems — Cet email est envoyé automatiquement.
      </p>
    </div>
  `
}

// --- Envoi ---

export async function sendVerificationEmail(
  data: VerificationEmailData,
): Promise<void> {
  const resend = getResendClient()
  const fromEmail = getFromEmail()
  const htmlContent = buildVerificationHtml(data)

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: data.recipientEmail,
    subject: EMAIL_SUBJECT,
    html: htmlContent,
  })

  if (error) {
    console.error("Erreur envoi email vérification", {
      recipientEmail: data.recipientEmail,
      error,
    })
  }
}

// --- Types reset ---

export type PasswordResetEmailData = {
  recipientEmail: string
  customerName: string
  resetUrl: string
}

// --- Constantes reset ---

const RESET_EXPIRY_NOTICE = "1 heure"
const RESET_EMAIL_SUBJECT =
  "Réinitialisation de votre mot de passe — Althea Systems"

// --- Construction HTML reset ---

function buildResetPasswordHtml(data: PasswordResetEmailData): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h1 style="color:#1a1a1a;font-size:24px">Réinitialisation de mot de passe</h1>
      <p>Bonjour ${data.customerName},</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en définir un nouveau :</p>

      <div style="text-align:center;margin:30px 0">
        <a href="${data.resetUrl}"
           style="background:#2563eb;color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block">
          Réinitialiser mon mot de passe
        </a>
      </div>

      <p style="color:#666;font-size:14px">
        Ce lien est valable pendant ${RESET_EXPIRY_NOTICE}. Passé ce délai, vous devrez faire une nouvelle demande.
      </p>

      <p style="color:#666;font-size:14px">
        Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.
      </p>

      <p style="color:#999;font-size:12px;margin-top:30px;border-top:1px solid #eee;padding-top:15px">
        Althea Systems — Cet email est envoyé automatiquement.
      </p>
    </div>
  `
}

// --- Envoi reset ---

export async function sendPasswordResetEmail(
  data: PasswordResetEmailData,
): Promise<void> {
  const resend = getResendClient()
  const fromEmail = getFromEmail()
  const htmlContent = buildResetPasswordHtml(data)

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: data.recipientEmail,
    subject: RESET_EMAIL_SUBJECT,
    html: htmlContent,
  })

  if (error) {
    console.error("Erreur envoi email réinitialisation", {
      recipientEmail: data.recipientEmail,
      error,
    })
  }
}

// --- Types code 2FA admin ---

export type AdminTwoFactorEmailData = {
  recipientEmail: string
  adminName: string
  code: string
  expiresInMinutes: number
}

// --- Constantes code 2FA admin ---

const ADMIN_2FA_EMAIL_SUBJECT =
  "Code de vérification administrateur — Althea Systems"

// --- Construction HTML code 2FA admin ---

function buildAdminTwoFactorHtml(data: AdminTwoFactorEmailData): string {
  const safeAdminName = escapeHtml(data.adminName || "Administrateur")
  const safeCode = escapeHtml(data.code)

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h1 style="color:#1a1a1a;font-size:22px">Validation 2FA administrateur</h1>
      <p>Bonjour ${safeAdminName},</p>
      <p>Un accès à l'espace administrateur a été demandé. Saisissez le code ci-dessous pour finaliser la connexion :</p>

      <div style="margin:24px 0;text-align:center">
        <p style="display:inline-block;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:12px 20px;font-size:28px;letter-spacing:6px;font-weight:700;color:#0f172a">
          ${safeCode}
        </p>
      </div>

      <p style="color:#475569;font-size:14px">
        Ce code expire dans ${data.expiresInMinutes} minute(s).
      </p>

      <p style="color:#64748b;font-size:13px">
        Si vous n'êtes pas à l'origine de cette demande, changez immédiatement votre mot de passe administrateur.
      </p>
    </div>
  `
}

// --- Envoi code 2FA admin ---

export async function sendAdminTwoFactorEmail(
  data: AdminTwoFactorEmailData,
): Promise<void> {
  const resend = getResendClient()
  const fromEmail = getFromEmail()
  const htmlContent = buildAdminTwoFactorHtml(data)

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: data.recipientEmail,
    subject: ADMIN_2FA_EMAIL_SUBJECT,
    html: htmlContent,
  })

  if (error) {
    console.error("Erreur envoi email code 2FA admin", {
      recipientEmail: data.recipientEmail,
      error,
    })

    throw new Error("Impossible d envoyer le code 2FA administrateur.")
  }
}

// --- Types mail admin direct ---

export type AdminDirectEmailData = {
  recipientEmail: string
  customerName: string
  subject: string
  message: string
}

// --- Helpers mail admin direct ---

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function buildAdminDirectEmailHtml(data: AdminDirectEmailData): string {
  const safeCustomerName = escapeHtml(data.customerName || "Client")
  const safeSubject = escapeHtml(data.subject)
  const safeMessage = escapeHtml(data.message).replaceAll("\n", "<br/>")

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h1 style="color:#1a1a1a;font-size:22px">Message du support Althea Systems</h1>
      <p>Bonjour ${safeCustomerName},</p>
      <p>Vous avez reçu un message de notre équipe administrative.</p>

      <div style="margin:20px 0;border:1px solid #e5e7eb;border-radius:8px;padding:16px;background:#f8fafc">
        <p style="margin:0 0 8px;font-size:13px;color:#64748b">Sujet</p>
        <p style="margin:0 0 12px;font-size:16px;color:#0f172a;font-weight:600">${safeSubject}</p>
        <p style="margin:0;color:#1f2937;line-height:1.55">${safeMessage}</p>
      </div>

      <p style="color:#6b7280;font-size:13px">
        Cet email a été envoyé par un administrateur Althea Systems.
      </p>
    </div>
  `
}

// --- Envoi mail admin direct ---

export async function sendAdminDirectEmail(
  data: AdminDirectEmailData,
): Promise<void> {
  const resend = getResendClient()
  const fromEmail = getFromEmail()
  const htmlContent = buildAdminDirectEmailHtml(data)

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: data.recipientEmail,
    subject: data.subject,
    html: htmlContent,
  })

  if (error) {
    console.error("Erreur envoi email admin direct", {
      recipientEmail: data.recipientEmail,
      error,
    })

    throw new Error("Impossible d envoyer le mail administrateur.")
  }
}
