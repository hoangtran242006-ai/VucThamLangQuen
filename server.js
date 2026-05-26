const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { 
        origin: "*", // Cho phép mọi domain (kể cả GitHub Pages) kết nối
        methods: ["GET", "POST"]
    }
});

// Cấu hình Express để đọc dữ liệu JSON và vượt tường lửa CORS
app.use(express.json());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    // Xử lý Preflight Request (Cực kỳ quan trọng khi Frontend và Backend khác Domain)
    if (req.method === 'OPTIONS') return res.status(200).end();
    next();
});

// Phục vụ trực tiếp các file game (HTML, CSS, JS, Hình ảnh) thay cho Live Server
app.use(express.static(__dirname));

// --- HỆ THỐNG DATABASE SUPABASE (POSTGRESQL) ---
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false } // Bắt buộc khi kết nối với Supabase
});

// Khởi tạo bảng nếu chưa có
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS accounts (
                username VARCHAR PRIMARY KEY,
                password VARCHAR NOT NULL,
                player_id VARCHAR NOT NULL
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS players (
                id VARCHAR PRIMARY KEY,
                data JSONB NOT NULL
            );
        `);
        console.log('✅ Đã kết nối thành công tới Supabase PostgreSQL!');
    } catch (err) {
        console.error('❌ Lỗi kết nối Database:', err);
    }
}
initDB();

// Lấy danh sách Top 10 Bảng Xếp Hạng
async function getLeaderboard() {
    try {
        const res = await pool.query(`SELECT data FROM players WHERE (data->>'bestWave')::int > 0 ORDER BY (data->>'bestWave')::int DESC LIMIT 10`);
        return res.rows.map(row => row.data);
    } catch (err) {
        console.error("Lỗi getLeaderboard:", err);
        return [];
    }
}

let players = {}; 
let chatHistory = [];
const MAX_CHAT_HISTORY = 15;
let connectedClients = {}; // { socketId: playerName }

function broadcastOnlinePlayers() {
    const onlineList = Object.values(connectedClients);
    io.emit('onlinePlayersList', onlineList);
}

io.on('connection', (socket) => {
    console.log('Có người vào game, ID:', socket.id);
    
    connectedClients[socket.id] = "Đang kết nối...";
    broadcastOnlinePlayers();

    // Gửi lịch sử chat ngay khi kết nối
    socket.emit('chatHistory', chatHistory);

    socket.on('ping', (clientTime) => {
        socket.emit('pong', clientTime);
    });

    socket.on('registerName', (name) => {
        connectedClients[socket.id] = name;
        broadcastOnlinePlayers();
    });

    socket.on('joinMultiplayer', (playerData) => {
        connectedClients[socket.id] = playerData.playerName;
        broadcastOnlinePlayers();

        const room = playerData.gameMode || 'coop';
        socket.join(room);
        playerData.room = room;
        players[socket.id] = playerData;
        
        const playersInRoom = {};
        for (let id in players) {
            if (players[id].room === room) {
                playersInRoom[id] = players[id];
            }
        }
        
        socket.to(room).emit('playerJoined', { id: socket.id, data: playerData });
        socket.emit('currentPlayers', playersInRoom);
    });

    socket.on('updateState', (data) => {
        if (players[socket.id]) {
            const room = players[socket.id].room;
            players[socket.id] = { ...data, room };
            socket.to(room).emit('playerStateUpdated', { id: socket.id, data });
        }
    });

    socket.on('leaveMultiplayer', () => {
        if (players[socket.id]) {
            const room = players[socket.id].room;
            socket.leave(room);
            socket.to(room).emit('playerLeft', socket.id);
            delete players[socket.id];
        }
    });

    socket.on('revivePlayer', (targetId) => {
        io.to(targetId).emit('revive');
    });

    socket.on('sendChat', (messageData) => {
        const msg = { id: Date.now().toString(), ...messageData, timestamp: Date.now() };
        chatHistory.push(msg);
        if (chatHistory.length > MAX_CHAT_HISTORY) chatHistory.shift();
        io.emit('newChatMessage', msg);
    });

    socket.on('disconnect', () => {
        console.log('Người chơi thoát:', socket.id);
        delete connectedClients[socket.id];
        broadcastOnlinePlayers();
        if (players[socket.id]) {
            const room = players[socket.id].room;
            socket.to(room).emit('playerLeft', socket.id);
            delete players[socket.id];
        }
    });
});

// --- CÁC CỔNG API LƯU/TẢI DỮ LIỆU ---
app.post('/api/save', async (req, res) => {
    const { id, data } = req.body;
    if (!id) return res.status(400).json({ error: "Missing ID" });
    
    try {
        const curr = await pool.query('SELECT data FROM players WHERE id = $1', [id]);
        let playerData = curr.rows.length > 0 ? curr.rows[0].data : {};
        playerData = { ...playerData, ...data, id: id };
        
        await pool.query(`
            INSERT INTO players (id, data) VALUES ($1, $2) 
            ON CONFLICT (id) DO UPDATE SET data = $2
        `, [id, playerData]);
        
        // Gửi thông báo cho toàn Server cập nhật BXH ngay lập tức
        io.emit('leaderboardUpdated', await getLeaderboard());
        io.emit('playerDataUpdated', { id: id, data: playerData });
        res.json({ success: true });
    } catch (err) {
        console.error("Lỗi /api/save:", err);
        res.status(500).json({ error: "Lỗi Server Database" });
    }
});

app.get('/api/load/:id', async (req, res) => {
    try {
        const curr = await pool.query('SELECT data FROM players WHERE id = $1', [req.params.id]);
        const player = curr.rows.length > 0 ? curr.rows[0].data : null;
        res.json(player);
    } catch (err) {
        console.error("Lỗi /api/load:", err);
        res.status(500).json({ error: "Lỗi Server Database" });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    res.json(await getLeaderboard());
});

app.get('/api/admin/players', async (req, res) => {
    try {
        const result = await pool.query(`SELECT data FROM players ORDER BY (data->>'bestWave')::int DESC NULLS LAST LIMIT 50`);
        res.json(result.rows.map(r => r.data));
    } catch (err) {
        console.error("Lỗi /api/admin/players:", err);
        res.status(500).json({ error: "Lỗi Server Database" });
    }
});

// --- HỆ THỐNG HÒM THƯ (MAILBOX) ---
app.get('/api/mail/:id', async (req, res) => {
    try {
        const curr = await pool.query('SELECT data FROM players WHERE id = $1', [req.params.id]);
        if (curr.rows.length === 0) return res.json([]);
        res.json(curr.rows[0].data.mailbox || []);
    } catch (err) {
        res.status(500).json({ error: "Lỗi Server Database" });
    }
});

app.post('/api/mail/claim', async (req, res) => {
    const { playerId, mailId } = req.body;
    try {
        const curr = await pool.query('SELECT data FROM players WHERE id = $1', [playerId]);
        if (curr.rows.length === 0) return res.status(400).json({ error: 'Không tìm thấy thông tin người chơi!' });
        
        let player = curr.rows[0].data;
        if (!player.mailbox) return res.status(400).json({ error: 'Thư không tồn tại!' });
        
        const mail = player.mailbox.find(m => m.id === mailId);
        if (!mail) return res.status(400).json({ error: 'Thư không tồn tại!' });
        if (mail.claimed) return res.status(400).json({ error: 'Đã nhận quà thư này rồi!' });
        
        mail.claimed = true;
        await pool.query('UPDATE players SET data = $1 WHERE id = $2', [player, playerId]);
        
        res.json({ success: true, gold: mail.gold || 0, souls: mail.souls || 0 });
    } catch (err) {
        res.status(500).json({ error: "Lỗi Server Database" });
    }
});

app.post('/api/admin/mail', async (req, res) => {
    const { target, title, content, gold, souls } = req.body;
    const mail = {
        id: 'mail_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        title, content, gold, souls, claimed: false, timestamp: Date.now()
    };

    try {
        if (target === 'all') {
            const all = await pool.query('SELECT id, data FROM players');
            for (let row of all.rows) {
                let p = row.data;
                if (!p.mailbox) p.mailbox = [];
                p.mailbox.push({ ...mail });
                await pool.query('UPDATE players SET data = $1 WHERE id = $2', [p, row.id]);
            }
        } else {
            const curr = await pool.query('SELECT data FROM players WHERE id = $1', [target]);
            if (curr.rows.length === 0) return res.status(400).json({ error: 'Người chơi không tồn tại!' });
            
            let p = curr.rows[0].data;
            if (!p.mailbox) p.mailbox = [];
            p.mailbox.push(mail);
            await pool.query('UPDATE players SET data = $1 WHERE id = $2', [p, target]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Lỗi Server Database" });
    }
});

// --- HỆ THỐNG ĐĂNG KÝ / ĐĂNG NHẬP CỤC BỘ ---
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Thiếu thông tin đăng ký!" });

    try {
        const acc = await pool.query('SELECT * FROM accounts WHERE username = $1', [username]);
        if (acc.rows.length > 0) return res.status(400).json({ error: "Tên tài khoản này đã có người sử dụng!" });

        // --- BẢO MẬT: MÃ HÓA MẬT KHẨU TRƯỚC KHI LƯU ---
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const id = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        await pool.query('INSERT INTO accounts (username, password, player_id) VALUES ($1, $2, $3)', [username, hashedPassword, id]);

        const newPlayer = { id, playerName: username, bestWave: 0, gold: 0, souls: 0 };
        await pool.query('INSERT INTO players (id, data) VALUES ($1, $2)', [id, newPlayer]);

        res.json({ success: true, id, username });
    } catch (err) {
        console.error("Lỗi /api/register:", err);
        res.status(500).json({ error: "Lỗi Server Database" });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const acc = await pool.query('SELECT * FROM accounts WHERE username = $1', [username]);
        if (acc.rows.length === 0) {
            return res.status(400).json({ error: "Sai tên tài khoản hoặc mật khẩu!" });
        }

        // --- BẢO MẬT: SO SÁNH MẬT KHẨU ĐÃ MÃ HÓA ---
        const match = await bcrypt.compare(password, acc.rows[0].password);
        if (!match) {
            return res.status(400).json({ error: "Sai tên tài khoản hoặc mật khẩu!" });
        }

        res.json({ success: true, id: acc.rows[0].player_id, username });
    } catch (err) {
        console.error("Lỗi /api/login:", err);
        res.status(500).json({ error: "Lỗi Server Database" });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Game đang chạy tại cổng ${PORT}`);
});