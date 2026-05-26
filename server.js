const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

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

// --- HỆ THỐNG DATABASE CỤC BỘ ---
const dbFile = path.join(__dirname, 'database.json'); // Đưa file data ra thư mục gốc
let dbData = { players: {} };

// Tải dữ liệu từ file lên RAM khi khởi động Server
if (fs.existsSync(dbFile)) {
    try { dbData = JSON.parse(fs.readFileSync(dbFile, 'utf8')); } catch(e) { console.error("Lỗi đọc Database:", e); }
}

// Đảm bảo cấu trúc dữ liệu luôn tồn tại sau khi đọc file
if (!dbData.accounts) dbData.accounts = {};
if (!dbData.players) dbData.players = {};

// Hàm lưu dữ liệu xuống ổ cứng
function saveDatabase() {
    fs.writeFile(dbFile, JSON.stringify(dbData, null, 2), (err) => {
        if (err) console.error("Lỗi lưu Database:", err);
    });
}

// Lấy danh sách Top 10 Bảng Xếp Hạng
function getLeaderboard() {
    return Object.values(dbData.players)
        .filter(p => p.bestWave > 0)
        .sort((a, b) => b.bestWave - a.bestWave)
        .slice(0, 10);
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
app.post('/api/save', (req, res) => {
    const { id, data } = req.body;
    if (!id) return res.status(400).json({ error: "Missing ID" });
    
    dbData.players[id] = { ...dbData.players[id], ...data, id: id };
    saveDatabase();
    
    // Gửi thông báo cho toàn Server cập nhật BXH ngay lập tức
    io.emit('leaderboardUpdated', getLeaderboard());
    io.emit('playerDataUpdated', { id: id, data: dbData.players[id] });
    res.json({ success: true });
});

app.get('/api/load/:id', (req, res) => {
    const player = dbData.players[req.params.id] || null;
    res.json(player);
});

app.get('/api/leaderboard', (req, res) => {
    res.json(getLeaderboard());
});

app.get('/api/admin/players', (req, res) => {
    const allPlayers = Object.values(dbData.players)
        .sort((a, b) => (b.bestWave || 0) - (a.bestWave || 0))
        .slice(0, 50);
    res.json(allPlayers);
});

// --- HỆ THỐNG HÒM THƯ (MAILBOX) ---
app.get('/api/mail/:id', (req, res) => {
    const player = dbData.players[req.params.id];
    if (!player) return res.json([]);
    res.json(player.mailbox || []);
});

app.post('/api/mail/claim', (req, res) => {
    const { playerId, mailId } = req.body;
    const player = dbData.players[playerId];
    if (!player || !player.mailbox) return res.status(400).json({ error: 'Không tìm thấy thông tin người chơi!' });
    
    const mail = player.mailbox.find(m => m.id === mailId);
    if (!mail) return res.status(400).json({ error: 'Thư không tồn tại!' });
    if (mail.claimed) return res.status(400).json({ error: 'Đã nhận quà thư này rồi!' });
    
    mail.claimed = true;
    saveDatabase();
    res.json({ success: true, gold: mail.gold || 0, souls: mail.souls || 0 });
});

app.post('/api/admin/mail', (req, res) => {
    const { target, title, content, gold, souls } = req.body;
    const mail = {
        id: 'mail_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        title, content, gold, souls, claimed: false, timestamp: Date.now()
    };

    if (target === 'all') {
        for (let id in dbData.players) {
            if (!dbData.players[id].mailbox) dbData.players[id].mailbox = [];
            dbData.players[id].mailbox.push({ ...mail });
        }
    } else {
        if (!dbData.players[target]) return res.status(400).json({ error: 'Người chơi không tồn tại!' });
        if (!dbData.players[target].mailbox) dbData.players[target].mailbox = [];
        dbData.players[target].mailbox.push(mail);
    }
    saveDatabase();
    res.json({ success: true });
});

// --- HỆ THỐNG ĐĂNG KÝ / ĐĂNG NHẬP CỤC BỘ ---
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Thiếu thông tin đăng ký!" });
    if (dbData.accounts[username]) return res.status(400).json({ error: "Tên tài khoản này đã có người sử dụng!" });
    
    const id = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    dbData.accounts[username] = { password, id };
    dbData.players[id] = { id, playerName: username, bestWave: 0, gold: 0, souls: 0 };
    saveDatabase();
    
    res.json({ success: true, id, username });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const acc = dbData.accounts[username];
    if (!acc || acc.password !== password) return res.status(400).json({ error: "Sai tên tài khoản hoặc mật khẩu!" });
    
    res.json({ success: true, id: acc.id, username });
});

server.listen(3000, '0.0.0.0', () => {
    console.log('Server Game đang chạy tại cổng 3000');
});