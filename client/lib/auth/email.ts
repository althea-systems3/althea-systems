import { getResendClient, getFromEmail } from '@/lib/email/client';

// --- Types ---

export type VerificationEmailData = {
  recipientEmail: string;
  customerName: string;
  verificationUrl: string;
};

// --- Constantes ---

const EXPIRY_NOTICE = '24 heures';
const EMAIL_SUBJECT = 'Vérifiez votre adresse email — Althea Systems';

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
  `;
}

// --- Envoi ---

export async function sendVerificationEmail(
  data: VerificationEmailData,
): Promise<void> {
  const resend = getResendClient();
  const fromEmail = getFromEmail();
  const htmlContent = buildVerificationHtml(data);

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: data.recipientEmail,
    subject: EMAIL_SUBJECT,
    html: htmlContent,
  });

  if (error) {
    console.error('Erreur envoi email vérification', {
      recipientEmail: data.recipientEmail,
      error,
    });
  }
}
