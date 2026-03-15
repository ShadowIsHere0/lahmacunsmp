const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./database');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'lahmacunsmp_secret';
const ADMIN_PASS = '6313148su';

db.exec(`
  CREATE TABLE IF NOT EXISTS leaderboard (
    username TEXT PRIMARY KEY,
    kills INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    online_hours REAL DEFAULT 0
  );
  INSERT OR IGNORE INTO leaderboard (username) VALUES ('KuzeyHere');
  INSERT OR IGNORE INTO leaderboard (username) VALUES ('benseref729');
  INSERT OR IGNORE INTO leaderboard (username) VALUES ('Metanoid');
  INSERT OR IGNORE INTO leaderboard (username) VALUES ('Darkiyuuu');
  INSERT OR IGNORE INTO leaderboard (username) VALUES ('Booster');

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS team (
    username TEXT PRIMARY KEY,
    role TEXT DEFAULT 'ROL BEKLENIYOOR',
    description TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 99
  );

  INSERT OR IGNORE INTO team (username, role, description, sort_order) VALUES ('KuzeyHere', 'KURUCU', 'Sunucunun kurucusu ve lideri.', 0);
  INSERT OR IGNORE INTO team (username, role, description, sort_order) VALUES ('benseref729', 'REHBER', 'Yeni oyunculara yol gösteren güvenilir isim.', 1);
  INSERT OR IGNORE INTO team (username, role, description, sort_order) VALUES ('Metanoid', 'REHBER', 'Her zaman ortalikta kosturan bir oyuncu.', 2);
  INSERT OR IGNORE INTO team (username, role, description, sort_order) VALUES ('Darkiyuuu', 'ROL BEKLENIYOOR', 'Gölgelerde dolasan gizemli bir oyuncu.', 3);
  INSERT OR IGNORE INTO team (username, role, description, sort_order) VALUES ('Booster', 'ROL BEKLENIYOOR', 'Enerjisiyle ortama renk katan bir oyuncu.', 4);
  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    minecraft_username TEXT NOT NULL,
    role TEXT NOT NULL,
    answers TEXT NOT NULL,
    status TEXT DEFAULT 'bekliyor',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// BAŞVURULAR
app.post('/api/apply', (req, res) => {
  const { minecraft_username, role, answers } = req.body;
  if (!minecraft_username || !role || !answers) return res.status(400).json({ error: 'Eksik alan' });
  db.prepare('INSERT INTO applications (minecraft_username, role, answers) VALUES (?, ?, ?)').run(minecraft_username, role, JSON.stringify(answers));
  res.json({ success: true });
});

app.get('/api/applications', (req, res) => {
  const { password } = req.query;
  if (password !== ADMIN_PASS) return res.status(401).json({ error: 'Yetkisiz' });
  res.json(db.prepare('SELECT * FROM applications ORDER BY created_at DESC').all());
});

app.post('/api/applications/approve', (req, res) => {
  const { password, id } = req.body;
  if (password !== ADMIN_PASS) return res.status(401).json({ error: 'Yetkisiz' });
  const app_data = db.prepare('SELECT * FROM applications WHERE id = ?').get(id);
  if (!app_data) return res.status(404).json({ error: 'Başvuru bulunamadı' });
  db.prepare('UPDATE applications SET status = ? WHERE id = ?').run('onaylandi', id);
  try {
    db.prepare('INSERT INTO team (username, role, description) VALUES (?, ?, ?)').run(app_data.minecraft_username, app_data.role, `${app_data.role} rolüyle katıldı.`);
  } catch {
    db.prepare('UPDATE team SET role=? WHERE username=?').run(app_data.role, app_data.minecraft_username);
  }
  res.json({ success: true });
});

app.post('/api/applications/reject', (req, res) => {
  const { password, id } = req.body;
  if (password !== ADMIN_PASS) return res.status(401).json({ error: 'Yetkisiz' });
  db.prepare('UPDATE applications SET status = ? WHERE id = ?').run('reddedildi', id);
  res.json({ success: true });
});
app.get('/api/leaderboard', (req, res) => {
  const kills  = db.prepare('SELECT username, kills  AS value FROM leaderboard ORDER BY kills  DESC').all();
  const deaths = db.prepare('SELECT username, deaths AS value FROM leaderboard ORDER BY deaths DESC').all();
  const online = db.prepare('SELECT username, online_hours AS value FROM leaderboard ORDER BY online_hours DESC').all();
  res.json({ kills, deaths, online });
});

app.post('/api/leaderboard/update', (req, res) => {
  const { password, username, kills, deaths, online_hours } = req.body;
  if (password !== ADMIN_PASS) return res.status(401).json({ error: 'Yetkisiz' });
  db.prepare(`INSERT INTO leaderboard (username, kills, deaths, online_hours) VALUES (?, ?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET kills=excluded.kills, deaths=excluded.deaths, online_hours=excluded.online_hours
  `).run(username, kills ?? 0, deaths ?? 0, online_hours ?? 0);
  res.json({ success: true });
});

// DUYURULAR
app.get('/api/announcements', (req, res) => {
  res.json(db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all());
});

app.post('/api/announcements/add', (req, res) => {
  const { password, title, description, date } = req.body;
  if (password !== ADMIN_PASS) return res.status(401).json({ error: 'Yetkisiz' });
  if (!title || !description || !date) return res.status(400).json({ error: 'Eksik alan' });
  const r = db.prepare('INSERT INTO announcements (title, description, date) VALUES (?, ?, ?)').run(title, description, date);
  res.json({ success: true, id: r.lastInsertRowid });
});

app.post('/api/announcements/delete', (req, res) => {
  const { password, id } = req.body;
  if (password !== ADMIN_PASS) return res.status(401).json({ error: 'Yetkisiz' });
  db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
  res.json({ success: true });
});

// KADRO
app.get('/api/team', (req, res) => {
  res.json(db.prepare('SELECT * FROM team ORDER BY sort_order ASC').all());
});

app.post('/api/team/update', (req, res) => {
  const { password, username, role, description } = req.body;
  if (password !== ADMIN_PASS) return res.status(401).json({ error: 'Yetkisiz' });
  db.prepare('UPDATE team SET role=?, description=? WHERE username=?').run(role, description, username);
  res.json({ success: true });
});

app.post('/api/team/add', (req, res) => {
  const { password, username, role, description } = req.body;
  if (password !== ADMIN_PASS) return res.status(401).json({ error: 'Yetkisiz' });
  try {
    db.prepare('INSERT INTO team (username, role, description) VALUES (?, ?, ?)').run(username, role || 'ROL BEKLENIYOOR', description || '');
    res.json({ success: true });
  } catch { res.status(400).json({ error: 'Kullanici zaten mevcut' }); }
});

app.post('/api/team/delete', (req, res) => {
  const { password, username } = req.body;
  if (password !== ADMIN_PASS) return res.status(401).json({ error: 'Yetkisiz' });
  db.prepare('DELETE FROM team WHERE username=?').run(username);
  res.json({ success: true });
});

app.get('/', (req, res) => res.json({ message: 'LahmacunSMP API calisiyor!' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda calisiyor`));
