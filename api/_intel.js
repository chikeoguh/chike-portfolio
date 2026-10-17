/**
 * Visitor context + IP intelligence for the Discord reports.
 *
 * Source: ip-api.com free tier. It is the only free source found that still returns the
 * hosting / proxy / mobile flags (ipapi.is' free tier no longer does).
 * shortcut: free tier is HTTP-only, 45 req/min per egress IP and non-commercial; results are
 * cached 6h per IP. Upgrade to a keyed HTTPS provider if traffic grows or this turns commercial.
 */
const net = require('net');

const FIELDS = 'status,message,continent,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,reverse,mobile,proxy,hosting,query';
const TTL = 6 * 3600 * 1000;
const cache = new Map();

/* ── ip-api lookup: cached, 2.2s timeout, never throws ── */
async function lookupIp(ip) {
  if (!net.isIP(ip)) return { fail: 'no valid IP' };
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
function classifyIp(i) {
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
function offMin(tz) {
  try {
    const v = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' })
      .formatToParts(new Date()).find(p => p.type === 'timeZoneName').value;
    const m = v.match(/GMT([+-])(\d{2}):?(\d{2})?/);
    return m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + (+m[3] || 0)) : 0;
  } catch (e) { return null; }
}

/* ── transparent risk score: every point has a stated reason ── */
function analyze(ctx, intel, type) {
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
function sanitizeClient(c) {
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

/* ── synchronous: gather everything from the request; kicks off the lookup ── */
function buildCtx(req, client) {
  const h = req.headers || {};
  const dec = v => { try { return decodeURIComponent(v || ''); } catch (e) { return v || ''; } };
  const q = v => String(v || '').replace(/^"|"$/g, '');
  const raw = (h['x-forwarded-for'] || '').split(',')[0].trim() || h['x-real-ip'] || '';
  const ip = net.isIP(raw) ? raw : 'unknown';
  return {
    ip,
    ua: h['user-agent'] || '',
    lang: (h['accept-language'] || '').split(',').slice(0, 3).map(x => x.split(';')[0].trim()).filter(Boolean).join(', '),
    geo: {
      country: h['x-vercel-ip-country'] || '', region: dec(h['x-vercel-ip-country-region']), city: dec(h['x-vercel-ip-city']),
      tz: h['x-vercel-ip-timezone'] || '', lat: h['x-vercel-ip-latitude'] || '', lon: h['x-vercel-ip-longitude'] || '', zip: dec(h['x-vercel-ip-postal-code']),
    },
    ch: { platform: q(h['sec-ch-ua-platform']), mobile: h['sec-ch-ua-mobile'] === '?1' },
    privacy: h.dnt === '1' || h['sec-gpc'] === '1',
    edge: (h['x-vercel-id'] || '').split('::')[0],
    client: sanitizeClient(client),
  };
}

/* start the lookup early so it overlaps other work (e.g. sending emails); resolveCtx reuses it */
function warm(ctx) { ctx.intelP = ctx.intelP || lookupIp(ctx.ip); }

/* ── await the lookup once, derive type + risk; idempotent ── */
async function resolveCtx(ctx) {
  if (ctx.done) return ctx;
  ctx.intel = await (ctx.intelP || lookupIp(ctx.ip));
  ctx.type = classifyIp(ctx.intel);
  ctx.risk = analyze(ctx, ctx.intel, ctx.type);
  ctx.done = true;
  return ctx;
}

module.exports = { buildCtx, resolveCtx, warm, classifyIp, analyze, lookupIp, offMin, sanitizeClient };
