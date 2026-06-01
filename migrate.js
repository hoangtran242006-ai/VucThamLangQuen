require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');

// Kết nối tới con database Supabase trên mây
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrateGameData() {
    try {
        // 1. Đọc file JSON cũ dưới máy
        let dbOld = { accounts: {}, players: {} };
        try {
            console.log('⏳ Đang tìm và đọc file database.json...');
            const rawData = fs.readFileSync('./database.json', 'utf8');
            dbOld = JSON.parse(rawData);
        } catch (err) {
            console.log('⚠️ Không tìm thấy file database.json cục bộ. Sẽ bỏ qua bước bơm dữ liệu cũ và chỉ tạo bảng trống!');
        }

        // 2. Tự động đập bảng cũ đi, xây lại bảng mới chuẩn xác 100% với cấu trúc game Vực Thẳm
        console.log('⏳ Đang thiết lập cấu trúc Server Supabase...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS accounts (
                username TEXT PRIMARY KEY,
                password TEXT NOT NULL,
                player_id TEXT UNIQUE NOT NULL
            );

            CREATE TABLE IF NOT EXISTS players (
                id TEXT PRIMARY KEY,
                player_name TEXT,
                best_wave INTEGER DEFAULT 1,
                gold BIGINT DEFAULT 0,
                souls BIGINT DEFAULT 0,
                race_id TEXT,
                owned_skins JSONB DEFAULT '[]'::jsonb,
                equipped_skin TEXT,
                mailbox JSONB DEFAULT '[]'::jsonb,
                index_data JSONB DEFAULT '{}'::jsonb,
                last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Tự động cập nhật cột mới nếu bảng cũ đã tồn tại mà chưa có cột này
            ALTER TABLE players ADD COLUMN IF NOT EXISTS index_data JSONB DEFAULT '{}'::jsonb;
        `);
        console.log('✅ Thiết lập cấu trúc mây thành công!');

        // 3. Bơm dữ liệu Tài khoản (Accounts)
        let accCount = 0;
        for (const [username, accData] of Object.entries(dbOld.accounts || {})) {
            await pool.query(
                'INSERT INTO accounts (username, password, player_id) VALUES ($1, $2, $3)',
                [username, accData.password, accData.id]
            );
            accCount++;
        }
        console.log(`🚀 Đã chuyển thành công ${accCount} tài khoản đăng nhập!`);

        // 4. Bơm dữ liệu Nhân vật & Trang bị (Players)
        let playerCount = 0;
        for (const [playerId, pData] of Object.entries(dbOld.players || {})) {
            await pool.query(
                `INSERT INTO players 
                (id, player_name, best_wave, gold, souls, race_id, owned_skins, equipped_skin, mailbox, index_data) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    playerId,
                    pData.playerName || 'Ẩn danh',
                    pData.bestWave || 1,
                    pData.gold || 0,
                    pData.souls || 0,
                    pData.raceId || 'human',
                    JSON.stringify(pData.ownedSkins || []),
                    pData.equippedSkin || 'blue',
                    JSON.stringify(pData.mailbox || []),
                    JSON.stringify(pData.indexData || {})
                ]
            );
            playerCount++;
        }
        console.log(`🚀 Đã chuyển thành công ${playerCount} hồ sơ nhân vật cùng hòm thư!`);
        console.log('🎉 XONG! TOÀN BỘ DỮ LIỆU ĐÃ ĐƯỢC CHUYỂN LÊN MÂY AN TOÀN!');

    } catch (error) {
        console.error('❌ Có lỗi xảy ra trong quá trình bơm:', error);
    } finally {
        await pool.end(); // Đóng kết nối
        process.exit();
    }
}

migrateGameData();