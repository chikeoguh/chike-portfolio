/* POST /api/contact — Cloudflare Pages Function.
   Anti-spam (honeypot, timing, rate limit, content filter) → validation → two emails via Resend → Discord report. */
import { buildCtx, warm } from '../../lib/intel.js';
import { notifyDiscord } from '../../lib/discord.js';
import { isSpam } from '../../lib/spam.js';
import { confirmationEmail, notificationEmail } from '../../lib/email-templates.js';

/* ─────────────────────────────────────────────────────────────
   RATE LIMITING  (per isolate; Pages may run several isolates, so this is a soft limit)
   Blocks more than 3 submissions from the same IP in 10 minutes
───────────────────────────────────────────────────────────── */
const rateMap = new Map();
const RATE_LIMIT  = 3;
const RATE_WINDOW = 10 * 60 * 1000;
// shortcut: per-isolate counter, not global; upgrade to a Durable Object / KV counter if spam gets through
function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, first: now };
  if (now - entry.first > RATE_WINDOW) {
    rateMap.set(ip, { count: 1, first: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  rateMap.set(ip, entry);
  return false;
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const str = v => (typeof v === 'string' ? v.trim() : '');

/* Resend REST API (no SDK needed on Workers) */
async function sendEmail(env, { from, to, replyTo, subject, html }) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to, reply_to: replyTo, subject, html }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

export async function onRequestPost({ request, env }) {
  let body = {};
  try { body = await request.json(); } catch { body = {}; }
  const { name, email, type, subject, message, _hp_name, _hp_email, _t } = body || {};

  const ctx = buildCtx(request, body.client, env); // visitor context for the Discord reports
  const ip = ctx.ip;

  /* ── 1. HONEYPOT — bots fill hidden fields, humans leave them empty ── */
  if (_hp_name || _hp_email) {
    console.warn('[SPAM] Honeypot triggered');
    await notifyDiscord.spam(ctx, { layer: 'honeypot' }).catch(err => console.warn('[DISCORD] spam notify failed:', err?.message));
    return json({ success: true }); // silent reject
  }

  /* ── 2. TIMING — real humans take > 3 s to fill a form ── */
  const elapsed = Date.now() - parseInt(_t || '0', 10);
  if (!_t || elapsed < 3000) {
    console.warn('[SPAM] Submitted too fast:', elapsed, 'ms');
    await notifyDiscord.spam(ctx, { layer: 'timing', meta: `${elapsed}ms` }).catch(err => console.warn('[DISCORD] spam notify failed:', err?.message));
    return json({ success: true }); // silent reject
  }

  /* ── 3. RATE LIMIT — max 3 submissions per IP per 10 min ── */
  if (isRateLimited(ip)) {
    console.warn('[SPAM] Rate limited IP:', ip);
    await notifyDiscord.spam(ctx, { layer: 'rate-limit' }).catch(err => console.warn('[DISCORD] spam notify failed:', err?.message));
    return json({ error: 'Too many submissions. Please wait a few minutes.' }, 429);
  }

  /* ── 4. FIELD VALIDATION ── */
  if (!str(name) || !str(email) || !str(type) || !str(subject) || !str(message)) {
    return json({ error: 'All fields are required.' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Invalid email address.' }, 400);
  }
  if (name.length > 100 || subject.length > 200 || message.length > 5000) {
    return json({ error: 'Input too long.' }, 400);
  }

  /* ── 5. SPAM CONTENT FILTER ── */
  if (isSpam({ name, email, subject, message })) {
    console.warn('[SPAM] Content filter triggered — from:', email);
    await notifyDiscord.spam(ctx, { layer: 'content-filter', meta: `from ${email}` }).catch(err => console.warn('[DISCORD] spam notify failed:', err?.message));
    return json({ success: true }); // silent reject
  }

  /* ── 6. SEND EMAILS ── */
  const label = type.replace(/_/g, ' ');
  const ts    = new Date().toUTCString();
  warm(ctx); // overlap the IP lookup with the email round-trips below

  try {
    await sendEmail(env, {
      from:    'Portfolio <noreply@chike.ng>',
      to:      ['hello@chike.ng'],
      replyTo: email,
      subject: `[INBOUND] ${label} — ${name}`,
      html:    notificationEmail({ name, email, type: label, subject, message, ts }),
    });

    await sendEmail(env, {
      from:    'Chike Oguh <noreply@chike.ng>',
      to:      [email],
      replyTo: 'hello@chike.ng',
      subject: 'Transmission received — chike.ng',
      html:    confirmationEmail({ name, email, type: label, subject, message, ts }),
    });

    await notifyDiscord.contact(ctx, { name, email, type: label, subject, message })
      .catch(err => console.warn('[DISCORD] contact notify failed:', err?.message));

    return json({ success: true });
  } catch (err) {
    console.error('[RESEND ERROR]', err?.message || err);
    return json({ error: 'Failed to transmit. Please try again.' }, 500);
  }
}
