import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

import { verifyAdminAccess } from "@/lib/auth/adminGuard"
import { getCurrentUser } from "@/lib/auth/session"
import { getFirestoreClient } from "@/lib/firebase/admin"
import { FIRESTORE_CHATBOT_KNOWLEDGE } from "@/lib/contact/constants"
import { logChatbotActivity } from "@/lib/chatbot/logger"
import type { KnowledgeBlock, KnowledgeCategory } from "@/lib/chatbot/types"

const VALID_CATEGORIES: KnowledgeCategory[] = [
  "faq",
  "navigation",
  "politique",
  "compte",
  "produit",
]

function parseCategory(value: unknown): KnowledgeCategory | null {
  if (VALID_CATEGORIES.includes(value as KnowledgeCategory)) {
    return value as KnowledgeCategory
  }
  return null
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((v) => typeof v === "string" && v.trim())
    .map((v) => (v as string).trim().toLowerCase())
}

// ─── GET /api/admin/chatbot/knowledge ─────────────────────────────────────────
export async function GET(request: NextRequest) {
  const denied = await verifyAdminAccess()
  if (denied) return denied

  try {
    const firestore = getFirestoreClient()
    const searchParams = request.nextUrl.searchParams
    const filterCategorie = searchParams.get("categorie")
    const filterActif = searchParams.get("actif")

    let query = firestore.collection(FIRESTORE_CHATBOT_KNOWLEDGE) as FirebaseFirestore.Query

    if (filterCategorie && VALID_CATEGORIES.includes(filterCategorie as KnowledgeCategory)) {
      query = query.where("categorie", "==", filterCategorie)
    }

    if (filterActif === "true") {
      query = query.where("actif", "==", true)
    } else if (filterActif === "false") {
      query = query.where("actif", "==", false)
    }

    const snapshot = await query.orderBy("updated_at", "desc").limit(500).get()

    const blocks: KnowledgeBlock[] = snapshot.docs.map((doc) => ({
      doc_id: doc.id,
      ...(doc.data() as Omit<KnowledgeBlock, "doc_id">),
    }))

    return NextResponse.json({ blocks })
  } catch (error) {
    console.error("Erreur lecture base de connaissances chatbot", { error })
    return NextResponse.json(
      { error: "Erreur serveur", code: "server_error" },
      { status: 500 },
    )
  }
}

// ─── POST /api/admin/chatbot/knowledge ────────────────────────────────────────
export async function POST(request: Request) {
  const denied = await verifyAdminAccess()
  if (denied) return denied

  try {
    const body = await request.json().catch(() => null)

    const categorie = parseCategory(body?.categorie)
    const titre = typeof body?.titre === "string" ? body.titre.trim() : ""
    const contenu = typeof body?.contenu === "string" ? body.contenu.trim() : ""
    const mots_cles = parseStringArray(body?.mots_cles)

    if (!categorie || !titre || !contenu) {
      return NextResponse.json(
        { error: "Champs requis : categorie, titre, contenu.", code: "validation_error" },
        { status: 400 },
      )
    }

    const doc_id = crypto.randomUUID()
    const now = new Date().toISOString()

    const block: KnowledgeBlock = {
      doc_id,
      categorie,
      titre,
      contenu,
      mots_cles,
      actif: body?.actif !== false,
      updated_at: now,
    }

    const firestore = getFirestoreClient()
    await firestore
      .collection(FIRESTORE_CHATBOT_KNOWLEDGE)
      .doc(doc_id)
      .set(block)

    const currentUser = await getCurrentUser()
    await logChatbotActivity("chatbot_knowledge_updated", {
      user_id: currentUser?.user?.id ?? null,
      action: "create",
      doc_id,
      categorie,
    })

    return NextResponse.json({ block }, { status: 201 })
  } catch (error) {
    console.error("Erreur création bloc connaissance chatbot", { error })
    return NextResponse.json(
      { error: "Erreur serveur", code: "server_error" },
      { status: 500 },
    )
  }
}
