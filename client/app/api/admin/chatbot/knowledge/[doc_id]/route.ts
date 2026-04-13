import { NextResponse } from "next/server"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { getCurrentUser } from "@/lib/auth/session"
import { getFirestoreClient } from "@/lib/firebase/admin"
import { FIRESTORE_CHATBOT_KNOWLEDGE } from "@/lib/contact/constants"
import { logChatbotActivity } from "@/lib/chatbot/logger"
import type { KnowledgeCategory } from "@/lib/chatbot/types"

type RouteContext = {
  params: Promise<{ doc_id: string }>
}

const VALID_CATEGORIES: KnowledgeCategory[] = [
  "faq",
  "navigation",
  "politique",
  "compte",
  "produit",
]

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((v) => typeof v === "string" && v.trim())
    .map((v) => (v as string).trim().toLowerCase())
}

// ─── GET /api/admin/chatbot/knowledge/[doc_id] ────────────────────────────────
export async function GET(_request: Request, { params }: RouteContext) {
  const denied = await verifyAdminAccess()
  if (denied) return denied

  try {
    const { doc_id } = await params

    if (!doc_id?.trim()) {
      return NextResponse.json(
        { error: "Identifiant invalide.", code: "id_required" },
        { status: 400 },
      )
    }

    const firestore = getFirestoreClient()
    const doc = await firestore
      .collection(FIRESTORE_CHATBOT_KNOWLEDGE)
      .doc(doc_id)
      .get()

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Bloc de connaissance introuvable.", code: "not_found" },
        { status: 404 },
      )
    }

    return NextResponse.json({ block: { doc_id: doc.id, ...doc.data() } })
  } catch (error) {
    console.error("Erreur lecture bloc connaissance chatbot", { error })
    return NextResponse.json(
      { error: "Erreur serveur", code: "server_error" },
      { status: 500 },
    )
  }
}

// ─── PUT /api/admin/chatbot/knowledge/[doc_id] ────────────────────────────────
export async function PUT(request: Request, { params }: RouteContext) {
  const denied = await verifyAdminAccess()
  if (denied) return denied

  try {
    const { doc_id } = await params

    if (!doc_id?.trim()) {
      return NextResponse.json(
        { error: "Identifiant invalide.", code: "id_required" },
        { status: 400 },
      )
    }

    const firestore = getFirestoreClient()
    const docRef = firestore.collection(FIRESTORE_CHATBOT_KNOWLEDGE).doc(doc_id)
    const existing = await docRef.get()

    if (!existing.exists) {
      return NextResponse.json(
        { error: "Bloc de connaissance introuvable.", code: "not_found" },
        { status: 404 },
      )
    }

    const body = await request.json().catch(() => null)

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (typeof body?.titre === "string" && body.titre.trim()) {
      updates.titre = body.titre.trim()
    }
    if (typeof body?.contenu === "string" && body.contenu.trim()) {
      updates.contenu = body.contenu.trim()
    }
    if (
      typeof body?.categorie === "string" &&
      VALID_CATEGORIES.includes(body.categorie as KnowledgeCategory)
    ) {
      updates.categorie = body.categorie
    }
    if (Array.isArray(body?.mots_cles)) {
      updates.mots_cles = parseStringArray(body.mots_cles)
    }
    if (typeof body?.actif === "boolean") {
      updates.actif = body.actif
    }

    await docRef.set(updates, { merge: true })

    const updated = await docRef.get()

    const currentUser = await getCurrentUser()
    await logChatbotActivity("chatbot_knowledge_updated", {
      user_id: currentUser?.user?.id ?? null,
      action: "update",
      doc_id,
    })

    return NextResponse.json({ block: { doc_id, ...updated.data() } })
  } catch (error) {
    console.error("Erreur mise à jour bloc connaissance chatbot", { error })
    return NextResponse.json(
      { error: "Erreur serveur", code: "server_error" },
      { status: 500 },
    )
  }
}

// ─── DELETE /api/admin/chatbot/knowledge/[doc_id] ─────────────────────────────
export async function DELETE(_request: Request, { params }: RouteContext) {
  const denied = await verifyAdminAccess()
  if (denied) return denied

  try {
    const { doc_id } = await params

    if (!doc_id?.trim()) {
      return NextResponse.json(
        { error: "Identifiant invalide.", code: "id_required" },
        { status: 400 },
      )
    }

    const firestore = getFirestoreClient()
    const docRef = firestore.collection(FIRESTORE_CHATBOT_KNOWLEDGE).doc(doc_id)
    const existing = await docRef.get()

    if (!existing.exists) {
      return NextResponse.json(
        { error: "Bloc de connaissance introuvable.", code: "not_found" },
        { status: 404 },
      )
    }

    await docRef.delete()

    const currentUser = await getCurrentUser()
    await logChatbotActivity("chatbot_knowledge_updated", {
      user_id: currentUser?.user?.id ?? null,
      action: "delete",
      doc_id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur suppression bloc connaissance chatbot", { error })
    return NextResponse.json(
      { error: "Erreur serveur", code: "server_error" },
      { status: 500 },
    )
  }
}
