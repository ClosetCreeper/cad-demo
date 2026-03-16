# 🚔 ERLC CAD — Setup Guide

A custom Computer Aided Dispatch system for your ERLC server.
Built with React, Node.js, SQLite, Discord OAuth, and Socket.io.

---

## What's Included

- **Live Dashboard** — Real-time server stats, active units, open incidents
- **Dispatch Board** — Create/manage calls, assign units, log to Discord
- **Live Map** — Real-time player positions from ERLC API v2
- **Records Database** — Search persons/vehicles, add flags, track notes
- **Discord Integration** — Login via Discord, role-based access, auto-logging to channels
- **Unit Management** — Shift tracking, status changes, panic button

---

## Prerequisites

- Node.js v18+ installed
- A Discord application (bot + OAuth2)
- Your ERLC server API key
- (Optional) Raspberry Pi for self-hosting

---

## Step 1: Install Dependencies

```bash
cd erlc-cad
npm install
```

---

## Step 2: Create Discord Application

1. Go to https://discord.com/developers/applications
2. Click **New Application**, name it (e.g. "Your Server CAD")
3. Go to **OAuth2** → copy your **Client ID** and **Client Secret**
4. Add redirect URL: `http://YOUR_IP:3001/auth/discord/callback`
   - For Raspberry Pi on your network: `http://192.168.x.x:3001/auth/discord/callback`
5. Go to **Bot** → click **Add Bot** → copy the **Bot Token**
6. Enable **Server Members Intent** under Privileged Gateway Intents
7. Invite the bot to your Discord server with `bot` and `applications.commands` scopes

---

## Step 3: Get Discord IDs

Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)

Right-click to copy IDs for:
- Your **server** (Guild ID)
- Your **admin role**
- Your **dispatch role** (or whichever role dispatchers have)
- Your **officer role**
- Your **#dispatch** channel
- Your **#records** channel  
- Your **#shifts** channel

---

## Step 4: Configure Environment

```bash
cp .env.example .env
```

Open `.env` and fill in every value:

```
ERLC_API_KEY=           # From ERLC server settings → API
DISCORD_CLIENT_ID=      # From Discord dev portal
DISCORD_CLIENT_SECRET=  # From Discord dev portal
DISCORD_BOT_TOKEN=      # From Discord dev portal
DISCORD_GUILD_ID=       # Your Discord server ID
DISCORD_ADMIN_ROLE_ID=  # Admin role
DISCORD_DISPATCH_ROLE_ID= # Dispatch role
DISCORD_OFFICER_ROLE_ID=  # Officer role
DISCORD_DISPATCH_CHANNEL_ID= # #dispatch channel
DISCORD_RECORDS_CHANNEL_ID=  # #records channel
DISCORD_SHIFTS_CHANNEL_ID=   # #shifts channel
SESSION_SECRET=         # Any random 32+ character string
CLIENT_URL=http://localhost:5173   # Change to your Pi's IP in production
SERVER_URL=http://localhost:3001
```

---

## Step 5: Run in Development

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

---

## Step 6: Deploy on Raspberry Pi (Free Forever)

### Build the frontend:
```bash
npm run build
```

### Set production environment:
In your `.env`:
```
NODE_ENV=production
CLIENT_URL=http://192.168.YOUR.PI_IP:3001
SERVER_URL=http://192.168.YOUR.PI_IP:3001
PORT=3001
```

### Run with PM2 (keeps it running 24/7):
```bash
npm install -g pm2
pm2 start server/index.js --name cad
pm2 startup    # Makes it auto-start on reboot
pm2 save
```

### Access from anywhere on your network:
`http://192.168.YOUR.PI_IP:3001`

### Optional — Access from outside your network:
Use **Cloudflare Tunnel** (free):
```bash
# Install cloudflared on Pi
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared
chmod +x cloudflared
./cloudflared tunnel --url http://localhost:3001
```
This gives you a public URL like `https://something.trycloudflare.com`

---

## File Structure

```
erlc-cad/
├── server/
│   └── index.js          # Express server, API, Discord bot, Socket.io
├── src/
│   ├── pages/
│   │   ├── Login.jsx     # Discord OAuth login
│   │   ├── Dashboard.jsx # Overview page
│   │   ├── Dispatch.jsx  # CAD board
│   │   ├── LiveMap.jsx   # Player map
│   │   └── Records.jsx   # Database
│   ├── components/
│   │   └── Layout.jsx    # Nav, sidebar, unit panel
│   ├── lib/
│   │   ├── AuthContext.jsx
│   │   └── SocketContext.jsx
│   └── styles/
│       └── global.css
├── .env.example
└── package.json
```

---

## Role Access

| Feature | Officer | Dispatch | Admin |
|---------|---------|----------|-------|
| View Dashboard | ✓ | ✓ | ✓ |
| View Map | ✓ | ✓ | ✓ |
| View Records | ✓ | ✓ | ✓ |
| Create Records | ✓ | ✓ | ✓ |
| Create Incidents | ✓ | ✓ | ✓ |
| Delete Records | ✗ | ✗ | ✓ |

---

## ERLC Map Note

The live map uses OpenStreetMap tiles styled for a dark tactical look.
ERLC uses its own coordinate system — you may need to adjust the coordinate
mapping in `LiveMap.jsx` once you test with real player data.

---

## Need Help?

Drop the error message in chat and we'll fix it together.
