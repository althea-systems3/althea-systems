import { getResendClient, getFromEmail } from "@/lib/email/client"
import { formatEuros } from "@/lib/checkout/currency"

// --- Types ---

export type OrderLineEmailData = {
  productName: string
  quantity: number
  subtotalTtc: number
}

export type OrderConfirmationEmailData = {
  recipientEmail: string
  customerName: string
  orderNumber: string
  totalTtc: number
  lines: OrderLineEmailData[]
  invoicePdfUrl: string | null
}

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
    .join("")
}

function buildInvoiceLinkHtml(invoicePdfUrl: string | null): string {
  if (!invoicePdfUrl) {
    return ""
  }

  return `<p style="margin-top:20px">
    <a href="${invoicePdfUrl}" style="color:#2563eb">Télécharger votre facture (PDF)</a>
  </p>`
}

function buildConfirmationHtml(emailData: OrderConfirmationEmailData): string {
  const lineRowsHtml = buildLineRowsHtml(emailData.lines)
  const invoiceLinkHtml = buildInvoiceLinkHtml(emailData.invoicePdfUrl)

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
  `
}

// --- Envoi ---

export async function sendOrderConfirmationEmail(
  emailData: OrderConfirmationEmailData,
): Promise<void> {
  const resend = getResendClient()
  const fromEmail = getFromEmail()
  const htmlContent = buildConfirmationHtml(emailData)

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: emailData.recipientEmail,
    subject: `Confirmation de commande ${emailData.orderNumber}`,
    html: htmlContent,
  })

  if (error) {
    console.error("Erreur envoi email confirmation commande", {
      orderNumber: emailData.orderNumber,
      recipientEmail: emailData.recipientEmail,
      error,
    })
  }
}

// --- Types renvoi facture ---

export type InvoiceResendEmailData = {
  recipientEmail: string
  customerName: string
  invoiceNumber: string
  orderNumber: string
  issueDate: string
  totalTtc: number
  invoicePdfUrl: string | null
}

// --- Types renvoi avoir ---

export type CreditNoteResendEmailData = {
  recipientEmail: string
  customerName: string
  creditNoteNumber: string
  invoiceNumber: string
  issueDate: string
  amount: number
  reason: string
  creditNotePdfUrl: string | null
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function buildInvoiceResendHtml(emailData: InvoiceResendEmailData): string {
  const safeCustomerName = escapeHtml(emailData.customerName || "Client")
  const safeInvoiceNumber = escapeHtml(emailData.invoiceNumber)
  const safeOrderNumber = escapeHtml(emailData.orderNumber)
  const safeIssueDate = escapeHtml(emailData.issueDate)

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h1 style="color:#1a1a1a;font-size:24px">Votre facture ${safeInvoiceNumber}</h1>
      <p>Bonjour ${safeCustomerName},</p>
      <p>Comme demandé, nous vous renvoyons les informations de votre facture.</p>

      <div style="margin:20px 0;border:1px solid #e5e7eb;border-radius:8px;padding:16px;background:#f8fafc">
        <p style="margin:0 0 8px"><strong>Commande :</strong> ${safeOrderNumber}</p>
        <p style="margin:0 0 8px"><strong>Date d'émission :</strong> ${safeIssueDate}</p>
        <p style="margin:0"><strong>Montant TTC :</strong> ${formatEuros(emailData.totalTtc)}</p>
      </div>

      ${
        emailData.invoicePdfUrl
          ? `<p><a href="${emailData.invoicePdfUrl}" style="color:#2563eb">Télécharger la facture (PDF)</a></p>`
          : "<p>Le PDF de cette facture n'est pas disponible pour le moment.</p>"
      }

      <p style="color:#666;font-size:12px;margin-top:30px">
        Althea Systems — Cet email est envoyé automatiquement.
      </p>
    </div>
  `
}

function buildCreditNoteResendHtml(
  emailData: CreditNoteResendEmailData,
): string {
  const safeCustomerName = escapeHtml(emailData.customerName || "Client")
  const safeCreditNoteNumber = escapeHtml(emailData.creditNoteNumber)
  const safeInvoiceNumber = escapeHtml(emailData.invoiceNumber)
  const safeIssueDate = escapeHtml(emailData.issueDate)
  const safeReason = escapeHtml(emailData.reason || "-")

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h1 style="color:#1a1a1a;font-size:24px">Votre avoir ${safeCreditNoteNumber}</h1>
      <p>Bonjour ${safeCustomerName},</p>
      <p>Comme demandé, nous vous renvoyons les informations de votre avoir.</p>

      <div style="margin:20px 0;border:1px solid #e5e7eb;border-radius:8px;padding:16px;background:#f8fafc">
        <p style="margin:0 0 8px"><strong>Facture liée :</strong> ${safeInvoiceNumber}</p>
        <p style="margin:0 0 8px"><strong>Date d'émission :</strong> ${safeIssueDate}</p>
        <p style="margin:0 0 8px"><strong>Motif :</strong> ${safeReason}</p>
        <p style="margin:0"><strong>Montant :</strong> -${formatEuros(Math.abs(emailData.amount))}</p>
      </div>

      ${
        emailData.creditNotePdfUrl
          ? `<p><a href="${emailData.creditNotePdfUrl}" style="color:#2563eb">Télécharger l'avoir (PDF)</a></p>`
          : "<p>Le PDF de cet avoir n'est pas disponible pour le moment.</p>"
      }

      <p style="color:#666;font-size:12px;margin-top:30px">
        Althea Systems — Cet email est envoyé automatiquement.
      </p>
    </div>
  `
}

export async function sendInvoiceResendEmail(
  emailData: InvoiceResendEmailData,
): Promise<void> {
  const resend = getResendClient()
  const fromEmail = getFromEmail()
  const htmlContent = buildInvoiceResendHtml(emailData)

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: emailData.recipientEmail,
    subject: `Renvoyer la facture ${emailData.invoiceNumber}`,
    html: htmlContent,
  })

  if (error) {
    console.error("Erreur envoi email renvoi facture", {
      invoiceNumber: emailData.invoiceNumber,
      recipientEmail: emailData.recipientEmail,
      error,
    })

    throw new Error("Impossible d envoyer la facture par email.")
  }
}

export async function sendCreditNoteResendEmail(
  emailData: CreditNoteResendEmailData,
): Promise<void> {
  const resend = getResendClient()
  const fromEmail = getFromEmail()
  const htmlContent = buildCreditNoteResendHtml(emailData)

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: emailData.recipientEmail,
    subject: `Renvoyer l'avoir ${emailData.creditNoteNumber}`,
    html: htmlContent,
  })

  if (error) {
    console.error("Erreur envoi email renvoi avoir", {
      creditNoteNumber: emailData.creditNoteNumber,
      recipientEmail: emailData.recipientEmail,
      error,
    })

    throw new Error("Impossible d envoyer l'avoir par email.")
  }
}
