require('dotenv').config();
const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function backupData() {
    try {
        console.log('⏳ Đang kết nối tải dữ liệu từ Supabase về máy...');
        const accountsRes = await pool.query('SELECT * FROM accounts');
        const playersRes = await pool.query('SELECT * FROM players');

        const db = {
            accounts: {},
            players: {}
        };

        accountsRes.rows.forEach(acc => {
            db.accounts[acc.username] = {
                id: acc.player_id,
                password: acc.password
            };
        });

        playersRes.rows.forEach(p => {
            db.players[p.id] = {
                playerName: p.player_name,
                bestWave: p.best_wave,
                gold: p.gold ? parseInt(p.gold) : 0,
                souls: p.souls ? parseInt(p.souls) : 0,
                raceId: p.race_id,
                ownedSkins: p.owned_skins || [],
                equippedSkin: p.equipped_skin,
                mailbox: p.mailbox || [],
                indexData: p.index_data || {}
            };
        });

        fs.writeFileSync('./database.json', JSON.stringify(db, null, 4), 'utf8');
        console.log('✅ Đã sao lưu toàn bộ dữ liệu thành công vào file database.json!');
    } catch (err) {
        console.error('❌ Lỗi sao lưu:', err);
    } finally {
        await pool.end();
        process.exit();
    }
}

backupData();