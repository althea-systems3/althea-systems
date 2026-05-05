// Re-export du handler /auth/callback pour les URLs préfixées par locale.
// Permet de gérer à la fois :
//   - https://altheasystem.com/auth/callback?code=xxx
//   - https://altheasystem.com/fr/auth/callback?code=xxx
//   - https://altheasystem.com/en/auth/callback?code=xxx (etc.)
// Selon ce que Supabase envoie dans son email template.
export { GET } from "@/app/auth/callback/route"
