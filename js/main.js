// js/main.js
import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, MAP_COLS, MAP_ROWS, CANVAS_WIDTH, CANVAS_HEIGHT, TILE_TYPES, setCanvasSize } from './constants.js';
import { Weapon, Projectile, RARITY, WEAPON_TYPES } from './weapons.js';
import { Player } from './entities.js';
import { Enemy, Merchant, AlchemyTable, EliteBoss } from './enemies.js';
import { GameMap } from './map.js';
import { InputManager } from './input.js';
import { Camera } from './camera.js';
import { Menu } from './menu.js';
import { SkinManager } from './skins.js';
import { RaceManager } from './races.js';
import { syncDataToCloud, loadDataFromCloud, getTopPlayers, checkAndPromptPlayerName, changePlayerName, getAllPlayersAdmin, updatePlayerAdmin, getPlayerName, isLoggedIn, registerAccount, loginAccount, logoutAccount, getMailboxAPI, claimMailAPI, sendAdminMailAPI } from '../db.js';
import * as VFX from './vfx.js';
import { UI } from './ui.js';
import { RNG } from './rng.js';
import { Network } from './network.js';
import { ChatSystem } from './chat.js';
import { AlchemySystem } from './alchemy.js';
import { AudioManager } from './audio.js';
import { SkillManager } from './skills.js';
import { IndexSystem } from './indexSystem.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const bgm = document.getElementById('bgm');

window.addEventListener('error', (e) => {
    const loading = document.getElementById('loading-text');
    if (loading) { loading.style.display = 'block'; loading.style.color = '#ff4757'; loading.innerHTML = `⚠️ LỖI GAME:<br>${e.message}<br><span style="font-size:14px">File: ${e.filename}:${e.lineno}</span>`; }
});

let savedVolume = localStorage.getItem('vucthamlangquen_volume');
let savedMuted = localStorage.getItem('vucthamlangquen_muted');

let globalVolume = savedVolume !== null ? parseFloat(savedVolume) : 0.4;
let globalMuted = savedMuted === 'true';

// Hàm áp dụng cài đặt âm thanh toàn cục (Cho cả Menu và In-game)
function applyAudioSettings(vol, muted) {
    globalVolume = vol; globalMuted = muted;
    if (bgm) { bgm.volume = vol; bgm.muted = muted; }
    AudioManager.setMute(muted);
    try { localStorage.setItem('vucthamlangquen_volume', vol); localStorage.setItem('vucthamlangquen_muted', muted); } catch(e){}
    
    // Cập nhật trạng thái cho Menu ngoài Sảnh
    if (window.menuRef) { window.menuRef.bgmVolume = vol; window.menuRef.isMusicMuted = muted; }

    // Cập nhật giao diện Pause
    const volSlider = document.getElementById('pause-volume');
    if (volSlider) volSlider.value = vol;
    const muteBtn = document.getElementById('pause-mute-btn');
    if (muteBtn) {
        muteBtn.textContent = muted ? '🔇 Đã Tắt' : '🔊 Đang Bật';
        muteBtn.style.borderColor = muted ? '#e74c3c' : '#2ecc71';
        muteBtn.style.color = muted ? '#e74c3c' : '#2ecc71';
    }
}

const playlist = [ { name: "Nhạc nền 1", url: "music/track1.mp3" }, { name: "Nhạc nền 2", url: "music/track2.mp3" } ];
let currentTrackIndex = 0, isMusicPlaying = false, musicError = false;

const elements = {
    interactionPrompt: document.getElementById('interaction-prompt'),
    inventoryScreen: document.getElementById('inventory-screen'),
    shopScreen: document.getElementById('shop-screen'),
    chestScreen: document.getElementById('chest-screen'),
    pauseScreen: document.getElementById('pause-screen'),
    updateLogScreen: document.getElementById('update-log-screen'),
    leaderboardScreen: document.getElementById('leaderboard-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    adminScreen: document.getElementById('admin-screen'),
    mailboxScreen: document.getElementById('mailbox-screen')
};

const bindClick = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', (e) => { AudioManager.play('click'); fn(e); }); };

bindClick('close-inventory-btn', closeInventory); 
bindClick('close-shop-btn', closeShop); 
bindClick('close-chest-btn', closeChest); 
bindClick('resume-button', togglePause); 
bindClick('quit-button', quitToMenu);

bindClick('close-log-btn', () => { const scr = document.getElementById('update-log-screen'); if(scr) scr.style.display = 'none'; gameState = 'MENU'; });
bindClick('close-leaderboard-btn', () => { const scr = document.getElementById('leaderboard-screen'); if(scr) scr.style.display = 'none'; gameState = 'MENU'; });
bindClick('close-admin-btn', () => { const scr = document.getElementById('admin-screen'); if(scr) scr.style.display = 'none'; gameState = 'MENU'; });
bindClick('restart-button', () => { enterFullscreen(); restartGame(true, gameMode); });

window.openMailbox = () => {
    if (gameState !== 'MENU') return;
    AudioManager.play('click');
    gameState = 'MAILBOX'; 
    const scr = document.getElementById('mailbox-screen');
    if (scr) {
        scr.style.display = 'flex';
        window.renderMailbox();
    }
};

window.closeMailbox = () => {
    AudioManager.play('click');
    const scr = document.getElementById('mailbox-screen');
    if (scr) scr.style.display = 'none';
    gameState = 'MENU';
};

// --- HỆ THỐNG MỤC LỤC (INDEX) ---
window.openIndex = () => {
    if (gameState !== 'MENU' && gameState !== 'PLAYING') return;
    AudioManager.play('click');
    if (gameState === 'PLAYING') {
        gameState = 'INDEX';
        document.body.classList.remove('show-joystick');
    }
    const overlay = document.getElementById('index-modal') || document.querySelector('.modal-overlay');
    if (overlay) overlay.classList.remove('hidden');
    IndexSystem.open();
};

window.closeIndex = () => {
    AudioManager.play('click');
    const overlay = document.getElementById('index-modal') || document.querySelector('.modal-overlay');
    if (overlay) overlay.classList.add('hidden');
    if (gameState === 'INDEX') {
        gameState = 'PLAYING';
        document.body.classList.add('show-joystick');
    }
};

bindClick('pause-fullscreen-btn', () => {
    if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(e => {});
        else if (document.documentElement.webkitRequestFullscreen) document.documentElement.webkitRequestFullscreen().catch(e => {});
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
});

document.addEventListener('fullscreenchange', () => {
    const btn = document.getElementById('pause-fullscreen-btn');
    if (btn) {
        btn.textContent = document.fullscreenElement ? '🔳 Thu Nhỏ Màn Hình' : '🔲 Toàn Màn Hình';
    }
});

bindClick('dev-btn-gold', () => { player.gold += 10000; isDataDirty = true; UI.updateHud(player); });
bindClick('dev-btn-soul', () => { player.souls += 1000; isDataDirty = true; UI.updateHud(player); });
bindClick('dev-btn-god', () => { 
    window.isGodMode = !window.isGodMode; 
    const btn = document.getElementById('dev-btn-god');
    if(btn) btn.style.background = window.isGodMode ? '#2ecc71' : '#e74c3c';
    UI.showLoot(window.isGodMode ? "BẬT BẤT TỬ" : "TẮT BẤT TỬ");
});
bindClick('dev-btn-wave', () => { enemies.forEach(e => { if(!e.isAlly) { e.hp = 0; e.die(); } }); waveClearTimer = 0; UI.showLoot("DỌN QUÁI THÀNH CÔNG"); });
bindClick('dev-btn-wpn', () => {
    WEAPON_TYPES.forEach(baseConfig => {
        if (player.inventory.length >= 27) return;
        const prefixes = ['Tàn bạo', 'Cổ đại', 'Linh thiêng', 'Bị nguyền rủa', 'Khát máu', 'Thần thánh', 'Hủy diệt'];
        const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const finalName = `${RARITY.MYTHIC.name} ${baseConfig.name} ${randomPrefix}`;
        let w = new Weapon({
            ...baseConfig,
            name: finalName,
            baseName: baseConfig.name,
            rarity: RARITY.MYTHIC
        });
        player.inventory.push(w);
    });
    UI.updateHud(player); UI.showLoot("ĐÃ THÊM FULL BỘ THẦN THOẠI");
});

// Ràng buộc sự kiện cho bảng Cài đặt nhanh trong Pause Menu
const pauseVol = document.getElementById('pause-volume');
if (pauseVol) pauseVol.addEventListener('input', (e) => applyAudioSettings(parseFloat(e.target.value), globalMuted));
const pauseMute = document.getElementById('pause-mute-btn');
if (pauseMute) pauseMute.addEventListener('click', () => { AudioManager.play('click'); applyAudioSettings(globalVolume, !globalMuted); });

window.saveAdmin = (id) => {
    const g = parseInt(document.getElementById(`adm-g-${id}`).value) || 0; const s = parseInt(document.getElementById(`adm-s-${id}`).value) || 0; const w = parseInt(document.getElementById(`adm-w-${id}`).value) || 0;
    const btn = event.target; btn.textContent = 'ĐANG LƯU...'; btn.style.background = '#f39c12';
    updatePlayerAdmin(id, { gold: g, souls: s, bestWave: w }).then(() => { btn.textContent = 'ĐÃ LƯU'; btn.style.background = '#2ecc71'; setTimeout(() => { btn.textContent = 'LƯU'; btn.style.background = ''; }, 2000); });
};

window.renderMailbox = async () => {
    try {
        const mc = document.getElementById('mailbox-content');
        if (!mc) return;
        mc.innerHTML = '<div style="text-align:center; margin-top:50px;">Đang tải dữ liệu từ máy chủ...</div>';
        const mails = await getMailboxAPI();
        if (!mails || mails.length === 0) {
            mc.innerHTML = '<div style="text-align:center; color:#bdc3c7; margin-top:50px;">Hòm thư của bạn hiện đang trống!</div>';
            return;
        }
        let html = '';
        mails.sort((a,b) => b.timestamp - a.timestamp).forEach(m => {
            const date = new Date(m.timestamp).toLocaleString('vi-VN');
            html += `
            <div style="background:rgba(255,255,255,0.05); padding:15px; border-radius:8px; border:1px solid ${m.claimed ? '#7f8c8d' : '#f1c40f'}; position:relative;">
                <h4 style="margin:0 0 8px 0; color:${m.claimed ? '#95a5a6' : '#f1c40f'}; font-size:18px;">✉️ ${m.title}</h4>
                <div style="font-size:12px; color:#7f8c8d; margin-bottom:10px;">${date}</div>
                <p style="margin:0 0 15px 0; font-size:15px; color:#ecf0f1; line-height:1.4;">${m.content.replace(/\n/g, '<br>')}</p>
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); padding:8px 12px; border-radius:6px;">
                    <span style="font-size:15px; font-weight:bold;">
                        Quà đính kèm: <span style="color:#f1c40f;">${m.gold} 💰</span> | <span style="color:#00d8d6;">${m.souls} 👻</span>
                    </span>
                    ${m.claimed 
                        ? `<button disabled style="padding:8px 15px; background:#7f8c8d; border:none; border-radius:6px; color:#fff; font-weight:bold;">Đã Nhận</button>`
                        : `<button onclick="window.claimMail('${m.id}')" style="padding:8px 15px; background:#2ecc71; border:none; border-radius:6px; color:#fff; cursor:pointer; font-weight:bold; box-shadow:0 0 10px rgba(46,204,113,0.4);">Nhận Quà</button>`
                    }
                </div>
            </div>`;
        });
        mc.innerHTML = html;
    } catch (e) {
        console.error("Lỗi render hòm thư:", e);
    }
};

window.claimMail = async (mailId) => {
    AudioManager.play('click');
    const btn = event.target;
    btn.textContent = 'ĐANG NHẬN...'; btn.disabled = true;
    const res = await claimMailAPI(mailId);
    if (res.success) {
        player.gold += res.gold;
        player.souls += res.souls;
        saveGameData();
        UI.updateHud(player);
        AudioManager.play('coin');
        window.renderMailbox();
        window.checkUnreadMails();
    } else {
        alert("Lỗi: " + res.error);
        btn.textContent = 'NHẬN QUÀ'; btn.disabled = false;
    }
};

window.sendAdminMail = async () => {
    const target = document.getElementById('admin-mail-target').value.trim();
    const title = document.getElementById('admin-mail-title').value.trim();
    const content = document.getElementById('admin-mail-content').value.trim();
    const gold = parseInt(document.getElementById('admin-mail-gold').value) || 0;
    const souls = parseInt(document.getElementById('admin-mail-souls').value) || 0;
    
    if (!target || !title) return alert("Vui lòng nhập ID người chơi (hoặc 'all') và Tiêu đề thư!");
    if (!confirm(`Bạn có chắc muốn gửi thư này đến [${target}]?`)) return;

    AudioManager.play('click');
    const btn = event.target; 
    btn.textContent = 'ĐANG GỬI...'; btn.disabled = true; btn.style.background = '#f39c12';
    
    const res = await sendAdminMailAPI(target, title, content, gold, souls);
    if (res.success) {
        alert("Gửi thư thành công!");
        document.getElementById('admin-mail-title').value = '';
        document.getElementById('admin-mail-content').value = '';
        document.getElementById('admin-mail-gold').value = '0';
        document.getElementById('admin-mail-souls').value = '0';
    } else {
        alert("Lỗi khi gửi thư: " + res.error);
    }
    btn.textContent = 'GỬI THƯ NÀY'; btn.disabled = false; btn.style.background = '#2ecc71';
};

window.checkUnreadMails = async () => {
    const mails = await getMailboxAPI();
    const hasUnread = mails && mails.some(m => !m.claimed);
    const dot = document.getElementById('mailbox-noti-dot');
    if (dot) dot.style.display = hasUnread ? 'block' : 'none';
};
setInterval(() => { if (gameState === 'MENU') window.checkUnreadMails(); }, 30000);
setTimeout(() => window.checkUnreadMails(), 2000);

window.addEventListener('beforeunload', () => { if (Network.isMultiplayer && Network.socket) Network.socket.emit('leaveMultiplayer'); });

let isGameOver = false, isGameStarted = false, isDataDirty = false;
let gameState = 'MENU', bestWave = 0, waveNumber = 1, waveClearTimer = 1200, gameMode = 'solo';
const GAME_VERSION = 'v3.9.0';
let loopId = null;
window.isGodMode = false;

function enterFullscreen() {
    if (!('ontouchstart' in window) && navigator.maxTouchPoints <= 0 && window.innerWidth > 900) return;
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(e => {});
}

let camera = new Camera();

// --- HỆ THỐNG GIAO DIỆN TÀI KHOẢN ---
function updateAuthUI() {
    const unlogged = document.getElementById('auth-unlogged');
    const logged = document.getElementById('auth-logged');
    
    if (isLoggedIn()) {
        if (unlogged) unlogged.style.display = 'none';
        if (logged) { logged.style.display = 'flex'; document.getElementById('logged-username').textContent = getPlayerName(); }
    } else {
        if (unlogged) unlogged.style.display = 'flex';
        if (logged) logged.style.display = 'none';
    }
}
updateAuthUI();

let authMode = 'login';
function openAuthModal(mode) {
    if (isLoggedIn() && mode !== 'logout') { alert("Bạn đã đăng nhập với tên: " + getPlayerName() + "\nNhấn ESC trong game để quản lý tài khoản."); return; }
    authMode = mode;
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('auth-title').textContent = mode === 'login' ? 'ĐĂNG NHẬP' : 'ĐĂNG KÝ TÀI KHOẢN';
    document.getElementById('auth-submit-btn').textContent = mode === 'login' ? 'ĐĂNG NHẬP' : 'TẠO TÀI KHOẢN';
    const toggleLink = document.getElementById('auth-toggle-link');
    if (toggleLink) toggleLink.textContent = mode === 'login' ? 'Đăng ký nè!' : 'Đăng nhập nè!';
    document.getElementById('auth-error').textContent = '';
}
bindClick('btn-show-login', () => openAuthModal('login'));
bindClick('btn-show-register', () => openAuthModal('register'));
bindClick('close-auth-btn', () => document.getElementById('auth-screen').style.display = 'none');
bindClick('btn-logout', () => { 
    if (confirm("Bạn có chắc muốn đăng xuất? Trò chơi sẽ trở về trạng thái Khách (0 Vàng, 0 Linh hồn).")) { 
        logoutAccount(); 
        updateAuthUI(); 
        alert("Đã đăng xuất. Bạn đang chơi dưới quyền Khách."); 
        localStorage.removeItem('vucthamlangquen_best_wave');
        localStorage.removeItem('vucthamlangquen_gold');
        localStorage.removeItem('vucthamlangquen_souls');
        localStorage.removeItem('vucthamlangquen_race');
        localStorage.removeItem('vucthamlangquen_owned_skins');
        localStorage.removeItem('vucthamlangquen_equipped_skin');
        localStorage.removeItem('vucthamlangquen_index_unlocked');
        localStorage.removeItem('vucthamlangquen_index_claimed');
        player.gold = 0; player.souls = 0; bestWave = 0; 
        player.raceId = 'human';
        SkinManager.ownedSkins = ['hoang', 'bocchi'];
        SkinManager.equippedSkin = 'hoang';
        IndexSystem.unlockedItems = [];
        IndexSystem.claimedItems = [];
        IndexSystem.calculateBonuses();
        player.setSkin(SkinManager.getEquippedSkin(), SkinManager.skinImages);
        loadSaveData(); 
        UI.updateHud(player); 
    } 
});

const authToggleBtn = document.getElementById('auth-toggle-link');
if (authToggleBtn) authToggleBtn.addEventListener('click', () => { AudioManager.play('click'); openAuthModal(authMode === 'login' ? 'register' : 'login'); });

const authSubmitBtn = document.getElementById('auth-submit-btn');
if(authSubmitBtn) authSubmitBtn.addEventListener('click', async () => {
    const u = document.getElementById('auth-username').value.trim(); const p = document.getElementById('auth-password').value;
    const errEl = document.getElementById('auth-error');
    if (!u || !p) { errEl.textContent = 'Vui lòng nhập đủ thông tin!'; return; }
    AudioManager.play('click'); authSubmitBtn.disabled = true; authSubmitBtn.textContent = 'ĐANG XỬ LÝ...';
    let res = authMode === 'login' ? await loginAccount(u, p) : await registerAccount(u, p);
    if (res.success) {
        document.getElementById('auth-screen').style.display = 'none'; updateAuthUI(); 
        alert(authMode === 'login' ? "Đăng nhập thành công!" : "Tạo tài khoản thành công! Dữ liệu Khách của bạn đã được liên kết vào tài khoản này.");
        if (authMode === 'login') {
            localStorage.removeItem('vucthamlangquen_best_wave'); localStorage.removeItem('vucthamlangquen_gold'); localStorage.removeItem('vucthamlangquen_souls'); localStorage.removeItem('vucthamlangquen_race');
            player.gold = 0; player.souls = 0; bestWave = 0; await loadSaveData();
            window.checkUnreadMails();
        } else {
            saveGameData(); // Tự động upload dữ liệu đang chơi lên tài khoản mới tạo
        }
        UI.updateHud(player);
        if (Network.socket) Network.socket.emit('registerName', getPlayerName());
    } else { errEl.textContent = res.error; }
    authSubmitBtn.disabled = false; authSubmitBtn.textContent = authMode === 'login' ? 'ĐĂNG NHẬP' : 'TẠO TÀI KHOẢN';
});

function playNextTrack() {
    if (!bgm) return;
    if (!bgm.getAttribute('src')) bgm.src = playlist[currentTrackIndex].url; else { currentTrackIndex = (currentTrackIndex + 1) % playlist.length; bgm.src = playlist[currentTrackIndex].url; }
    musicError = false; isMusicPlaying = true; bgm.play().catch(() => { musicError = true; isMusicPlaying = false; });
}
if (bgm) bgm.addEventListener('ended', playNextTrack);

window.addEventListener('resize', () => {
    const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || window.innerWidth <= 900;
    let newHeight = 600, newWidth = isMobile ? Math.max(800, 600 * (window.innerWidth / window.innerHeight)) : 800;
    setCanvasSize(newWidth, newHeight); canvas.width = newWidth; canvas.height = newHeight; if (camera) { camera.width = newWidth; camera.height = newHeight; }
    const bgCanvas = document.getElementById('bgCanvas');
    if (bgCanvas) { bgCanvas.width = newWidth; bgCanvas.height = newHeight; }
    const container = document.getElementById('game-container'); if (!container) return;
    if (!isMobile) { 
        const scale = Math.min(window.innerWidth / newWidth, window.innerHeight / newHeight); 
        container.style.width = '800px'; container.style.height = '600px';
        container.style.transform = scale < 1 ? `scale(${scale})` : 'scale(1)'; 
    } else { 
        container.style.width = '100%'; container.style.height = '100%'; container.style.transform = 'none'; 
    }
});
window.dispatchEvent(new Event('resize'));

let gameMap, projectiles = [], chests = [], enemies = [], merchant = null, alchemyTable = null;
const player = new Player(0, 0); const menu = new Menu(); const inputManager = new InputManager(); inputManager.init(canvas);
const skillManager = new SkillManager();
window.playerRef = player; // Giữ tham chiếu cho network.js cập nhật
window.menuRef = menu; // Giữ tham chiếu để tránh lỗi ReferenceError

// Tải hình ảnh Rương báu
const chestImg = new Image();
chestImg.src = 'img/chest.png';

// Khởi tạo âm thanh & Bật âm sau khi tương tác lần đầu
applyAudioSettings(globalVolume, globalMuted);
document.body.addEventListener('mousedown', () => { AudioManager.init(); if (!isMusicPlaying && !globalMuted) playNextTrack(); }, { once: true });
document.body.addEventListener('touchstart', () => { AudioManager.init(); if (!isMusicPlaying && !globalMuted) playNextTrack(); }, { once: true });

// Cố gắng phát nhạc ngay khi trang vừa tải xong
setTimeout(() => {
    if (!globalMuted && !isMusicPlaying) playNextTrack();
}, 500);

UI.init({
    onEquip: (w) => { AudioManager.play('click'); player.equipItem(w); UI.updateHud(player); UI.renderInventory(player); },
    onUnequip: (slot) => { AudioManager.play('click'); player.unequipItem(slot); UI.updateHud(player); UI.renderInventory(player); },
    onUpgDmg: (w, cost) => { if (player.souls >= cost) { AudioManager.play('chest'); player.souls -= cost; w.damage += Math.max(1, Math.floor(w.damage*0.15)); w.upgradeDmgLevel++; isDataDirty = true; UI.renderShop(player); UI.updateHud(player); UI.showLoot(`+ Sát thương`); } else AudioManager.play('error'); },
    onUpgSpd: (w, cost) => { if (player.souls >= cost) { AudioManager.play('chest'); player.souls -= cost; w.fireRate = Math.max(50, w.fireRate-15); w.upgradeSpeedLevel++; isDataDirty = true; UI.renderShop(player); UI.updateHud(player); UI.showLoot(`+ Tốc độ bắn`); } else AudioManager.play('error'); },
    onBuyHp: () => { if (player.gold >= 50 && player.hp < player.maxHp) { AudioManager.play('chest'); player.gold -= 50; player.hp = Math.min(player.maxHp, player.hp + 50); isDataDirty = true; UI.renderShop(player); UI.updateHud(player); UI.showLoot(`Hồi phục HP`); } else AudioManager.play('error'); },
    onTakeChestItem: (equip) => {
        if (!window.currentOpenChest) return;
        const c = window.currentOpenChest;
        AudioManager.play('chest');
        c.opened = true;
        Network.markChestOpened(c.id);
        IndexSystem.unlock(c.weapon.baseName, c.weapon.rarity.id); // Ghi nhận vào mục lục
        if (player.inventory.length < 27) player.inventory.push(c.weapon);
        if (equip) player.equipItem(c.weapon);
        player.maxHp += 10; player.hp = Math.min(player.maxHp, player.hp + 20);
        UI.showLoot(`Nhận được: ${c.weapon.name}`);
        UI.updateHud(player);
        closeChest();
    },
    onRevivePlayer: (targetId, cost) => {
        if (player.souls >= cost) {
            AudioManager.play('chest');
            player.souls -= cost;
            isDataDirty = true;
            Network.sendRevive(targetId);
            UI.showLoot('Đã trả 50 Linh hồn để chuộc mạng đồng đội!');
            const btn = document.getElementById(`revive-btn-${targetId}`); if (btn) btn.disabled = true;
            UI.updateHud(player);
        } else AudioManager.play('error');
    }
});

AlchemySystem.init(player);
window.closeAlchemyCallback = () => {
    gameState = 'PLAYING'; 
    document.body.classList.add('show-joystick'); 
};

let lastFrameTime = performance.now();
let networkSyncTimer = 0; 

// Khởi tạo kết nối mạng để chat hoạt động ngay từ Menu
Network.initSocket();
ChatSystem.init(player);

// Render Bảng Xếp Hạng
window.renderLeaderboard = function(ps) {
    const lc = document.getElementById('leaderboard-content');
    if(!lc) return;
    let h=''; ps.forEach((p,i)=>{ const c = i===0?'👑 ':(i===1?'🥈 ':(i===2?'🥉 ': `#${i+1} `)); h+=`<div class="rank-item ${i<3?`rank-${i+1}`:''}"><div class="player-name">${c}${p.playerName||'Ẩn danh'}</div><div class="player-stats">Tầng ${p.bestWave||1}</div></div>`; });
    lc.innerHTML = h||'<div style="text-align:center;">Chưa có dữ liệu</div>';
}

// Xử lý bật/tắt danh sách người chơi
const onlineToggle = document.getElementById('online-players-toggle');
const onlineList = document.getElementById('online-players-list');
if (onlineToggle && onlineList) {
    onlineToggle.addEventListener('click', () => {
        onlineList.style.display = onlineList.style.display === 'none' ? 'block' : 'none';
        onlineToggle.innerHTML = `👥 Đang Online: <span id="server-player-count">${onlineList.children.length}</span> ${onlineList.style.display === 'none' ? '▾' : '▴'}`;
    });
}

// Cập nhật Kỷ lục an toàn từ Mạng
window.updateBestWave = function(newWave) {
    bestWave = Math.max(bestWave, newWave);
    localStorage.setItem('vucthamlangquen_best_wave', bestWave);
    const bsv = document.getElementById('best-score-value'); if (bsv) bsv.textContent = bestWave;
};

window.onReviveReceived = () => {
    if (player.isDead) {
        player.isDead = false;
        player.deathProcessed = false;
        player.hp = player.maxHp * 0.5;
        player.invulnerableTimer = 3000;
        const scr = document.getElementById('game-over-screen');
        if (scr) scr.style.display = 'none';
        isGameOver = false; 
        UI.showLoot('Bạn đã được đồng đội chuộc mạng!');
        UI.updateHud(player);
        VFX.spawnImpactEffect(player.x + player.width/2, player.y + player.height/2, 'lightning', 0, []); 
        Network.updateSync(player, inputManager, waveNumber);
    }
};

async function loadSaveData() {
    try { bestWave = parseInt(localStorage.getItem('vucthamlangquen_best_wave')) || 0; player.gold = parseInt(localStorage.getItem('vucthamlangquen_gold')) || 0; player.souls = parseInt(localStorage.getItem('vucthamlangquen_souls')) || 0; player.raceId = localStorage.getItem('vucthamlangquen_race') || 'human'; } catch (e) {}
    const bsv = document.getElementById('best-score-value'); if (bsv) bsv.textContent = bestWave;
    const cloudData = await loadDataFromCloud();
    if (cloudData) {
        if (cloudData.bestWave) bestWave = Math.max(bestWave, cloudData.bestWave);
        if (cloudData.gold !== undefined) player.gold = cloudData.gold;
        if (cloudData.souls !== undefined) player.souls = cloudData.souls;
        if (cloudData.raceId) player.raceId = cloudData.raceId;
        if (cloudData.ownedSkins) SkinManager.ownedSkins = cloudData.ownedSkins;
        if (cloudData.equippedSkin) SkinManager.equippedSkin = cloudData.equippedSkin;
        if (cloudData.indexData) IndexSystem.setIndexData(cloudData.indexData);
        SkinManager.saveSkinData();
        player.recalculateStats();
        try { localStorage.setItem('vucthamlangquen_best_wave', bestWave); localStorage.setItem('vucthamlangquen_gold', player.gold); localStorage.setItem('vucthamlangquen_souls', player.souls); localStorage.setItem('vucthamlangquen_race', player.raceId); } catch (e) {}
    } else {
        // KHÔI PHỤC TỰ ĐỘNG: Nếu dữ liệu trên mây bị trống, lập tức bơm ngược dữ liệu từ máy người chơi lên lại!
        saveGameData();
    }
    window.bestWave = bestWave; // Lưu vào biến toàn cục cho network truy cập
}
loadSaveData();

function saveGameData() {
    try { localStorage.setItem('vucthamlangquen_best_wave', bestWave); localStorage.setItem('vucthamlangquen_gold', player.gold); localStorage.setItem('vucthamlangquen_souls', player.souls); localStorage.setItem('vucthamlangquen_race', player.raceId); } catch (e) {}
    const indexData = { unlocked: IndexSystem.unlockedItems, claimed: IndexSystem.claimedItems };
    clearTimeout(window.cloudSyncTimeout); window.cloudSyncTimeout = setTimeout(() => { syncDataToCloud({ bestWave, gold: player.gold, souls: player.souls, raceId: player.raceId, ownedSkins: SkinManager.ownedSkins, equippedSkin: SkinManager.equippedSkin, indexData: indexData, lastUpdated: new Date().toISOString() }); }, 2000);
}
window.saveGameData = saveGameData;

function setHudVisibility(visible) {
    if (visible && gameState === 'PLAYING') document.body.classList.add('show-joystick'); else document.body.classList.remove('show-joystick');
    ['hud', 'minimapCanvas', 'chat-widget'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = visible ? '' : 'none'; });
    
    ['interaction-prompt', 'inventory-screen', 'shop-screen', 'chest-screen', 'pause-screen', 'update-log-screen', 'leaderboard-screen', 'game-over-screen', 'admin-screen', 'mailbox-screen'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    const devPanel = document.getElementById('dev-panel');
    if (devPanel) {
        devPanel.style.display = (visible && localStorage.getItem('vucthamlangquen_admin_token') === 'true') ? 'block' : 'none';
    }

    const mailboxBtn = document.getElementById('mailbox-floating-btn');
    if (mailboxBtn) mailboxBtn.style.display = visible ? 'none' : 'flex';
}

function findSpawnPosition(map, avoid = null) {
    for (let i = 0; i < 500; i++) {
        const c = Math.floor(Math.random()*(MAP_COLS-6))+3, r = Math.floor(Math.random()*(MAP_ROWS-6))+3;
        if (![TILE_TYPES.GRASS, TILE_TYPES.DIRT, TILE_TYPES.PATH].includes(map.grid[r][c])) continue;
        const x = c*TILE_SIZE+(TILE_SIZE-24)/2, y = r*TILE_SIZE+(TILE_SIZE-24)/2;
        if (map.isSolidPixel(x,y) || map.isSolidPixel(x+24,y) || map.isSolidPixel(x,y+24) || map.isSolidPixel(x+24,y+24)) continue;
        if (avoid && Math.hypot(x-(avoid.x+avoid.width/2), y-(avoid.y+avoid.height/2)) < (avoid.distance||200)) continue;
        return { x, y };
    }
    return { x: TILE_SIZE*2, y: TILE_SIZE*2 };
}
function setPlayerSpawn(p, m) { const pos = findSpawnPosition(m); p.x = pos.x; p.y = pos.y; }

function showWaveAnnouncement(wave, isBoss) {
    const ann = document.getElementById('wave-announcement'), title = document.getElementById('wave-title'), sub = document.getElementById('wave-subtitle');
    if (!ann || !title || !sub) return;
    title.textContent = typeof wave === 'string' ? `CHẾ ĐỘ ${wave}` : `TẦNG ${wave}`;
    if (isBoss) { title.style.color = '#e74c3c'; title.style.textShadow = '0 0 20px rgba(231,76,60,0.8),0 5px 0 #c0392b,0 10px 10px rgba(0,0,0,0.8)'; sub.textContent = 'TINH ANH XUẤT HIỆN'; sub.style.color = '#ffeb3b'; } 
    else { title.style.color = '#f1c40f'; title.style.textShadow = '0 0 20px rgba(241,196,15,0.8),0 5px 0 #d35400,0 10px 10px rgba(0,0,0,0.8)'; sub.textContent = 'BẮT ĐẦU'; sub.style.color = '#fff'; }
    ann.classList.remove('show'); void ann.offsetWidth; ann.classList.add('show');
    clearTimeout(ann.timeoutId); ann.timeoutId = setTimeout(() => { if (ann.classList.contains('show')) ann.classList.remove('show'); }, 2500);
}

function spawnWave(count) {
    const isBossWave = waveNumber % 5 === 0;
    showWaveAnnouncement(waveNumber, isBossWave);
    
    if (Network.isMultiplayer) RNG.beginSync(waveNumber); // Đồng bộ Hạt giống (Seed)

    const avoidTarget = Network.isMultiplayer ? { x: MAP_WIDTH/2, y: MAP_HEIGHT/2, width: 0, height: 0, distance: 300 } : player;

    // TĂNG ĐỘ KHÓ: Spawn nhiều quái hơn theo cấp số nhân
    let enemyCount = Math.floor(count * 2) + Math.floor(waveNumber * 1.5);

    if (isBossWave) { UI.showLoot(`⚠️ CẢNH BÁO: TẦNG ${waveNumber} - TINH ANH XUẤT HIỆN! ⚠️`); const p = findSpawnPosition(gameMap, { ...avoidTarget, distance: 400 }); enemies.push(new EliteBoss(p.x, p.y, waveNumber, `boss_${waveNumber}`)); count = Math.floor(count/2); } 
    else UI.showLoot(`Tầng ${waveNumber} bắt đầu!`);
    for (let i = 0; i < enemyCount; i++) { const p = findSpawnPosition(gameMap, { ...avoidTarget, distance: 240 }); enemies.push(new Enemy(p.x, p.y, waveNumber, `enemy_${waveNumber}_${i}`)); }
    if (waveNumber === 1 || waveNumber % 2 === 0) { 
        const p = findSpawnPosition(gameMap, { ...avoidTarget, distance: 300 }); if (!merchant) merchant = new Merchant(p.x, p.y); else { merchant.x = p.x; merchant.y = p.y; } 
    }
    if (waveNumber > 1) createChests(2, gameMap);
    
    if (Network.isMultiplayer) RNG.endSync(); // Trả lại ngẫu nhiên để rớt hạt VFX không bị lỗi
}

function showGameOver() {
    isGameOver = true; const fsv = document.getElementById('final-score-value'); if (fsv) fsv.textContent = waveNumber;
    if (waveNumber > bestWave) bestWave = waveNumber;
    saveGameData(); const bsv = document.getElementById('best-score-value'); if (bsv) bsv.textContent = bestWave;
    const scr = document.getElementById('game-over-screen');
    if (scr) {
        scr.style.display = 'flex';
        const hint = document.getElementById('spectate-hint');
        let allDead = player.isDead && Network.isMultiplayer && gameMode !== 'pvp' ? Object.values(Network.otherPlayers).every(op => op.isDead) : true;
        if (hint) hint.style.display = (Network.isMultiplayer && gameMode !== 'pvp' && !allDead) ? 'block' : 'none';
    }
}

function restartGame(startLoop = true, mode = 'solo') {
    gameMode = mode;
    
    const modeEl = document.getElementById('current-mode-value');
    if (modeEl) {
        modeEl.textContent = gameMode === 'solo' ? 'Chơi Đơn' : (gameMode === 'coop' ? 'Co-op (PvE)' : 'Đấu Trường');
        modeEl.style.color = gameMode === 'pvp' ? '#e74c3c' : (gameMode === 'coop' ? '#3498db' : '#2ecc71');
    }

    const scr = document.getElementById('game-over-screen');
    if (scr) scr.style.display = 'none';
    isGameOver = false; isGameStarted = true; gameState = 'PLAYING';
    closeInventory(); setHudVisibility(true);
    projectiles.length = 0; chests.length = 0; VFX.clearAllVFX(); merchant = null; alchemyTable = null;
    player.level = 1; player.exp = 0; player.expToNextLevel = 100; player.maxHp = 100; player.isDead = false; player.hp = 100; player.speed = 200; player.inventory = [];
    player.deathProcessed = false;
    
    player.hasMagneticField = false;
    player.canBlink = false;
    player.hasSingularity = false;
    player.bonusMaxHp = 0;
    player.bonusMaxShield = 0;
    player.bonusSpeedMult = 1;
    player.bonusDamageMult = 0;
    player.bonusAttackSpeedMult = 0;
    player.lifestealChance = 0;
    player.hasThorns = false;
    player.dodgeChance = 0;
    player.expMultiplier = 1;
    player.hasMeteor = false;
    player.hasFairy = false;
    skillManager.acquiredSkills = [];
    
    player.setSkin(SkinManager.getEquippedSkin(), SkinManager.skinImages); 
    const pt = document.getElementById('player-portrait'); if (pt) pt.style.backgroundColor = player.color;
    player.currentWeapon = new Weapon({ name:'Cung Gỗ Tập Sự', baseName:'Cung Gỗ', type:'ranged', rarity:RARITY.COMMON, baseDmg:10, baseSpeed:350, fireRate:400, range:300, color:'#f1c40f', effectType:'standard', imgSrc: 'img/weapon/wodden-bow.png' }); player.inventory.push(player.currentWeapon); 
    IndexSystem.unlock(player.currentWeapon.baseName, player.currentWeapon.rarity.id); // Mở khóa Cung gỗ
    
    Network.start(gameMode !== 'solo', gameMode);
    if (Network.isMultiplayer) { checkAndPromptPlayerName(); RNG.beginSync(0); }
    
    gameMap = new GameMap(gameMode); setPlayerSpawn(player, gameMap); 
    enemies.length = 0; waveNumber = 1; waveClearTimer = 1200; 
    
    if (gameMode === 'pvp') {
        showWaveAnnouncement('PVP', false);
        createChests(10, gameMap);
    } else {
        createChests(5, gameMap);
        spawnWave(waveNumber + 1);
    }
    
    if (Network.isMultiplayer) RNG.endSync();
    
    camera.x = 0; camera.y = 0; camera.offsetX = 0; camera.offsetY = 0;
    lastFrameTime = performance.now(); UI.updateHud(player);
    const ld = document.getElementById('loading-text'); if(ld) ld.style.display = 'none';
    if (loopId) cancelAnimationFrame(loopId);
    if (startLoop) loopId = requestAnimationFrame(gameLoop);
}

function createChests(count, map) {
    // Dọn dẹp rương đã mở để tránh lag bản đồ và nhường chỗ cho rương mới
    for (let i = chests.length - 1; i >= 0; i--) if (chests[i].opened) chests.splice(i, 1);

    let added = 0;
    for(let i=0; i<200 && added<count; i++) {
        if(chests.length >= 15) break;
        const c = Math.floor(Math.random()*(MAP_COLS-6))+3, r = Math.floor(Math.random()*(MAP_ROWS-6))+3;
        if(![TILE_TYPES.GRASS, TILE_TYPES.DIRT, TILE_TYPES.PATH].includes(map.grid[r][c])) continue;
        const x = c*TILE_SIZE+TILE_SIZE/2-16, y = r*TILE_SIZE+TILE_SIZE/2-16;
        
        if(chests.some(ch => Math.hypot(ch.x-x, ch.y-y)<80)) continue;
        if(!Network.isMultiplayer && Math.hypot(player.x-x, player.y-y)<80) continue; 
        
        const isMage = player.skin && player.skin.id === 'skeleton_mage';
        chests.push({ id: `chest_${waveNumber}_${i}`, x, y, width:40, height:40, opened:false, weapon: chests.length===0?Weapon.rollRandomLightning(isMage):Weapon.rollRandomWeapon(isMage) }); added++;
    }
}

function togglePause() { 
    const pauseScreen = document.getElementById('pause-screen');
    if (gameState === 'PLAYING') { 
        gameState = 'PAUSED'; 
        if (pauseScreen) {
            pauseScreen.style.display = 'flex';
            const title = document.querySelector('.pause-box h2');
            if (title) title.textContent = 'TẠM DỪNG';
            const resumeBtn = document.getElementById('resume-button');
            if (resumeBtn) resumeBtn.style.display = 'block';
            const quitBtn = document.getElementById('quit-button');
            if (quitBtn) { quitBtn.textContent = 'Thoát ra Menu'; quitBtn.style.background = '#c0392b'; quitBtn.style.borderColor = '#e74c3c'; }
        }
        document.body.classList.remove('show-joystick'); 
        const volSlider = document.getElementById('pause-volume'); 
        if (volSlider) volSlider.value = globalVolume; 
    } else if (gameState === 'PAUSED') { 
        gameState = 'PLAYING'; 
        if (pauseScreen) pauseScreen.style.display = 'none'; 
        document.body.classList.add('show-joystick'); 
        inputManager.mouse.leftJustPressed = false; 
    } 
}
function quitToMenu() { 
    gameState = 'MENU'; isGameStarted = false; setHudVisibility(false); Network.start(false); 
    const modeEl = document.getElementById('current-mode-value');
    if (modeEl) { modeEl.textContent = 'Sảnh Chờ'; modeEl.style.color = '#ecf0f1'; }
}
function openInventory() { 
    if(player.isDead) return; 
    gameState = 'INVENTORY'; 
    const scr = document.getElementById('inventory-screen');
    if (scr) scr.style.display = 'flex'; 
    document.body.classList.remove('show-joystick'); 
    UI.renderInventory(player); 
}
function closeInventory() { 
    gameState = 'PLAYING'; 
    const scr = document.getElementById('inventory-screen');
    if (scr) scr.style.display = 'none'; 
    document.body.classList.add('show-joystick'); 
}
function openShop() { 
    if(player.isDead) return; 
    gameState = 'SHOP'; 
    const scr = document.getElementById('shop-screen');
    const prompt = document.getElementById('interaction-prompt');
    if (scr) scr.style.display = 'flex'; 
    if (prompt) prompt.style.display = 'none'; 
    document.body.classList.remove('show-joystick'); 
    const deadPlayers = [];
    if (Network.isMultiplayer && gameMode === 'coop') {
        for (let id in Network.otherPlayers) { if (Network.otherPlayers[id].isDead) deadPlayers.push({ id: id, name: Network.otherPlayers[id].playerName || 'Hiệp sĩ' }); }
    }
    UI.renderShop(player, deadPlayers); 
}
function closeShop() { 
    gameState = 'PLAYING'; 
    const scr = document.getElementById('shop-screen');
    if (scr) scr.style.display = 'none'; 
    document.body.classList.add('show-joystick'); 
}

window.currentOpenChest = null;
function openChest(chest) {
    if(player.isDead) return;
    gameState = 'CHEST'; window.currentOpenChest = chest;
    const scr = document.getElementById('chest-screen');
    const prompt = document.getElementById('interaction-prompt');
    if (scr) scr.style.display = 'flex';
    if (prompt) prompt.style.display = 'none';
    document.body.classList.remove('show-joystick'); 
    UI.renderChest(chest.weapon);
}
function closeChest() { 
    if (gameState !== 'CHEST') return;
    gameState = 'PLAYING'; window.currentOpenChest = null;
    const scr = document.getElementById('chest-screen');
    if (scr) scr.style.display = 'none'; 
    document.body.classList.add('show-joystick'); 
}

function openAlchemy() {
    if(player.isDead) return;
    gameState = 'ALCHEMY';
    const prompt = document.getElementById('interaction-prompt');
    if (prompt) prompt.style.display = 'none';
    document.body.classList.remove('show-joystick');
    AlchemySystem.open();
}

function gameLoop(time) {
    // Xử lý cái chết của bản thân
    if (player.isDead && !player.deathProcessed) {
        player.deathProcessed = true;
        VFX.spawnImpactEffect(player.x + player.width/2, player.y + player.height/2, 'death');
        Network.updateSync(player, inputManager, waveNumber);
        if (Network.isMultiplayer && gameMode !== 'pvp') {
            UI.showLoot("Bạn biến thành hồn ma! Nhờ đồng đội cứu tại Lò Rèn.");
        }
        
        const alchemyGif = document.getElementById('alchemy-gif');
        if (alchemyGif) alchemyGif.style.display = 'none';
    }

    let allPlayersDead = player.isDead;
    if (Network.isMultiplayer && gameMode !== 'pvp') {
        if (player.isDead) {
            allPlayersDead = Object.values(Network.otherPlayers).every(op => op.isDead);
        }
    }

    if (allPlayersDead && !isGameOver) {
        showGameOver();
    }

    if (isGameOver) return; // Dừng hoàn toàn vòng lặp
    let dt = Math.min(time - lastFrameTime, 50); lastFrameTime = time;

    if (gameState === 'MENU') {
        if (isGameStarted && inputManager.isActionJustPressed('escape') && !isGameOver) { 
            if (menu.currentScreen !== 'MAIN') {
                menu.currentScreen = 'MAIN';
                menu.skinPage = 0;
            } else {
                gameState = 'PLAYING'; setHudVisibility(true); 
                player.setSkin(SkinManager.getEquippedSkin(), SkinManager.skinImages); 
                const pt = document.getElementById('player-portrait'); if (pt) pt.style.backgroundColor = player.color;
            }
            inputManager.update(); if (loopId) cancelAnimationFrame(loopId); loopId = requestAnimationFrame(gameLoop); return; 
        }
        menu.update(dt, inputManager, player, 
            (mode) => { enterFullscreen(); if (!isGameStarted) restartGame(false, mode); else { gameState = 'PLAYING'; inputManager.mouse.leftJustPressed = false; player.setSkin(SkinManager.getEquippedSkin(), SkinManager.skinImages); const pt = document.getElementById('player-portrait'); if (pt) pt.style.backgroundColor = player.color; setHudVisibility(true); } },
            () => { isDataDirty = true; }, 
            () => { 
                gameState = 'UPDATE_LOG'; 
                const scr = document.getElementById('update-log-screen');
                if (scr) scr.style.display = 'flex'; 
            },
            () => { 
                checkAndPromptPlayerName(); 
                gameState = 'LEADERBOARD'; 
                const scr = document.getElementById('leaderboard-screen');
                if (scr) { 
                    scr.style.display = 'flex'; 
                    const lc = document.getElementById('leaderboard-content'); 
                    if(lc) lc.innerHTML = '<div style="text-align:center;margin-top:50px;">Đang tải Dữ liệu Máy chủ...</div>'; 
                    getTopPlayers().then(ps => renderLeaderboard(ps)); 
                } 
            },
            (v) => { applyAudioSettings(v, globalMuted); }, 
            (m) => { applyAudioSettings(globalVolume, m); }, 
            () => playNextTrack(), 
            () => { changePlayerName(); if (Network.socket) Network.socket.emit('registerName', getPlayerName()); },
            () => { 
                gameState = 'ADMIN'; 
                const scr = document.getElementById('admin-screen');
                if (scr) { 
                    scr.style.display = 'flex'; 
                    const ac = document.getElementById('admin-content'); 
                    if (ac) ac.innerHTML = '<div style="text-align: center; margin-top: 50px;">Đang tải dữ liệu...</div>'; 
                    getAllPlayersAdmin().then(ps => { 
                        let h=''; (ps || []).forEach(p => { h+=`<div class="admin-player-card"><div style="flex:1; min-width: 120px; color:#f1c40f"><strong>${p.playerName||'Ẩn danh'}</strong><br><small style="color:#3498db; user-select:text; -webkit-user-select:text; cursor:pointer; text-decoration:underline;" title="Bấm vào để tự động điền ID lên ô Gửi Thư" onclick="document.getElementById('admin-mail-target').value='${p.id}'; document.getElementById('admin-panel').scrollTo({top:0, behavior:'smooth'});">${p.id} 📋</small></div><div>Vàng: <input type="number" id="adm-g-${p.id}" value="${p.gold||0}"></div><div>Linh hồn: <input type="number" id="adm-s-${p.id}" value="${p.souls||0}"></div><div>Tầng: <input type="number" id="adm-w-${p.id}" value="${p.bestWave||0}"></div><button class="admin-btn" onclick="window.saveAdmin('${p.id}')">LƯU</button></div>`; }); 
                        if(ac) ac.innerHTML = h||'<div style="text-align:center;">Không có dữ liệu</div>'; 
                    }); 
                } 
            },
            () => {
                if (!document.fullscreenElement) {
                    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(e => {});
                    else if (document.documentElement.webkitRequestFullscreen) document.documentElement.webkitRequestFullscreen().catch(e => {});
                } else {
                    if (document.exitFullscreen) document.exitFullscreen();
                    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                }
            },
            () => {
                if (isLoggedIn()) {
                    const btnLogout = document.getElementById('btn-logout');
                    if (btnLogout) btnLogout.click();
                } else {
                    openAuthModal('login');
                }
            }
        );
        menu.draw(ctx, GAME_VERSION, player.gold, musicError ? '⚠️ Lỗi nhạc!' : (isMusicPlaying ? playlist[currentTrackIndex].name : 'Chưa phát')); inputManager.update(); if (loopId) cancelAnimationFrame(loopId); loopId = requestAnimationFrame(gameLoop); return;
    }

    if (['UPDATE_LOG', 'LEADERBOARD', 'ADMIN', 'MAILBOX'].includes(gameState)) {
        menu.clouds.forEach(c => { c.x += c.speed * (dt / 1000); if (c.x > CANVAS_WIDTH + 100) { c.x = -100; c.y = Math.random() * (CANVAS_HEIGHT / 2.5); } });
        menu.draw(ctx, GAME_VERSION, player.gold, isMusicPlaying ? playlist[currentTrackIndex].name : 'Chưa phát');
        if (inputManager.isActionJustPressed('escape')) { 
            ['update-log-screen', 'leaderboard-screen', 'admin-screen', 'mailbox-screen'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            const authScr = document.getElementById('auth-screen');
            if (authScr) authScr.style.display = 'none'; 
            gameState = 'MENU'; 
        }
        inputManager.update(); if (loopId) cancelAnimationFrame(loopId); loopId = requestAnimationFrame(gameLoop); return;
    }

    if (gameState === 'PAUSED') { if (inputManager.isActionJustPressed('escape')) togglePause(); inputManager.update(); if (loopId) cancelAnimationFrame(loopId); loopId = requestAnimationFrame(gameLoop); return; }
    if (gameState === 'INVENTORY') { if (inputManager.isActionJustPressed('inventory') || inputManager.isActionJustPressed('escape')) closeInventory(); inputManager.update(); if (loopId) cancelAnimationFrame(loopId); loopId = requestAnimationFrame(gameLoop); return; }
    if (gameState === 'SHOP') { if (inputManager.isActionJustPressed('interact') || inputManager.isActionJustPressed('inventory') || inputManager.isActionJustPressed('escape')) closeShop(); inputManager.update(); if (loopId) cancelAnimationFrame(loopId); loopId = requestAnimationFrame(gameLoop); return; }
    if (gameState === 'INDEX') { if (inputManager.isActionJustPressed('escape')) window.closeIndex(); inputManager.update(); if (loopId) cancelAnimationFrame(loopId); loopId = requestAnimationFrame(gameLoop); return; }
    if (gameState === 'CHEST') { if (inputManager.isActionJustPressed('interact') || inputManager.isActionJustPressed('inventory') || inputManager.isActionJustPressed('escape')) closeChest(); inputManager.update(); if (loopId) cancelAnimationFrame(loopId); loopId = requestAnimationFrame(gameLoop); return; }
    if (gameState === 'ALCHEMY') { if (inputManager.isActionJustPressed('interact') || inputManager.isActionJustPressed('inventory') || inputManager.isActionJustPressed('escape')) AlchemySystem.close(); inputManager.update(); if (loopId) cancelAnimationFrame(loopId); loopId = requestAnimationFrame(gameLoop); return; }
    if (gameState === 'SKILL_SELECT') { inputManager.update(); if (loopId) cancelAnimationFrame(loopId); loopId = requestAnimationFrame(gameLoop); return; }

    if (inputManager.isActionJustPressed('escape') && !player.isDead) { togglePause(); inputManager.update(); if (loopId) cancelAnimationFrame(loopId); loopId = requestAnimationFrame(gameLoop); return; }
    if (inputManager.isActionJustPressed('inventory') && !player.isDead) { openInventory(); inputManager.update(); if (loopId) cancelAnimationFrame(loopId); loopId = requestAnimationFrame(gameLoop); return; }

    gameMap.solidEntities = [alchemyTable, merchant];

    player.update(dt, inputManager, gameMap, camera, projectiles, enemies);
    
    // Xử lý Cơ chế Triệu hồi Pháp Sư Xương
    if (player.wantsToSummon) {
        player.wantsToSummon = false;
        
        const isMage = player.skin && player.skin.id === 'skeleton_mage';
        const runes = player.runes || [];
        
        let maxShadows = 3;
        if (runes.some(r => r.runeId === 'undead_tide')) maxShadows = 5;
        if (runes.some(r => r.runeId === 'goliath')) maxShadows = 1;

        let currentShadows = enemies.filter(e => e.isAlly).length;

        // SWARM KEYSTONE
        let swarmCount = runes.filter(r => r.branch === 'SWARM').length;
        if (swarmCount >= 3 && currentShadows >= maxShadows - 1) {
            player.invulnerableTimer = 5000;
            VFX.spawnFloatingText(player.x + player.width/2, player.y - 30, 'BẤT TỬ LÂM THỜI!', '#f1c40f');
            enemies.forEach(e => { if (e.isAlly) { e.isTaunting = true; e.color = '#f1c40f'; } });
        }

        if (currentShadows < maxShadows) {
            const shadows = ['beru', 'igris', 'bellion'];
            const selectedShadow = shadows[Math.floor(Math.random() * shadows.length)];
            let shadowName = '';
            
            const minion = new Enemy(player.x + (Math.random()-0.5)*80, player.y + (Math.random()-0.5)*80, player.level, `ally_${Math.random()}`);
            minion.isAlly = true;
            minion.shadowType = selectedShadow;
            minion.color = '#3498db';
            minion.lifespan = 30000; // 30s tuổi thọ
                
            let hpMult = 1, dmgMult = 1, speedMult = 1, sizeMult = 1;

            if (runes.some(r => r.runeId === 'undead_tide')) { hpMult *= 0.75; dmgMult *= 0.75; }
            if (runes.some(r => r.runeId === 'undead_legion')) { hpMult *= 1.2; }
            if (runes.some(r => r.runeId === 'mass_frenzy')) {
                const count = Math.min(15, currentShadows + 1);
                speedMult *= (1 + 0.02 * count); minion.attackSpeedMult = (1 + 0.04 * count);
            }
            if (runes.some(r => r.runeId === 'withering')) { dmgMult *= 0.7; minion.applyWithering = true; }
            if (runes.some(r => r.runeId === 'bone_burst')) { minion.lifespan = 15000; minion.boneBurst = true; }
            if (runes.some(r => r.runeId === 'goliath')) { sizeMult *= 2; hpMult *= 4; dmgMult *= 3; minion.isGoliath = true; minion.cleaveAttack = true; }
            if (runes.some(r => r.runeId === 'absolute_power')) { minion.attackSpeedMult = (minion.attackSpeedMult || 1) + 0.5; }
            if (runes.some(r => r.runeId === 'parasite')) { minion.isParasite = true; }
            if (runes.some(r => r.runeId === 'soul_absorb')) { 
                // Rút máu trực tiếp, không gọi hàm takeDamage để tránh buff thời gian bất tử (i-frames)
                player.hp -= 5; if (player.hp <= 0 && !player.isDead) player.die();
                minion.soulAbsorb = true; 
            }
            
            if (selectedShadow === 'beru') {
                shadowName = 'BERU';
                minion.width = 24 * sizeMult; minion.height = 24 * sizeMult; minion.baseSpeed *= 3.5 * speedMult;
                minion.hp *= 2 * hpMult; minion.maxHp = minion.hp; minion.damage = Math.floor(minion.damage * 0.5 * dmgMult);
                minion.skillCooldown = 5000 / (minion.attackSpeedMult || 1);
            } else if (selectedShadow === 'igris') {
                shadowName = 'IGRIS';
                minion.width = 24 * sizeMult; minion.height = 28 * sizeMult; minion.baseSpeed *= 1.2 * speedMult;
                minion.hp *= 3 * hpMult; minion.maxHp = minion.hp; minion.damage = Math.floor(minion.damage * 0.8 * dmgMult);
                minion.skillCooldown = 6000 / (minion.attackSpeedMult || 1);
            } else if (selectedShadow === 'bellion') {
                shadowName = 'BELLION';
                minion.width = 30 * sizeMult; minion.height = 36 * sizeMult; minion.baseSpeed *= 0.9 * speedMult;
                minion.hp *= 8 * hpMult; minion.maxHp = minion.hp; minion.damage = Math.floor(minion.damage * 1.2 * dmgMult);
                minion.skillCooldown = 10000 / (minion.attackSpeedMult || 1);
            }
            minion.speed = minion.baseSpeed;
            
            // TITAN KEYSTONE
            let titanCount = runes.filter(r => r.branch === 'TITAN').length;
            if (titanCount >= 3 && minion.isGoliath) { player.mergedTarget = minion; }

            enemies.push(minion);
            VFX.spawnImpactEffect(player.x + player.width/2, player.y + player.height/2, 'singularity');
            VFX.spawnFloatingText(player.x + player.width/2, player.y - 20, `HÃY TRỖI DẬY, ${shadowName}!`, '#3498db');
            AudioManager.play('chest');
        } else {
            VFX.spawnFloatingText(player.x + player.width/2, player.y - 20, 'Đã đạt giới hạn!', '#e74c3c');
            AudioManager.play('error');
        }
    }

    // Kỹ năng: Thiên Thạch (Meteor)
    if (player.hasMeteor && !player.isDead) {
        player.meteorTimer -= dt;
        if (player.meteorTimer <= 0) {
            player.meteorTimer = 15000;
            let tx = player.x + (Math.random() - 0.5) * 600, ty = player.y + (Math.random() - 0.5) * 600;
            if (enemies.length > 0) { // Ưu tiên chọn 1 con quái vật làm tâm chấn
                const t = enemies[Math.floor(Math.random() * enemies.length)];
                tx = t.x + t.width/2; ty = t.y + t.height/2;
            }
            VFX.spawnImpactEffect(tx, ty, 'meteor');
            AudioManager.play('chest'); // Dùng tiếng Chest để tạo âm thanh vụ nổ trầm
            
            const dmg = Math.floor(150 * player.damageMult); // Sát thương tỉ lệ với sức mạnh
            enemies.forEach(e => {
                if (!e.isDead && Math.hypot(e.x + e.width/2 - tx, e.y + e.height/2 - ty) <= 150) { 
                    e.takeDamage(dmg); 
                    VFX.spawnFloatingText(e.x + e.width/2, e.y, dmg, '#ff4757'); 
                }
            });
        }
    }

    networkSyncTimer += dt;
    // Tăng Tick-rate lên 25 FPS (40ms) do không còn bị Firebase giới hạn
    if (networkSyncTimer >= 40) { Network.updateSync(player, inputManager, waveNumber); networkSyncTimer = 0; }

    Network.updateInterpolation(dt);

    // Xử lý đuổi kịp Tầng (Wave Catch-up) cho người chơi vào sau hoặc load chậm
    if (Network.isMultiplayer && gameMode !== 'pvp' && Network.highestWave > waveNumber) {
        waveNumber = Network.highestWave;
        Network.clearWaveData();
        enemies.length = 0;
        chests.length = 0;
        spawnWave(waveNumber + 1);
        waveClearTimer = 1200;
    }

    // Cho phép người chơi mạng bắn đạn trên màn hình của mình
    if (Network.isMultiplayer) {
        const now = performance.now();
        Object.values(Network.otherPlayers).forEach(op => {
            if (op.isAttacking && !op.isDead) op.fireWeapon(projectiles, now, gameMode === 'pvp');
        });
    }

    let canInteract = false;
    let interactTarget = null;
    let interactType = null;

    if (!player.isDead && merchant && Math.hypot(player.x+player.width/2 - (merchant.x+merchant.width/2), player.y+player.height/2 - (merchant.y+merchant.height/2)) < 80) { 
        canInteract = true; interactTarget = merchant; interactType = 'merchant';
    }

    if (!canInteract && !player.isDead) {
        if (alchemyTable && Math.hypot(player.x+player.width/2 - (alchemyTable.x+alchemyTable.width/2), player.y+player.height/2 - (alchemyTable.y+alchemyTable.height/2)) < 80) { 
            canInteract = true; interactTarget = alchemyTable; interactType = 'alchemy';
        }
    }

    if (!canInteract && !player.isDead) {
        if (player.skin && player.skin.id !== 'hoàng') { // Hoàng không được phép mở rương
            let nearestChest = null; let minChestDist = Infinity;
            for (let c of chests) { if (!c.opened) { let dist = Math.hypot(player.x+player.width/2 - (c.x+c.width/2), player.y+player.height/2 - (c.y+c.height/2)); if (dist < 80 && dist < minChestDist) { minChestDist = dist; nearestChest = c; } } }
            if (nearestChest) { canInteract = true; interactTarget = nearestChest; interactType = 'chest'; }
        }
    }

    const prompt = document.getElementById('interaction-prompt');
    if (prompt) { 
        prompt.style.display = canInteract ? 'block' : 'none'; 
        if (canInteract) {
            if (interactType === 'merchant') prompt.textContent = 'Nhấn [ F ] để Giao dịch';
            else if (interactType === 'alchemy') prompt.textContent = 'Nhấn [ F ] để Luyện Kim';
            else prompt.textContent = 'Nhấn [ F ] để Mở Rương';
        }
    }

    // Xử lý thu/phóng Bản đồ nhỏ
    const minimapCanvas = document.getElementById('minimapCanvas');
    if (minimapCanvas) {
        if (inputManager.isActionActive('map') && !player.isDead) minimapCanvas.classList.add('enlarged');
        else minimapCanvas.classList.remove('enlarged');
    }

    if (canInteract && inputManager.isActionJustPressed('interact')) {
        AudioManager.play('click');
        if (interactType === 'merchant') openShop();
        else if (interactType === 'chest') openChest(interactTarget);
        else if (interactType === 'alchemy') openAlchemy();
    }

    const allPlayers = [player, ...Object.values(Network.otherPlayers)];
    let hasParasite = false;
    if (gameMode !== 'pvp') {
        enemies.forEach(e => e.update(dt, allPlayers, gameMap, enemies));
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];
            
            if (e.isAlly && e.isParasite) {
                hasParasite = true;
                if (player.hp < player.maxHp * 0.15) { e.hp = 0; e.die(); }
            }
            if (e.isAlly && e.lifespan !== undefined) {
                e.lifespan -= dt;
                if (e.lifespan <= 0 && !e.isDead) { e.hp = 0; e.die(); }
            }
            
            // Nhận tín hiệu quái chết từ mạng
            if (Network.isMultiplayer && Network.sharedKilledEnemies.has(e.id) && !e.isDead) { e.hp = 0; e.die(); }

            if (enemies[i].isDead) {
                if (e.isAlly) {
                    if (e.isGoliath) {
                        player.stunTimer = 3000;
                        player.summonTimer = Math.max(player.summonTimer || 0, 10000);
                        VFX.spawnFloatingText(player.x, player.y, "CỰ THẦN GỤC NGÃ!", "#e74c3c");
                        player.mergedTarget = null;
                    }
                    if (e.boneBurst) {
                        VFX.spawnImpactEffect(e.x + e.width/2, e.y + e.height/2, 'meteor');
                        const dmg = Math.floor(e.maxHp * 0.25);
                        enemies.forEach(en => {
                            if (!en.isDead && !en.isAlly && Math.hypot(en.x + en.width/2 - (e.x + e.width/2), en.y + en.height/2 - (e.y + e.height/2)) < 150) {
                                en.takeDamage(dmg); en.applyStatusEffect('ice', 3000, 0.4); 
                            }
                        });
                        const runes = player.runes || [];
                        if (runes.filter(r => r.branch === 'SACRIFICE').length >= 3) {
                            player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.05);
                            player.summonTimer = Math.max(0, (player.summonTimer || 0) - 1000);
                        }
                    }
                    if (e.soulAbsorb) {
                        player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.05);
                        VFX.spawnFloatingText(player.x, player.y, "+ Máu", "#2ecc71");
                    }
                }

                Network.markEnemyKilled(e.id);
                if (!enemies[i].expGranted && !enemies[i].isAlly) {
                    VFX.spawnExpOrbs(enemies[i].x+enemies[i].width/2, enemies[i].y+enemies[i].height/2, enemies[i].expValue);
                    if (Math.random() < 0.4 || enemies[i].isBoss) VFX.spawnGoldCoins(enemies[i].x+enemies[i].width/2, enemies[i].y+enemies[i].height/2, enemies[i].isBoss ? Math.floor(Math.random()*50)+waveNumber*25 : Math.floor(Math.random()*10)+waveNumber*5);
                    if (Math.random() < 0.3 || enemies[i].isBoss) VFX.spawnSoulDrops(enemies[i].x+enemies[i].width/2, enemies[i].y+enemies[i].height/2, enemies[i].isBoss ? 10+waveNumber*3 : 1+Math.floor(Math.random()*2));
                    enemies[i].expGranted = true;
                }
                enemies.splice(i, 1);
            }
        }

        if (enemies.filter(e => !e.isAlly).length === 0 && !isGameOver) { 
            waveClearTimer -= dt; 
            if (waveClearTimer <= 0) { 
                waveNumber++; Network.clearWaveData(); 
                gameState = 'SKILL_SELECT';
                document.body.classList.remove('show-joystick');
                const options = skillManager.getThreeRandomSkills();
                UI.renderSkillSelection(options, (selectedId) => {
                    skillManager.selectSkill(selectedId, player);
                    player.recalculateStats();
                    AudioManager.play('chest');
                    gameState = 'PLAYING';
                    document.body.classList.add('show-joystick');
                    spawnWave(waveNumber + 1);
                    waveClearTimer = 1200;
                    isDataDirty = true;
                });
            } 
        } else waveClearTimer = 1200;
        
        if (hasParasite) {
            // Rút máu liên tục, không gọi hàm takeDamage để không kích hoạt bất tử và tiếng kêu liên tục
            player.hp -= player.maxHp * 0.03 * (dt / 1000);
            if (player.hp <= 0 && !player.isDead) player.die();
        }
    } else {
        // PvP Mode: Liên tục thả rương tiếp tế
        waveClearTimer -= dt;
        if (waveClearTimer <= 0 && chests.filter(c => !c.opened).length < 15) {
            createChests(2, gameMap);
            waveClearTimer = 15000;
        }
    }

    projectiles.forEach(p => {
        p.update(dt, gameMap); if (p.markedForDeletion) return;
        if (!p.isEnemyProjectile) {
            for (const e of enemies) {
                if (e.isDead || e.isAlly) continue;
                if (Math.hypot(p.x-(e.x+e.width/2), p.y-(e.y+e.height/2)) < p.radius + Math.max(e.width, e.height)/2) {
                    if (p.hitEnemies && p.hitEnemies.has(e)) continue; 
                    
                    let finalDmg = p.damage;
                    let isCrit = false;
                    if (Math.random() < player.critRate) {
                        finalDmg = Math.floor(finalDmg * player.critDamage);
                        isCrit = true;
                    }
                    
                    e.takeDamage(finalDmg); 
                    VFX.spawnFloatingText(e.x+e.width/2, e.y, isCrit ? finalDmg + '!' : finalDmg, isCrit ? '#f1c40f' : '#ffffff'); 
                    if (p.hitEnemies) p.hitEnemies.add(e); p.pierceCount--; if (p.pierceCount <= 0) p.markedForDeletion = true;
                    if (p.effectType === 'lightning' && !p.spawnedImpact) { VFX.spawnLightningChainEffect(e, finalDmg*0.55, enemies); p.spawnedImpact = true; } else if (p.effectType === 'fire') e.applyStatusEffect('fire', 3000, Math.max(1, Math.floor(finalDmg*0.3))); else if (p.effectType === 'ice') e.applyStatusEffect('ice', 2000, 0.4);
                    if (player.hasSingularity && player.singularityTimer <= 0) {
                        player.singularityTimer = player.singularityMaxCooldown;
                        VFX.spawnImpactEffect(e.x + e.width/2, e.y + e.height/2, 'singularity');
                    }
                    if (player.lifestealChance && Math.random() < player.lifestealChance) {
                        player.hp = Math.min(player.maxHp, player.hp + 2);
                        VFX.spawnFloatingText(player.x + player.width/2, player.y, '+2', '#2ecc71');
                    }
                    if (p.markedForDeletion) break;
                }
            }
            // Cho phép đạn bản thân nổ khi trúng người chơi khác trong PvP để lấy hiệu ứng hình ảnh
            if (gameMode === 'pvp') {
                for (const op of Object.values(Network.otherPlayers)) {
                    if (op.isDead) continue;
                    if (Math.hypot(p.x-(op.x+op.width/2), p.y-(op.y+op.height/2)) < p.radius + Math.max(op.width, op.height)/2) {
                        if (p.hitEnemies && p.hitEnemies.has(op)) continue; 
                        
                        let finalDmg = p.damage;
                        let isCrit = false;
                        if (Math.random() < player.critRate) {
                            finalDmg = Math.floor(finalDmg * player.critDamage);
                            isCrit = true;
                        }
                        
                        VFX.spawnFloatingText(op.x+op.width/2, op.y, isCrit ? finalDmg + '!' : finalDmg, isCrit ? '#e67e22' : '#e74c3c'); 
                        if (p.hitEnemies) p.hitEnemies.add(op); p.pierceCount--; if (p.pierceCount <= 0) p.markedForDeletion = true;
                        if (p.markedForDeletion) break;
                    }
                }
            }
        } else { if (!player.isDead && !window.isGodMode && Math.hypot(p.x-(player.x+player.width/2), p.y-(player.y+player.height/2)) < p.radius + Math.max(player.width, player.height)/2) { player.takeDamage(p.damage); p.markedForDeletion = true; } }
    });

    for (let i = projectiles.length - 1; i >= 0; i--) if (projectiles[i].markedForDeletion) projectiles.splice(i, 1);

    for (let i = chests.length - 1; i >= 0; i--) {
        const c = chests[i]; 
        if (c.opened) {
            if (c.despawnTimer === undefined) c.despawnTimer = 20000; // 20 giây
            c.despawnTimer -= dt;
            if (c.despawnTimer <= 0) chests.splice(i, 1);
            continue;
        }
        
        // Rương bị người chơi khác mở
        if (Network.isMultiplayer && Network.sharedOpenedChests.has(c.id)) {
            c.opened = true; c.despawnTimer = 20000; continue;
        }
    }

    UI.updateLoot(dt); VFX.updateExpOrbs(dt, player); VFX.updateGoldCoins(dt, player, () => isDataDirty = true); VFX.updateSoulDrops(dt, player, () => isDataDirty = true); VFX.updateImpactEffects(dt); VFX.updateFloatingTexts(dt); UI.updateHud(player);

    if (waveNumber > bestWave) { bestWave = waveNumber; isDataDirty = true; const bsv = document.getElementById('best-score-value'); if (bsv) bsv.textContent = bestWave; }
    if (isDataDirty) { saveGameData(); isDataDirty = false; }

    camera.update(player, dt); inputManager.update();

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); camera.beginRender(ctx);
    
    const bgCanvas = document.getElementById('bgCanvas');
    if (bgCanvas) {
        const bgCtx = bgCanvas.getContext('2d');
        bgCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        camera.beginRender(bgCtx);
        gameMap.draw(bgCtx, camera);
        camera.endRender(bgCtx);
    } else {
        gameMap.draw(ctx, camera);
    }

    // Sắp xếp chiều sâu (Y-Sorting)
    const renderList = [];
    chests.forEach(c => renderList.push({ type: 'chest', y: c.y + c.height, obj: c }));
    if (merchant) renderList.push({ type: 'merchant', y: merchant.y + merchant.height, obj: merchant });
    if (alchemyTable) renderList.push({ type: 'alchemyTable', y: alchemyTable.y + alchemyTable.height, obj: alchemyTable });
    renderList.push({ type: 'player', y: player.y + player.height, obj: player });
    enemies.forEach(e => renderList.push({ type: 'enemy', y: e.y + e.height, obj: e }));
    projectiles.forEach(p => renderList.push({ type: 'projectile', y: p.y, obj: p }));
    
    if (Network.isMultiplayer) {
        Object.values(Network.otherPlayers).forEach(op => {
            renderList.push({ type: 'otherPlayer', y: op.y + op.height, obj: op });
        });
    }

    renderList.sort((a, b) => a.y - b.y);

    renderList.forEach(item => {
        if (item.type === 'chest') {
            const c = item.obj;
            if (chestImg.complete && chestImg.naturalWidth > 0) {
                const fw = chestImg.naturalWidth;
                const fh = chestImg.naturalHeight / 2;
                const drawW = c.width * 1.5;
                const drawH = drawW * (fh / fw);
                ctx.drawImage(chestImg, 0, c.opened ? fh : 0, fw, fh, c.x + (c.width - drawW)/2, c.y + c.height - drawH, drawW, drawH);
            } else {
                if (!c.opened) { ctx.save(); ctx.fillStyle = '#b5651d'; ctx.fillRect(c.x, c.y, c.width, c.height); ctx.fillStyle = '#ffd700'; ctx.fillRect(c.x + 8, c.y + 8, c.width - 16, c.height - 16); ctx.restore(); }
            }
        } else if (item.type === 'otherPlayer') {
            Network.drawOtherPlayer(ctx, item.obj, camera, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else {
            item.obj.draw(ctx);
        }
    });
    
    const alchemyGif = document.getElementById('alchemy-gif');
    if (alchemyTable && alchemyGif) {
        const screenX = alchemyTable.x + alchemyTable.width / 2 - camera.getRenderX();
        const screenY = alchemyTable.y + alchemyTable.height / 2 - camera.getRenderY() - 15;
        alchemyGif.style.left = `${screenX}px`;
        alchemyGif.style.top = `${screenY}px`;
        alchemyGif.style.display = 'block';
    } else if (alchemyGif) {
        alchemyGif.style.display = 'none';
    }
    

    VFX.drawExpOrbs(ctx); VFX.drawGoldCoins(ctx); VFX.drawSoulDrops(ctx); VFX.drawImpactEffects(ctx); VFX.drawFloatingTexts(ctx);
    camera.endRender(ctx);
    UI.drawMinimap(gameMap, chests, enemies, merchant, alchemyTable, player, Network.otherPlayers, camera, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = 'italic 14px "Segoe UI"'; ctx.textAlign = 'right'; ctx.fillText(`Phiên bản ${GAME_VERSION}`, CANVAS_WIDTH - 15, CANVAS_HEIGHT - 15); ctx.restore();
    if (!isGameOver || (Network.isMultiplayer && !allPlayersDead)) { if (loopId) cancelAnimationFrame(loopId); loopId = requestAnimationFrame(gameLoop); }
}

const initLoading = document.getElementById('loading-text'); if(initLoading) initLoading.style.display = 'none';
setHudVisibility(false); loopId = requestAnimationFrame(gameLoop);
