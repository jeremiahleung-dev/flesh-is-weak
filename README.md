# The Flesh is Weak

A minimalist spiritual devotional app. Answer 5 questions about your emotional state and receive a Bible verse, a theologian quote, and a personalized 3-sentence prayer — powered by Claude AI.

---

## Local Development

**Prerequisites:** Node.js 18+

```bash
# Install dependencies
npm install

# For local dev WITH the API working:
npm install -g vercel
vercel dev         # runs frontend + API function together at localhost:3000

# Or without API (UI only):
npm run dev        # localhost:5173
```

---

## Deploy to Vercel

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/flesh-is-weak.git
git push -u origin main
```

### Step 2 — Import on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repo — Vite is auto-detected, no config needed
3. Click **Deploy**

### Step 3 — Add your API key (required)

In your Vercel project → **Settings → Environment Variables**, add:

| Name | Value |
|------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...your key...` |

Then go to **Deployments → Redeploy** to apply it.

Get your key at [console.anthropic.com](https://console.anthropic.com)

### Or deploy via CLI

```bash
npm install -g vercel
vercel env add ANTHROPIC_API_KEY   # paste key when prompted
vercel --prod
```

---

## How the API security works

All Claude API calls go through `/api/verse.js` — a Vercel Edge Function that runs on the server. Your `ANTHROPIC_API_KEY` lives only in Vercel's environment and is never sent to the browser.

```
Browser → POST /api/verse → Edge Function → Anthropic API
                               (key added here, server-side)
```

---

## Custom Domain

Once deployed on Vercel:
1. Go to your project → **Settings → Domains**
2. Add your domain (e.g. `thefleshisweak.com`)
3. Update DNS at your registrar to point to Vercel

---

## Stack

- React 18 + Vite
- Vercel Edge Functions (API proxy)
- EB Garamond (Google Fonts)
- Anthropic Claude API (claude-sonnet-4)
- Zero UI dependencies beyond React
