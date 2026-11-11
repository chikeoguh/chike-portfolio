# chike.oguh — Portfolio

Personal portfolio and CV for Chike Oguh, hosted on **Cloudflare Pages**.
Vanilla HTML/CSS/JS for the site, Pages Functions for the API, Resend for email, Discord for visit and enquiry alerts.

## Layout

```
public/                  static site (Pages publish directory)
  index.html             the whole portfolio (EN, with PT swapped in by site.js)
  assets/site.css        page styles (the 3D stage, work cards, phone frame, dialogs)
  assets/site.js         language, Cal.com, message form, ⌘K palette, terminal, status, work cards, 3D mount
  assets/hero3d.js       the 3D hero, BUILT from src/hero3d.js (npm run build:3d); do not edit by hand
  assets/hero-poster*.webp  stills of the 3D scene, shown before it loads and when WebGL is off
  assets/{system,ui,motion,layout,icons,moments,diagrams}/  the design system (tasteskill kit)
  work/                  site screenshots for the work cards and the 3D laptop screen
  apps/                  Buk Business screenshots and app concepts
  robots.txt, sitemap.xml, favicon.svg, og-image.png, work.json, status.json, 404.html
src/
  hero3d.js              three.js scene: a laptop with the sites, a phone with the app (source of assets/hero3d.js)
functions/
  api/contact.js         POST /api/contact  — contact form: anti-spam, Resend emails, Discord report
  api/track.js           POST /api/track    — visit beacon → Discord visit report
lib/
  intel.js               visitor context (Cloudflare geo + IP type via ip-api.com), risk score
  discord.js             Discord embeds (visit / enquiry / spam)
  spam.js                spam patterns and content filter
  email-templates.js     HTML receipt and notification emails
  intel.test.js          unit tests
wrangler.toml            Pages project name and output directory
```

## Deploy (Cloudflare Pages, from GitHub)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → pick `chikeoguh/chike-portfolio`.
2. Build settings: **Framework preset** None, **Build command** *(empty)*, **Build output directory** `public`.
3. **Environment variables** (Production, and Preview if you want previews to send mail):
   - `RESEND_API_KEY` — encrypted
   - `DISCORD_WEBHOOK` — encrypted
4. Save and deploy. Every push to `main` deploys to production.
5. Custom domain: Pages project → **Custom domains** → add `chike.ng`. Email records (Zoho MX, SPF, Resend DKIM) stay as they are.

From the CLI instead of Git:

```bash
npx wrangler login
npx wrangler pages secret put RESEND_API_KEY --project-name chike-portfolio
npx wrangler pages secret put DISCORD_WEBHOOK --project-name chike-portfolio
npm run deploy
```

## Local development

```bash
npm install
npm run dev        # wrangler pages dev public → http://127.0.0.1:8788
npm run build:3d   # rebuild public/assets/hero3d.js after editing src/hero3d.js
npm test           # unit tests for lib/
```

Content you can edit without touching code:

- `public/work.json`: the work cards (name, url, role, description, image, and `_pt` fields for Portuguese).
  Screenshots go in `public/work/` as `<name>.webp` (1440×900) and `<name>-720.webp`.
- `public/status.json`: the status line in the close and the `profile.sh` terminal (`state`, `message`, `focus`).

Secrets for local runs go in `.dev.vars` (gitignored):

```
RESEND_API_KEY=re_...
DISCORD_WEBHOOK=https://discord.com/api/webhooks/...
```

## Notes

- The contact form's rate limit and visit throttle are per isolate, so they are soft limits. Durable Objects or KV would make them global.
- Visitor location comes from Cloudflare's `request.cf`. IP type (residential, datacenter, VPN, Tor) comes from ip-api.com, whose free tier is HTTP-only and non-commercial.
