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

// ─── LİDERLİK TABLOSU ───

// Tabloyu oluştur (varsa atla)
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
`);

// Liderlik tablosunu getir
app.get('/api/leaderboard', (req, res) => {
    const kills  = db.prepare('SELECT username, kills  AS value FROM leaderboard ORDER BY kills  DESC').all();
    const deaths = db.prepare('SELECT username, deaths AS value FROM leaderboard ORDER BY deaths DESC').all();
    const online = db.prepare('SELECT username, online_hours AS value FROM leaderboard ORDER BY online_hours DESC').all();
    res.json({ kills, deaths, online });
});

// Liderlik tablosunu güncelle (admin)
app.post('/api/leaderboard/update', (req, res) => {
    const { password, username, kills, deaths, online_hours } = req.body;
    if (password !== ADMIN_PASS) return res.status(401).json({ error: 'Yetkisiz erişim' });
    db.prepare(`
    INSERT INTO leaderboard (username, kills, deaths, online_hours)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(username) DO UPDATE SET
      kills = excluded.kills,
      deaths = excluded.deaths,
      online_hours = excluded.online_hours
  `).run(username, kills ?? 0, deaths ?? 0, online_hours ?? 0);
    res.json({ success: true });
});

// ─── KULLANICI SİSTEMİ ───
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
    try {
        const hashed = await bcrypt.hash(password, 10);
        db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashed);
        res.json({ message: 'Kayıt başarılı!' });
    } catch {
        res.status(400).json({ error: 'Bu kullanıcı adı zaten alınmış' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return res.status(400).json({ error: 'Kullanıcı bulunamadı' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Yanlış şifre' });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username, credits: user.credits, role: user.role });
});

app.get('/', (req, res) => {
    res.json({ message: 'LahmacunSMP API çalışıyor!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor`);
});