import { NextResponse } from "next/server"
import type { CarouselApiResponse } from "@/features/home/carousel/carouselTypes"

const HOME_CAROUSEL_SLIDES: CarouselApiResponse["slides"] = [
  {
    id: "slide-pro-audio",
    imageUrl: "/carousel/pro-audio.svg",
    imageAlt: "Installation audio professionnelle dans une salle moderne",
    title: "Audio Pro Nouvelle Generation",
    description:
      "Equipez vos espaces avec une qualite sonore premium et une installation simplifiee.",
    ctaLabel: "Decouvrir la gamme",
    redirectUrl: "/mes-commandes",
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

export async function GET() {
  return NextResponse.json({ slides: HOME_CAROUSEL_SLIDES })
}
