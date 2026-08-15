const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'gizli_anahtar_buraya';

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Veri Tabanı Bağlantısı
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('Veri tabanı hatası:', err.message);
    else console.log('SQLite veri tabanına bağlandı.');
});

db.run(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'user'
    )
`);

// 1. /admin Adresine Girildiğinde Admin Sayfasını Göster
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 2. Kullanıcı Kayıt
// Kayıt olan her yeni kullanıcıyı direkt 'admin' yapar
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Eksik bilgi!' });

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, [username, hashedPassword, 'user'], function(err) {
        if (err) return res.status(400).json({ error: 'Kullanıcı adı zaten var.' });
        res.json({ message: 'Kullanıcı kaydı başarılı!' });
    });
});

// 3. Kullanıcı ve Admin Girişi
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'Kullanıcı bulunamadı.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Hatalı şifre!' });

        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ message: 'Giriş başarılı!', token, role: user.role });
    });
});

// Middleware: Token & Admin Doğrulama
function authenticateAdmin(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Yetkisiz erişim!' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err || user.role !== 'admin') {
            return res.status(403).json({ error: 'Bu alana sadece yöneticiler girebilir!' });
        }
        req.user = user;
        next();
    });
}

// 4. Admin Verileri (Tüm Kullanıcı Listesi)
app.get('/api/admin/users', authenticateAdmin, (req, res) => {
    db.all(`SELECT id, username, role FROM users`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Veriler çekilemedi.' });
        res.json({ users: rows });
    });
});

// Admin Kullanıcı Silme Endpoint'i
app.delete('/api/admin/users/:id', authenticateAdmin, (req, res) => {
    const userId = req.params.id;

    db.run(`DELETE FROM users WHERE id = ?`, [userId], function(err) {
        if (err) return res.status(500).json({ error: 'Kullanıcı silinemedi.' });
        if (this.changes === 0) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

        res.json({ message: 'Kullanıcı başarıyla silindi.' });
    });
});

app.listen(PORT, () => console.log(`Sunucu http://localhost:${PORT} adresinde aktif!`));