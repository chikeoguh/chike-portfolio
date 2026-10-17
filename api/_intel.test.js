/* Self-check for the visitor-intelligence + Discord helpers.  Run: node --test api/_intel.test.js  (no network: fetch is stubbed) */
const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyIp, analyze, lookupIp, offMin, sanitizeClient, buildCtx } = require('./_intel');
const { describeRef, esc, parseUA } = require('./_discord');

/* synthetic ip-api-shaped answers (shapes match what was observed live) */
const R = { status: 'success', isp: 'Some ISP', as: 'AS1 Some ISP', asname: 'SOME-RESIDENCIAL', reverse: 'host.dsl.example.net', mobile: false, proxy: false, hosting: false, timezone: 'Europe/Lisbon' };

test('classifyIp: residential, datacenter, VPN, Tor, mobile, private, failures', () => {
  assert.equal(classifyIp(R).kind, 'residential');
  assert.equal(classifyIp({ ...R, hosting: true }).kind, 'datacenter');
  assert.equal(classifyIp({ ...R, hosting: true, proxy: true }).kind, 'dc-vpn');
  assert.equal(classifyIp({ ...R, proxy: true }).kind, 'vpn');
  assert.equal(classifyIp({ ...R, mobile: true }).kind, 'mobile');
  assert.equal(classifyIp({ ...R, hosting: true, proxy: true, reverse: 'berlin01.tor-exit.example.org' }).kind, 'tor'); // Tor wins over generic hosting+proxy
  assert.equal(classifyIp({ fail: 'private range' }).kind, 'private');
  assert.equal(classifyIp({ fail: 'timeout' }).kind, 'unknown');
  assert.equal(classifyIp(null).kind, 'unknown');
});

test('analyze: risk levels are explained and tz mismatch is offset-aware', () => {
  const base = { ua: 'Mozilla/5.0 Chrome/141', lang: 'pt-PT', geo: { tz: '' }, client: { tz: 'Europe/Lisbon', wd: false } };
  const low = analyze(base, R, classifyIp(R));
  assert.equal(low.level, 'Low'); assert.equal(low.score, 0); assert.equal(low.tz.ok, true);
  assert.equal(analyze({ ...base, client: { tz: 'Europe/London' } }, R, classifyIp(R)).tz.ok, true); // different name, same offset → not a mismatch
  const dc = analyze(base, { ...R, hosting: true }, classifyIp({ ...R, hosting: true }));
  assert.equal(dc.level, 'Medium'); assert.deepEqual(dc.reasons, ['Datacenter IP']);
  const bot = analyze({ ...base, ua: 'HeadlessChrome', client: { tz: 'Asia/Tokyo', wd: true } }, { ...R, hosting: true }, classifyIp({ ...R, hosting: true }));
  assert.equal(bot.level, 'High'); assert.ok(bot.reasons.includes('Timezone ≠ IP') && bot.reasons.includes('Automated browser'));
  assert.equal(analyze({ ...base, lang: '' }, R, classifyIp(R)).reasons[0], 'No Accept-Language');
});

test('offMin handles zones and junk', () => {
  assert.equal(typeof offMin('Europe/Lisbon'), 'number');
  assert.equal(offMin('Not/AZone'), null);
});

test('describeRef: names, types, in-app referrers, queries, campaigns, own sites', () => {
  assert.deepEqual(['LinkedIn', 'social'], [describeRef('https://www.linkedin.com/feed/', '').name, describeRef('https://lnkd.in/x', '').type]);
  assert.equal(describeRef('https://www.google.pt/', '').name, 'Google');
  assert.equal(describeRef('https://gemini.google.com/app', '').type, 'ai');            // specific host beats google.*
  assert.equal(describeRef('https://mail.google.com/', '').name, 'Gmail');
  assert.equal(describeRef('https://l.facebook.com/l.php', '').name, 'Facebook');
  assert.equal(describeRef('android-app://com.linkedin.android', '').name, 'LinkedIn app');
  assert.equal(describeRef('https://duckduckgo.com/?q=chike+oguh+support', '').query, 'chike oguh support');
  assert.equal(describeRef('https://buk.ng/about', '').type, 'own');
  assert.equal(describeRef('https://some-blog.example/post', '').type, 'other');
  assert.equal(describeRef('', '').type, 'direct');
  assert.equal(describeRef('', 'source=newsletter medium=email').type, 'campaign');       // tagged link, no referrer
  assert.equal(describeRef('', 'source=newsletter medium=email').name, 'newsletter');     // named by its utm source, not "Direct"
  assert.equal(describeRef('', 'medium=qr').name, 'Tagged link');
  assert.equal(describeRef('not a url at all', '').type, 'direct');
});

test('esc neutralises mentions, links and formatting from visitor text', () => {
  const out = esc('@everyone [click](http://evil) `x` **b**\nnew');
  assert.ok(!/(^|[^\\])@everyone/.test(out) && !/(^|[^\\])\[/.test(out) && !out.includes('\n'));
});

test('parseUA: iPhone is iOS (not macOS), versions parsed', () => {
  assert.equal(parseUA('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Version/18.0 Mobile Safari/604.1').os, 'iOS');
  assert.equal(parseUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/141.0 Safari/537.36').ver, '141');
});

test('sanitizeClient bounds untrusted input', () => {
  const c = sanitizeClient({ tz: 'x'.repeat(500), cores: 'abc', dpr: '2', wd: 1, extra: 'ignored', visits: null });
  assert.equal(c.tz.length, 40); assert.equal(c.cores, null); assert.equal(c.dpr, 2); assert.equal(c.wd, true); assert.equal(c.visits, null);
  assert.ok(!('extra' in c)); assert.deepEqual(sanitizeClient('junk').tz, '');
});

test('buildCtx: rejects spoofed IPs, decodes geo headers, no lookup until needed', () => {
  const h = { 'x-forwarded-for': 'not-an-ip, 1.2.3.4', 'x-vercel-ip-city': 'S%C3%A3o%20Paulo', 'accept-language': 'pt-PT,pt;q=0.9,en;q=0.8,fr;q=0.7', 'sec-ch-ua-platform': '"macOS"', 'sec-gpc': '1', 'x-vercel-id': 'cdg1::iad1::abc' };
  const c = buildCtx({ headers: h }, {});
  assert.equal(c.ip, 'unknown'); assert.equal(c.geo.city, 'São Paulo'); assert.equal(c.lang, 'pt-PT, pt, en');
  assert.equal(c.ch.platform, 'macOS'); assert.equal(c.privacy, true); assert.equal(c.edge, 'cdg1'); assert.equal(c.intelP, undefined);
  assert.equal(buildCtx({ headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' } }, {}).ip, '203.0.113.9');
});

test('lookupIp: caches answers, never caches transient failures, survives timeouts', async () => {
  const real = global.fetch; let calls = 0;
  try {
    global.fetch = async () => { calls++; return { ok: true, json: async () => ({ ...R }) }; };
    await lookupIp('198.51.100.7'); await lookupIp('198.51.100.7');
    assert.equal(calls, 1, 'second lookup should be served from cache');
    global.fetch = async () => { calls++; return { ok: true, json: async () => ({ status: 'fail', message: 'over quota' }) }; };
    calls = 0; const f = await lookupIp('198.51.100.8'); await lookupIp('198.51.100.8');
    assert.equal(f.fail, 'over quota'); assert.equal(calls, 2, 'failures must be retried, not cached');
    global.fetch = async (u, { signal }) => new Promise((_, rej) => signal.addEventListener('abort', () => rej(Object.assign(new Error('x'), { name: 'AbortError' }))));
    assert.equal((await lookupIp('198.51.100.9')).fail, 'timeout');
    assert.equal((await lookupIp('garbage')).fail, 'no valid IP');
  } finally { global.fetch = real; }
});
