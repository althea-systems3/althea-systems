import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getFirestoreClient } from "@/lib/firebase/admin"
import { FIRESTORE_IMAGES_CARROUSEL } from "@/lib/carousel/constants"
import type { Carrousel } from "@/lib/supabase/types"
import type { CarouselSlide } from "@/features/home/carousel/carouselTypes"

export const dynamic = "force-dynamic"

const FALLBACK_CAROUSEL_SLIDES: CarouselSlide[] = [
  {
    id: "slide-pro-audio",
    imageUrl: "/carousel/pro-audio.svg",
    imageAlt: "Installation audio professionnelle dans une salle moderne",
    title: "Audio Pro Nouvelle Generation",
    description:
      "Equipez vos espaces avec une qualite sonore premium et une installation simplifiee.",
    ctaLabel: "Decouvrir la gamme",
    redirectUrl: "/mon-compte/commandes",
  },
  {
    id: "slide-industrial-network",
    imageUrl: "/carousel/industrial-network.svg",
    imageAlt: "Reseau industriel et supervision de donnees en temps reel",
    title: "Reseaux Industriels Fiables",
    description:
      "Optimisez vos infrastructures avec des solutions robustes concues pour la performance.",
    ctaLabel: "Voir les solutions",
    redirectUrl: "/contact",
  },
  {
    id: "slide-smart-support",
    imageUrl: "/carousel/smart-support.svg",
    imageAlt: "Support technique digital avec suivi intelligent",
    title: "Support Technique 24/7",
    description:
      "Beneficiez d un accompagnement continu pour garantir la disponibilite de vos systemes.",
    ctaLabel: "Contacter un expert",
    redirectUrl: "/contact",
  },
]

type FirestoreImageDoc = {
  slide_id: string
  image_desktop_url: string
  image_mobile_url: string
}

function createFallbackResponse() {
  return NextResponse.json({
    slides: FALLBACK_CAROUSEL_SLIDES,
    isFallbackData: true,
  })
}

function hasRequiredConfig(): boolean {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
    Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
  )
}

async function fetchActiveSlides(): Promise<Carrousel[] | null> {
  const supabaseAdmin = createAdminClient()

  const { data, error } = await supabaseAdmin
    .from("carrousel")
    .select("id_slide, titre, texte, lien_redirection, ordre, actif, image_url")
    .eq("actif", true)
    .order("ordre", { ascending: true })

  if (error) {
    console.error("Erreur chargement slides carrousel", { error })
    return null
  }

  return (data ?? []) as Carrousel[]
}

async function fetchSlideImages(
  slideIds: string[],
): Promise<Map<string, FirestoreImageDoc>> {
  const imageMap = new Map<string, FirestoreImageDoc>()

  if (slideIds.length === 0) {
    return imageMap
  }

  try {
    const firestore = getFirestoreClient()

    const snapshot = await firestore
      .collection(FIRESTORE_IMAGES_CARROUSEL)
      .where("slide_id", "in", slideIds)
      .get()

    snapshot.docs.forEach((doc) => {
      const imageDoc = doc.data() as FirestoreImageDoc
      imageMap.set(imageDoc.slide_id, imageDoc)
    })
  } catch (error) {
    console.error("Erreur chargement images Firestore", { error })
  }

  return imageMap
}

function mapToCarouselSlide(
  slide: Carrousel,
  imageDoc?: FirestoreImageDoc,
): CarouselSlide {
  const imageDesktopUrl = imageDoc?.image_desktop_url ?? slide.image_url ?? ""
  const imageMobileUrl = imageDoc?.image_mobile_url ?? imageDesktopUrl

  return {
    id: slide.id_slide,
    imageUrl: imageDesktopUrl,
    imageDesktopUrl,
    imageMobileUrl,
    imageAlt: slide.titre,
    title: slide.titre,
    description: slide.texte ?? "",
    ctaLabel: "Découvrir",
    redirectUrl: slide.lien_redirection ?? "/",
  }
}

export async function GET() {
  try {
    if (!hasRequiredConfig()) {
      return createFallbackResponse()
    }

    const activeSlides = await fetchActiveSlides()

    if (!activeSlides) {
      return createFallbackResponse()
    }

    if (activeSlides.length === 0) {
      return NextResponse.json({ slides: [], isFallbackData: false })
    }

    const slideIds = activeSlides.map((slide) => slide.id_slide)
    const imageMap = await fetchSlideImages(slideIds)

    const slides = activeSlides.map((slide) => {
      return mapToCarouselSlide(slide, imageMap.get(slide.id_slide))
    })

    return NextResponse.json({ slides, isFallbackData: false })
  } catch (error) {
    console.error("Erreur inattendue endpoint carrousel", { error })
    return createFallbackResponse()
  }
}
