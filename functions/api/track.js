/* POST /api/track — visit beacon from public/index.html → Discord visit report. Cloudflare Pages Function. */
import { buildCtx } from '../../lib/intel.js';
import { notifyDiscord } from '../../lib/discord.js';

/* ────────────────────────────────────────────────
   In-memory rate limit — one ping per IP per hour (per isolate)
   Keeps Discord channel clean when a single visitor
   navigates around the site or hits refresh.
──────────────────────────────────────────────── */
const recentIps = new Map();
const IP_TTL    = 60 * 60 * 1000; // 1 hour

function isRecent(ip) {
  const now = Date.now();
  if (recentIps.size > 500) {
    for (const [k, t] of recentIps) if (now - t > IP_TTL) recentIps.delete(k);
  }
  const last = recentIps.get(ip);
  if (last && now - last < IP_TTL) return true;
  recentIps.set(ip, now);
  return false;
}

/* ignore obvious bots so we don't spam the Discord channel */
const BOT_UA = /(bot|crawler|spider|slurp|bing|google|yandex|duckduck|baidu|facebook|linkedin|discord|slack|whatsapp|telegram|preview|curl|wget|python-requests|axios|node-fetch|headless)/i;

const empty = (status = 204) => new Response(null, { status });

export async function onRequestPost({ request, env }) {
  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  const ctx = buildCtx(request, body, env); // headers + Cloudflare geo; the IP lookup runs only if we report

  // Silent success for bots and repeat visitors (checked before spending an IP lookup)
  if (BOT_UA.test(ctx.ua)) return empty();
  if (isRecent(ctx.ip))    return empty();

  const { path = '/', referrer = '' } = body || {};
  // awaited: the Worker must not return before the Discord request has finished
  await notifyDiscord.visit(ctx, { path: String(path).slice(0, 100), referrer: String(referrer).slice(0, 300) });
  return empty();
}
