import { FunctionsHttpError } from '@supabase/supabase-js';

/** Turn Supabase / Edge Function / network errors into a sentence a traveller can read. */
export async function readableError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error) return String(body.error);
    } catch {
      // fall through
    }
  }
  if (error instanceof Error) {
    if (/network|fetch/i.test(error.message)) return 'You seem to be offline. Check your connection and try again.';
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
