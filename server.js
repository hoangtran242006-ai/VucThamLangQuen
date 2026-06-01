const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Pool } = require('pg'); // Gọi thư viện PostgreSQL

// Khởi tạo kết nối thẳng tới Supabase
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { 
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Cấu hình Express
app.use(express.json());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    if (req.method === 'OPTIONS') return res.status(200).end();
    next();
});

// Phục vụ các file tĩnh (Frontend)
app.use(express.static(__dirname));

// --- HÀM HỖ TRỢ TRUY XUẤT DATABASE ---
async function getLeaderboard() {
    try {
        const result = await db.query('SELECT player_name as "playerName", best_wave as "bestWave" FROM players WHERE best_wave > 0 ORDER BY best_wave DESC LIMIT 10');
        return result.rows;
    } catch (error) {
        console.error("Lỗi getLeaderboard:", error);
        return [];
    }
}

// --- QUẢN LÝ WEBSOCKET (SOCKET.IO) ---
let players = {}; 
let chatHistory = [];
const MAX_CHAT_HISTORY = 15;
let connectedClients = {}; 

function broadcastOnlinePlayers() {
    io.emit('onlinePlayersList', Object.values(connectedClients));
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

// --- CÁC CỔNG API LƯU/TẢI DỮ LIỆU (Đã nối Supabase) ---

app.post('/api/save', async (req, res) => {
    const { id, data } = req.body;
    if (!id) return res.status(400).json({ error: "Missing ID" });
    
    try {
        await db.query(`
            INSERT INTO players (id, player_name, best_wave, gold, souls, race_id, owned_skins, equipped_skin, mailbox, index_data)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO UPDATE SET 
                player_name = EXCLUDED.player_name, best_wave = EXCLUDED.best_wave, gold = EXCLUDED.gold, souls = EXCLUDED.souls, race_id = EXCLUDED.race_id, owned_skins = EXCLUDED.owned_skins, equipped_skin = EXCLUDED.equipped_skin, mailbox = EXCLUDED.mailbox, index_data = EXCLUDED.index_data, last_updated = NOW()
        `, [
            id,
            data.playerName || 'Ẩn danh',
            data.bestWave || 1, 
            data.gold || 0, 
            data.souls || 0, 
            data.raceId || 'human',
            JSON.stringify(data.ownedSkins || []), 
            data.equippedSkin || 'blue',
            JSON.stringify(data.mailbox || []), 
            JSON.stringify(data.indexData || {})
        ]);

        // Thông báo cập nhật Leaderboard cho mọi người
        const topPlayers = await getLeaderboard();
        io.emit('leaderboardUpdated', topPlayers);
        
        io.emit('playerDataUpdated', { id: id, data });
        res.json({ success: true });
    } catch (error) {
        console.error("Lỗi lưu game:", error);
        res.status(500).json({ error: "Lỗi lưu database" });
    }
});

app.get('/api/load/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM players WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.json(null);
        
        const p = result.rows[0];
        res.json({
            id: p.id,
            playerName: p.player_name,
            bestWave: p.best_wave,
            gold: parseInt(p.gold),
            souls: parseInt(p.souls),
            raceId: p.race_id,
            ownedSkins: p.owned_skins,
            equippedSkin: p.equipped_skin,
            mailbox: p.mailbox,
            indexData: p.index_data
        });
    } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
        res.status(500).json({ error: "Lỗi hệ thống" });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    const topPlayers = await getLeaderboard();
    res.json(topPlayers);
});

app.get('/api/admin/players', async (req, res) => {
    try {
        // Trả về top 50 cho admin
        const result = await db.query('SELECT id, player_name as "playerName", best_wave as "bestWave", gold, souls FROM players ORDER BY best_wave DESC LIMIT 50');
        res.json(result.rows);
    } catch (error) {
        res.json([]);
    }
});

// --- HỆ THỐNG HÒM THƯ (MAILBOX) ---
app.get('/api/mail/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT mailbox FROM players WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.json([]);
        res.json(result.rows[0].mailbox || []);
    } catch (error) {
        res.json([]);
    }
});

app.post('/api/mail/claim', async (req, res) => {
    const { playerId, mailId } = req.body;
    try {
        const result = await db.query('SELECT mailbox FROM players WHERE id = $1', [playerId]);
        if (result.rows.length === 0) return res.status(400).json({ error: 'Không tìm thấy thông tin người chơi!' });
        
        let mailbox = result.rows[0].mailbox || [];
        const mailIndex = mailbox.findIndex(m => m.id === mailId);
        
        if (mailIndex === -1) return res.status(400).json({ error: 'Thư không tồn tại!' });
        if (mailbox[mailIndex].claimed) return res.status(400).json({ error: 'Đã nhận quà thư này rồi!' });
        
        mailbox[mailIndex].claimed = true;
        await db.query('UPDATE players SET mailbox = $1 WHERE id = $2', [JSON.stringify(mailbox), playerId]);
        
        res.json({ success: true, gold: mailbox[mailIndex].gold || 0, souls: mailbox[mailIndex].souls || 0 });
    } catch (error) {
        console.error("Lỗi nhận thư:", error);
        res.status(500).json({ error: "Lỗi hệ thống" });
    }
});

app.post('/api/admin/mail', async (req, res) => {
    const { target, title, content, gold, souls } = req.body;
    const newMail = {
        id: 'mail_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        title, content, gold, souls, claimed: false, timestamp: Date.now()
    };

    try {
        if (target === 'all') {
            const allPlayers = await db.query('SELECT id, mailbox FROM players');
            for (let player of allPlayers.rows) {
                let mailbox = player.mailbox || [];
                mailbox.push(newMail);
                await db.query('UPDATE players SET mailbox = $1 WHERE id = $2', [JSON.stringify(mailbox), player.id]);
            }
        } else {
            const playerRes = await db.query('SELECT mailbox FROM players WHERE id = $1', [target]);
            if (playerRes.rows.length === 0) return res.status(400).json({ error: 'Người chơi không tồn tại!' });
            
            let mailbox = playerRes.rows[0].mailbox || [];
            mailbox.push(newMail);
            await db.query('UPDATE players SET mailbox = $1 WHERE id = $2', [JSON.stringify(mailbox), target]);
        }
        res.json({ success: true });
    } catch (error) {
        console.error("Lỗi gửi thư:", error);
        res.status(500).json({ error: "Lỗi hệ thống" });
    }
});

// --- HỆ THỐNG ĐĂNG KÝ / ĐĂNG NHẬP (Chuẩn SQL) ---
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Thiếu thông tin đăng ký!" });
    
    try {
        const check = await db.query('SELECT * FROM accounts WHERE username = $1', [username]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Tên tài khoản này đã có người sử dụng!" });

        const id = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        
        // Lưu thông tin đăng nhập
        await db.query('INSERT INTO accounts (username, password, player_id) VALUES ($1, $2, $3)', [username, password, id]);
        
        // Khởi tạo hồ sơ nhân vật
        await db.query('INSERT INTO players (id, player_name, best_wave, gold, souls) VALUES ($1, $2, 0, 0, 0)', [id, username]);
        
        res.json({ success: true, id, username });
    } catch (error) {
        console.error("Lỗi đăng ký:", error);
        res.status(500).json({ error: "Lỗi hệ thống đăng ký" });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const acc = await db.query('SELECT * FROM accounts WHERE username = $1', [username]);
        
        if (acc.rows.length === 0 || acc.rows[0].password !== password) {
            return res.status(400).json({ error: "Sai tên tài khoản hoặc mật khẩu!" });
        }

        res.json({ success: true, id: acc.rows[0].player_id, username });
    } catch (error) {
        console.error("Lỗi hệ thống khi đăng nhập:", error);
        res.status(500).json({ error: "Lỗi hệ thống" });
    }
});

server.listen(3000, '0.0.0.0', () => {
    console.log('✅ Server Game Vực Thẳm Lãng Quên đang chạy tại cổng 3000 (Supabase Cloud)');
});