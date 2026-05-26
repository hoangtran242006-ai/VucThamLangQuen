const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const db = require('./db'); // KẾT NỐI DATABASE SUPABASE LÊN MÂY

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { 
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

app.use(express.json());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    if (req.method === 'OPTIONS') return res.status(200).end();
    next();
});

app.use(express.static(__dirname));

// --- QUẢN LÝ WEBSOCKET (GIỮ NGUYÊN) ---
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
    socket.emit('chatHistory', chatHistory);

    socket.on('ping', (clientTime) => socket.emit('pong', clientTime));
    
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
            if (players[id].room === room) playersInRoom[id] = players[id];
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

    socket.on('revivePlayer', (targetId) => io.to(targetId).emit('revive'));

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

// --- CÁC CỔNG API KẾT NỐI SUPABASE ---

// 1. Lưu Game
app.post('/api/save', async (req, res) => {
    const { id, data } = req.body;
    if (!id) return res.status(400).json({ error: "Missing ID" });
    
    try {
        await db.query(`
            UPDATE players 
            SET best_wave = $1, gold = $2, souls = $3, race_id = $4, owned_skins = $5, equipped_skin = $6, mailbox = $7, last_updated = NOW()
            WHERE id = $8
        `, [
            data.bestWave || 1, data.gold || 0, data.souls || 0, data.raceId || 'human',
            JSON.stringify(data.ownedSkins || []), data.equippedSkin || 'blue',
            JSON.stringify(data.mailbox || []), id
        ]);

        // Cập nhật BXH
        const topRes = await db.query('SELECT player_name as "playerName", best_wave as "bestWave" FROM players WHERE best_wave > 0 ORDER BY best_wave DESC LIMIT 10');
        io.emit('leaderboardUpdated', topRes.rows);
        io.emit('playerDataUpdated', { id: id, data });
        res.json({ success: true });
    } catch (error) {
        console.error("Lỗi lưu game:", error);
        res.status(500).json({ error: "Lỗi lưu database" });
    }
});

// 2. Tải Game
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
            mailbox: p.mailbox
        });
    } catch (error) {
        res.status(500).json({ error: "Lỗi tải dữ liệu" });
    }
});

// 3. Lấy Bảng Xếp Hạng
app.get('/api/leaderboard', async (req, res) => {
    try {
        const result = await db.query('SELECT player_name as "playerName", best_wave as "bestWave" FROM players WHERE best_wave > 0 ORDER BY best_wave DESC LIMIT 10');
        res.json(result.rows);
    } catch (error) {
        res.json([]);
    }
});

// 4. Lấy Hòm Thư
app.get('/api/mail/:id', async (req, res) => {
    try {
        const result = await db.query('SELECT mailbox FROM players WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.json([]);
        res.json(result.rows[0].mailbox || []);
    } catch (error) {
        res.json([]);
    }
});

// 5. Nhận Quà Từ Thư
app.post('/api/mail/claim', async (req, res) => {
    const { playerId, mailId } = req.body;
    try {
        const result = await db.query('SELECT mailbox FROM players WHERE id = $1', [playerId]);
        if (result.rows.length === 0) return res.status(400).json({ error: 'Không tìm thấy người chơi!' });
        
        let mailbox = result.rows[0].mailbox || [];
        const mailIndex = mailbox.findIndex(m => m.id === mailId);
        
        if (mailIndex === -1) return res.status(400).json({ error: 'Thư không tồn tại!' });
        if (mailbox[mailIndex].claimed) return res.status(400).json({ error: 'Đã nhận quà thư này rồi!' });
        
        mailbox[mailIndex].claimed = true;
        await db.query('UPDATE players SET mailbox = $1 WHERE id = $2', [JSON.stringify(mailbox), playerId]);
        
        res.json({ success: true, gold: mailbox[mailIndex].gold || 0, souls: mailbox[mailIndex].souls || 0 });
    } catch (error) {
        res.status(500).json({ error: "Lỗi xử lý hộp thư" });
    }
});

// 6. Đăng ký
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Thiếu thông tin!" });
    
    try {
        const check = await db.query('SELECT * FROM accounts WHERE username = $1', [username]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Tên tài khoản đã tồn tại!" });

        const id = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        await db.query('INSERT INTO accounts (username, password, player_id) VALUES ($1, $2, $3)', [username, password, id]);
        await db.query('INSERT INTO players (id, player_name) VALUES ($1, $2)', [id, username]);
        
        res.json({ success: true, id, username });
    } catch (error) {
        res.status(500).json({ error: "Lỗi đăng ký" });
    }
});

// 7. Đăng nhập
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const acc = await db.query('SELECT * FROM accounts WHERE username = $1', [username]);
        if (acc.rows.length === 0 || acc.rows[0].password !== password) {
            return res.status(400).json({ error: "Sai tên tài khoản hoặc mật khẩu!" });
        }
        res.json({ success: true, id: acc.rows[0].player_id, username });
    } catch (error) {
        res.status(500).json({ error: "Lỗi hệ thống" });
    }
});

server.listen(3000, '0.0.0.0', () => {
    console.log('✅ Server Game đang chạy tại cổng 3000 và đã đồng bộ Supabase Cloud!');
});