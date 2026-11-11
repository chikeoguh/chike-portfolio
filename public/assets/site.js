/*
  chike.ng page script: what the kit (system.js, motion.js, layout.js) does not do.
  - language: EN/PT for every [data-i18n] element, kept per visitor
  - booking: the Cal.com popup, loaded on first use or when the page is idle
  - dialogs: the message form (POST /api/contact), the command palette (⌘K) and the terminal (`)
  - live bits: the status line (/status.json), the Lisbon clock, the work cards (/work.json)
  - the hero's 3D stage (hero3d.js, poster first) and its pause button
  - the phone's status bar in the apps section, sound effects, and the casual source deterrent
*/
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const html = document.documentElement;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const EMAIL = 'hello@chike.ng';
const CAL_LINK = 'chike-oguh-4bnilm/15min';

/* ---------------------------------------------------------------- language */
const PT = {
  'skip': 'Saltar para o conteúdo',
  'nav.work': 'Trabalho', 'nav.services': 'Serviços', 'nav.apps': 'Apps', 'nav.stack': 'Ferramentas', 'nav.about': 'Sobre',
  'menu.buk': 'Marcações e sinais para salões na Nigéria', 'menu.fnt': 'Mercado de alfaiates verificados no Canadá', 'menu.mya': 'Loja de moda africana em WordPress',
  'cta.book': 'Marcar chamada', 'cta.send': 'Enviar mensagem',
  'hero.h1': 'Programador e engenheiro de suporte',
  'hero.lead': 'Crio e mantenho sites, aplicações web e os sistemas por trás deles: alojamento, DNS, redes e apoio técnico. Mais de 6 anos em TI empresarial, em Portugal.',
  'spot.sites.t': 'Sites que alojo e mantenho',
  'spot.sites.d': 'buk.ng, fixntread.online e myafromania.com: alojamento, DNS, email e correções.',
  'spot.app.d': 'App de marcações para salões na Nigéria, na App Store e no Google Play.',
  'work.h2': 'Sites e apps que mantenho.', 'work.sub': 'Construo, alojo e dou suporte a cada um.',
  'about.h2': 'Sobre o Chike Oguh',
  'about.text': 'Comecei no apoio técnico, a resolver o que avariava. Hoje também construo o software: <strong>sites, aplicações web e os sistemas por trás deles</strong>, documentados para que a próxima pessoa os saiba resolver.',
  'fact.years.t': 'Suporte de TI empresarial', 'fact.years.d': 'Mais de 6 anos',
  'fact.countries.t': 'Trabalhei em', 'fact.countries.d': 'Portugal, Austrália, Canadá, Nigéria',
  'fact.lang.t': 'Idiomas', 'fact.lang.d': 'Inglês e português',
  'fact.cert.t': 'Credenciais', 'fact.cert.d': 'CCNA, mestrado em Engenharia Informática',
  'services.h2': 'O que faço por equipas.', 'services.sub': 'Código, servidores e as pessoas que os usam.',
  'svc.build.t': 'Cria sites e aplicações web',
  'svc.build.d': 'Fluxos de marcação, pagamentos e painéis em JavaScript, e sites WordPress que carregam depressa.',
  'svc.host.t': 'Gere alojamento, DNS e email',
  'svc.host.d': 'Cloudflare, VPS e alojamento partilhado: domínios, SSL e registos de email que não falham.',
  'svc.support.t': 'Apoia pessoas e o Microsoft 365',
  'svc.support.d': 'Active Directory, Intune e Autopilot: contas, políticas e portáteis prontos no primeiro dia.',
  'apps.h2': 'Apps móveis em que trabalho.', 'apps.sub': 'Ecrãs reais e conceitos.',
  'buk.r1': 'Marcações e sinais do dia num relance', 'buk.r2': 'Transferências em naira confirmadas em dois toques',
  'buk.r3': 'Calendário diário e semanal por funcionário', 'buk.r4': 'Lembretes e respostas no WhatsApp',
  'buk.get': 'Obter a app Buk Business', 'buk.site': 'Visitar buk.ng',
  'fnt.r1': 'Alfaiates verificados por cidade e especialidade', 'fnt.r2': 'Descrever, receber proposta, rever o orçamento',
  'fnt.r3': 'Inglês e francês, app em breve', 'fnt.site': 'Visitar fixntread.online',
  'scr.bookings': 'Marcações', 'scr.calendar': 'Calendário', 'scr.revenue': 'Receita', 'scr.payments': 'Pagamentos',
  'scr.invoices': 'Faturas', 'scr.growth': 'Crescimento', 'scr.reviews': 'Avaliações', 'scr.android': 'Android',
  'scr.find': 'Encontrar alfaiate', 'scr.quote': 'Pedir orçamento',
  'stack.h2': 'Ferramentas que uso todas as semanas.', 'stack.sub': 'Para construir, alojar e dar suporte.',
  'stack.build': 'Construir', 'stack.host': 'Alojar e manter', 'stack.support': 'Suporte',
  'cred.h2': 'Formação e certificações.', 'cred.sub': 'Dois cursos de informática, depois redes e suporte.',
  'cred.google': 'Certificado profissional',
  'cred.degrees': 'Graus académicos', 'cred.msc': 'Mestrado em Engenharia Informática', 'cred.bsc': 'Licenciatura em Ciências da Computação',
  'cred.certs': 'Certificações', 'cred.nsa': 'Administração de Redes e Sistemas', 'cred.cyber': 'Formação em cibersegurança', 'cred.progress': 'Em curso',
  'close.h2': 'Marque uma chamada de 15 minutos', 'close.line': 'Ou envie uma mensagem: respondo em 24 horas.',
  'footer.lede': 'Programador e engenheiro de suporte em Portugal.', 'footer.site': 'Site', 'footer.creds': 'Credenciais',
  'footer.contact': 'Contacto', 'footer.more': 'Mais', 'footer.term': 'Abrir o terminal', 'footer.search': 'Pesquisar no site',
  'footer.sound': 'Efeitos sonoros', 'footer.built': 'Feito com linhas de código pelo Chike.',
  'footer.tm': 'Os nomes e logótipos de produtos pertencem aos seus donos.',
  'cf.intro': 'Diga-me do que precisa. Respondo em 24 horas.', 'cf.job': 'Oportunidade de emprego', 'cf.freelance': 'Projeto freelance',
  'cf.collab': 'Colaboração técnica', 'cf.general': 'Pergunta geral', 'cf.hint': 'Vai para hello@chike.ng',
  'cf.sent': 'Mensagem enviada', 'cf.ack': 'uma cópia vai a caminho de', 'cf.eta': 'resposta em 24 horas',
};
const UI = {
  en: { clock: t => `${t} in Lisbon`, lang: ['PT', 'Mudar para português'], pause: 'Pause the animation', play: 'Play the animation',
        sending: 'Sending…', required: 'Fill in every field.', email: 'Check the email address.', failed: 'Could not send. Try again, or email hello@chike.ng.',
        copied: 'Copied hello@chike.ng', close: 'Close' },
  pt: { clock: t => `${t} em Lisboa`, lang: ['EN', 'Switch to English'], pause: 'Pausar a animação', play: 'Reproduzir a animação',
        sending: 'A enviar…', required: 'Preencha todos os campos.', email: 'Verifique o endereço de email.', failed: 'Não foi possível enviar. Tente de novo ou escreva para hello@chike.ng.',
        copied: 'Copiado hello@chike.ng', close: 'Fechar' },
};
let lang = 'en';
const ui = () => UI[lang];

function translate(root = document) {
  for (const el of $$('[data-i18n]', root)) {
    if (!('en' in el.dataset)) el.dataset.en = el.hasAttribute('data-i18n-html') ? el.innerHTML : el.textContent;
    const text = lang === 'pt' ? PT[el.dataset.i18n] ?? el.dataset.en : el.dataset.en;
    if (el.hasAttribute('data-i18n-html')) el.innerHTML = text; else el.textContent = text;
  }
  for (const el of $$('.dlg__close', root)) el.setAttribute('aria-label', ui().close);
}

// the statement's moment splits its words into spans: unmount it, swap the words, mount it again
async function remountStatement() {
  const sec = $('[data-moment="word-highlight"]');
  if (!sec?.__moment) return;
  const m = await import('/assets/moments/moments.js');
  try { sec.__moment.destroy?.(); } catch { /* gone */ }
  delete sec.__moment; delete sec.__momentP; sec.removeAttribute('data-moment-mounted');
  const p = $('.mo-wh__text', sec);
  p.removeAttribute('aria-label');
  p.innerHTML = lang === 'pt' ? PT['about.text'] : p.dataset.en;
  m.mount(sec);
}

function setLang(next, { save = true } = {}) {
  lang = next === 'pt' ? 'pt' : 'en';
  html.lang = lang === 'pt' ? 'pt-PT' : 'en';
  translate();
  const [label, aria] = ui().lang;
  for (const b of $$('[data-lang-toggle]')) { b.textContent = label; b.setAttribute('aria-label', aria); b.lang = lang === 'pt' ? 'en' : 'pt'; }
  if (save) store.set('lang', lang);
  remountStatement();
  renderWork();
  tickClock();
  document.dispatchEvent(new CustomEvent('langchange'));
}

function initLang() {
  const q = new URLSearchParams(location.search).get('lang');
  const saved = store.get('lang');
  const guess = (navigator.language || '').toLowerCase().startsWith('pt') ? 'pt' : 'en';
  const pick = q === 'pt' || q === 'en' ? q : saved || guess;
  $$('[data-lang-toggle]').forEach(b => b.addEventListener('click', () => { setLang(lang === 'pt' ? 'en' : 'pt'); snd.beep(); }));
  if (pick === 'pt') setLang('pt', { save: !!saved || q === 'pt' });
}

/* ---------------------------------------------------------------- booking (Cal.com) */
let calP = null;
function loadCal() {
  if (calP) return calP;
  calP = new Promise((resolve, reject) => {
    (function (C, A, L) { const p = (a, ar) => a.q.push(ar); const d = C.document; C.Cal = C.Cal || function () { const cal = C.Cal; const ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; const s = d.head.appendChild(d.createElement('script')); s.src = A; s.onload = resolve; s.onerror = reject; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const ns = ar[1]; api.q = api.q || []; if (typeof ns === 'string') { cal.ns[ns] = cal.ns[ns] || api; p(cal.ns[ns], ar); p(cal, ['initNamespace', ns]); } else p(cal, ar); return; } p(cal, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
    window.Cal('init', '15min', { origin: 'https://app.cal.com' });
    window.Cal.ns['15min']('ui', {
      theme: 'dark', layout: 'month_view', hideEventTypeDetails: false,
      cssVarsPerTheme: { dark: { 'cal-brand': '#c9a45a', 'cal-text': '#ffffff', 'cal-bg': '#0c0a08', 'cal-bg-emphasis': '#181512', 'cal-border': 'rgba(255,255,255,0.12)', 'cal-border-subtle': 'rgba(255,255,255,0.07)' } },
    });
  });
  return calP;
}
function book(e) {
  e?.preventDefault();
  snd.chime();
  loadCal().catch(() => window.open(`https://cal.com/${CAL_LINK}`, '_blank', 'noopener'));
  window.Cal?.ns?.['15min']?.('modal', { calLink: CAL_LINK, config: { layout: 'month_view', theme: 'dark' } });
}
function initBooking() {
  document.addEventListener('click', e => { const a = e.target.closest('[data-book]'); if (a) book(e); });
  const idle = window.requestIdleCallback || (f => setTimeout(f, 2500));
  addEventListener('load', () => idle(() => loadCal().catch(() => {}), { timeout: 6000 }), { once: true });
}

/* ---------------------------------------------------------------- dialogs */
function dialog(id) {
  const tpl = document.getElementById(id);
  if (!tpl.__dlg) {
    tpl.__dlg = tpl.content.firstElementChild.cloneNode(true);
    document.body.appendChild(tpl.__dlg);
    translate(tpl.__dlg);
    // a click on the backdrop closes it, as Escape does
    tpl.__dlg.addEventListener('click', e => { if (e.target === tpl.__dlg) tpl.__dlg.close(); });
  }
  return tpl.__dlg;
}
const openModal = (dlg, focus) => { if (!dlg.open) dlg.showModal(); snd.chime(); focus?.focus(); };

/* the message form */
function contactForm() {
  const dlg = dialog('tpl-contact');
  if (dlg.__ready) return dlg;
  dlg.__ready = true;
  const form = $('form', dlg), err = $('[data-cf-error]', dlg), btn = $('[data-cf-submit]', dlg);
  const show = msg => { err.textContent = msg; err.hidden = !msg; };
  form.addEventListener('submit', async e => {
    if (e.submitter?.value === 'close') return;
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const fields = ['name', 'email', 'subject', 'message'].map(n => form.elements[n]);
    fields.forEach(el => el.removeAttribute('aria-invalid'));
    const empty = fields.filter(el => !el.value.trim());
    if (empty.length) { empty.forEach(el => el.setAttribute('aria-invalid', 'true')); empty[0].focus(); return show(ui().required); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) { form.elements.email.setAttribute('aria-invalid', 'true'); form.elements.email.focus(); return show(ui().email); }
    show('');
    btn.disabled = true;
    const label = $('span', btn), was = label.textContent;
    label.textContent = ui().sending;
    try {
      const res = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: f.name, email: f.email, type: f.type, subject: f.subject, message: f.message, _hp_name: f._hp_name, _hp_email: f._hp_email, _t: f._t, client: window.__ci ? window.__ci() : {} }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || ui().failed);
      $('[data-cf-email]', dlg).textContent = f.email.trim();
      $('[data-cf-body]', dlg).hidden = true;
      const sent = $('[data-cf-sent]', dlg);
      sent.hidden = false;
      sent.focus();
      snd.success();
    } catch (x) {
      show('✗ ' + (x.message || ui().failed));
    } finally {
      btn.disabled = false;
      label.textContent = was;
    }
  });
  return dlg;
}
function openContact(e) {
  e?.preventDefault();
  const dlg = contactForm(), form = $('form', dlg);
  // a fresh form and timing token each time it opens: the server rejects a send within 3 s
  if (!$('[data-cf-sent]', dlg).hidden) { form.reset(); $('[data-cf-sent]', dlg).hidden = true; $('[data-cf-body]', dlg).hidden = false; }
  form.elements._t.value = Date.now();
  form.elements._hp_name.value = ''; form.elements._hp_email.value = '';
  openModal(dlg, form.elements.name);
}

/* the command palette */
const PALETTE = {
  en: { ph: 'Type a command or search', nav: 'Go to', act: 'Actions', pref: 'Preferences', links: 'Links', none: 'No results',
        work: 'Work', services: 'Services', apps: 'Apps', stack: 'Stack', about: 'About', creds: 'Credentials', contact: 'Contact',
        book: 'Book a 15-minute call', send: 'Send a message', term: 'Open the terminal', lang: 'Mudar para português', snd: 'Sound effects on or off',
        email: 'Copy the email address', li: 'Open LinkedIn' },
  pt: { ph: 'Escreva um comando ou pesquise', nav: 'Ir para', act: 'Ações', pref: 'Preferências', links: 'Ligações', none: 'Sem resultados',
        work: 'Trabalho', services: 'Serviços', apps: 'Apps', stack: 'Ferramentas', about: 'Sobre', creds: 'Credenciais', contact: 'Contacto',
        book: 'Marcar chamada de 15 minutos', send: 'Enviar mensagem', term: 'Abrir o terminal', lang: 'Switch to English', snd: 'Ligar ou desligar o som',
        email: 'Copiar o email', li: 'Abrir o LinkedIn' },
};
function paletteItems() {
  const t = PALETTE[lang], go = id => () => { closePalette(); document.getElementById(id)?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' }); };
  return [
    { g: t.nav, ic: '01', lb: t.work, kw: 'work sites trabalho buk fixntread myafromania', run: go('work') },
    { g: t.nav, ic: '02', lb: t.about, kw: 'about sobre profile perfil', run: go('about') },
    { g: t.nav, ic: '03', lb: t.services, kw: 'services servicos hosting dns support', run: go('services') },
    { g: t.nav, ic: '04', lb: t.apps, kw: 'apps mobile ios android iphone buk fixntread', run: go('apps') },
    { g: t.nav, ic: '05', lb: t.stack, kw: 'stack tools ferramentas cloudflare wordpress microsoft', run: go('stack') },
    { g: t.nav, ic: '06', lb: t.creds, kw: 'credentials education certs ccna msc formacao', run: go('credentials') },
    { g: t.nav, ic: '07', lb: t.contact, kw: 'contact contacto footer', run: go('contact') },
    { g: t.act, ic: '⏱', lb: t.book, kw: 'book call cal meeting agendar marcar chamada', k: 'B', run: () => { closePalette(); book(); } },
    { g: t.act, ic: '✉', lb: t.send, kw: 'send message form mensagem email', k: 'M', run: () => { closePalette(); openContact(); } },
    { g: t.act, ic: '>_', lb: t.term, kw: 'terminal shell console', k: '`', run: () => { closePalette(); openTerminal(); } },
    { g: t.pref, ic: '文', lb: t.lang, kw: 'language idioma portugues english pt en', run: () => { setLang(lang === 'pt' ? 'en' : 'pt'); renderPalette(); } },
    { g: t.pref, ic: '♪', lb: t.snd, kw: 'sound audio som mute', run: () => { snd.toggle(); closePalette(); } },
    { g: t.links, ic: '@', lb: t.email, kw: 'email copy hello', run: async () => { try { await navigator.clipboard.writeText(EMAIL); toast(ui().copied); } catch { /* blocked */ } closePalette(); } },
    { g: t.links, ic: 'in', lb: t.li, kw: 'linkedin profile', run: () => { closePalette(); window.open('https://www.linkedin.com/in/chike-oguh/', '_blank', 'noopener'); } },
  ];
}
let ck = { dlg: null, cur: [], sel: 0 };
function renderPalette() {
  const { dlg } = ck;
  if (!dlg) return;
  const input = $('.ck__input', dlg), list = $('.ck__list', dlg), q = input.value.trim().toLowerCase();
  input.placeholder = PALETTE[lang].ph;
  const all = paletteItems();
  ck.cur = q ? all.filter(i => (i.lb + ' ' + i.kw).toLowerCase().includes(q)) : all;
  ck.sel = Math.min(ck.sel, Math.max(ck.cur.length - 1, 0));
  if (!ck.cur.length) { list.innerHTML = `<div class="ck__empty">${esc(PALETTE[lang].none)}</div>`; input.removeAttribute('aria-activedescendant'); return; }
  let out = '', g = '';
  ck.cur.forEach((it, i) => {
    if (it.g !== g) { out += `<div class="ck__grp" role="presentation">${esc(it.g)}</div>`; g = it.g; }
    out += `<div class="ck__item" role="option" id="ck-${i}" aria-selected="${i === ck.sel}" data-i="${i}"><span class="ck__ic" aria-hidden="true">${esc(it.ic)}</span><span>${esc(it.lb)}</span>${it.k ? `<kbd aria-hidden="true">${esc(it.k)}</kbd>` : ''}</div>`;
  });
  list.innerHTML = out;
  input.setAttribute('aria-activedescendant', `ck-${ck.sel}`);
  $('[aria-selected="true"]', list)?.scrollIntoView({ block: 'nearest' });
}
function openPalette() {
  if (!ck.dlg) {
    ck.dlg = dialog('tpl-palette');
    const input = $('.ck__input', ck.dlg), list = $('.ck__list', ck.dlg);
    input.addEventListener('input', () => { ck.sel = 0; renderPalette(); });
    input.addEventListener('keydown', e => {
      const n = Math.max(ck.cur.length, 1);
      if (e.key === 'ArrowDown') { e.preventDefault(); ck.sel = (ck.sel + 1) % n; renderPalette(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); ck.sel = (ck.sel - 1 + n) % n; renderPalette(); }
      else if (e.key === 'Enter') { e.preventDefault(); ck.cur[ck.sel]?.run(); }
    });
    list.addEventListener('click', e => { const it = e.target.closest('.ck__item'); if (it) ck.cur[+it.dataset.i]?.run(); });
    list.addEventListener('pointermove', e => { const it = e.target.closest('.ck__item'); if (it && +it.dataset.i !== ck.sel) { ck.sel = +it.dataset.i; renderPalette(); } });
  }
  const input = $('.ck__input', ck.dlg);
  input.value = ''; ck.sel = 0; renderPalette();
  openModal(ck.dlg, input);
}
function closePalette() { ck.dlg?.close(); }

/* the terminal */
const TT = {
  help: () => ['', '<span class="k">COMMANDS</span>',
    ...[['help', 'this list'], ['whoami', 'who Chike is'], ['ls', 'the sections'], ['open <section>', 'go to a section'], ['stack', 'the tools'],
      ['location', 'where and when'], ['social', 'how to reach me'], ['contact', 'send a message'], ['book', 'book a call'], ['lang', 'English or Português'],
      ['clear', 'clear the screen'], ['exit', 'close the terminal']].map(([c, d]) => `  <span class="s">${esc(c).padEnd(18)}</span><span class="m">${d}</span>`),
    '', '<span class="m">try</span> <span class="k">sudo hire chike</span>'],
  whoami: () => ['', '<span class="k">Chike Oguh</span>', '<span class="m">Software developer and technical support engineer, Portugal</span>', '',
    '  6+ years in enterprise IT support', '  CCNA, Google IT Support, MCDST', '  English and Portuguese', '  open to new roles <span class="s">✓</span>'],
  ls: () => ['', ...[['work/', 'websites and apps I run'], ['about/', 'the short version'], ['services/', 'what I do for teams'], ['apps/', 'Buk Business and FixNTread'],
    ['stack/', 'the tools I use'], ['credentials/', 'degrees and certificates'], ['contact/', 'book a call or write']].map(([n, d]) => `  <span class="k">${n.padEnd(15)}</span><span class="m">${d}</span>`)],
  stack: () => ['', ...[['build', 'JavaScript · Node.js · HTML · WordPress'], ['host', 'Cloudflare · Vercel · Ubuntu · Docker'], ['support', 'Microsoft 365 · Intune · Autopilot · AD'],
    ['network', 'TCP/IP · DNS · DHCP · VPN · Cisco']].map(([k, v]) => `  <span class="s">${k.padEnd(10)}</span><span class="m">${v}</span>`)],
  location: () => ['', `  Portugal · Europe/Lisbon · ${lisbonTime()}`, '  remote-first, on call when needed'],
  social: () => ['', `  <span class="k">email     </span>${EMAIL}`, '  <span class="k">linkedin  </span>linkedin.com/in/chike-oguh', '  <span class="k">web       </span>chike.ng'],
  date: () => [esc(new Date().toString())],
  pwd: () => ['/home/chike/portfolio'],
  hack: () => ['<span class="e">access denied.</span> <span class="m">this is a portfolio. try</span> <span class="k">contact</span>'],
  npm: () => ['<span class="m">npm ERR! chike-oguh is not for sale, but is for hire.</span>'],
  rm: () => ['<span class="e">nice try.</span> <span class="m">type</span> <span class="k">help</span>'],
};
let tt = null;
function ttPrint(lines) {
  const body = $('[data-tt-body]', tt);
  for (const l of [].concat(lines)) { const d = document.createElement('div'); d.innerHTML = l; body.appendChild(d); }
  body.scrollTop = body.scrollHeight;
}
function ttRun(raw) {
  const line = raw.trim();
  if (!line) return;
  ttPrint(`<span class="s">chike@portfolio</span>:<span class="k">~</span>$ ${esc(line)}`);
  const [cmd, ...rest] = line.split(/\s+/), arg = rest.join(' ').toLowerCase().replace(/\/$/, '');
  const c = cmd.toLowerCase();
  if (TT[c]) return ttPrint(TT[c]());
  if (c === 'clear') { $('[data-tt-body]', tt).innerHTML = ''; return; }
  if (c === 'exit') return tt.close();
  if (c === 'echo') return ttPrint(esc(rest.join(' ')));
  if (c === 'lang') { setLang(lang === 'pt' ? 'en' : 'pt'); return ttPrint(`<span class="s">✓</span> ${lang === 'pt' ? 'Português' : 'English'}`); }
  if (c === 'open' || c === 'cd' || c === 'cat') {
    const el = arg && document.getElementById(arg);
    if (!el) return ttPrint(`<span class="e">${esc(c)}:</span> ${esc(arg || '?')}: no such section. try <span class="k">ls</span>`);
    tt.close(); el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' }); return;
  }
  if (c === 'contact' || (c === 'sudo' && arg.startsWith('hire'))) {
    ttPrint(c === 'sudo' ? ['  <span class="s">✓</span> permission granted', '  <span class="k">→</span> opening the message form'] : '<span class="k">→</span> opening the message form');
    return setTimeout(() => { tt.close(); openContact(); }, 500);
  }
  if (c === 'book') { tt.close(); return book(); }
  ttPrint(`<span class="e">command not found:</span> ${esc(cmd)}. try <span class="k">help</span>`);
}
function openTerminal() {
  if (!tt) {
    tt = dialog('tpl-terminal');
    const input = $('[data-tt-input]', tt), hist = [];
    let h = 0;
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { hist.push(input.value); h = hist.length; ttRun(input.value); input.value = ''; }
      else if (e.key === 'ArrowUp' && h > 0) { e.preventDefault(); input.value = hist[--h]; }
      else if (e.key === 'ArrowDown') { e.preventDefault(); h = Math.min(hist.length, h + 1); input.value = hist[h] ?? ''; }
      else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); $('[data-tt-body]', tt).innerHTML = ''; }
    });
    ttPrint(['<span class="k">chike.ng</span> terminal', '<span class="m">type</span> <span class="s">help</span> <span class="m">to list commands, or</span> <span class="s">whoami</span> <span class="m">to start.</span>', '']);
  }
  openModal(tt, $('[data-tt-input]', tt));
}

function initDialogs() {
  document.addEventListener('click', e => {
    if (e.target.closest('[data-contact]')) openContact(e);
    else if (e.target.closest('[data-palette]')) openPalette();
    else if (e.target.closest('[data-terminal]')) openTerminal();
  });
  document.addEventListener('keydown', e => {
    const typing = e.target.closest?.('input, textarea, select, [contenteditable="true"]');
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); ck.dlg?.open ? closePalette() : openPalette(); }
    else if (!typing && (e.key === '`' || e.key === '~') && !document.querySelector('dialog[open]')) { e.preventDefault(); openTerminal(); }
  });
}

let toastTimer;
function toast(msg) {
  let el = $('.ck-toast');
  if (!el) { el = document.createElement('div'); el.className = 'ck-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('is-on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('is-on'), 1800);
}

/* ---------------------------------------------------------------- sound effects: off until the visitor turns them on */
const snd = (() => {
  let ctx = null, on = store.get('snd') === '1';
  const tone = (freq, dur = 0.06, vol = 0.04, type = 'sine', at = 0) => {
    if (!on) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t = ctx.currentTime + at, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch { /* no audio */ }
  };
  const sync = () => $$('[data-sound]').forEach(b => b.setAttribute('aria-pressed', String(on)));
  return {
    sync,
    beep: () => tone(880, 0.05),
    tick: () => tone(1320, 0.025, 0.02, 'triangle'),
    chime: () => { tone(660, 0.12, 0.035); tone(990, 0.16, 0.03, 'sine', 0.07); },
    success: () => { tone(660, 0.1); tone(880, 0.1, 0.04, 'sine', 0.08); tone(1320, 0.18, 0.035, 'sine', 0.16); },
    toggle() { on = !on; store.set('snd', on ? '1' : '0'); sync(); if (on) this.chime(); toast(on ? '♪ on' : '♪ off'); },
  };
})();
function initSound() {
  snd.sync();
  document.addEventListener('click', e => {
    if (e.target.closest('[data-sound]')) return snd.toggle();
    if (e.target.closest('a, button, [role="tab"]')) snd.tick();
  });
}

/* ---------------------------------------------------------------- status line and the Lisbon clock */
const lisbonTime = () => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' }).format(new Date());
function tickClock() { for (const el of $$('[data-clock]')) el.textContent = ui().clock(lisbonTime()); }
function initClock() {
  tickClock();
  setTimeout(() => { tickClock(); setInterval(tickClock, 60000); }, (60 - new Date().getSeconds()) * 1000);
}
async function initStatus() {
  const el = $('[data-status]');
  if (!el) return;
  try {
    const res = await fetch('/status.json', { cache: 'no-store' });
    if (!res.ok) return;
    const s = await res.json();
    if (s.message) { el.textContent = s.message.replace(/\.?$/, '.'); el.hidden = false; }
    // the about section's profile.sh shows the same file
    const set = (sel, v) => { const n = $(sel); if (n && v) n.textContent = v; };
    set('[data-term-state]', s.state);
    set('[data-term-msg]', s.message?.replace(/^open to\s+/i, '').replace(/\.$/, ''));
    set('[data-term-focus]', s.focus);
  } catch { /* the close reads right without it */ }
}

/* ---------------------------------------------------------------- work cards from /work.json */
let workItems = null;
const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const ARROW = '<svg class="m-arrow" viewBox="0 0 12 12" aria-hidden="true"><path class="m-arrow__stem" d="M1 6h8"/><path class="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5"/></svg>';
function workCard(it) {
  const url = /^https?:\/\//.test(it.url || '') ? it.url : '#work';
  const img = it.image ? String(it.image) : '';
  const small = img.replace(/\.webp$/, '-720.webp');
  const role = lang === 'pt' ? it.role_pt || it.role : it.role;
  const desc = lang === 'pt' ? it.description_pt || it.description : it.description;
  const tag = lang === 'pt' ? it.tagline_pt || it.tagline : it.tagline;
  const media = img
    ? `<img class="frame__img" src="${esc(img)}" srcset="${esc(small)} 720w, ${esc(img)} 1440w" sizes="(max-width: 1023px) 92vw, 628px" width="1440" height="900" alt="${esc(`The ${it.name} home page`)}" loading="lazy">`
    : `<span class="work-card__mark">${esc(it.name)}</span>`;
  return `<a class="card card--open work-card span-6" href="${esc(url)}" target="_blank" rel="noopener">
    <div class="panel panel--top">${media}</div>
    <h3>${esc(it.name)}${tag ? ", " + esc(tag) : ""}</h3>
    <p>${esc(desc)}</p>
    <span class="work-card__host">${esc(hostOf(url))}<span class="work-card__role"> · ${esc(role)}</span>${ARROW}</span>
  </a>`;
}
function renderWork() {
  if (!workItems) return;
  const grids = $$('[data-work]');
  grids[0].innerHTML = workItems.slice(0, 2).map(workCard).join('');
  grids[1].innerHTML = workItems.slice(2, 4).map(workCard).join('');
}
async function initWork() {
  try {
    const res = await fetch('/work.json', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (!Array.isArray(data.items) || !data.items.length) return;
    workItems = data.items;
    renderWork();
  } catch { /* the cards in the page stay */ }
}

/* ---------------------------------------------------------------- apps: the phone's status bar follows the screen on show */
function initDevice() {
  const device = $('.device');
  if (!device) return;
  const sync = () => {
    const box = $$('.device__screens', device).find(b => !b.hidden);
    const img = box && $$('img', box).find(i => !i.hidden);
    device.dataset.bar = img?.hasAttribute('data-bar') ? 'on' : 'off';
  };
  new MutationObserver(sync).observe(device, { subtree: true, attributes: true, attributeFilter: ['hidden'] });
  sync();
}

/* ---------------------------------------------------------------- the hero's 3D stage */
function canWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
function initStage() {
  const stage = $('[data-stage3d]');
  if (!stage) return;
  const conn = navigator.connection || {};
  const weak = conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '') || (navigator.deviceMemory && navigator.deviceMemory < 2);
  if (weak || !canWebGL()) return;
  const btn = $('[data-stage-pause]', stage);
  const start = () => import('/assets/hero3d.js').then(m => {
    const ctrl = m.mount(stage, {
      reduced: reduced(),
      sites: ['/work/buk.webp', '/work/fixntread.webp', '/work/myafromania.webp'],
      apps: ['/apps/buk-bookings.webp', '/apps/buk-calendar.webp', '/apps/buk-revenue.webp', '/apps/buk-payments.webp', '/apps/buk-invoices.webp', '/apps/buk-growth.webp', '/apps/buk-reviews.webp'],
    });
    return ctrl.ready.then(() => {
      stage.classList.add('is-live');
      // once the canvas has faded in, the poster leaves the page (it returns if the WebGL context is lost)
      setTimeout(() => stage.querySelectorAll('.poster').forEach(p => { p.hidden = true; }), 700);
      const label = () => btn.setAttribute('aria-label', ctrl.paused ? ui().play : ui().pause);
      label();
      document.addEventListener('langchange', label);
      btn.addEventListener('click', () => {
        if (ctrl.paused) ctrl.resume(); else ctrl.pause();
        btn.setAttribute('aria-pressed', String(ctrl.paused));
        label();
      });
    });
  }).catch(e => console.warn('hero3d:', e));
  // after the page has painted and loaded, so the words and the poster come first
  if (document.readyState === 'complete') start();
  else addEventListener('load', () => (window.requestIdleCallback || setTimeout)(start, { timeout: 1500 }), { once: true });
}

/* ---------------------------------------------------------------- the casual source deterrent (not security) */
function initGuard() {
  const field = el => el?.closest?.('input, textarea, select, [contenteditable="true"]');
  document.addEventListener('contextmenu', e => { if (!field(e.target)) e.preventDefault(); });
  document.addEventListener('dragstart', e => { if (/^(IMG|CANVAS)$/.test(e.target.tagName)) e.preventDefault(); });
  document.addEventListener('keydown', e => {
    const k = (e.key || '').toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if (e.key === 'F12' || (mod && (k === 'u' || k === 's')) || (mod && e.shiftKey && 'ijc'.includes(k) && k) || (e.metaKey && e.altKey && 'ijcu'.includes(k) && k)) e.preventDefault();
  });
  const css = (c, s = '') => `color:${c};font-family:'JetBrains Mono',monospace;${s}`;
  console.log('%cchike.ng', css('#c9a45a', 'font-size:28px;font-weight:500'));
  console.log('%cPasting code someone gave you here can expose your accounts. Never paste unknown JavaScript.', css('#febc2e', 'font-size:12px'));
  console.log(`%cWant to work together? ${EMAIL} or linkedin.com/in/chike-oguh`, css('#f2f2f2', 'font-size:12px'));
}

/* ---------------------------------------------------------------- start */
function init() {
  const run = (name, f) => { try { f(); } catch (e) { console.warn(`site.js: ${name}`, e); } };
  run('language', initLang);
  run('booking', initBooking);
  run('dialogs', initDialogs);
  run('sound', initSound);
  run('clock', initClock);
  run('device', initDevice);
  run('stage', initStage);
  run('guard', initGuard);
  initStatus();
  initWork();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
