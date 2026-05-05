// Re-export du handler /auth/confirm pour les URLs préfixées par locale.
// Permet de gérer à la fois :
//   - https://altheasystem.com/auth/confirm?token_hash=xxx&type=signup
//   - https://altheasystem.com/fr/auth/confirm?token_hash=xxx&type=signup
//   - https://altheasystem.com/en/auth/confirm?token_hash=xxx&type=signup
// Selon ce que Supabase envoie dans son email template.
export { GET } from "@/app/auth/confirm/route"
