import { notFound } from 'next/navigation'

/** Toute adresse inconnue du site affiche l'écran 404 dans la mise en page du site. */
export default function Inconnu() {
  notFound()
}
