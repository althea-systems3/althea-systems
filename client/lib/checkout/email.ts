import { getResendClient, getFromEmail } from '@/lib/email/client';
import { formatEuros } from '@/lib/checkout/currency';

// --- Types ---

export type OrderLineEmailData = {
  productName: string;
  quantity: number;
  subtotalTtc: number;
};

export type OrderConfirmationEmailData = {
  recipientEmail: string;
  customerName: string;
  orderNumber: string;
  totalTtc: number;
  lines: OrderLineEmailData[];
  invoicePdfUrl: string | null;
};

// --- Construction du contenu HTML ---

function buildLineRowsHtml(lines: OrderLineEmailData[]): string {
  return lines
    .map(
      (line) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${line.productName}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${line.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatEuros(line.subtotalTtc)}</td>
        </tr>`,
    )
    .join('');
}

function buildInvoiceLinkHtml(invoicePdfUrl: string | null): string {
  if (!invoicePdfUrl) {
    return '';
  }

  return `<p style="margin-top:20px">
    <a href="${invoicePdfUrl}" style="color:#2563eb">Télécharger votre facture (PDF)</a>
  </p>`;
}

function buildConfirmationHtml(
  emailData: OrderConfirmationEmailData,
): string {
  const lineRowsHtml = buildLineRowsHtml(emailData.lines);
  const invoiceLinkHtml = buildInvoiceLinkHtml(emailData.invoicePdfUrl);

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h1 style="color:#1a1a1a;font-size:24px">Merci pour votre commande !</h1>
      <p>Bonjour ${emailData.customerName},</p>
      <p>Votre commande <strong>${emailData.orderNumber}</strong> a bien été confirmée.</p>

      <table style="width:100%;border-collapse:collapse;margin-top:20px">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px;text-align:left">Produit</th>
            <th style="padding:8px;text-align:center">Qté</th>
            <th style="padding:8px;text-align:right">Sous-total</th>
          </tr>
        </thead>
        <tbody>
          ${lineRowsHtml}
        </tbody>
      </table>

      <p style="font-size:18px;font-weight:bold;margin-top:20px">
        Total : ${formatEuros(emailData.totalTtc)}
      </p>

      ${invoiceLinkHtml}

      <p style="color:#666;font-size:12px;margin-top:30px">
        Althea Systems — Cet email est envoyé automatiquement.
      </p>
    </div>
  `;
}

// --- Envoi ---

export async function sendOrderConfirmationEmail(
  emailData: OrderConfirmationEmailData,
): Promise<void> {
  const resend = getResendClient();
  const fromEmail = getFromEmail();
  const htmlContent = buildConfirmationHtml(emailData);

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: emailData.recipientEmail,
    subject: `Confirmation de commande ${emailData.orderNumber}`,
    html: htmlContent,
  });

  if (error) {
    console.error('Erreur envoi email confirmation commande', {
      orderNumber: emailData.orderNumber,
      recipientEmail: emailData.recipientEmail,
      error,
    });
  }
}
