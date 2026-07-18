// netlify/functions/paystack-webhook.js
//
// Paystack calls this URL directly after every payment event — the browser
// never touches it. This is the only place that verifies a payment really
// happened before crediting an affiliate, which is why it has to live on
// a server, not in index.html.
//
// Environment variables to set in Netlify (Site settings → Environment):
//   PAYSTACK_SECRET_KEY   — your Paystack secret key (sk_live_... / sk_test_...)
//   SUPABASE_URL          — from Supabase project settings
//   SUPABASE_SERVICE_KEY  — Supabase "service_role" key (NOT the anon key —
//                            this one bypasses RLS, so it must stay server-side)

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  // 1. Verify the request really came from Paystack (not a forged call).
  const signature = event.headers['x-paystack-signature'];
  const expected = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(event.body)
    .digest('hex');

  if (signature !== expected) {
    return { statusCode: 401, body: 'Invalid signature' };
  }

  const payload = JSON.parse(event.body);

  // 2. Only act on successful charges.
  if (payload.event !== 'charge.success') {
    return { statusCode: 200, body: 'Ignored' };
  }

  const data = payload.data;
  const amountKobo = data.amount;
  const reference = data.reference;
  const course = data.metadata?.product || 'Unknown course';
  const refCode = data.metadata?.affiliate_ref;
  const isDirect = !refCode || refCode === 'direct';
  const commissionKobo = isDirect ? 0 : Math.round(amountKobo * 0.25);

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // 3. Record the sale. paystack_reference is unique, so a retried webhook
  //    call (Paystack does retry) can't double-credit the same sale.
  const { error } = await supabase.from('sales').upsert(
    {
      paystack_reference: reference,
      course: course,
      amount_kobo: amountKobo,
      commission_kobo: commissionKobo,
      ref_code: isDirect ? null : refCode,
      status: 'paid',
    },
    { onConflict: 'paystack_reference' }
  );

  if (error) {
    console.error('Supabase insert error:', error);
    return { statusCode: 500, body: 'Database error' };
  }

  return { statusCode: 200, body: 'OK' };
};
