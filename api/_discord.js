/**
 * Shared Discord webhook notifier
 * Uses process.env.DISCORD_WEBHOOK (Sensitive, set in Vercel)
 * All three notification types share this file so we send consistent embeds.
 */

/* Normalise legacy discordapp.com → discord.com (Node fetch fails the redirect) */
const WEBHOOK = (process.env.DISCORD_WEBHOOK || '').replace(/discordapp\.com/i, 'discord.com');

/* ISO country code → flag emoji */
function flag(cc = 'XX') {
  if (!cc || cc.length !== 2) return '🌍';
  const A = 0x1f1e6;
  return String.fromCodePoint(A + cc.charCodeAt(0) - 65) + String.fromCodePoint(A + cc.charCodeAt(1) - 65);
}

/* very-lightweight UA parser — no npm dep */
function parseUA(ua = '') {
  const s = String(ua);
  const browser =
    /Edg\//.test(s)       ? 'Edge'    :
    /OPR\//.test(s)       ? 'Opera'   :
    /Firefox\//.test(s)   ? 'Firefox' :
    /Chrome\//.test(s)    ? 'Chrome'  :
    /Safari\//.test(s)    ? 'Safari'  :
    /curl\//.test(s)      ? 'curl'    :
    'Unknown';
  const os =
    /Windows NT/.test(s)  ? 'Windows' :
    /Mac OS X/.test(s)    ? 'macOS'   :
    /Android/.test(s)     ? 'Android' :
    /iPhone|iPad|iOS/.test(s) ? 'iOS' :
    /Linux/.test(s)       ? 'Linux'   :
    'Unknown';
  const device =
    /Mobi|iPhone|Android(?!.*Tablet)/.test(s) ? 'Mobile' :
    /iPad|Tablet/.test(s) ? 'Tablet' :
    'Desktop';
  return { browser, os, device };
}

/* Post to Discord webhook — returns silently on failure */
async function post(payload) {
  if (!WEBHOOK) { console.warn('[DISCORD] no webhook configured'); return; }
  try {
    const res = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.warn('[DISCORD] webhook returned', res.status, await res.text().catch(()=>'(no body)'));
    else         console.log('[DISCORD] webhook OK');
  } catch (err) {
    console.warn('[DISCORD] webhook error:', err?.name, err?.message, err?.cause?.code || '');
  }
}

const trunc = (s, n) => {
  s = String(s || '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};

/* ────────────────────────────────────────────────
   NOTIFY: NEW VISITOR
──────────────────────────────────────────────── */
async function visit({ path = '/', referrer = '', country, city, ua = '', screen = '', ip = '' }) {
  const { browser, os, device } = parseUA(ua);
  const ref = !referrer || /chike\.ng/.test(referrer) ? 'direct' : new URL(referrer).hostname;
  const embed = {
    title: '👀 New visitor',
    color: 0x00ff88,
    fields: [
      { name: '📍 Page',     value: '`' + trunc(path, 60) + '`',                       inline: false },
      { name: '🌍 Location', value: `${flag(country)} ${city || country || 'Unknown'}`, inline: true },
      { name: '💻 Device',   value: `${device} · ${os}`,                                inline: true },
      { name: '🌐 Browser',  value: browser,                                            inline: true },
      { name: '↗️ Referrer', value: '`' + trunc(ref, 40) + '`',                        inline: true },
      { name: '📺 Screen',   value: screen || '—',                                      inline: true },
      { name: '🔐 IP',       value: '`' + trunc(ip, 40) + '`',                         inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'chike.ng · visit log' },
  };
  return post({ username: 'chike.ng', embeds: [embed] });
}

/* ────────────────────────────────────────────────
   NOTIFY: NEW CONTACT FORM SUBMISSION
──────────────────────────────────────────────── */
async function contact({ name, email, type, subject, message, ip, country, city }) {
  const embed = {
    title: '📬 New contact form submission',
    description: `**${trunc(name, 60)}** just sent you a message`,
    color: 0x00d4ff,
    fields: [
      { name: '👤 From',    value: `${trunc(name, 40)} \`<${trunc(email, 60)}>\``, inline: false },
      { name: '🏷️ Type',    value: '`' + trunc(type, 30) + '`',                    inline: true },
      { name: '🌍 Location', value: `${flag(country)} ${city || country || 'Unknown'}`, inline: true },
      { name: '📌 Subject', value: trunc(subject, 200),                            inline: false },
      { name: '💬 Message', value: '```\n' + trunc(message, 900) + '\n```',       inline: false },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: `chike.ng · IP ${ip}` },
  };
  const replyLink = `mailto:${email}?subject=${encodeURIComponent('Re: ' + subject)}`;
  return post({
    username: 'chike.ng',
    content:  `📥 New inquiry from **${name}** — [Reply](${replyLink})`,
    embeds:   [embed],
  });
}

/* ────────────────────────────────────────────────
   NOTIFY: SPAM BLOCKED
──────────────────────────────────────────────── */
async function spam({ layer, ip, country, city, meta = '' }) {
  const embed = {
    title: '🚫 Spam blocked',
    color: 0xf87171,
    fields: [
      { name: '🛡️ Layer',   value: '`' + layer + '`',                             inline: true },
      { name: '🌍 Location', value: `${flag(country)} ${city || country || '?'}`, inline: true },
      { name: '🔐 IP',       value: '`' + trunc(ip, 40) + '`',                    inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'chike.ng · spam log' },
  };
  if (meta) embed.fields.push({ name: 'ℹ️ Details', value: '`' + trunc(meta, 120) + '`', inline: false });
  return post({ username: 'chike.ng', embeds: [embed] });
}

module.exports = { notifyDiscord: { visit, contact, spam } };
