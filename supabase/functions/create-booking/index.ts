// create-booking — the only way a booking gets into the database.
// The app sends its JWT + what the user picked; the server checks everything and sets
// the price (via public.quote_booking, also enforced by the bookings trigger), the end date
// and the status. Client-sent totals are never used.
//
// Payments: only a mock provider for now. To add Razorpay later, create the order in a separate
// Edge Function, then verify the payment signature here (RAZORPAY_KEY_SECRET as a function
// secret) before inserting. No payment secret ever lives in the app.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(s: string) {
  if (!DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
function addDaysUTC(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type Payment = { provider: 'mock'; reference: string };

async function verifyPayment(payment: unknown): Promise<string | null> {
  const p = payment as Partial<Payment> | null;
  if (!p || typeof p.reference !== 'string' || p.reference.length < 6) return 'Missing payment confirmation.';
  if (p.provider === 'mock') {
    return Deno.env.get('ALLOW_MOCK_PAYMENTS') === 'false' ? 'Test payments are disabled.' : null;
  }
  // future: if (p.provider === 'razorpay') verify razorpay_signature with RAZORPAY_KEY_SECRET
  return 'Unsupported payment method.';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Sign in to book.' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return json({ error: 'Your session has expired. Sign in again.' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  const experienceId = body.experience_id;
  const startDate = body.start_date;
  const adults = body.adults;
  const children = body.children ?? 0;

  if (typeof experienceId !== 'string' || !UUID.test(experienceId)) return json({ error: 'Unknown experience.' }, 400);
  if (typeof startDate !== 'string' || !isRealDate(startDate)) return json({ error: 'Pick a valid start date.' }, 400);
  if (startDate < addDaysUTC(0)) return json({ error: 'The start date is in the past.' }, 400);
  if (startDate > addDaysUTC(365)) return json({ error: 'Bookings open up to a year ahead.' }, 400);
  if (!Number.isInteger(adults) || (adults as number) < 1 || (adults as number) > 10) {
    return json({ error: 'Choose between 1 and 10 adults.' }, 400);
  }
  if (!Number.isInteger(children) || (children as number) < 0 || (children as number) > 10) {
    return json({ error: 'Choose between 0 and 10 children.' }, 400);
  }

  // contact details: the app requires a phone (older app versions don't send one, so it's checked only when present)
  const phoneRaw = typeof body.contact_phone === 'string' ? body.contact_phone.trim() : '';
  if (phoneRaw && !/^\+?[0-9 ()-]{6,20}$/.test(phoneRaw)) return json({ error: 'Enter a valid phone number.' }, 400);
  const phone = phoneRaw || null;
  const requestsRaw = typeof body.special_requests === 'string' ? body.special_requests.trim() : '';
  if (requestsRaw.length > 500) return json({ error: 'Keep special requests under 500 characters.' }, 400);
  const specialRequests = requestsRaw || null;

  const paymentError = await verifyPayment(body.payment);
  if (paymentError) return json({ error: paymentError }, 402);

  // experience must exist; price is recalculated here, never taken from the client
  const { data: quote, error: quoteError } = await admin
    .rpc('quote_booking', { p_experience_id: experienceId, p_adults: adults as number, p_children: children as number })
    .maybeSingle();
  if (quoteError) return json({ error: 'Could not price this booking. Try again.' }, 500);
  if (!quote) return json({ error: 'This experience is no longer available.' }, 404);

  const { data: booking, error: insertError } = await admin
    .from('bookings')
    .insert({
      user_id: user.id,
      experience_id: experienceId,
      start_date: startDate,
      adults: adults as number,
      children: children as number,
      contact_phone: phone,
      special_requests: specialRequests,
      status: 'confirmed',
    })
    .select('id, booking_code, start_date, end_date, adults, children, total_price, status')
    .single();

  if (insertError || !booking) {
    console.error('create-booking insert failed', insertError);
    return json({ error: 'Could not create the booking. Please try again.' }, 500);
  }

  return json({ booking, quote }, 201);
});
