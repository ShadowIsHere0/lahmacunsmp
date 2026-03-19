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

// MESAJLAŞMA
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender TEXT NOT NULL,
    receiver TEXT NOT NULL,
    content TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Mesaj gönder
app.post('/api/messages/send', (req, res) => {
  const { sender, receiver, content } = req.body;
  if (!sender || !receiver || !content) return res.status(400).json({ error: 'Eksik alan' });
  if (content.length > 500) return res.status(400).json({ error: 'Mesaj çok uzun' });

  // Spam önleme: aynı kişiden son 2 saniyede mesaj var mı?
  const lastMsg = db.prepare(`
    SELECT * FROM messages WHERE sender = ? AND sent_at > datetime('now', '-2 seconds')
  `).get(sender);
  if (lastMsg) return res.status(429).json({ error: 'Çok hızlı mesaj gönderiyorsun!' });

  db.prepare('INSERT INTO messages (sender, receiver, content) VALUES (?, ?, ?)').run(sender, receiver, content);
  res.json({ success: true });
});

// Sohbet geçmişi
app.get('/api/messages/conversation', (req, res) => {
  const { user1, user2 } = req.query;
  if (!user1 || !user2) return res.status(400).json({ error: 'Eksik alan' });
  const msgs = db.prepare(`
    SELECT * FROM messages 
    WHERE (sender=? AND receiver=?) OR (sender=? AND receiver=?)
    ORDER BY sent_at ASC LIMIT 50
  `).all(user1, user2, user2, user1);
  res.json(msgs);
});

// Yeni mesajlar (polling için)
app.get('/api/messages/new', (req, res) => {
  const { username, since } = req.query;
  if (!username) return res.status(400).json({ error: 'Eksik alan' });
  const sinceDate = since || new Date(Date.now() - 5000).toISOString();
  const msgs = db.prepare(`
    SELECT * FROM messages WHERE receiver=? AND sent_at > ? ORDER BY sent_at ASC
  `).all(username, sinceDate);
  res.json(msgs);
});

// Konuşmalar listesi
app.get('/api/messages/conversations', (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Eksik alan' });
  const convs = db.prepare(`
    SELECT DISTINCT 
      CASE WHEN sender=? THEN receiver ELSE sender END as other_user,
      MAX(sent_at) as last_at,
      (SELECT content FROM messages m2 WHERE (m2.sender=messages.sender AND m2.receiver=messages.receiver) OR (m2.sender=messages.receiver AND m2.receiver=messages.sender) ORDER BY m2.sent_at DESC LIMIT 1) as last_message,
      (SELECT COUNT(*) FROM messages m3 WHERE m3.receiver=? AND m3.sender=(CASE WHEN messages.sender=? THEN messages.receiver ELSE messages.sender END) AND m3.read=0) as unread
    FROM messages WHERE sender=? OR receiver=?
    GROUP BY other_user ORDER BY last_at DESC
  `).all(username, username, username, username, username);
  res.json(convs);
});

// Mesajları okundu işaretle
app.post('/api/messages/read', (req, res) => {
  const { username, other_user } = req.body;
  db.prepare('UPDATE messages SET read=1 WHERE receiver=? AND sender=?').run(username, other_user);
  res.json({ success: true });
});

// OY SİSTEMİ
db.exec(`
  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    minecraft_username TEXT NOT NULL,
    ip TEXT,
    rewarded INTEGER DEFAULT 0,
    voted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Oy ver
app.post('/api/vote', (req, res) => {
  const { minecraft_username } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!minecraft_username) return res.status(400).json({ error: 'Kullanıcı adı gerekli' });

  // Son 24 saatte aynı kullanıcı veya IP oy vermiş mi?
  const lastVoteByUser = db.prepare(`
    SELECT * FROM votes WHERE minecraft_username = ? AND voted_at > datetime('now', '-24 hours')
  `).get(minecraft_username);

  if (lastVoteByUser) {
    const nextVote = new Date(lastVoteByUser.voted_at);
    nextVote.setHours(nextVote.getHours() + 24);
    return res.status(400).json({ error: 'Zaten oy verdin!', next_vote: nextVote });
  }

  db.prepare('INSERT INTO votes (minecraft_username, ip) VALUES (?, ?)').run(minecraft_username, ip);
  
  // Liderlik tablosuna oyuncu yoksa ekle
  db.prepare(`INSERT OR IGNORE INTO leaderboard (username) VALUES (?)`).run(minecraft_username);

  res.json({ success: true, message: 'Oy verildi! Ödülün sunucuya girince verilecek.' });
});

// Oy durumu sorgula
app.get('/api/vote/status', (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Kullanıcı adı gerekli' });
  
  const lastVote = db.prepare(`
    SELECT * FROM votes WHERE minecraft_username = ? ORDER BY voted_at DESC LIMIT 1
  `).get(username);

  if (!lastVote) return res.json({ can_vote: true });

  const nextVote = new Date(lastVote.voted_at);
  nextVote.setHours(nextVote.getHours() + 24);
  const canVote = new Date() > nextVote;

  res.json({ can_vote: canVote, next_vote: nextVote, last_vote: lastVote.voted_at });
});

// Bekleyen ödüller (plugin tarafından çekilecek)
app.get('/api/vote/pending', (req, res) => {
  const { password } = req.query;
  if (password !== ADMIN_PASS) return res.status(401).json({ error: 'Yetkisiz' });
  const pending = db.prepare(`
    SELECT * FROM votes WHERE rewarded = 0 ORDER BY voted_at ASC
  `).all();
  res.json(pending);
});

// Ödül verildi işaretle
app.post('/api/vote/rewarded', (req, res) => {
  const { password, id } = req.body;
  if (password !== ADMIN_PASS) return res.status(401).json({ error: 'Yetkisiz' });
  db.prepare('UPDATE votes SET rewarded = 1 WHERE id = ?').run(id);
  res.json({ success: true });
});

// Oy liderlik tablosu
app.get('/api/vote/leaderboard', (req, res) => {
  const rows = db.prepare(`
    SELECT minecraft_username, COUNT(*) as total_votes 
    FROM votes GROUP BY minecraft_username ORDER BY total_votes DESC LIMIT 10
  `).all();
  res.json(rows);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda calisiyor`));
async function oyVer() {
    const oyuncuAdi = document.getElementById("minecraft-kullanici-adin").value; // HTML'deki kutunun ID'si bu olmalı
    const webhookURL = "BURAYA_DISCORDDAN_ALDIĞIN_URLYİ_YAPIŞTIR";

    if (!oyuncuAdi) {
        alert("Kanka ismini yazmadın, lahmacunlar boşa gitmesin!");
        return;
    }

    const mesaj = {
        content: `📢 **[YENİ OY]** \nKullanıcı: **${oyuncuAdi}** \nKomut: \`/crates openfor ${oyuncuAdi} lahmacun_kasasi\``
    };

    try {
        await fetch(webhookURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mesaj)
        });
        alert("Oy verildi kanka! Sunucuya girince ödülün hazır.");
    } catch (error) {
        alert("Kanka bir hata oldu, Discord'a haber gitmedi!");
    }
}
