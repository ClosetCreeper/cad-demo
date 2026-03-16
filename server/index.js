require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const cors = require('cors');
const axios = require('axios');
const Database = require('better-sqlite3');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, credentials: true }
});

// ─── Database Setup ────────────────────────────────────────────────────────
const db = new Database('./cad.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('person','vehicle')),
    identifier TEXT NOT NULL,
    name TEXT,
    dob TEXT,
    address TEXT,
    notes TEXT,
    flags TEXT DEFAULT '[]',
    incidents TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    units TEXT DEFAULT '[]',
    status TEXT DEFAULT 'open' CHECK(status IN ('open','closed','pending')),
    priority TEXT DEFAULT 'low' CHECK(priority IN ('low','medium','high','emergency')),
    location TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT NOT NULL,
    username TEXT NOT NULL,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    duration_minutes INTEGER
  );

  CREATE TABLE IF NOT EXISTS units (
    discord_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    callsign TEXT,
    status TEXT DEFAULT 'off-duty' CHECK(status IN ('available','busy','off-duty','break')),
    current_incident INTEGER,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ─── Discord Bot ────────────────────────────────────────────────────────────
const discordBot = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

discordBot.once('ready', () => {
  console.log(`[Discord Bot] Logged in as ${discordBot.user.tag}`);
});

if (process.env.DISCORD_BOT_TOKEN) {
  discordBot.login(process.env.DISCORD_BOT_TOKEN).catch(console.error);
}

async function sendDiscordEmbed(channelId, embed) {
  try {
    const channel = await discordBot.channels.fetch(channelId);
    if (channel) await channel.send({ embeds: [embed] });
  } catch (e) {
    console.error('[Discord] Failed to send embed:', e.message);
  }
}

// ─── Passport / Auth ────────────────────────────────────────────────────────
passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: `${process.env.SERVER_URL}/auth/discord/callback`,
  scope: ['identify', 'guilds', 'guilds.members.read']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user is in the guild and get their roles
    const memberRes = await axios.get(
      `https://discord.com/api/v10/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const member = memberRes.data;
    const roles = member.roles || [];

    const isAdmin = roles.includes(process.env.DISCORD_ADMIN_ROLE_ID);
    const isDispatch = roles.includes(process.env.DISCORD_DISPATCH_ROLE_ID);
    const isOfficer = roles.includes(process.env.DISCORD_OFFICER_ROLE_ID);

    if (!isAdmin && !isDispatch && !isOfficer) {
      return done(null, false, { message: 'No authorized role.' });
    }

    const user = {
      id: profile.id,
      username: profile.username,
      discriminator: profile.discriminator,
      avatar: profile.avatar,
      roles,
      isAdmin,
      isDispatch,
      isOfficer
    };
    return done(null, user);
  } catch (e) {
    return done(null, false, { message: 'Not in server or error fetching roles.' });
  }
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 86400000 }
}));
app.use(passport.initialize());
app.use(passport.session());

function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

function requireAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.isAdmin) return next();
  res.status(403).json({ error: 'Forbidden' });
}

// ─── Auth Routes ────────────────────────────────────────────────────────────
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: `${process.env.CLIENT_URL}/login?error=unauthorized` }),
  (req, res) => res.redirect(process.env.CLIENT_URL)
);
app.get('/auth/logout', (req, res) => {
  req.logout(() => res.redirect(process.env.CLIENT_URL + '/login'));
});
app.get('/auth/me', (req, res) => {
  if (req.isAuthenticated()) res.json(req.user);
  else res.status(401).json({ error: 'Not authenticated' });
});

// ─── ERLC API Proxy ─────────────────────────────────────────────────────────
const ERLC_BASE = 'https://api.policeroleplay.community/v1';
const erlcHeaders = () => ({ 'Server-Key': process.env.ERLC_API_KEY });

async function fetchErlcData() {
  try {
    const [players, vehicles, queue] = await Promise.all([
      axios.get(`${ERLC_BASE}/server/players`, { headers: erlcHeaders() }),
      axios.get(`${ERLC_BASE}/server/vehicles`, { headers: erlcHeaders() }),
      axios.get(`${ERLC_BASE}/server/joinlogs`, { headers: erlcHeaders() })
    ]);
    return {
      players: players.data,
      vehicles: vehicles.data,
      queue: queue.data,
      timestamp: Date.now()
    };
  } catch (e) {
    console.error('[ERLC] Fetch error:', e.message);
    return null;
  }
}

let latestErlcData = null;

// Poll ERLC every 5 seconds and broadcast to connected clients
setInterval(async () => {
  const data = await fetchErlcData();
  if (data) {
    latestErlcData = data;
    io.emit('erlc:update', data);
  }
}, 5000);

app.get('/api/erlc/live', requireAuth, (req, res) => {
  res.json(latestErlcData || { players: [], vehicles: [], timestamp: null });
});

app.get('/api/erlc/server', requireAuth, async (req, res) => {
  try {
    const response = await axios.get(`${ERLC_BASE}/server`, { headers: erlcHeaders() });
    res.json(response.data);
  } catch (e) {
    res.status(500).json({ error: 'ERLC API error' });
  }
});

// ─── Records Routes ─────────────────────────────────────────────────────────
app.get('/api/records', requireAuth, (req, res) => {
  const { search, type } = req.query;
  let query = 'SELECT * FROM records WHERE 1=1';
  const params = [];
  if (type) { query += ' AND type = ?'; params.push(type); }
  if (search) {
    query += ' AND (identifier LIKE ? OR name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  query += ' ORDER BY updated_at DESC LIMIT 50';
  res.json(db.prepare(query).all(...params));
});

app.get('/api/records/:id', requireAuth, (req, res) => {
  const record = db.prepare('SELECT * FROM records WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  record.flags = JSON.parse(record.flags);
  record.incidents = JSON.parse(record.incidents);
  res.json(record);
});

app.post('/api/records', requireAuth, (req, res) => {
  const { type, identifier, name, dob, address, notes, flags } = req.body;
  const result = db.prepare(
    'INSERT INTO records (type, identifier, name, dob, address, notes, flags) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(type, identifier, name, dob, address, notes, JSON.stringify(flags || []));

  // Log to Discord
  const embed = new EmbedBuilder()
    .setTitle(`📋 New ${type === 'person' ? 'Person' : 'Vehicle'} Record`)
    .addFields(
      { name: type === 'person' ? 'Name' : 'Plate', value: identifier, inline: true },
      { name: 'Added By', value: req.user.username, inline: true }
    )
    .setColor(0x3b82f6)
    .setTimestamp();
  sendDiscordEmbed(process.env.DISCORD_RECORDS_CHANNEL_ID, embed);

  res.json({ id: result.lastInsertRowid });
});

app.put('/api/records/:id', requireAuth, (req, res) => {
  const { name, dob, address, notes, flags } = req.body;
  db.prepare(
    'UPDATE records SET name=?, dob=?, address=?, notes=?, flags=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
  ).run(name, dob, address, notes, JSON.stringify(flags || []), req.params.id);
  res.json({ success: true });
});

app.delete('/api/records/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM records WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Incidents Routes ────────────────────────────────────────────────────────
app.get('/api/incidents', requireAuth, (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM incidents';
  if (status) query += ` WHERE status = '${status}'`;
  query += ' ORDER BY created_at DESC';
  res.json(db.prepare(query).all());
});

app.post('/api/incidents', requireAuth, (req, res) => {
  const { title, description, priority, location, units } = req.body;
  const result = db.prepare(
    'INSERT INTO incidents (title, description, priority, location, units, created_by) VALUES (?,?,?,?,?,?)'
  ).run(title, description, priority || 'low', location, JSON.stringify(units || []), req.user.username);

  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(result.lastInsertRowid);
  io.emit('incident:new', incident);

  // Log to Discord
  const priorityColors = { low: 0x22c55e, medium: 0xf59e0b, high: 0xef4444, emergency: 0x7c3aed };
  const embed = new EmbedBuilder()
    .setTitle(`🚨 New Incident — ${title}`)
    .addFields(
      { name: 'Priority', value: priority?.toUpperCase() || 'LOW', inline: true },
      { name: 'Location', value: location || 'Unknown', inline: true },
      { name: 'Created By', value: req.user.username, inline: true }
    )
    .setDescription(description || '')
    .setColor(priorityColors[priority] || 0x22c55e)
    .setTimestamp();
  sendDiscordEmbed(process.env.DISCORD_DISPATCH_CHANNEL_ID, embed);

  res.json(incident);
});

app.patch('/api/incidents/:id', requireAuth, (req, res) => {
  const { status, units, description } = req.body;
  const fields = [];
  const vals = [];
  if (status) { fields.push('status=?'); vals.push(status); }
  if (units) { fields.push('units=?'); vals.push(JSON.stringify(units)); }
  if (description) { fields.push('description=?'); vals.push(description); }
  fields.push('updated_at=CURRENT_TIMESTAMP');
  vals.push(req.params.id);
  db.prepare(`UPDATE incidents SET ${fields.join(',')} WHERE id=?`).run(...vals);
  const updated = db.prepare('SELECT * FROM incidents WHERE id=?').get(req.params.id);
  io.emit('incident:update', updated);
  res.json(updated);
});

// ─── Units / Shift Routes ────────────────────────────────────────────────────
app.get('/api/units', requireAuth, (req, res) => {
  res.json(db.prepare("SELECT * FROM units WHERE status != 'off-duty'").all());
});

app.post('/api/units/signin', requireAuth, (req, res) => {
  const { callsign } = req.body;
  db.prepare(
    'INSERT INTO units (discord_id, username, callsign, status) VALUES (?,?,?,?) ON CONFLICT(discord_id) DO UPDATE SET callsign=?, status=?, last_seen=CURRENT_TIMESTAMP'
  ).run(req.user.id, req.user.username, callsign, 'available', callsign, 'available');

  db.prepare('INSERT INTO shifts (discord_id, username) VALUES (?,?)').run(req.user.id, req.user.username);
  const unit = db.prepare('SELECT * FROM units WHERE discord_id=?').get(req.user.id);
  io.emit('unit:update', unit);

  const embed = new EmbedBuilder()
    .setTitle('🟢 Unit On Duty')
    .addFields(
      { name: 'Officer', value: req.user.username, inline: true },
      { name: 'Callsign', value: callsign, inline: true }
    )
    .setColor(0x22c55e)
    .setTimestamp();
  sendDiscordEmbed(process.env.DISCORD_SHIFTS_CHANNEL_ID, embed);

  res.json(unit);
});

app.post('/api/units/signout', requireAuth, (req, res) => {
  db.prepare("UPDATE units SET status='off-duty', current_incident=NULL WHERE discord_id=?").run(req.user.id);
  const shift = db.prepare("SELECT * FROM shifts WHERE discord_id=? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1").get(req.user.id);
  if (shift) {
    const duration = Math.floor((Date.now() - new Date(shift.start_time).getTime()) / 60000);
    db.prepare("UPDATE shifts SET end_time=CURRENT_TIMESTAMP, duration_minutes=? WHERE id=?").run(duration, shift.id);

    const embed = new EmbedBuilder()
      .setTitle('🔴 Unit Off Duty')
      .addFields(
        { name: 'Officer', value: req.user.username, inline: true },
        { name: 'Shift Duration', value: `${duration} minutes`, inline: true }
      )
      .setColor(0xef4444)
      .setTimestamp();
    sendDiscordEmbed(process.env.DISCORD_SHIFTS_CHANNEL_ID, embed);
  }
  io.emit('unit:signout', { discord_id: req.user.id });
  res.json({ success: true });
});

app.patch('/api/units/status', requireAuth, (req, res) => {
  const { status } = req.body;
  db.prepare("UPDATE units SET status=?, last_seen=CURRENT_TIMESTAMP WHERE discord_id=?").run(status, req.user.id);
  const unit = db.prepare('SELECT * FROM units WHERE discord_id=?').get(req.user.id);
  io.emit('unit:update', unit);
  res.json(unit);
});

// ─── Socket.io ──────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);
  if (latestErlcData) socket.emit('erlc:update', latestErlcData);

  socket.on('panic', (data) => {
    io.emit('panic:alert', data);
    const embed = new EmbedBuilder()
      .setTitle('🚨 PANIC BUTTON ACTIVATED')
      .setDescription(`Officer **${data.username}** has activated their panic button!`)
      .setColor(0xff0000)
      .setTimestamp();
    sendDiscordEmbed(process.env.DISCORD_DISPATCH_CHANNEL_ID, embed);
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Client disconnected:', socket.id);
  });
});

// ─── Serve Frontend (production) ─────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../dist/index.html')));
}

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`[Server] Running on port ${PORT}`));
