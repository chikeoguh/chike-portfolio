/**
 * Visitor context + IP intelligence for the Discord reports (Cloudflare Pages Functions).
 *
 * Geo comes from Cloudflare's request.cf (country, city, region, timezone, lat/lon, postal code,
 * colo) — no third-party call needed for location. The ip-api.com lookup adds the
 * hosting / proxy / mobile flags that Cloudflare does not expose.
 * shortcut: ip-api free tier is HTTP-only, 45 req/min per egress IP and non-commercial; results are
 * cached 6h per isolate. Upgrade to a keyed HTTPS provider if traffic grows or this turns commercial.
 */

const FIELDS = 'status,message,continent,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,reverse,mobile,proxy,hosting,query';
const TTL = 6 * 3600 * 1000;
const cache = new Map();

/* strict-enough IP check: dotted IPv4 with octets ≤255, or IPv6 made of hex groups and colons */
export function isIP(s) {
  if (typeof s !== 'string') return false;
  const v4 = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) return v4.slice(1).every(o => +o <= 255);
  return s.includes(':') && /^[0-9a-f:.]+$/i.test(s) && s.length <= 45;
}

/* ── ip-api lookup: cached, 2.2s timeout, never throws ── */
export async function lookupIp(ip) {
  if (!isIP(ip)) return { fail: 'no valid IP' };
  const hit = cache.get(ip);
  if (hit && Date.now() - hit.t < TTL) return hit.v;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 2200);
  try {
    const r = await fetch(`http://ip-api.com/json/${ip}?fields=${FIELDS}`, { signal: ac.signal });
    const j = r.ok ? await r.json() : null;
    const v = j && j.status === 'success' ? j : { fail: (j && j.message) || 'HTTP ' + r.status };
    // cache real answers and private ranges; not rate-limit/transient failures
    if (!v.fail || /private|reserved/.test(v.fail)) {
      if (cache.size > 500) cache.clear();
      cache.set(ip, { t: Date.now(), v });
    }
    return v;
  } catch (e) {
    return { fail: e.name === 'AbortError' ? 'timeout' : 'network error' };
  } finally {
    clearTimeout(timer);
  }
}

/* ── residential / datacenter / VPN / Tor / mobile ── */
export function classifyIp(i) {
  if (!i) return { label: 'Unknown', kind: 'unknown' };
  if (i.fail) {
    return /private|reserved/.test(i.fail)
      ? { label: 'Private / local', kind: 'private' }
      : { label: `Lookup unavailable (${i.fail})`, kind: 'unknown' };
  }
  if (/tor[-.]?(exit|relay)|torservers|torproject/i.test(`${i.reverse} ${i.asname} ${i.org}`)) return { label: 'Tor exit node', kind: 'tor' };
  if (i.hosting && i.proxy) return { label: 'Datacenter · VPN/proxy', kind: 'dc-vpn' };
  if (i.hosting) return { label: 'Datacenter / hosting', kind: 'datacenter' };
  if (i.proxy) return { label: 'VPN / proxy', kind: 'vpn' };
  if (i.mobile) return { label: 'Mobile carrier', kind: 'mobile' };
  return { label: 'Residential / ISP', kind: 'residential' };
}

/* current UTC offset (minutes) of an IANA zone; null if unknown */
export function offMin(tz) {
  try {
    const v = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' })
      .formatToParts(new Date()).find(p => p.type === 'timeZoneName').value;
    const m = v.match(/GMT([+-])(\d{2}):?(\d{2})?/);
    return m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + (+m[3] || 0)) : 0;
  } catch (e) { return null; }
}

/* ── transparent risk score: every point has a stated reason ── */
export function analyze(ctx, intel, type) {
  let score = 0; const reasons = [];
  const add = (n, why) => { score += n; reasons.push(why); };
  if (type.kind === 'tor') add(4, 'Tor exit');
  else if (type.kind === 'dc-vpn') add(3, 'Datacenter + VPN/proxy');
  else if (type.kind === 'datacenter') add(3, 'Datacenter IP');
  else if (type.kind === 'vpn') add(2, 'VPN/proxy');
  if (ctx.client.wd) add(3, 'Automated browser');
  if (/headless/i.test(ctx.ua)) add(3, 'Headless UA');
  if (!ctx.lang) add(1, 'No Accept-Language');
  const ipTz = (intel && intel.timezone) || ctx.geo.tz, cTz = ctx.client.tz;
  let tz = null;
  if (cTz && ipTz) {
    const a = offMin(cTz), b = offMin(ipTz);
    tz = { ok: a === null || b === null || a === b, client: cTz, ip: ipTz };
    if (!tz.ok) add(1, 'Timezone ≠ IP');
  }
  return { score, reasons, level: score >= 4 ? 'High' : score >= 2 ? 'Medium' : 'Low', tz };
}

/* ── untrusted client payload → known keys, bounded sizes ── */
export function sanitizeClient(c) {
  c = c && typeof c === 'object' ? c : {};
  const s = (v, n = 60) => (typeof v === 'string' ? v.slice(0, n) : '');
  const n = v => (v === null || v === '' || !Number.isFinite(+v) ? null : +v);
  return {
    tz: s(c.tz, 40), langs: s(c.langs), vp: s(c.vp, 20), scr: s(c.screen || c.scr, 20), dpr: n(c.dpr),
    cores: n(c.cores), mem: n(c.mem), net: s(c.net, 30), touch: n(c.touch), scheme: s(c.scheme, 10),
    rm: !!c.rm, wd: !!c.wd, utm: s(c.utm, 100), visits: n(c.visits), since: s(c.since, 10), load: n(c.load),
    ref: s(c.referrer || c.ref, 200), ref0: s(c.ref0, 120), path: s(c.path, 100),
  };
}

/* ── synchronous: gather everything from the request; the IP lookup starts only when warm()/resolveCtx() runs.
   request: a Fetch API Request (headers + Cloudflare's request.cf). env: Pages bindings (DISCORD_WEBHOOK). ── */
export function buildCtx(request, client, env = {}) {
  const h = request.headers;
  const g = k => h.get(k) || '';
  const cf = request.cf || {};
  const raw = (g('cf-connecting-ip') || g('x-forwarded-for').split(',')[0] || '').trim();
  const ip = isIP(raw) ? raw : 'unknown';
  const q = v => String(v || '').replace(/^"|"$/g, '');
  return {
    ip,
    ua: g('user-agent'),
    lang: g('accept-language').split(',').slice(0, 3).map(x => x.split(';')[0].trim()).filter(Boolean).join(', '),
    geo: {
      country: cf.country || '', region: cf.region || '', city: cf.city || '',
      tz: cf.timezone || '', lat: cf.latitude || '', lon: cf.longitude || '', zip: cf.postalCode || '',
    },
    ch: { platform: q(g('sec-ch-ua-platform')), mobile: g('sec-ch-ua-mobile') === '?1' },
    privacy: g('dnt') === '1' || g('sec-gpc') === '1',
    edge: cf.colo || '',
    webhook: env.DISCORD_WEBHOOK || '',
    client: sanitizeClient(client),
  };
}

/* start the lookup early so it overlaps other work (e.g. sending emails); resolveCtx reuses it */
export function warm(ctx) { ctx.intelP = ctx.intelP || lookupIp(ctx.ip); }

/* ── await the lookup once, derive type + risk; idempotent ── */
export async function resolveCtx(ctx) {
  if (ctx.done) return ctx;
  ctx.intel = await (ctx.intelP || lookupIp(ctx.ip));
  ctx.type = classifyIp(ctx.intel);
  ctx.risk = analyze(ctx, ctx.intel, ctx.type);
  ctx.done = true;
  return ctx;
}
