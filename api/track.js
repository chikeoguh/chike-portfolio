const { notifyDiscord } = require('./_discord');

/* ────────────────────────────────────────────────
   In-memory rate limit — one ping per IP per hour
   Keeps Discord channel clean when a single visitor
   navigates around the site or hits refresh.
──────────────────────────────────────────────── */
const recentIps = new Map();
const IP_TTL    = 60 * 60 * 1000; // 1 hour

function isRecent(ip) {
  const now = Date.now();
  // Occasional GC to prevent unbounded growth
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

module.exports = async function handler(req, res) {
  // Ignore anything that isn't a POST beacon
  if (req.method !== 'POST') return res.status(405).end();

  const ip      = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const ua      = req.headers['user-agent'] || '';
  const country = req.headers['x-vercel-ip-country'] || 'XX';
  const city    = req.headers['x-vercel-ip-city']    || '';

  // Silent success for bots and repeat visitors
  if (BOT_UA.test(ua))  return res.status(204).end();
  if (isRecent(ip))     return res.status(204).end();

  const { path = '/', referrer = '', screen = '' } = req.body || {};

  // AWAIT — Vercel serverless terminates the container on `return`, killing
  // any in-flight fetch. sendBeacon on the client already means UX isn't blocked.
  await notifyDiscord.visit({ path, referrer, country, city, ua, screen, ip });

  return res.status(204).end();
};
