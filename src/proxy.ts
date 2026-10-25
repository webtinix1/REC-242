import { NextResponse, type NextRequest } from 'next/server'

/**
 * Espace membre : session de 30 minutes sans activité quand « Rester connecté » n'est pas coché.
 * Chaque page visitée prolonge le cookie de 30 minutes ; sans visite, il expire et la page de connexion affiche « Session expirée ».
 * Le chemin demandé est transmis aux pages pour revenir au même endroit après la reconnexion.
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.set('x-rec-chemin', request.nextUrl.pathname + request.nextUrl.search)
  const res = NextResponse.next({ request: { headers } })
  const jeton = request.cookies.get('payload-token')?.value
  if (jeton && request.cookies.get('rec242_session')?.value === 'court') {
    res.cookies.set('payload-token', jeton, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 30 * 60,
    })
  }
  return res
}

export const config = {
  matcher: '/espace-membre/:path*',
}
