# NEXUS CAD — Setup Guide

A full-featured Computer Aided Dispatch system built for ERLC.
Runs 100% on Vercel (free tier) + Supabase (free tier). No server needed.

---

## Stack

| Layer | Service | Cost |
|---|---|---|
| Frontend + API proxy | Vercel | Free |
| Database + Realtime | Supabase | Free |
| Live ERLC data | ERLC API v2 | Free |

---

## Step 1 — Create Supabase Project

1. Go to https://supabase.com → New Project
2. Name it `nexus-cad`, pick a region close to you
3. Wait for it to spin up (~1 min)
4. Go to **SQL Editor** → paste the entire contents of `supabase_schema.sql` → click **Run**
5. Go to **Settings → API** → copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

---

## Step 2 — Get ERLC API Key

1. Open ERLC → go to your Private Server settings
2. Find **Server Key** → copy it → `VITE_ERLC_API_KEY`

---

## Step 3 — Deploy to Vercel

### Option A — GitHub (recommended)
1. Push this folder to a GitHub repo
2. Go to https://vercel.com → Import Project → select your repo
3. In **Environment Variables**, add:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_ERLC_API_KEY=your-erlc-key
   ```
4. Click **Deploy**

### Option B — Vercel CLI
```bash
npm install -g vercel
cp .env.example .env   # fill in your values
vercel --prod
```

---

## Step 4 — Run locally for testing

```bash
npm install
cp .env.example .env   # fill in your values
npm run dev
```

Open http://localhost:5173

---

## How Users Log In

No passwords. Users enter their Roblox username and pick their team.
Their session is stored in the browser — they stay logged in until they sign out.

---

## Features by Team

| Feature | Police | Fire | EMS | Dispatch | Civilian |
|---|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Live Map | ✓ | ✓ | ✓ | ✓ | ✓ |
| Dispatch Board | ✓ | ✓ | ✓ | ✓ | — |
| Self-Dispatch | ✓ | ✓ | ✓ | — | — |
| Attach any unit | — | — | — | ✓ | — |
| 5 Unit Statuses | ✓ | ✓ | ✓ | — | — |
| Change unit status | — | — | — | ✓ | — |
| Records lookup | ✓ | — | — | ✓ | — |
| Log arrest/citation | ✓ | — | — | — | — |
| Body Camera | ✓ | — | — | view | — |
| Radio | ✓ | ✓ | ✓ | ✓ | — |
| Civilian profile | — | — | — | — | ✓ |
| View all civilians | ✓ | — | — | ✓ | — |

---

## Radio Channels

| Channel | Teams |
|---|---|
| MAIN CH1 | Police, Fire, EMS, Dispatch |
| FIRE CH2 | Fire, Dispatch |
| EMS  CH3 | EMS, Dispatch |
| TACT CH4 | Police, Dispatch |

---

## Body Cameras

Police officers can start a body camera from the top bar.
They need to share their screen via an embed-able stream URL (e.g. using OBS + Streamyard, or Restream).
Paste the iframe-embeddable URL when prompted.
Dispatch can view all live feeds on the Body Cams page.

---

## Notes

- The ERLC map uses real player `LocationX` / `LocationZ` coordinates from the API.
  The map tiles are real-world OSM styled dark — you may want to overlay a custom ERLC map image later.
- Supabase Realtime keeps calls, units, and radio in sync across all browsers instantly.
- Data persists in Supabase — calls and civilian records survive page refreshes.
