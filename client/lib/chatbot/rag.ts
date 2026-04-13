import { getFirestoreClient } from "@/lib/firebase/admin"
import { createAdminClient } from "@/lib/supabase/admin"
import { FIRESTORE_CHATBOT_KNOWLEDGE } from "@/lib/contact/constants"
import type { KnowledgeBlock } from "@/lib/chatbot/types"

// ─── French stopwords ──────────────────────────────────────────────────────────
const STOPWORDS = new Set([
  "le","la","les","de","du","des","un","une","je","tu","il","elle","nous","vous",
  "ils","elles","et","ou","mais","donc","or","ni","car","en","à","au","aux","par",
  "sur","sous","dans","avec","sans","pour","comment","que","qui","quoi","quand",
  "où","est","sont","a","ont","être","avoir","ce","se","sa","son","ses","mon",
  "ma","mes","votre","vos","leur","leurs","on","y","me","te","lui","ne","pas",
  "plus","si","bien","aussi","tout","tous","même","puis","lors","alors","après",
  "avant","entre","jusqu","très","peut","faire","fais","fait","dois","faut",
])

export function extractKeywords(message: string): string[] {
  return message
    .toLowerCase()
    .replace(/[^a-zàâäéèêëîïôùûüç\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word))
}

// ─── RAG selection ─────────────────────────────────────────────────────────────
export async function fetchKnowledgeBlocks(): Promise<KnowledgeBlock[]> {
  try {
    const firestore = getFirestoreClient()
    const snapshot = await firestore
      .collection(FIRESTORE_CHATBOT_KNOWLEDGE)
      .where("actif", "==", true)
      .get()

    return snapshot.docs.map((doc) => ({
      doc_id: doc.id,
      ...(doc.data() as Omit<KnowledgeBlock, "doc_id">),
    }))
  } catch (error) {
    console.error("Erreur lecture base de connaissances chatbot", { error })
    return []
  }
}

function scoreBlock(block: KnowledgeBlock, keywords: string[]): number {
  let score = 0

  for (const kw of keywords) {
    if (block.mots_cles.some((mk) => mk.toLowerCase().includes(kw))) {
      score++
    }
    if (block.titre.toLowerCase().includes(kw)) {
      score++
    }
  }

  return score
}

export async function selectKnowledgeBlocks(message: string): Promise<KnowledgeBlock[]> {
  const keywords = extractKeywords(message)

  if (keywords.length === 0) {
    return []
  }

  const blocks = await fetchKnowledgeBlocks()

  const scored = blocks
    .map((block) => ({ block, score: scoreBlock(block, keywords) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ block }) => block)

  // Token budget: roughly 4 chars per token, keep under 3000 tokens ≈ 12000 chars
  let charBudget = 12000
  const selected: KnowledgeBlock[] = []

  for (const block of scored) {
    const blockLen = block.contenu.length + block.titre.length + 50
    if (charBudget - blockLen >= 0) {
      selected.push(block)
      charBudget -= blockLen
    }
  }

  return selected
}

// ─── Product search (RAG dynamic) ─────────────────────────────────────────────
const PRODUCT_KEYWORDS = [
  "produit","échographe","echographe","materiel","équipement","equipement",
  "appareil","catalogue","médical","medical","dispositif","prix","disponible",
  "achat","acheter","commander","stock",
]

export function messageContainsProductKeyword(message: string): boolean {
  const lower = message.toLowerCase()
  return PRODUCT_KEYWORDS.some((kw) => lower.includes(kw))
}

type ProductRow = {
  nom: string
  description: string | null
  prix_ttc: number | null
  quantite_stock: number | null
  slug: string
}

export async function fetchRelevantProducts(message: string): Promise<string> {
  const keywords = extractKeywords(message).slice(0, 3)

  if (keywords.length === 0) {
    return ""
  }

  try {
    const supabase = createAdminClient()

    // Build OR filter for each keyword
    const filters = keywords.map((kw) => `nom.ilike.%${kw}%,description.ilike.%${kw}%`).join(",")

    const { data, error } = await supabase
      .from("produit")
      .select("nom, description, prix_ttc, quantite_stock, slug")
      .eq("statut", "publie")
      .or(filters)
      .limit(5)

    if (error || !data || data.length === 0) {
      return ""
    }

    const lines = (data as ProductRow[]).map((p) => {
      const dispo =
        p.quantite_stock !== null && p.quantite_stock > 0
          ? "En stock"
          : "Sur commande"
      const desc = p.description
        ? p.description.slice(0, 200) + (p.description.length > 200 ? "…" : "")
        : "Aucune description disponible."
      const prix = p.prix_ttc !== null ? `${p.prix_ttc}€ TTC` : "Prix sur demande"
      return `- ${p.nom} – ${prix} – ${dispo} – Voir : /produits/${p.slug}\n  Description : ${desc}`
    })

    return `Produits correspondants dans le catalogue :\n${lines.join("\n")}`
  } catch (error) {
    console.error("Erreur recherche produits RAG", { error })
    return ""
  }
}

export function formatKnowledgeBlocks(blocks: KnowledgeBlock[]): string {
  if (blocks.length === 0) return ""

  return blocks
    .map((b) => `## ${b.titre}\n${b.contenu}`)
    .join("\n\n")
}
