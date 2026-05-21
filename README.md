# chike.oguh — Portfolio

Personal portfolio & CV site for Chike Oguh.  
Built with vanilla HTML/CSS/JS + Vercel serverless functions + Resend for email.

---

## Deploy in 4 steps

### 1. Push to GitHub

```bash
cd chike-portfolio
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/chike-portfolio.git
git push -u origin main
```

---

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your `chike-portfolio` GitHub repo
3. Leave all build settings as default — Vercel auto-detects the setup
4. Click **Deploy** (it will fail on the first run — that's expected until step 3)

---

### 3. Add your Resend API key

1. Go to [resend.com](https://resend.com) → **API Keys** → create a key
2. Go to [resend.com/domains](https://resend.com/domains) → **Add Domain** → enter `chike.ng`
3. Add the DNS records Resend gives you to your domain registrar
4. In Vercel → your project → **Settings** → **Environment Variables**:

| Name | Value |
|------|-------|
| `RESEND_API_KEY` | `re_xxxxxxxxxxxx` |

5. Go to **Deployments** → click **Redeploy**

---

### 4. Done

Your site is live at `https://chike-portfolio.vercel.app`  
Point your custom domain in Vercel → **Settings** → **Domains** → add `chike.ng`

---

## Run locally

```bash
npm install
npx vercel dev
# → http://localhost:3000
```

Add a `.env` file first:

```bash
cp .env.example .env
# paste your RESEND_API_KEY into .env
```

---

## Project structure

```
chike-portfolio/
├── api/
│   └── contact.js      # Vercel serverless function — handles form + sends emails
├── public/
│   └── index.html      # The full portfolio site
├── .env.example        # Copy to .env for local dev
├── .gitignore
├── package.json
├── vercel.json         # Vercel routing config
└── README.md
```

---

## How the contact form works

1. Visitor fills the terminal-style form and hits **Execute**
2. `POST /api/contact` fires to the serverless function
3. Resend sends two emails:
   - **Notification** → `hello@chike.ng` with full message details + one-click reply button
   - **Confirmation** → visitor's inbox with a techy dark-mode receipt
