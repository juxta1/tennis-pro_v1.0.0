import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import cookieSession from "cookie-session";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: Database.Database;
try {
  db = new Database("tennis_league.db");
  console.log("Database connected successfully.");
} catch (e) {
  console.error("Failed to connect to database:", e);
  process.exit(1);
}

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player1 TEXT NOT NULL,
    player2 TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT, -- "10:00"
    duration INTEGER, -- in minutes
    surface TEXT NOT NULL,
    season TEXT NOT NULL,
    score1 TEXT DEFAULT NULL, -- Stored as comma-separated games: "6,6"
    score2 TEXT DEFAULT NULL, -- Stored as comma-separated games: "4,2"
    status TEXT DEFAULT 'scheduled' -- 'scheduled', 'completed'
  );
`);

// Seed dummy data if empty
const matchCount = db.prepare("SELECT COUNT(*) as count FROM matches").get() as { count: number };
if (matchCount.count === 0) {
  const dummyMatches = [
    { p1: 'Mark', p2: 'Alex', date: '2025-10-15', st: '10:00', dur: 90, surface: 'Hard', season: 'Fall 2025', s1: '6,6', s2: '4,3', status: 'completed' },
    { p1: 'Mark', p2: 'John', date: '2025-11-02', st: '14:30', dur: 120, surface: 'Clay', season: 'Fall 2025', s1: '3,6,4', s2: '6,2,6', status: 'completed' },
    { p1: 'Mark', p2: 'Sarah', date: '2026-01-10', st: '09:00', dur: 60, surface: 'Grass', season: 'Winter 2026', s1: '6,7', s2: '2,5', status: 'completed' },
    { p1: 'Mark', p2: 'Mike', date: '2026-02-20', st: '18:00', dur: 90, surface: 'Hard', season: 'Winter 2026', s1: '6,6', s2: '4,4', status: 'completed' },
    { p1: 'Mark', p2: 'David', date: '2026-02-27', st: '11:00', dur: 90, surface: 'Hard', season: 'Winter 2026', s1: null, s2: null, status: 'scheduled' },
  ];

  const insertMatch = db.prepare("INSERT INTO matches (player1, player2, date, start_time, duration, surface, season, score1, score2, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  dummyMatches.forEach(m => insertMatch.run(m.p1, m.p2, m.date, m.st, m.dur, m.surface, m.season, m.s1, m.s2, m.status));
  
  const insertPlayer = db.prepare("INSERT OR IGNORE INTO players (name) VALUES (?)");
  ['Alex', 'John', 'Sarah', 'Mike', 'David'].forEach(name => insertPlayer.run(name));

  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('user_name', 'Mark')").run();
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('default_start_time', '10:00')").run();
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('default_duration', '90')").run();
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('surfaces', 'Clay,Grass,Hard,Carpet')").run();
}

async function startServer() {
  console.log("Starting server...");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
  // Trust proxy for secure cookies in AI Studio iframe
  app.set('trust proxy', 1);

  app.use(cookieSession({
    name: 'session',
    keys: ['tennis-pro-secret'],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: true,
    sameSite: 'none'
  }));

  const getOAuthClient = () => {
    const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/google/callback`;
    console.log("OAuth Redirect URI:", redirectUri);
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
  };

  app.get("/api/init", async (req, res) => {
    try {
      const matches = db.prepare("SELECT * FROM matches ORDER BY date DESC, start_time DESC").all();
      const seasons = db.prepare("SELECT DISTINCT season FROM matches ORDER BY season DESC").all();
      const settings = db.prepare("SELECT * FROM settings").all() as { key: string, value: string }[];
      const players = db.prepare(`
        SELECT p.name, COUNT(m.id) as match_count 
        FROM players p 
        LEFT JOIN matches m ON p.name = m.player2 
        GROUP BY p.name 
        ORDER BY match_count DESC, p.name ASC
      `).all();

      const settingsMap: Record<string, string> = {};
      settings.forEach(s => settingsMap[s.key] = s.value);

      res.json({
        matches,
        seasons: seasons.map((s: any) => s.season),
        settings: {
          userName: settingsMap.user_name || "",
          defaultStartTime: settingsMap.default_start_time || "10:00",
          defaultDuration: settingsMap.default_duration || "90",
          surfaces: settingsMap.surfaces ? settingsMap.surfaces.split(',') : ['Clay', 'Grass', 'Hard', 'Carpet']
        },
        players: players.map((p: any) => p.name),
        googleConnected: !!req.session?.tokens
      });
    } catch (error) {
      console.error('Error initializing data', error);
      res.status(500).json({ error: "Failed to initialize data" });
    }
  });

  // API Routes
  app.get("/health", (req, res) => {
    res.send("OK");
  });

  app.get("/api/auth/google/url", (req, res) => {
    const oauth2Client = getOAuthClient();
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      prompt: 'consent'
    });
    res.json({ url });
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    const oauth2Client = getOAuthClient();
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      req.session!.tokens = tokens;
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error getting tokens', error);
      res.status(500).send('Authentication failed');
    }
  });

  app.get("/api/auth/google/status", (req, res) => {
    res.json({ connected: !!req.session?.tokens });
  });

  app.post("/api/calendar/event", async (req, res) => {
    if (!req.session?.tokens) {
      return res.status(401).json({ error: "Not connected to Google Calendar" });
    }

    const { opponent, surface, date, startTime, duration } = req.body;
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials(req.session.tokens);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(startDateTime.getTime() + (duration || 90) * 60000);

    try {
      await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: `Tennis with ${opponent} - ${surface}`,
          start: { dateTime: startDateTime.toISOString() },
          end: { dateTime: endDateTime.toISOString() },
        },
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Error creating calendar event', error);
      res.status(500).json({ error: "Failed to create calendar event" });
    }
  });

  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all() as { key: string, value: string }[];
    const result: Record<string, string> = {};
    settings.forEach(s => result[s.key] = s.value);
    res.json({
      userName: result.user_name || "",
      defaultStartTime: result.default_start_time || "10:00",
      defaultDuration: result.default_duration || "90",
      surfaces: result.surfaces ? result.surfaces.split(',') : ['Clay', 'Grass', 'Hard', 'Carpet']
    });
  });

  app.post("/api/settings", (req, res) => {
    const { userName, defaultStartTime, defaultDuration, surfaces } = req.body;
    const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    if (userName !== undefined) upsert.run('user_name', userName);
    if (defaultStartTime !== undefined) upsert.run('default_start_time', defaultStartTime);
    if (defaultDuration !== undefined) upsert.run('default_duration', defaultDuration.toString());
    if (surfaces !== undefined) upsert.run('surfaces', Array.isArray(surfaces) ? surfaces.join(',') : surfaces);
    res.json({ success: true });
  });

  app.get("/api/players", (req, res) => {
    // Sort by match count descending
    const players = db.prepare(`
      SELECT p.name, COUNT(m.id) as match_count 
      FROM players p 
      LEFT JOIN matches m ON p.name = m.player2 
      GROUP BY p.name 
      ORDER BY match_count DESC, p.name ASC
    `).all();
    res.json(players.map((p: any) => p.name));
  });

  app.post("/api/players", (req, res) => {
    const { name } = req.body;
    try {
      db.prepare("INSERT INTO players (name) VALUES (?)").run(name);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Player already exists" });
    }
  });

  app.delete("/api/players/:name", (req, res) => {
    const { name } = req.params;
    db.prepare("DELETE FROM players WHERE name = ?").run(name);
    res.json({ success: true });
  });

  app.get("/api/matches", (req, res) => {
    const matches = db.prepare("SELECT * FROM matches ORDER BY date DESC, start_time DESC").all();
    res.json(matches);
  });

  app.post("/api/matches", (req, res) => {
    const { player1, player2, date, startTime, duration, surface, season } = req.body;
    
    // Save player2 if not exists
    db.prepare("INSERT OR IGNORE INTO players (name) VALUES (?)").run(player2);

    const info = db.prepare(
      "INSERT INTO matches (player1, player2, date, start_time, duration, surface, season, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')"
    ).run(player1, player2, date, startTime, duration, surface, season);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/matches/:id", (req, res) => {
    const { id } = req.params;
    const { player1, player2, date, start_time, duration, surface, season, score1, score2, status } = req.body;
    
    db.prepare(`
      UPDATE matches 
      SET player1 = ?, player2 = ?, date = ?, start_time = ?, duration = ?, surface = ?, season = ?, score1 = ?, score2 = ?, status = ? 
      WHERE id = ?
    `).run(player1, player2, date, start_time, duration, surface, season, score1, score2, status, id);
    
    res.json({ success: true });
  });

  app.put("/api/matches/:id/score", (req, res) => {
    const { id } = req.params;
    const { score1, score2 } = req.body; // Expecting strings like "6,6"
    db.prepare(
      "UPDATE matches SET score1 = ?, score2 = ?, status = 'completed' WHERE id = ?"
    ).run(score1, score2, id);
    res.json({ success: true });
  });

  app.get("/api/seasons", (req, res) => {
    const seasons = db.prepare("SELECT DISTINCT season FROM matches ORDER BY season DESC").all();
    res.json(seasons.map((s: any) => s.season));
  });

  app.get("/api/stats", (req, res) => {
    const totalGames = db.prepare("SELECT COUNT(*) as count FROM matches WHERE status = 'completed'").get();
    const matches = db.prepare("SELECT * FROM matches WHERE status = 'completed'").all();
    res.json({ totalGames: totalGames.count, matches });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite middleware...");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware initialized.");
    } catch (e) {
      console.error("Failed to initialize Vite middleware:", e);
    }
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
