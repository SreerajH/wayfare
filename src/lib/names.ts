import type { User } from '@supabase/supabase-js';

function tidy(word: string) {
  // keep deliberate casing ("McKenzie"), fix all-lower / all-upper ("sreeraj", "SREERAJ")
  if (word === word.toLowerCase() || word === word.toUpperCase()) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  return word;
}

function firstWord(value: unknown) {
  if (typeof value !== 'string') return null;
  const word = value.trim().split(/\s+/)[0]?.replace(/[^\p{L}'-]/gu, '');
  return word && word.length >= 2 ? tidy(word) : null;
}

/**
 * Best first name for greetings: saved profile name → name from the sign-in provider (Google)
 * → the start of the email address ("sreeraj.h@example.com" → "Sreeraj").
 */
export function firstNameFor(profileName: string | null | undefined, user: User | null | undefined): string | null {
  const meta = user?.user_metadata ?? {};
  const fromName = firstWord(profileName) ?? firstWord(meta.given_name) ?? firstWord(meta.full_name) ?? firstWord(meta.name);
  if (fromName) return fromName;

  const local = user?.email?.split('@')[0] ?? '';
  const fromEmail = local.split(/[._\-+]/)[0]?.replace(/[^\p{L}]/gu, '');
  return fromEmail && fromEmail.length >= 2 ? tidy(fromEmail) : null;
}

export function initialOf(name: string | null | undefined) {
  return name?.trim().charAt(0).toUpperCase() || null;
}
