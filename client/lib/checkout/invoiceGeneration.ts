import { normalizeString } from "@/lib/admin/common"
import {
  INVOICE_STATUS_PAID,
  INVOICES_STORAGE_PATH,
} from "@/lib/checkout/constants"
import { buildInvoiceNumber } from "@/lib/checkout/numberGenerator"
import { generateInvoicePdf } from "@/lib/checkout/pdf"
import type { InvoicePdfData } from "@/lib/checkout/pdf"
import type { createAdminClient } from "@/lib/supabase/admin"

import type { AddressInput } from "./addressResolver"
import type { EnrichedLine } from "./cartResolution"

async function uploadPdfToStorage(
  documentNumber: string,
  pdfBuffer: Buffer,
): Promise<string> {
  const admin = await import("firebase-admin")
  const bucket = admin.storage().bucket()
  const filePath = `${INVOICES_STORAGE_PATH}/${documentNumber}.pdf`
  const file = bucket.file(filePath)

  await file.save(pdfBuffer, {
    contentType: "application/pdf",
    metadata: { documentNumber },
  })

  await file.makePublic()

  return file.publicUrl()
}

export async function createInvoiceAndUploadPdf(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  orderId: string,
  orderNumber: string,
  totalTtc: number,
  customerName: string,
  customerEmail: string,
  addressSummary: AddressInput,
  lines: EnrichedLine[],
  totalHt: number,
  totalTva: number,
): Promise<string | null> {
  const invoiceNumber = buildInvoiceNumber()

  const invoiceData: InvoicePdfData = {
    invoiceNumber,
    orderNumber,
    issueDate: new Date().toISOString(),
    customerName,
    customerEmail,
    addressLine1: normalizeString(addressSummary.address1),
    addressLine2: normalizeString(addressSummary.address2),
    city: normalizeString(addressSummary.city),
    postalCode: normalizeString(addressSummary.postalCode),
    country: normalizeString(addressSummary.country),
    lines: lines.map((line) => ({
      productName: line.productName,
      quantity: line.quantity,
      unitPriceHt: line.unitPriceHt,
      totalTtc: line.subtotalTtc,
    })),
    totalHt,
    totalTva,
    totalTtc,
  }

  let pdfUrl: string | null = null

  try {
    const pdfBuffer = await generateInvoicePdf(invoiceData)
    pdfUrl = await uploadPdfToStorage(invoiceNumber, pdfBuffer)
  } catch (error) {
    console.error("Erreur génération/upload PDF facture", { error })
  }

  const { error } = await supabaseAdmin.from("facture").insert({
    numero_facture: invoiceNumber,
    id_commande: orderId,
    montant_ttc: totalTtc,
    statut: INVOICE_STATUS_PAID,
    pdf_url: pdfUrl,
  } as never)

  if (error) {
    console.error("Erreur insertion facture", { error })
    return null
  }

  return pdfUrl
}
