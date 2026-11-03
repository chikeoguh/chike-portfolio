# chike.oguh — Portfolio

Personal portfolio and CV for Chike Oguh, hosted on **Cloudflare Pages**.
Vanilla HTML/CSS/JS for the site, Pages Functions for the API, Resend for email, Discord for visit and enquiry alerts.

## Layout

```
public/                  static site (Pages publish directory)
  index.html             the whole portfolio
  robots.txt, sitemap.xml, favicon.svg, og-image.png, apps/, work.json, status.json
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
npm test           # unit tests for lib/
```

Secrets for local runs go in `.dev.vars` (gitignored):

```
RESEND_API_KEY=re_...
DISCORD_WEBHOOK=https://discord.com/api/webhooks/...
```

## Notes

- The contact form's rate limit and visit throttle are per isolate, so they are soft limits. Durable Objects or KV would make them global.
- Visitor location comes from Cloudflare's `request.cf`. IP type (residential, datacenter, VPN, Tor) comes from ip-api.com, whose free tier is HTTP-only and non-commercial.
