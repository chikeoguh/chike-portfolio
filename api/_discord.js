/**
 * Shared Discord webhook notifier — visit / contact / spam embeds.
 * Every embed carries the resolved visitor context from _intel.js
 * (IP type, network, risk, location, timezone check, device, source).
 */
const { resolveCtx } = require('./_intel');

/* Normalise legacy discordapp.com → discord.com (Node fetch fails the redirect) */
const WEBHOOK = (process.env.DISCORD_WEBHOOK || '').replace(/discordapp\.com/i, 'discord.com');
const COLOR = { Low: 0x00ff88, Medium: 0xfbbf24, High: 0xf87171 };

/* ISO country code → flag emoji */
function flag(cc) {
  if (!cc || cc.length !== 2) return '🌍';
  const A = 0x1f1e6; cc = cc.toUpperCase();
  return String.fromCodePoint(A + cc.charCodeAt(0) - 65) + String.fromCodePoint(A + cc.charCodeAt(1) - 65);
}

/* Visitor-controlled text → plain text safe for Discord markdown (no links, formatting or mentions) */
const esc = s => String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').replace(/([\\*_~`|>\[\]()@])/g, '\\$1');
const code = s => '`' + String(s == null ? '' : s).replace(/[\r\n`]+/g, ' ') + '`';
const trunc = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const dot = (...p) => p.filter(Boolean).join(' · ');

/* lightweight UA parser — no npm dep. Order matters: iPhone UAs contain "like Mac OS X". */
function parseUA(ua = '', ch = {}) {
  const s = String(ua), v = re => (s.match(re) || [])[1];
  const [browser, ver] =
    /Edg\//.test(s)     ? ['Edge', v(/Edg\/(\d+)/)] :
    /OPR\//.test(s)     ? ['Opera', v(/OPR\/(\d+)/)] :
    /Firefox\//.test(s) ? ['Firefox', v(/Firefox\/(\d+)/)] :
    /CriOS\//.test(s)   ? ['Chrome (iOS)', v(/CriOS\/(\d+)/)] :
    /Chrome\//.test(s)  ? ['Chrome', v(/Chrome\/(\d+)/)] :
    /Safari\//.test(s)  ? ['Safari', v(/Version\/(\d+)/)] :
    /curl\//.test(s)    ? ['curl', v(/curl\/([\d.]+)/)] : ['Unknown', ''];
  const os = ch.platform ||
    (/iPhone|iPad|iPod/.test(s) ? 'iOS' : /Android/.test(s) ? 'Android' : /Windows NT/.test(s) ? 'Windows' :
     /Mac OS X/.test(s) ? 'macOS' : /CrOS/.test(s) ? 'ChromeOS' : /Linux/.test(s) ? 'Linux' : 'Unknown');
  const device = ch.mobile || /Mobi|iPhone|Android(?!.*Tablet)/.test(s) ? 'Mobile' : /iPad|Tablet/.test(s) ? 'Tablet' : 'Desktop';
  return { browser, ver: ver || '', os, device };
}

/* ── referrer intelligence ─────────────────────────────────────────
   Hostname → { name, type }. First match wins, so specific hosts (Gmail,
   Gemini) come before their parent domains (google.*). */
const OWN = /(^|\.)(buk\.ng|fixntread\.(online|com)|myafromania\.com|chike\.ng)$/;
const REF = [
  [/^mail\.google\.com$/, 'Gmail', 'email'], [/^outlook\.(live|office|office365)\.com$/, 'Outlook', 'email'], [/^mail\.yahoo\.com$/, 'Yahoo Mail', 'email'],
  [/^gemini\.google\.com$/, 'Gemini', 'ai'], [/^(chatgpt\.com|chat\.openai\.com)$/, 'ChatGPT', 'ai'], [/^claude\.ai$/, 'Claude', 'ai'],
  [/(^|\.)perplexity\.ai$/, 'Perplexity', 'ai'], [/^copilot\.microsoft\.com$/, 'Copilot', 'ai'], [/(^|\.)you\.com$/, 'You.com', 'ai'],
  [/^news\.google\./, 'Google News', 'search'],
  [/(^|\.)google\.[a-z.]+$/, 'Google', 'search'], [/(^|\.)bing\.com$/, 'Bing', 'search'], [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo', 'search'],
  [/(^|\.)yahoo\.com$/, 'Yahoo', 'search'], [/(^|\.)ecosia\.org$/, 'Ecosia', 'search'], [/^search\.brave\.com$/, 'Brave Search', 'search'],
  [/(^|\.)yandex\.[a-z.]+$/, 'Yandex', 'search'], [/(^|\.)baidu\.com$/, 'Baidu', 'search'], [/(^|\.)startpage\.com$/, 'Startpage', 'search'],
  [/(^|\.)qwant\.com$/, 'Qwant', 'search'], [/(^|\.)kagi\.com$/, 'Kagi', 'search'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'LinkedIn', 'social'], [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, 'Facebook', 'social'],
  [/(^|\.)instagram\.com$/, 'Instagram', 'social'], [/(^|\.)(x\.com|twitter\.com|t\.co)$/, 'X / Twitter', 'social'],
  [/(^|\.)reddit\.com$/, 'Reddit', 'social'], [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube', 'social'], [/(^|\.)tiktok\.com$/, 'TikTok', 'social'],
  [/(^|\.)pinterest\.[a-z.]+$/, 'Pinterest', 'social'], [/(^|\.)threads\.net$/, 'Threads', 'social'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'WhatsApp', 'messaging'], [/(^|\.)(t\.me|telegram\.org)$/, 'Telegram', 'messaging'],
  [/(^|\.)(discord\.com|discordapp\.com)$/, 'Discord', 'messaging'], [/(^|\.)slack\.com$/, 'Slack', 'messaging'],
  [/(^|\.)github\.com$/, 'GitHub', 'dev'], [/(^|\.)stackoverflow\.com$/, 'Stack Overflow', 'dev'], [/^news\.ycombinator\.com$/, 'Hacker News', 'dev'],
  [/(^|\.)medium\.com$/, 'Medium', 'dev'], [/(^|\.)dev\.to$/, 'DEV', 'dev'], [/(^|\.)producthunt\.com$/, 'Product Hunt', 'dev'],
];
/* Android in-app referrers arrive as android-app://<package> */
const APP = {
  'com.linkedin.android': ['LinkedIn app', 'social'], 'com.whatsapp': ['WhatsApp app', 'messaging'], 'com.google.android.gm': ['Gmail app', 'email'],
  'com.twitter.android': ['X app', 'social'], 'com.facebook.katana': ['Facebook app', 'social'], 'com.instagram.android': ['Instagram app', 'social'],
  'com.google.android.googlequicksearchbox': ['Google app', 'search'], 'org.telegram.messenger': ['Telegram app', 'messaging'],
};
const ICON = { search: '🔎', social: '👥', messaging: '💬', email: '✉️', ai: '🤖', dev: '🧑‍💻', own: '🏠', direct: '➡️', campaign: '📣', other: '🔗' };

function describeRef(referrer, utm) {
  let name = 'Direct / unknown', type = 'direct', host = '', query = '';
  try {
    const u = new URL(referrer);
    if (u.protocol === 'android-app:') {
      host = u.hostname; [name, type] = APP[host] || [host, 'other'];
    } else {
      host = u.hostname.replace(/^www\./, '');
      const m = REF.find(r => r[0].test(host));
      if (OWN.test(host)) { name = host; type = 'own'; }
      else if (m) { name = m[1]; type = m[2]; }
      else { name = host; type = 'other'; }
      if (type === 'search') query = u.searchParams.get('q') || u.searchParams.get('query') || u.searchParams.get('p') || ''; // most engines now withhold it
    }
  } catch (e) { /* empty or malformed referrer → direct */ }
  if (type === 'direct' && utm) { type = 'campaign'; name = (utm.match(/source=(\S+)/) || [])[1] || 'Tagged link'; } // no referrer but a tagged link (newsletter, QR, ad)
  return { name, type, host, query: trunc(query, 80), icon: ICON[type] || ICON.other };
}
const NOTE = { direct: 'typed URL, bookmark, or an app/privacy setting that hides the referrer', campaign: 'tagged link, no referrer' };

/* Post to Discord webhook — never throws; mentions disabled so visitor text can't ping anyone */
async function post(payload) {
  if (!WEBHOOK) { console.warn('[DISCORD] no webhook configured'); return; }
  try {
    const res = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowed_mentions: { parse: [] }, ...payload }),
    });
    if (!res.ok) console.warn('[DISCORD] webhook returned', res.status, await res.text().catch(() => '(no body)'));
    else console.log('[DISCORD] webhook OK');
  } catch (err) {
    console.warn('[DISCORD] webhook error:', err?.name, err?.message, err?.cause?.code || '');
  }
}

/* ── shared field builders (each returns a Discord embed field, or null to skip) ── */
const F = (name, value, inline = false) => (value ? { name, value: trunc(value, 1000), inline } : null);

function fType(c) {
  const i = c.intel || {};
  if (i.fail) return F('🛰️ IP type', `**${esc(c.type.label)}**`, true);
  const yn = b => (b ? 'yes' : 'no');
  return F('🛰️ IP type', `**${esc(c.type.label)}**\nHosting: ${yn(i.hosting)} · VPN/proxy: ${yn(i.proxy)} · Mobile: ${yn(i.mobile)}`, true);
}
function fRisk(c) {
  const r = c.risk;
  return F('🎯 Risk', `**${r.level}** (score ${r.score})${r.reasons.length ? ' — ' + esc(r.reasons.join(', ')) : ' — no flags'}${c.privacy ? '\nSent DNT/GPC privacy signal' : ''}`, true);
}
function fNetwork(c) {
  const i = c.intel || {};
  if (i.fail) return null;
  const asn = (i.as || '').split(' ')[0];
  return F('🌐 Network', `**${esc(i.isp || i.org)}**${asn ? ' · ' + code(asn) : ''}${i.asname ? ' (' + esc(i.asname) + ')' : ''}${i.reverse ? '\nrDNS ' + code(trunc(i.reverse, 70)) : ''}`);
}
function fLocation(c) {
  const g = c.geo, i = c.intel || {};
  const cc = g.country || i.countryCode || '', city = g.city || i.city || '';
  const where = dot(esc(city), esc(g.region || i.regionName), esc(i.country || cc));
  if (!where) return null;
  const alt = i.city && g.city && i.city !== g.city ? `\nip-api: ${esc(i.city)}, ${esc(i.regionName)}` : '';
  const map = g.lat && g.lon ? ` · [approx. map](https://www.google.com/maps?q=${encodeURIComponent(g.lat)},${encodeURIComponent(g.lon)})` : '';
  return F('📍 Location', `${flag(cc)} ${where}${g.zip ? ' ' + esc(g.zip) : ''}${alt}${map}`);
}
function fTz(c) {
  const t = c.risk.tz;
  if (!t) return null;
  return F('🕒 Timezone', t.ok ? `${code(t.client)} · matches IP` : `⚠ client ${code(t.client)} vs IP ${code(t.ip)}`, true);
}
function fDevice(c) {
  const u = parseUA(c.ua, c.ch), k = c.client;
  const l1 = dot(u.device, u.os, `${u.browser}${u.ver ? ' ' + u.ver : ''}`);
  const l2 = dot(k.scr && `screen ${esc(k.scr)}${k.dpr ? ' @' + k.dpr + 'x' : ''}`, k.vp && `viewport ${esc(k.vp)}`);
  const l3 = dot(k.cores && `${k.cores} cores`, k.mem && `${k.mem} GB`, k.net && esc(k.net), k.touch && `touch ${k.touch}`);
  const l4 = dot(k.scheme && `${esc(k.scheme)} mode`, k.rm && 'reduced motion', k.wd && 'webdriver', c.lang && `lang ${esc(c.lang)}`);
  return F('💻 Device', [l1, l2, l3, l4].filter(Boolean).join('\n'));
}
function fLinks(c) {
  return c.ip === 'unknown' ? null : F('🔗 Lookup', `[ipinfo](https://ipinfo.io/${c.ip}) · [AbuseIPDB](https://www.abuseipdb.com/check/${c.ip})`);
}
function fSource(c, path, referrer) {
  const k = c.client, s = describeRef(referrer, k.utm);
  const lines = [`${s.icon} **${esc(s.name)}** · ${s.type}`];
  if (s.host && s.host !== s.name) lines.push(`↳ ${code(trunc(s.host, 50))}`);
  if (s.query) lines.push(`searched ${code(s.query)}`);
  else if (NOTE[s.type] && !k.utm) lines.push(`(${NOTE[s.type]})`);
  if (k.utm) lines.push(`campaign ${esc(k.utm)}`);
  if (k.visits > 1 && k.ref0 && k.ref0 !== '-') { // first-touch: where this visitor originally came from
    const f = describeRef(k.ref0.includes('://') ? k.ref0 : 'https://' + k.ref0, '');
    if (f.type !== 'direct' && f.name !== s.name) lines.push(`first touch: **${esc(f.name)}**`);
  }
  lines.push(`page ${code(trunc(path, 60))}`);
  return F('↗️ Source', lines.join('\n'));
}
const fIp = c => F('🔐 IP', code(c.ip), true);
const footer = (c, what) => ({ text: `chike.ng · ${what}${c.edge ? ' · edge ' + c.edge : ''}` });

/* ────────────────────────────────────────────────
   NOTIFY: NEW VISITOR
──────────────────────────────────────────────── */
async function visit(ctx, { path = '/', referrer = '' } = {}) {
  const c = await resolveCtx(ctx), k = c.client;
  const visitor = k.visits > 1 ? `returning · visit #${k.visits}${k.since ? ' · since ' + esc(k.since) : ''}` : 'new visitor';
  const cc = c.geo.country || (c.intel && c.intel.countryCode);
  const loc = dot(esc(c.geo.city || (c.intel && c.intel.city)), esc(cc));
  const embed = {
    title: '👀 New visitor',
    description: `${flag(cc)} ${loc} · **${esc(c.type.label)}**`,
    color: COLOR[c.risk.level],
    fields: [
      fType(c), fRisk(c), fIp(c), fSource(c, path, referrer), fNetwork(c), fLocation(c), fTz(c), fDevice(c),
      F('🧑 Visitor', dot(visitor, k.load && `loaded in ${k.load} ms`), true),
      fLinks(c),
    ].filter(Boolean),
    timestamp: new Date().toISOString(),
    footer: footer(c, 'visit log'),
  };
  return post({ username: 'chike.ng', embeds: [embed] });
}

/* ────────────────────────────────────────────────
   NOTIFY: NEW CONTACT FORM SUBMISSION
──────────────────────────────────────────────── */
async function contact(ctx, { name, email, type, subject, message }) {
  const c = await resolveCtx(ctx);
  const embed = {
    title: '📬 New contact form submission',
    description: `**${esc(trunc(name, 60))}** just sent you a message`,
    color: 0x00d4ff,
    fields: [
      F('👤 From', `${esc(trunc(name, 40))} ${code('<' + trunc(email, 60) + '>')}`),
      F('🏷️ Type', code(trunc(type, 30)), true),
      fType(c), fRisk(c),
      F('📌 Subject', esc(trunc(subject, 200))),
      F('💬 Message', '```\n' + trunc(String(message).replace(/```/g, "'''"), 900) + '\n```'),
      fSource(c, c.client.path || '/', c.client.ref), fNetwork(c), fLocation(c), fTz(c), fDevice(c), fIp(c), fLinks(c),
    ].filter(Boolean),
    timestamp: new Date().toISOString(),
    footer: footer(c, 'contact form'),
  };
  const replyLink = `mailto:${encodeURIComponent(email).replace(/[()]/g, escape)}?subject=${encodeURIComponent('Re: ' + subject)}`;
  return post({
    username: 'chike.ng',
    content: `📥 New inquiry from **${esc(trunc(name, 60))}** — [Reply](${replyLink})`,
    embeds: [embed],
  });
}

/* ────────────────────────────────────────────────
   NOTIFY: SPAM BLOCKED
──────────────────────────────────────────────── */
async function spam(ctx, { layer, meta = '' }) {
  const c = await resolveCtx(ctx);
  const embed = {
    title: '🚫 Spam blocked',
    description: `Stopped by **${esc(layer)}**${meta ? ' · ' + esc(trunc(meta, 120)) : ''}`,
    color: 0xf87171,
    fields: [fType(c), fRisk(c), fIp(c), fNetwork(c), fLocation(c), fTz(c), fDevice(c), fLinks(c)].filter(Boolean),
    timestamp: new Date().toISOString(),
    footer: footer(c, 'spam log'),
  };
  return post({ username: 'chike.ng', embeds: [embed] });
}

module.exports = { notifyDiscord: { visit, contact, spam }, parseUA, describeRef, esc };
