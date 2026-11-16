// Upload supabase/seed-images/** to the public "images" bucket (same paths), overwriting existing files.
// Usage: node scripts/upload-seed-images.mjs <email> <password>
// The account needs a storage policy that allows it to write to the "images" bucket
// (the app's users never get one). Uses only the publishable key.
import { createClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => l.trim().split(/=(.*)/s).slice(0, 2)),
);
const [email, password] = process.argv.slice(2);
if (!email || !password) throw new Error('Usage: node scripts/upload-seed-images.mjs <email> <password>');

const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } });
const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
if (signInError) throw signInError;

const dir = join(root, 'supabase', 'seed-images');
const files = (function walk(d) {
  return readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
})(dir);

const TYPES = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };
let failed = 0;
for (const file of files) {
  const path = relative(dir, file).split(sep).join('/');
  const contentType = TYPES[path.split('.').pop().toLowerCase()];
  const { error } = await supabase.storage.from('images').upload(path, readFileSync(file), {
    contentType,
    upsert: true,
    cacheControl: '31536000',
  });
  console.log(`${error ? 'FAIL' : 'ok  '}  ${path}${error ? `  → ${error.message}` : ''}`);
  if (error) failed++;
}
await supabase.auth.signOut();
console.log(`\n${files.length - failed}/${files.length} uploaded`);
process.exit(failed ? 1 : 0);
