// js/network.js
import { getPlayerName, getDeviceId } from './db.js';
import { Player } from './entities.js';
import { SkinManager } from './skins.js';
import * as VFX from './vfx.js';

export const Network = {
    isMultiplayer: false,
    otherPlayers: {},
    highestWave: 1,
    sharedOpenedChests: new Set(),
    sharedKilledEnemies: new Set(),
    localOpenedChests: [],
    localKilledEnemies: [],
    lastSyncString: "",
    socket: null,
    
    onChatHistoryReceived: null,
    onNewChatMessage: null,

    initSocket() {
        if (!this.socket) {
            // Tự động nhận diện domain/IP hiện tại để kết nối (Hỗ trợ chơi qua mạng Internet)
            this.socket = io(window.location.origin);

            this.socket.emit('registerName', getPlayerName());
            
            this.socket.on('pong', (clientTime) => {
                const ping = Date.now() - clientTime;
                const pingEl = document.getElementById('ping-value');
                if (pingEl) {
                    pingEl.textContent = ping;
                    pingEl.className = ping < 50 ? 'good-ping' : (ping < 150 ? 'med-ping' : 'bad-ping');
                }
            });

            this.socket.on('onlinePlayersList', (list) => {
                const countEl = document.getElementById('server-player-count');
                if (countEl) countEl.textContent = list.length;
                
                const listEl = document.getElementById('online-players-list');
                if (listEl) listEl.innerHTML = list.map(name => `<div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">• ${name}</div>`).join('');
                
                const toggleEl = document.getElementById('online-players-toggle');
                if (toggleEl && toggleEl.innerHTML.includes('▴')) toggleEl.innerHTML = `👥 Đang Online: <span id="server-player-count">${list.length}</span> ▴`;
                else if (toggleEl) toggleEl.innerHTML = `👥 Đang Online: <span id="server-player-count">${list.length}</span> ▾`;
            });

            setInterval(() => {
                if (this.socket.connected) {
                    this.socket.emit('ping', Date.now());
                } else {
                    const pingEl = document.getElementById('ping-value');
                    if (pingEl) pingEl.textContent = '--';
                }
            }, 2000);

            this.socket.on('leaderboardUpdated', (leaderboard) => {
                if (window.renderLeaderboard) window.renderLeaderboard(leaderboard);
            });

            this.socket.on('revive', () => {
                if (window.onReviveReceived) window.onReviveReceived();
            });

            this.socket.on('playerDataUpdated', (info) => {
                if (info.id === getDeviceId() && window.playerRef) {
                    const d = info.data;
                    if (d.gold !== undefined) { window.playerRef.gold = d.gold; localStorage.setItem('vucthamlangquen_gold', d.gold); }
                    if (d.souls !== undefined) { window.playerRef.souls = d.souls; localStorage.setItem('vucthamlangquen_souls', d.souls); }
                    if (d.bestWave !== undefined && window.updateBestWave) { window.updateBestWave(d.bestWave); }
                    if (d.ownedSkins) SkinManager.ownedSkins = d.ownedSkins;
                    if (d.equippedSkin) SkinManager.equippedSkin = d.equippedSkin;
                    SkinManager.saveSkinData();
                }
            });

            this.socket.on('chatHistory', (history) => {
                if (this.onChatHistoryReceived) this.onChatHistoryReceived(history);
            });
            
            this.socket.on('newChatMessage', (msg) => {
                if (this.onNewChatMessage) this.onNewChatMessage(msg);
            });

            this.socket.on('currentPlayers', (players) => {
                for (let id in players) {
                    if (id !== this.socket.id) this.updateOtherPlayer(id, players[id]);
                }
            });

            this.socket.on('playerJoined', (info) => {
                this.updateOtherPlayer(info.id, info.data);
            });

            this.socket.on('playerStateUpdated', (info) => {
                this.updateOtherPlayer(info.id, info.data);
            });

            this.socket.on('playerLeft', (id) => {
                delete this.otherPlayers[id];
            });
        }
    },

    updateOtherPlayer(id, p) {
        if (!this.otherPlayers[id]) this.otherPlayers[id] = new Player(p.x, p.y);
        const op = this.otherPlayers[id];
        
        if (!op.isDead && p.dead) VFX.spawnImpactEffect(p.x + op.width/2, p.y + op.height/2, 'death');
        
        op.targetX = p.x; op.targetY = p.y;
        op.vx = p.vx || 0; op.vy = p.vy || 0; // Nhận vận tốc để dự đoán
        if (Math.abs(op.x - p.x) > 100 || Math.abs(op.y - p.y) > 100) { op.x = p.x; op.y = p.y; } 
        op.hp = p.hp; op.maxHp = p.maxHp; op.facing = p.facing || {x:0, y:1};
        op.shield = p.sh || 0; op.maxShield = p.mSh || 0;
        
        if (p.skin) {
            op.skin = p.skin; 
            op.color = p.skin.color || '#3498db';
            op.skinImage = SkinManager.getSkinImage(p.skin.id);
        } else { op.color = p.color || '#3498db'; }

        op.playerName = p.playerName; op.isDead = p.dead;
        op.isAttacking = p.atk;
        if (p.weapon) {
            const localTime = op.currentWeapon ? op.currentWeapon.lastFiredTime : 0;
            op.currentWeapon = p.weapon;
            op.currentWeapon.lastFiredTime = localTime; // Giữ lại đồng hồ cục bộ để không bị nghẹn đạn
        }
        
        if (p.w && p.w > this.highestWave) this.highestWave = p.w;
        if (p.ch) p.ch.forEach(c => this.sharedOpenedChests.add(c));
        if (p.en) p.en.forEach(e => this.sharedKilledEnemies.add(e));
    },

    start(isMulti, gameMode = 'coop') {
        this.isMultiplayer = isMulti;
        this.otherPlayers = {};
        this.highestWave = 1;
        this.sharedOpenedChests.clear();
        this.sharedKilledEnemies.clear();
        this.localOpenedChests = [];
        this.localKilledEnemies = [];
        this.lastSyncString = "";
        
        this.initSocket();

        if (isMulti) {
            this.socket.emit('joinMultiplayer', {
                playerName: getPlayerName(), x: 0, y: 0, hp: 100, maxHp: 100, dead: false, atk: false, gameMode: gameMode
            });
        } else {
            this.socket.emit('leaveMultiplayer');
        }
    },

    updateSync(player, inputManager, waveNumber) {
        if (!this.isMultiplayer || !this.socket) return;
        const isAttacking = inputManager.mouse.leftDown || inputManager.mouse.leftJustPressed || inputManager.isActionActive('attack') || inputManager.isShooting;
        const moveVec = inputManager.getMovementVector();
        
        const checkData = { 
            x: Math.round(player.x), y: Math.round(player.y), hp: Math.round(player.hp), maxHp: player.maxHp,
            sh: Math.round(player.shield), mSh: player.maxShield,
            vx: Math.round(moveVec.x * player.speed), vy: Math.round(moveVec.y * player.speed), // Truyền vận tốc
            color: player.color, skin: player.skin,
            facing: { x: parseFloat(player.facing.x.toFixed(1)), y: parseFloat(player.facing.y.toFixed(1)) }, 
            atk: isAttacking, dead: player.isDead, w: waveNumber, 
            ch: this.localOpenedChests, en: this.localKilledEnemies,
            weapon: player.currentWeapon, playerName: getPlayerName()
        };
        const currentString = JSON.stringify(checkData);
        if (currentString !== this.lastSyncString) {
            this.lastSyncString = currentString;
            this.socket.emit('updateState', checkData);
        }
    },

    sendRevive(targetId) {
        if (!this.socket) return;
        this.socket.emit('revivePlayer', targetId);
    },

    sendChat(text) {
        if (!this.socket) this.initSocket();
        this.socket.emit('sendChat', { playerName: getPlayerName(), text });
    },

    markChestOpened(id) { if (!this.localOpenedChests.includes(id)) { this.localOpenedChests.push(id); this.sharedOpenedChests.add(id); } },
    markEnemyKilled(id) { if (!this.localKilledEnemies.includes(id)) { this.localKilledEnemies.push(id); this.sharedKilledEnemies.add(id); } },
    
    clearWaveData() {
        this.localOpenedChests = [];
        this.localKilledEnemies = [];
        this.sharedOpenedChests.clear();
        this.sharedKilledEnemies.clear();
    },

    updateInterpolation(dt) {
        if (!this.isMultiplayer) return;
        Object.values(this.otherPlayers).forEach(op => {
            if (op.targetX !== undefined) { 
                // Dead Reckoning (Dự đoán): Tiếp tục trượt đi theo vận tốc cũ trong lúc chờ mạng
                op.targetX += op.vx * (dt / 1000);
                op.targetY += op.vy * (dt / 1000);
                // Lerp (Làm mượt): Kéo nhẹ nhân vật về vị trí chuẩn
                op.x += (op.targetX - op.x) * 0.4; 
                op.y += (op.targetY - op.y) * 0.4; 
                
                op.isMoving = (Math.abs(op.vx) > 0 || Math.abs(op.vy) > 0);
            }
            
            op.updateAnimation(dt, op.isAttacking);
        });
    },

    drawOtherPlayer(ctx, op, camera = null, canvasWidth = 800, canvasHeight = 600) {
            op.draw(ctx);
            
            if (!op.isDead) {
                // Vẽ thanh HP bo tròn cute
                const hpWidth = 36;
                const hpHeight = 6;
                const hpX = op.x + op.width / 2 - hpWidth / 2;
                
                const spriteTop = op.getSpriteTopY ? op.getSpriteTopY() : op.y - 10;
                const hpY = spriteTop - 12;
                const hpRatio = Math.max(0, Math.min(1, op.hp / op.maxHp));

                ctx.save();
            if (op.maxShield > 0) {
                const shHeight = 4; const shY = hpY - 5; const shRatio = Math.max(0, Math.min(1, op.shield / op.maxShield));
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; ctx.beginPath(); ctx.roundRect(hpX, shY, hpWidth, shHeight, 2); ctx.fill();
                ctx.fillStyle = '#3498db'; ctx.beginPath(); ctx.roundRect(hpX, shY, hpWidth * shRatio, shHeight, 2); ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(hpX, shY, hpWidth, shHeight, 2); ctx.stroke();
            }
                // Nền thanh máu
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.beginPath(); ctx.roundRect(hpX, hpY, hpWidth, hpHeight, 3); ctx.fill();
                // Màu sắc thanh máu theo lượng máu
                if (hpRatio > 0.5) ctx.fillStyle = '#2ecc71'; // Xanh lá
                else if (hpRatio > 0.2) ctx.fillStyle = '#f1c40f'; // Vàng
                else ctx.fillStyle = '#e74c3c'; // Đỏ
                // Lõi thanh máu
                ctx.beginPath(); ctx.roundRect(hpX, hpY, hpWidth * hpRatio, hpHeight, 3); ctx.fill();
                // Viền thanh máu
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.roundRect(hpX, hpY, hpWidth, hpHeight, 3); ctx.stroke();
                // Tên người chơi
                const nameY = op.maxShield > 0 ? hpY - 11 : hpY - 6;
                ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Segoe UI"'; ctx.textAlign = 'center'; ctx.fillText(op.playerName || 'Hiệp sĩ', op.x + op.width/2, nameY);
                ctx.restore();
            } else {
                // Trạng thái đã chết: Chỉ vẽ tên dịch xuống dưới bia mộ
                ctx.save(); ctx.fillStyle = '#fff'; ctx.font = 'bold 12px "Segoe UI"'; ctx.textAlign = 'center'; ctx.fillText(op.playerName || 'Hiệp sĩ', op.x + op.width/2, op.y + 35); ctx.restore();
            }

            // Vẽ định vị đồng đội (Off-screen Indicator)
            if (camera && !op.isDead) {
                const opCenterX = op.x + op.width / 2;
                const opCenterY = op.y + op.height / 2;
                const isOffScreen = opCenterX < camera.x || opCenterX > camera.x + canvasWidth || opCenterY < camera.y || opCenterY > camera.y + canvasHeight;
                
                if (isOffScreen) {
                    ctx.save();
                    const camCenterX = camera.x + canvasWidth / 2;
                    const camCenterY = camera.y + canvasHeight / 2;
                    const dx = opCenterX - camCenterX;
                    const dy = opCenterY - camCenterY;
                    const angle = Math.atan2(dy, dx);
                    
                    const padding = 30; // Cách lề 30px
                    const left = camera.x + padding;
                    const right = camera.x + canvasWidth - padding;
                    const top = camera.y + padding;
                    const bottom = camera.y + canvasHeight - padding;
                    
                    let posX = camCenterX;
                    let posY = camCenterY;

                    if (dx !== 0) {
                        const slope = dy / dx;
                        if (dx > 0) { posX = right; posY = camCenterY + slope * (right - camCenterX); } 
                        else { posX = left; posY = camCenterY + slope * (left - camCenterX); }
                    }
                    
                    if (posY > bottom || posY < top || dx === 0) {
                        const invSlope = dx / dy;
                        if (dy > 0) { posY = bottom; posX = camCenterX + invSlope * (bottom - camCenterY); } 
                        else if (dy < 0) { posY = top; posX = camCenterX + invSlope * (top - camCenterY); }
                    }

                    // Vẽ mũi tên định vị
                    ctx.translate(posX, posY);
                    ctx.rotate(angle);
                    
                    ctx.fillStyle = op.color || '#2ecc71';
                    ctx.beginPath();
                    ctx.moveTo(12, 0);
                    ctx.lineTo(-8, 8);
                    ctx.lineTo(-4, 0);
                    ctx.lineTo(-8, -8);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    
                    ctx.restore();
                }
            }
    }
};
