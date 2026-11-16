// Backend end-to-end + RLS test against the live Supabase project.
// Usage: node scripts/e2e-backend-test.mjs <path-to-test-accounts.json>
// The JSON holds { a, b, password } for two existing test users. Uses only the publishable key.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => l.trim().split(/=(.*)/s).slice(0, 2)),
);
const URL_ = env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const acct = JSON.parse(readFileSync(process.argv[2], 'utf8'));

const results = [];
const check = (name, pass, detail = '') => results.push({ pass: !!pass, name, detail: String(detail) });

async function signIn(email) {
  const c = createClient(URL_, KEY, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: acct.password });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return { c, user: data.user, token: data.session.access_token };
}
async function callBooking(token, body) {
  const res = await fetch(`${URL_}/functions/v1/create-booking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: KEY, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}
const day = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const mock = { provider: 'mock', reference: 'mock_test_123456' };

const A = await signIn(acct.a);
const B = await signIn(acct.b);
const anon = createClient(URL_, KEY, { auth: { persistSession: false } });

const { data: exps } = await anon.from('experiences').select('id, slug, duration_days').in('slug', ['tokyo-essentials', 'versailles-day-trip']);
const tokyo = exps.find((e) => e.slug === 'tokyo-essentials');
const dayTrip = exps.find((e) => e.slug === 'versailles-day-trip');

// profiles
const profA = await A.c.from('profiles').select('full_name').eq('id', A.user.id).maybeSingle();
check('Profile auto-created on sign-up', profA.data?.full_name === 'Test Traveler A', profA.data?.full_name);
const profAasB = await B.c.from('profiles').select('id').eq('id', A.user.id);
check('B cannot read A profile', profAasB.data?.length === 0, JSON.stringify(profAasB.data));

// booking via Edge Function
const start = day(10);
const ok = await callBooking(A.token, { experience_id: tokyo.id, start_date: start, adults: 2, children: 1, total_price: 1, payment: mock });
check('create-booking succeeds (201)', ok.status === 201, `${ok.status} ${JSON.stringify(ok.json)}`);
const bk = ok.json?.booking;
check('Server price ignores client total (2 adults + 1 child = 2622.38)', Number(bk?.total_price) === 2622.38, bk?.total_price);
check('Status is confirmed', bk?.status === 'confirmed', bk?.status);
check('booking_code format WF-XXXXXX', /^WF-[A-Z2-9]{6}$/.test(bk?.booking_code ?? ''), bk?.booking_code);
check('end_date = start + duration_days - 1', bk?.end_date === day(10 + tokyo.duration_days - 1), `${bk?.start_date} → ${bk?.end_date}`);

const oneDay = await callBooking(A.token, { experience_id: dayTrip.id, start_date: day(5), adults: 1, children: 0, payment: mock });
check('1-day trip: end_date = start_date', oneDay.json?.booking?.end_date === day(5), JSON.stringify(oneDay.json?.booking ?? oneDay.json));

const noAuth = await callBooking(null, { experience_id: tokyo.id, start_date: start, adults: 1, payment: mock });
check('No JWT → 401', noAuth.status === 401, noAuth.status);
const past = await callBooking(A.token, { experience_id: tokyo.id, start_date: day(-1), adults: 1, payment: mock });
check('Past start date → 400', past.status === 400, JSON.stringify(past.json));
const zeroAdults = await callBooking(A.token, { experience_id: tokyo.id, start_date: start, adults: 0, payment: mock });
check('0 adults → 400', zeroAdults.status === 400, JSON.stringify(zeroAdults.json));
const fakeExp = await callBooking(A.token, { experience_id: '00000000-0000-4000-8000-000000000000', start_date: start, adults: 1, payment: mock });
check('Unknown experience → 404', fakeExp.status === 404, JSON.stringify(fakeExp.json));
const noPay = await callBooking(A.token, { experience_id: tokyo.id, start_date: start, adults: 1 });
check('Missing payment → 402', noPay.status === 402, JSON.stringify(noPay.json));
const badDate = await callBooking(A.token, { experience_id: tokyo.id, start_date: '2026-02-30', adults: 1, payment: mock });
check('Impossible date → 400', badDate.status === 400, JSON.stringify(badDate.json));

// direct inserts are blocked
const direct = await A.c.from('bookings').insert({ experience_id: tokyo.id, start_date: start, end_date: day(13), adults: 1 });
check('Direct client insert into bookings is blocked', !!direct.error, direct.error?.message);

// RLS: B vs A's bookings
const bList = await B.c.from('bookings').select('id');
check('B sees none of A\'s bookings', bList.data?.length === 0, JSON.stringify(bList.data));
const bById = await B.c.from('bookings').select('id').eq('id', bk.id);
check('B cannot read A\'s booking by id', bById.data?.length === 0, JSON.stringify(bById.data));
const bCancel = await B.c.from('bookings').update({ status: 'cancelled' }).eq('id', bk.id).select('id');
check('B cannot cancel A\'s booking', (bCancel.data?.length ?? 0) === 0, bCancel.error?.message ?? JSON.stringify(bCancel.data));
const aList = await A.c.from('bookings').select('id');
check('A sees exactly their 2 bookings', aList.data?.length === 2, aList.data?.length);

// A can only cancel, not edit
const aPrice = await A.c.from('bookings').update({ total_price: 1 }).eq('id', bk.id).select('id');
check('A cannot change total_price', !!aPrice.error, aPrice.error?.message);
const aConfirm = await A.c.from('bookings').update({ status: 'completed' }).eq('id', bk.id).select('id');
check('A cannot set status other than cancelled', !!aConfirm.error || (aConfirm.data?.length ?? 0) === 0, aConfirm.error?.message ?? JSON.stringify(aConfirm.data));
const aCancel = await A.c.from('bookings').update({ status: 'cancelled' }).eq('id', bk.id).select('id, status');
check('A can cancel their upcoming booking', aCancel.data?.[0]?.status === 'cancelled', aCancel.error?.message ?? JSON.stringify(aCancel.data));
const aCancel2 = await A.c.from('bookings').update({ status: 'cancelled' }).eq('id', bk.id).select('id');
check('Cancelling twice changes nothing', (aCancel2.data?.length ?? 0) === 0, JSON.stringify(aCancel2.data));

// saved items
const save = await A.c.from('saved_items').insert({ experience_id: tokyo.id }).select('id, user_id').single();
check('A saves an experience (user_id defaults to A)', save.data?.user_id === A.user.id, save.error?.message ?? save.data?.user_id);
const dup = await A.c.from('saved_items').insert({ experience_id: tokyo.id });
check('Saving twice → unique violation', dup.error?.code === '23505', dup.error?.code);
const both = await A.c.from('saved_items').insert({ experience_id: tokyo.id, destination_id: (await anon.from('destinations').select('id').eq('slug', 'tokyo').single()).data.id });
check('Saving both targets at once → check violation', both.error?.code === '23514', both.error?.code);
const bSaved = await B.c.from('saved_items').select('id');
check('B sees none of A\'s saved items', bSaved.data?.length === 0, JSON.stringify(bSaved.data));
const bForge = await B.c.from('saved_items').insert({ user_id: A.user.id, experience_id: dayTrip.id });
check('B cannot save into A\'s list', !!bForge.error, bForge.error?.message);
const bDel = await B.c.from('saved_items').delete().eq('id', save.data.id).select('id');
check('B cannot delete A\'s saved item', (bDel.data?.length ?? 0) === 0, JSON.stringify(bDel.data));
const anonSaved = await anon.from('saved_items').select('id');
check('Signed-out client reads no saved items', !!anonSaved.error || anonSaved.data?.length === 0, anonSaved.error?.message ?? anonSaved.data?.length);

// storage: avatars
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const upOwn = await A.c.storage.from('avatars').upload(`${A.user.id}/test.png`, png, { contentType: 'image/png', upsert: true });
check('A uploads to own avatar folder', !upOwn.error, upOwn.error?.message);
const upOther = await A.c.storage.from('avatars').upload(`${B.user.id}/hack.png`, png, { contentType: 'image/png' });
check('A cannot upload into B\'s folder', !!upOther.error, upOther.error?.message);
const bRead = await B.c.storage.from('avatars').createSignedUrl(`${A.user.id}/test.png`, 60);
check('B cannot get a URL for A\'s avatar', !!bRead.error, bRead.error?.message);
const pub = await fetch(`${URL_}/storage/v1/object/public/avatars/${A.user.id}/test.png`);
check('Avatars bucket is not public', pub.status >= 400, pub.status);
await A.c.storage.from('avatars').remove([`${A.user.id}/test.png`]);

// catalog is read-only for users
const catWrite = await A.c.from('experiences').update({ price_per_person: 1 }).eq('id', tokyo.id).select('id');
check('Users cannot edit the catalog', !!catWrite.error || (catWrite.data?.length ?? 0) === 0, catWrite.error?.message ?? JSON.stringify(catWrite.data));

const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.pass ? '' : `  → ${r.detail}`}`);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
