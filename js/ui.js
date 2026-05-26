import { MAP_WIDTH, MAP_COLS, MAP_ROWS } from './constants.js';
import { SpriteRenderer } from './sprite.js';
import { RaceManager } from './races.js';
import { SkinManager } from './skins.js';

export const UI = {
    els: {},
    cb: {},
    lootTimer: 0,
    lastAvatarSkinId: null,
    lastRaceId: null,
    lastJoystickSkinId: null,

    init(callbacks) {
        this.cb = callbacks;
        this.els = {
            hudAvatar: document.getElementById('hud-avatar-canvas'),
            raceBadge: document.getElementById('race-badge'),
            levelValue: document.getElementById('levelValue'),
            hpValue: document.getElementById('hpValue'),
            maxHpValue: document.getElementById('maxHpValue'),
            hpFill: document.getElementById('hp-fill'),
            shieldBar: document.getElementById('shield-bar'),
            shieldFill: document.getElementById('shield-fill'),
            shieldValue: document.getElementById('shieldValue'),
            maxShieldValue: document.getElementById('maxShieldValue'),
            expFill: document.getElementById('exp-fill'),
            goldValue: document.getElementById('goldValue'),
            soulValue: document.getElementById('soulValue'),
            lootText: document.getElementById('loot-text'),
            invList: document.getElementById('inventory-list'),
            invDetails: document.getElementById('inventory-details'),
            shopGold: document.getElementById('shop-player-gold'),
            shopSouls: document.getElementById('shop-player-souls'),
            shopUpg: document.getElementById('shop-upgrade-container'),
            chestContent: document.getElementById('chest-content'),
            chestEquipBtn: document.getElementById('chest-equip-btn'),
            chestTakeBtn: document.getElementById('chest-take-btn'),
            minimap: document.getElementById('minimapCanvas'),
            joystickAim: document.getElementById('joystick-aim'),
            btnSummon: document.getElementById('btn-summon')
        };
        if(this.els.minimap) this.miniCtx = this.els.minimap.getContext('2d');

        if (this.els.chestEquipBtn) {
            this.els.chestEquipBtn.addEventListener('click', () => { if(this.cb.onTakeChestItem) this.cb.onTakeChestItem(true); });
            this.els.chestEquipBtn.addEventListener('dragover', (e) => { e.preventDefault(); this.els.chestEquipBtn.style.boxShadow = '0 0 15px #fff'; });
            this.els.chestEquipBtn.addEventListener('dragleave', () => { this.els.chestEquipBtn.style.boxShadow = ''; });
            this.els.chestEquipBtn.addEventListener('drop', (e) => { e.preventDefault(); this.els.chestEquipBtn.style.boxShadow = ''; if(e.dataTransfer.getData('text') === 'chest-item' && this.cb.onTakeChestItem) this.cb.onTakeChestItem(true); });
        }
        if (this.els.chestTakeBtn) {
            this.els.chestTakeBtn.addEventListener('click', () => { if(this.cb.onTakeChestItem) this.cb.onTakeChestItem(false); });
            this.els.chestTakeBtn.addEventListener('dragover', (e) => { e.preventDefault(); this.els.chestTakeBtn.style.boxShadow = '0 0 15px #fff'; });
            this.els.chestTakeBtn.addEventListener('dragleave', () => { this.els.chestTakeBtn.style.boxShadow = ''; });
            this.els.chestTakeBtn.addEventListener('drop', (e) => { e.preventDefault(); this.els.chestTakeBtn.style.boxShadow = ''; if(e.dataTransfer.getData('text') === 'chest-item' && this.cb.onTakeChestItem) this.cb.onTakeChestItem(false); });
        }
    },

    updateHud(player) {
        if(this.els.levelValue) this.els.levelValue.textContent = player.level;
        if(this.els.hpValue) this.els.hpValue.textContent = Math.max(0, Math.round(player.hp));
        if(this.els.maxHpValue) this.els.maxHpValue.textContent = player.maxHp;
        if(this.els.goldValue) this.els.goldValue.textContent = player.gold;
        if(this.els.soulValue) this.els.soulValue.textContent = player.souls;

        const currentSkinId = player.skin ? player.skin.id : null;
        if (this.lastJoystickSkinId !== currentSkinId) {
            this.lastJoystickSkinId = currentSkinId;
            if (this.els.joystickAim && this.els.btnSummon) {
                if (currentSkinId === 'skeleton_mage') {
                    this.els.joystickAim.style.display = 'none';
                    this.els.btnSummon.style.display = 'flex';
                } else {
                    this.els.joystickAim.style.display = 'block';
                    this.els.btnSummon.style.display = 'none';
                }
            }
        }

        // Chỉ render lại DOM của Race Badge nếu người chơi đổi tộc (Tránh tụt FPS do gọi innerHTML 60 lần/giây)
        if (this.els.raceBadge && this.lastRaceId !== player.raceId) {
            this.lastRaceId = player.raceId;
            const race = RaceManager.getRace(player.raceId);
            if (race.imgSrc) {
                this.els.raceBadge.innerHTML = `<img src="${race.imgSrc}" style="width:16px; height:16px; object-fit:contain; filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));">`;
            } else {
                this.els.raceBadge.textContent = race.icon;
            }
            this.els.raceBadge.style.borderColor = race.rarity.color;
            this.els.raceBadge.title = `Tộc: ${race.name}\n${race.desc}`;
        }

        if (player.maxShield > 0) {
            if (this.els.shieldBar) this.els.shieldBar.style.display = 'block';
            if (this.els.shieldValue) this.els.shieldValue.textContent = Math.max(0, Math.round(player.shield));
            if (this.els.maxShieldValue) this.els.maxShieldValue.textContent = player.maxShield;
            const shieldP = Math.min(1, Math.max(0, player.shield / player.maxShield)) * 100;
            if (this.els.shieldFill) this.els.shieldFill.style.width = `${shieldP}%`;
        } else {
            if (this.els.shieldBar) this.els.shieldBar.style.display = 'none';
        }

        const hpP = Math.min(1, Math.max(0, player.hp / player.maxHp)) * 100;
        if(this.els.hpFill) this.els.hpFill.style.width = `${hpP}%`;
        const expP = Math.min(1, player.exp / player.expToNextLevel) * 100;
        if(this.els.expFill) this.els.expFill.style.width = `${expP}%`;

        // Cập nhật Avatar (HUD)
        if (this.els.hudAvatar && player.skin) {
            const skin = player.skin;
            const skinImg = player.skinImage;
            let isLoaded = true;
            
            if (skinImg) {
                if (skin.isAdvancedSprite) {
                    if (!skinImg.idle || !skinImg.idle.down || !skinImg.idle.down.complete || skinImg.idle.down.naturalWidth === 0) isLoaded = false;
                } else {
                    if (!skinImg.complete || skinImg.naturalWidth === 0) isLoaded = false;
                }
            }

            // Chỉ vẽ lại khi ảnh đã load và người chơi đổi sang Skin khác để tối ưu FPS
            if (isLoaded && this.lastAvatarSkinId !== skin.id) {
                this.lastAvatarSkinId = skin.id;
                const ctx = this.els.hudAvatar.getContext('2d');
                ctx.clearRect(0, 0, 50, 50);
                
                if (skinImg) {
                    if (skin.isAdvancedSprite) SpriteRenderer.drawAdvancedAvatar(ctx, skinImg.idle.down, skin.framesX || 8, 0, 0, 50, skin.scale || 1);
                    else if (skin.isSpriteSheet) SpriteRenderer.drawAvatar(ctx, skinImg, skin.framesX || 4, skin.framesY || 4, 0, 0, 50);
                    else ctx.drawImage(skinImg, 0, 0, 50, 50);
                } else {
                    SpriteRenderer.drawChibiAvatar(ctx, 0, 0, 50, skin);
                }
            } else if (!isLoaded) {
                this.lastAvatarSkinId = null; // Thử vẽ lại ở khung hình tiếp theo
            }
        }
    },

    showLoot(text) {
        if(!this.els.lootText) return;
        this.els.lootText.textContent = text;
        this.lootTimer = 1800;
    },

    updateLoot(dt) {
        if(!this.els.lootText) return;
        if(this.lootTimer > 0) {
            this.lootTimer -= dt;
            if(this.lootTimer <= 0) this.els.lootText.textContent = 'Nhặt rương để tăng sức mạnh!';
        }
    },

    renderInventory(player) {
        const list = document.getElementById('inventory-list');
        if(!list || !this.els.invDetails) return;
        
        // 1. Render Character Preview (Chibi)
        const cvs = document.getElementById('inv-player-canvas');
        if (cvs && player.skin) {
            const pCtx = cvs.getContext('2d');
            pCtx.clearRect(0, 0, 80, 120);

            const skin = player.skin;
            const skinImg = player.skinImage;

            if (skinImg) {
                if (skin.isAdvancedSprite && skinImg.idle && skinImg.idle.down) {
                    SpriteRenderer.drawAdvancedAvatar(pCtx, skinImg.idle.down, skin.framesX || 8, 0, 20, 80, skin.scale || 1);
                } else if (skin.isSpriteSheet) {
                    SpriteRenderer.drawAvatar(pCtx, skinImg, skin.framesX || 4, skin.framesY || 4, 0, 20, 80);
                } else {
                    const fw = skinImg.naturalWidth;
                    const fh = skinImg.naturalHeight;
                    if (fw > 0 && fh > 0) {
                        const scale = Math.min(80 / fw, 80 / fh);
                        const drawW = fw * scale;
                        const drawH = fh * scale;
                        pCtx.drawImage(skinImg, (80 - drawW) / 2, 20 + (80 - drawH) / 2, drawW, drawH);
                    }
                }
            } else {
                SpriteRenderer.drawChibiAvatar(pCtx, 15, 35, 50, skin);
            }
        }

        // 2. Render Equipment Slots
        const isMage = player.skin && player.skin.id === 'skeleton_mage';
        const equipSlotsContainer = document.querySelector('.mc-equip-slots');
        
        if (equipSlotsContainer) {
            equipSlotsContainer.innerHTML = '';
            equipSlotsContainer.style.display = 'grid';
            equipSlotsContainer.style.gridTemplateColumns = isMage ? 'repeat(3, 44px)' : 'repeat(2, 44px)';
            equipSlotsContainer.style.gap = '8px';
            equipSlotsContainer.style.justifyContent = 'center';
            
            const armorSlots = [{id: 'helmet', icon: '🪖'}, {id: 'armor', icon: '👕'}, {id: 'gloves', icon: '🧤'}, {id: 'boots', icon: '👢'}];
            
            armorSlots.forEach(conf => {
                const item = player.equipment[conf.id];
                const div = document.createElement('div');
                div.className = 'mc-slot equip-slot'; div.id = `slot-${conf.id}`;
                if (item) {
                    let iconHtml = item.imgSrc ? `<img src="${item.imgSrc}" style="width:32px; height:32px; object-fit:contain; filter:drop-shadow(0 0 10px ${item.rarity.color}); pointer-events:none;">` : `<div class="item-icon" style="text-shadow:0 0 15px ${item.rarity.color}; pointer-events:none;">${this.getIcon(item)}</div>`;
                    div.innerHTML = iconHtml; div.style.borderColor = item.rarity.color; div.onclick = () => this.cb.onUnequip(conf.id); div.onmouseover = () => this.showItemDetails(item); div.onmouseout = () => this.els.invDetails.innerHTML='';
                } else {
                    div.innerHTML = `<div style="opacity:0.3;font-size:24px;">${conf.icon}</div>`; div.style.borderColor = '#373737';
                }
                equipSlotsContainer.appendChild(div);
            });
            
            if (isMage) {
                ['rune1', 'rune2', 'rune3'].forEach(rId => {
                    const item = player.equipment[rId];
                    const div = document.createElement('div'); div.className = 'mc-slot equip-slot'; div.id = `slot-${rId}`;
                    if (item) {
                        let iconHtml = item.imgSrc ? `<img src="${item.imgSrc}" style="width:32px; height:32px; object-fit:contain; filter:drop-shadow(0 0 10px ${item.rarity.color}); pointer-events:none;">` : `<div class="item-icon" style="text-shadow:0 0 15px ${item.rarity.color}; pointer-events:none;">🪨</div>`;
                        div.innerHTML = iconHtml; div.style.borderColor = item.rarity.color; div.onclick = () => this.cb.onUnequip(rId); div.onmouseover = () => this.showItemDetails(item); div.onmouseout = () => this.els.invDetails.innerHTML='';
                    } else { div.innerHTML = `<div style="opacity:0.3;font-size:24px;">🪨</div>`; div.style.borderColor = '#373737'; }
                    equipSlotsContainer.appendChild(div);
                });
            } else {
                const item = player.currentWeapon;
                const div = document.createElement('div'); div.className = 'mc-slot equip-slot'; div.id = `slot-weapon`;
                if (item) {
                    let iconHtml = item.imgSrc ? `<img src="${item.imgSrc}" style="width:32px; height:32px; object-fit:contain; filter:drop-shadow(0 0 10px ${item.rarity.color}); pointer-events:none;">` : `<div class="item-icon" style="text-shadow:0 0 15px ${item.rarity.color}; pointer-events:none;">${this.getIcon(item)}</div>`;
                    div.innerHTML = iconHtml; div.style.borderColor = item.rarity.color; div.onclick = () => this.cb.onUnequip('weapon'); div.onmouseover = () => this.showItemDetails(item); div.onmouseout = () => this.els.invDetails.innerHTML='';
                } else { div.innerHTML = `<div style="opacity:0.3;font-size:24px;">🗡️</div>`; div.style.borderColor = '#373737'; }
                equipSlotsContainer.appendChild(div);
            }
        }

        // 3. Render 27 Grid Slots
        list.innerHTML = '';
        for(let i=0; i<27; i++) {
            const item = player.inventory[i];
            const div = document.createElement('div'); div.className = 'mc-slot';
            if(item) {
                let iconHtml = item.imgSrc 
                    ? `<img src="${item.imgSrc}" style="width:32px; height:32px; object-fit:contain; filter:drop-shadow(0 0 10px ${item.rarity.color}); pointer-events:none;">` 
                    : `<div class="item-icon" style="text-shadow:0 0 15px ${item.rarity.color}; pointer-events:none;">${this.getIcon(item)}</div>`;
                div.innerHTML = iconHtml;
                div.style.borderColor = item.rarity.color;
                div.onclick = () => this.cb.onEquip(item); div.onmouseover = () => this.showItemDetails(item); div.onmouseout = () => this.els.invDetails.innerHTML='';
            } else {
                div.style.borderColor = '#373737';
            }
            list.appendChild(div);
        }
    },
    
    getIcon(item) {
        let icon = '🗡️';
        if(item.type==='ranged') icon='🏹'; else if(item.type==='magic') icon='🪄'; 
        else if(item.type==='armor') { if(item.armorType==='helmet') icon='🪖'; if(item.armorType==='armor') icon='👕'; if(item.armorType==='gloves') icon='🧤'; if(item.armorType==='boots') icon='👢'; }
        else if(item.type==='rune') icon='🪨';
        return icon;
    },

    showItemDetails(w) {
        if (!w || !this.els.invDetails) return;
        let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><h3 style="margin:0;color:${w.rarity.color};font-size:18px;">${w.name}</h3><span style="background:${w.rarity.color}44;color:${w.rarity.color};padding:2px 8px;border-radius:4px;font-size:11px;">${w.rarity.name}</span></div><div style="display:flex;gap:15px;"><div style="flex:1;">`;
        if (w.type === 'ranged' || w.type === 'magic') html += `<div class="stat-row">⚔️ Sát thương: <strong>${w.damage}</strong></div><div class="stat-row">⚡ Tốc độ: <strong>${(1000/w.fireRate).toFixed(1)} Đ/s</strong></div>`;
        else if (w.type === 'armor') {
            if (w.hpBonus) html += `<div class="stat-row">❤️ Máu tối đa: <strong style="color:#2ecc71">+${Math.floor(w.hpBonus*w.rarity.statMultiplier)}</strong></div>`;
            if (w.shieldBonus) html += `<div class="stat-row">🛡️ Giáp ảo: <strong style="color:#3498db">+${Math.floor(w.shieldBonus*w.rarity.statMultiplier)}</strong></div>`;
            if (w.speedBonus) html += `<div class="stat-row">👟 Tốc chạy: <strong style="color:#f1c40f">+${Math.floor(w.speedBonus*w.rarity.statMultiplier)}</strong></div>`;
        }
        else if (w.type === 'rune') {
            html += `<div class="stat-row" style="background: rgba(46, 204, 113, 0.1); border-color: #2ecc71; text-align: left;"><strong style="color:#2ecc71;">[BUFF]</strong> ${w.buff}</div>`;
            html += `<div class="stat-row" style="background: rgba(231, 76, 60, 0.1); border-color: #e74c3c; text-align: left;"><strong style="color:#e74c3c;">[DEBUFF]</strong> ${w.debuff}</div>`;
        }
        
        if (w.type !== 'rune') {
            html += `</div><div style="flex:1;font-style:italic;color:#bdc3c7;font-size:12px;background:rgba(0,0,0,0.3);padding:8px;border-radius:4px;">✨ ${w.ability}</div></div>`;
        } else {
            html += `</div></div>`;
        }
        this.els.invDetails.innerHTML = html;
    },

    renderChest(w) {
        if(!this.els.chestContent) return;
        let iconHtml = w.imgSrc 
            ? `<img src="${w.imgSrc}" draggable="false" style="width:60px; height:60px; object-fit:contain; filter:drop-shadow(0 0 15px ${w.rarity.color}); pointer-events:none;">` 
            : `<div style="font-size:40px; text-shadow:0 0 15px ${w.rarity.color}; pointer-events:none;">${w.type === 'ranged' ? '🏹' : w.type==='magic' ? '🪄' : w.effectType==='fire' ? '🔥' : w.effectType==='ice' ? '❄️' : w.effectType==='lightning' ? '⚡' : w.effectType==='poison' ? '🧪' : '🗡️'}</div>`;

        let statsHtml = '';
        if (w.type === 'ranged' || w.type === 'magic') {
            statsHtml = `<div style="width:100%; display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:5px;"><div class="stat-row" style="margin:0;"><span>⚔️ Sát thương: <strong>${w.damage}</strong></span></div><div class="stat-row" style="margin:0;"><span>⚡ Tốc độ: <strong>${(1000/w.fireRate).toFixed(1)}/s</strong></span></div></div><div class="inv-ability" style="width:100%; box-sizing:border-box; margin:0; font-size:13px; padding: 10px;">✨ ${w.ability}</div>`;
        } else if (w.type === 'armor') {
            let armorStats = '';
            if (w.hpBonus) armorStats += `<div class="stat-row" style="margin:0;"><span>❤️ Máu: <strong style="color:#2ecc71">+${Math.floor(w.hpBonus*w.rarity.statMultiplier)}</strong></span></div>`;
            if (w.shieldBonus) armorStats += `<div class="stat-row" style="margin:0;"><span>🛡️ Giáp: <strong style="color:#3498db">+${Math.floor(w.shieldBonus*w.rarity.statMultiplier)}</strong></span></div>`;
            if (w.speedBonus) armorStats += `<div class="stat-row" style="margin:0;"><span>👟 Tốc độ: <strong style="color:#f1c40f">+${Math.floor(w.speedBonus*w.rarity.statMultiplier)}</strong></span></div>`;
            statsHtml = `<div style="width:100%; display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:5px;">${armorStats}</div><div class="inv-ability" style="width:100%; box-sizing:border-box; margin:0; font-size:13px; padding: 10px;">✨ ${w.ability}</div>`;
        } else if (w.type === 'rune') {
            statsHtml = `
                <div style="width:100%; display:flex; flex-direction:column; gap:5px; margin-top:5px;">
                    <div class="stat-row" style="margin:0; background: rgba(46, 204, 113, 0.1); border-color: #2ecc71; text-align: left;">
                        <strong style="color:#2ecc71;">[BUFF]</strong> ${w.buff}
                    </div>
                    <div class="stat-row" style="margin:0; background: rgba(231, 76, 60, 0.1); border-color: #e74c3c; text-align: left;">
                        <strong style="color:#e74c3c;">[DEBUFF]</strong> ${w.debuff}
                    </div>
                </div>
            `;
        }

        this.els.chestContent.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:15px; padding-top: 10px;">
                <div id="chest-draggable-item" draggable="true" ondragstart="event.dataTransfer.setData('text', 'chest-item'); this.style.opacity='0.5';" ondragend="this.style.opacity='1';" style="cursor:grab; width:80px;height:80px;background:rgba(0,0,0,0.4);border:3px solid ${w.rarity.color};border-radius:15px;display:flex;justify-content:center;align-items:center;box-shadow:0 0 20px ${w.rarity.color}66; transition: transform 0.2s;" title="Kéo để thả hoặc bấm nút bên dưới">${iconHtml}</div>
                <h3 style="color:${w.rarity.color}; margin:0; text-align:center; font-size:22px;">${w.name}</h3>
                <span style="background:${w.rarity.color}22;border:1px solid ${w.rarity.color};color:${w.rarity.color};padding:4px 12px;border-radius:15px;font-size:13px;font-weight:bold;text-transform:uppercase;">${w.rarity.name}</span>
                ${statsHtml}
            </div>
        `;
    },

    renderShop(player, deadPlayers = []) {
        if(this.els.shopGold) this.els.shopGold.textContent = player.gold;
        if(this.els.shopSouls) this.els.shopSouls.textContent = player.souls;
        if(!this.els.shopUpg) return;
        
        const isMage = player.skin && player.skin.id === 'skeleton_mage';
        const w = player.currentWeapon;
        
        let upgradeHtml = '';
        if (isMage) {
            upgradeHtml = `<div style="text-align:center; color:#bdc3c7; margin: 20px 0; font-size: 14px; font-style: italic;">Pháp Sư Xương không sử dụng vũ khí vật lý.<br>Hãy tìm Cổ Ngữ trong rương và sử dụng Luyện Kim!</div>`;
        } else if (w) {
            const dmgCost = 15 + (w.upgradeDmgLevel * 20);
            const speedCost = 15 + (w.upgradeSpeedLevel * 20);
            const canUpSpeed = w.fireRate > 50;
            let iconHtml = w.imgSrc 
                ? `<img src="${w.imgSrc}" style="width:30px; height:30px; object-fit:contain; filter:drop-shadow(0 0 10px ${w.rarity.color}); pointer-events:none;">` 
                : `<div style="font-size:20px; text-shadow:0 0 10px ${w.rarity.color}; pointer-events:none;">${w.type === 'ranged' ? '🏹' : w.type==='magic' ? '🪄' : w.effectType==='fire' ? '🔥' : w.effectType==='ice' ? '❄️' : w.effectType==='lightning' ? '⚡' : w.effectType==='poison' ? '🧪' : '🗡️'}</div>`;
            
            upgradeHtml = `
            <div style="display:flex;align-items:center;justify-content:center;gap:15px;margin-bottom:15px;background:rgba(0,0,0,0.4);padding:10px;border-radius:8px;border:1px solid ${w.rarity.color}55;"><div style="width:40px;height:40px;background:#2d3436;border:2px solid ${w.rarity.color};border-radius:8px;display:flex;justify-content:center;align-items:center;box-shadow:inset 0 0 10px rgba(0,0,0,0.8),0 0 10px ${w.rarity.color}88;">${iconHtml}</div><div style="text-align:center;"><div style="font-size:12px;color:#a0aec0;">Đang trang bị</div><div style="font-size:16px;font-weight:bold;color:${w.rarity.color};text-shadow:0 0 5px ${w.rarity.color}88;">${w.name}</div></div></div>
            <div class="upgrade-options-grid">
                <div class="upgrade-box"><h4>⚔️ Sát Thương <span style="color:#f1c40f">+${w.upgradeDmgLevel}</span></h4><div class="upgrade-stat">Tăng vĩnh viễn 15% gốc.<br>Đang có: ${w.damage} ➔ <span style="color:#2ecc71;font-weight:bold;">${w.damage+Math.max(1,Math.floor(w.damage*0.15))}</span></div><button id="upg-dmg" class="upg-btn" ${player.souls<dmgCost?'disabled':''}><div style="display:flex;justify-content:space-between;align-items:center;"><span>Rèn vũ khí</span><span style="background:rgba(0,0,0,0.3);padding:2px 8px;border-radius:10px;">${dmgCost} 👻</span></div></button></div>
                <div class="upgrade-box"><h4>⚡ Tốc Độ <span style="color:#f1c40f">+${w.upgradeSpeedLevel}</span></h4><div class="upgrade-stat">Giảm 15ms giữa 2 lần bắn.<br>Đang có: ${(1000/w.fireRate).toFixed(1)} Đ/s ➔ <span style="color:#2ecc71;font-weight:bold;">${canUpSpeed?(1000/Math.max(50,w.fireRate-15)).toFixed(1)+' Đ/s':'MAX'}</span></div><button id="upg-spd" class="upg-btn" ${!canUpSpeed||player.souls<speedCost?'disabled':''}><div style="display:flex;justify-content:space-between;align-items:center;"><span>${canUpSpeed?'Rèn vũ khí':'ĐẠT GIỚI HẠN'}</span><span style="background:rgba(0,0,0,0.3);padding:2px 8px;border-radius:10px;">${canUpSpeed?speedCost+' 👻':'MAX'}</span></div></button></div>
            </div>`;
        }

        let reviveHtml = '';
        if (deadPlayers.length > 0) {
            reviveHtml = `<div style="grid-column:1/-1; margin-top: 15px; border-top: 2px dashed #e74c3c; padding-top: 15px;">
                <h4 style="color:#2ecc71; margin:0 0 10px 0; text-align:center;">HỒI SINH ĐỒNG ĐỘI</h4>
                <div class="upgrade-options-grid">`;
            deadPlayers.forEach(dp => {
                const cost = 50; 
                reviveHtml += `
                    <div class="upgrade-box" style="border-color:#2ecc71;">
                        <h4 style="color:#2ecc71;">👻 ${dp.name}</h4>
                        <div class="upgrade-stat">Chuộc mạng với 50% HP.</div>
                        <button id="revive-btn-${dp.id}" class="upg-btn" style="background:linear-gradient(180deg,#27ae60,#2ecc71);border-color:#2ecc71;" ${player.souls < cost ? 'disabled' : ''}>
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <span>Cứu ngay</span><span style="background:rgba(0,0,0,0.3);padding:2px 8px;border-radius:10px;">${cost} 👻</span>
                            </div>
                        </button>
                    </div>`;
            });
            reviveHtml += `</div></div>`;
        }

        this.els.shopUpg.innerHTML = `
            <h3 style="margin:0 0 15px 0;color:#00d8d6;border-bottom:2px solid #4a5568;padding-bottom:10px;text-align:center;text-shadow:0 0 8px #00d8d6;">LÒ RÈN LINH HỒN</h3>
            ${upgradeHtml}
            <div class="upgrade-box" style="grid-column:1/-1;border-color:#e74c3c; margin-top: ${isMage ? '0' : '12px'};"><h4 style="color:#ff7675;margin-bottom:5px;">❤️ Bình Dược Thủy (Hồi Phục)</h4><div class="upgrade-stat" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0;"><span>Hồi ngay lập tức 50 Máu.<br>Sinh lực: <span style="color:#ff7675;font-weight:bold;">${Math.round(player.hp)} / ${player.maxHp}</span></span><button id="buy-hp" class="upg-btn" style="width:auto;padding:10px 20px;background:linear-gradient(180deg,#e74c3c,#c0392b);border-color:#ff7675;" ${player.gold<50||player.hp>=player.maxHp?'disabled':''}><div style="display:flex;gap:10px;align-items:center;"><span>Mua ngay</span><span style="background:rgba(0,0,0,0.3);padding:2px 8px;border-radius:10px;">50 💰</span></div></button></div></div>
            ${reviveHtml}
        `;
        if (!isMage && w) {
            const dmgCost = 15 + (w.upgradeDmgLevel * 20);
            const speedCost = 15 + (w.upgradeSpeedLevel * 20);
            document.getElementById('upg-dmg')?.addEventListener('click', () => this.cb.onUpgDmg(w, dmgCost));
            document.getElementById('upg-spd')?.addEventListener('click', () => this.cb.onUpgSpd(w, speedCost));
        }
        document.getElementById('buy-hp')?.addEventListener('click', () => this.cb.onBuyHp());
        if (deadPlayers.length > 0) {
            deadPlayers.forEach(dp => { document.getElementById(`revive-btn-${dp.id}`)?.addEventListener('click', () => this.cb.onRevivePlayer(dp.id, 50)); });
        }
    },

    drawMinimap(map, chests, enemies, merchant, alchemyTable, player, otherPlayers, camera, W, H) {
        if(!this.miniCtx || !this.els.minimap) return;
        const w = this.els.minimap.width, h = this.els.minimap.height;
        const ts = w / MAP_COLS, sc = w / MAP_WIDTH;
        this.miniCtx.clearRect(0, 0, w, h);
        for(let r=0; r<MAP_ROWS; r++) for(let c=0; c<MAP_COLS; c++) {
            this.miniCtx.fillStyle = map.tileColors[map.grid[r][c]] || '#0f172a';
            this.miniCtx.fillRect(c*ts, r*ts, ts, ts);
        }
        chests.forEach(c => { if(!c.opened) { this.miniCtx.fillStyle='#ffd700'; this.miniCtx.fillRect(c.x*sc, c.y*sc, 3, 3); } });
        enemies.forEach(e => {
            if(e.isDead) return;
            if(e.isBoss) { this.miniCtx.fillStyle='#ff0000'; this.miniCtx.fillRect((e.x+e.width/2)*sc-2.5, (e.y+e.height/2)*sc-2.5, 5, 5); }
            else if(e.isAlly) { this.miniCtx.fillStyle='#3498db'; this.miniCtx.fillRect((e.x+e.width/2)*sc-1.5, (e.y+e.height/2)*sc-1.5, 3, 3); }
            else { this.miniCtx.fillStyle='#e74c3c'; this.miniCtx.fillRect((e.x+e.width/2)*sc-1.5, (e.y+e.height/2)*sc-1.5, 3, 3); }
        });
        if(merchant) { this.miniCtx.fillStyle='#8e44ad'; this.miniCtx.fillRect((merchant.x+merchant.width/2)*sc-2, (merchant.y+merchant.height/2)*sc-2, 4, 4); }
        if(alchemyTable) { this.miniCtx.fillStyle='#e67e22'; this.miniCtx.fillRect((alchemyTable.x+alchemyTable.width/2)*sc-2, (alchemyTable.y+alchemyTable.height/2)*sc-2, 4, 4); }
        
        if(otherPlayers) {
            Object.values(otherPlayers).forEach(op => {
                if(op.isDead) return;
                this.miniCtx.fillStyle = op.color || '#2ecc71';
                this.miniCtx.beginPath(); this.miniCtx.arc((op.x+op.width/2)*sc, (op.y+op.height/2)*sc, 3, 0, Math.PI*2); this.miniCtx.fill();
                this.miniCtx.strokeStyle = '#fff'; this.miniCtx.lineWidth = 1; this.miniCtx.stroke();
            });
        }
        
        this.miniCtx.fillStyle='#3498db'; this.miniCtx.beginPath(); this.miniCtx.arc((player.x+player.width/2)*sc, (player.y+player.height/2)*sc, 4, 0, Math.PI*2); this.miniCtx.fill();
        this.miniCtx.strokeStyle='rgba(255,255,255,0.7)'; this.miniCtx.lineWidth=2; this.miniCtx.strokeRect(camera.x*sc, camera.y*sc, W*sc, H*sc);
    },

    renderSkillSelection(options, onSelect) {
        let screen = document.getElementById('skill-screen');
        if (!screen) {
            screen = document.createElement('div');
            screen.id = 'skill-screen';
            document.body.appendChild(screen);
        }
        
        let html = '<h2>🌟 CHỌN KỸ NĂNG MỚI 🌟</h2>';
        html += '<div class="skill-options-container">';
        
        options.forEach((skill, idx) => {
            html += `
                <div id="skill-card-${idx}" class="skill-card">
                    <div class="skill-icon">${skill.icon}</div>
                    <h3>${skill.name}</h3>
                    <p>${skill.description}</p>
                </div>
            `;
        });
        html += '</div>';
        screen.innerHTML = html;
        screen.style.display = 'flex';
        
        options.forEach((skill, idx) => {
            const card = document.getElementById(`skill-card-${idx}`);
            card.onclick = () => {
                screen.style.display = 'none';
                onSelect(skill.id);
            };
        });
    }
};
