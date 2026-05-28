import { WEAPON_TYPES, RARITY } from './weapons.js';
import { AudioManager } from './audio.js';

export const IndexSystem = {
    unlockedItems: [], 
    claimedItems: [],
    currentTab: 1,
    bonusStats: { critRate: 0, critDamage: 0, baseDamageMult: 0 },
    selectedItemKey: null,

    init() {
        this.load();
        
        // Expose to global for button click
        window.IndexSystem = this;
    },

    load() {
        try {
            const saved = localStorage.getItem('vucthamlangquen_index_unlocked');
            if (saved) this.unlockedItems = JSON.parse(saved);
            const claimed = localStorage.getItem('vucthamlangquen_index_claimed');
            if (claimed) this.claimedItems = JSON.parse(claimed);
        } catch(e) {}
        this.calculateBonuses();
    },

    save() {
        localStorage.setItem('vucthamlangquen_index_unlocked', JSON.stringify(this.unlockedItems));
        localStorage.setItem('vucthamlangquen_index_claimed', JSON.stringify(this.claimedItems));
        // Tự động gọi lệnh lưu đám mây
        if (window.saveGameData) window.saveGameData();
    },

    setIndexData(data) {
        if (data) {
            if (data.unlocked) this.unlockedItems = data.unlocked;
            if (data.claimed) this.claimedItems = data.claimed;
            this.calculateBonuses();
            this.save();
        }
    },

    getBuffTypeForWeapon(baseName) {
        let hash = 0;
        for (let i = 0; i < baseName.length; i++) hash += baseName.charCodeAt(i);
        return hash % 3;
    },

    calculateBonuses() {
        this.bonusStats = { critRate: 0, critDamage: 0, baseDamageMult: 0 };
        this.claimedItems.forEach(key => {
            const parts = key.split('_');
            const baseName = parts[0];
            const rarityId = parseInt(key.split('_')[1]);
            const buffType = this.getBuffTypeForWeapon(baseName);
            
            if (buffType === 0) this.bonusStats.critRate += rarityId * 0.001; 
            else if (buffType === 1) this.bonusStats.critDamage += rarityId * 0.003; 
            else if (buffType === 2) this.bonusStats.baseDamageMult += rarityId * 0.003; 
        });
        if (window.playerRef) window.playerRef.recalculateStats();
    },

    unlock(baseName, rarityId) {
        const key = `${baseName}_${rarityId}`;
        if (!this.unlockedItems.includes(key)) {
            this.unlockedItems.push(key);
            this.save();
        }
    },

    switchTab(rarityId) {
        AudioManager.play('click');
        this.currentTab = rarityId;
        const tabs = document.querySelectorAll('#rarity-tabs .r-tab');
        tabs.forEach((t, index) => {
            if (index + 1 === rarityId) t.classList.add('active');
            else t.classList.remove('active');
        });
        this.renderGrid();
        this.renderDetails(null);
    },

    open() {
        this.selectedItemKey = null;
        this.renderGrid();
        this.updateProgress();
        this.renderDetails(null);
    },

    getIcon(item) {
        if(item.type==='ranged') return '🏹'; 
        if(item.type==='magic') return '🪄'; 
        if(item.type==='armor') { 
            if(item.armorType==='helmet') return '🪖'; 
            if(item.armorType==='armor') return '👕'; 
            if(item.armorType==='gloves') return '🧤'; 
            if(item.armorType==='boots') return '👢'; 
        }
        if(item.type==='rune') return '🪨';
        return '🗡️';
    },

    renderGrid() {
        const grid = document.getElementById('weapon-index-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const rarityObj = Object.values(RARITY).find(r => r.id === this.currentTab) || RARITY.COMMON;

        WEAPON_TYPES.forEach(baseItem => {
            const key = `${baseItem.name}_${this.currentTab}`;
            const isUnlocked = this.unlockedItems.includes(key);
            const isClaimed = this.claimedItems.includes(key);
            
            const slot = document.createElement('div');
            slot.className = `w-slot ${isUnlocked ? '' : 'locked'}`;
            slot.style.borderColor = isUnlocked ? rarityObj.color : '#111';
            
            let iconHtml = baseItem.imgSrc 
                ? `<img src="${baseItem.imgSrc}">` 
                : `<div style="font-size: 40px;">${this.getIcon(baseItem)}</div>`;
                
            slot.innerHTML = `
                ${iconHtml}
                <span style="color: ${isUnlocked ? rarityObj.color : '#555'};">${isUnlocked ? baseItem.name : '???'}</span>
                ${isUnlocked && !isClaimed ? '<div style="position:absolute; top:-5px; right:-5px; width:14px; height:14px; background:#ff4757; border-radius:50%; border:2px solid #000; box-shadow: 0 0 5px #ff4757;"></div>' : ''}
            `;

            if (isUnlocked) {
                slot.onclick = () => {
                    this.selectedItemKey = key;
                    this.showDetails(baseItem, rarityObj);
                };
            } else {
                slot.onclick = () => {
                    this.selectedItemKey = null;
                    this.renderDetails(null);
                };
            }
            
            grid.appendChild(slot);
        });
    },

    showDetails(baseItem, rarityObj) {
        const panel = document.getElementById('weapon-details-panel');
        let iconHtml = baseItem.imgSrc 
            ? `<img src="${baseItem.imgSrc}" style="filter: drop-shadow(0 0 20px ${rarityObj.color});">` 
            : `<div class="item-icon-large" style="text-shadow: 0 0 20px ${rarityObj.color};">${this.getIcon(baseItem)}</div>`;
            
        const dmg = Math.floor(baseItem.baseDmg * rarityObj.statMultiplier);
        const fireRate = Math.max(100, baseItem.fireRate - (rarityObj.id * 20));
        
        let statsHtml = '';
        if (baseItem.type === 'ranged' || baseItem.type === 'magic') {
            statsHtml = `ST Cơ Bản: ${dmg} | Tốc bắn: ${(1000/fireRate).toFixed(1)} Đ/s`;
        } else if (baseItem.type === 'armor') {
            if (baseItem.hpBonus) statsHtml += `Máu: +${Math.floor(baseItem.hpBonus*rarityObj.statMultiplier)} `;
            if (baseItem.shieldBonus) statsHtml += `Giáp: +${Math.floor(baseItem.shieldBonus*rarityObj.statMultiplier)} `;
            if (baseItem.speedBonus) statsHtml += `Tốc độ: +${Math.floor(baseItem.speedBonus*rarityObj.statMultiplier)} `;
        }

        panel.innerHTML = `
            ${iconHtml}
            <h3 style="color: ${rarityObj.color}; margin-top: 0;">${rarityObj.name} ${baseItem.name}</h3>
            <div class="stats-row">${statsHtml}</div>
            <div class="lore-text">✨ ${baseItem.ability || (baseItem.buff ? `[BUFF] ${baseItem.buff}<br>[DEBUFF] ${baseItem.debuff}` : '')}</div>
        `;

        this.renderRewardPanel(rarityObj.id);
    },
    
    renderDetails(item) {
        if (!item) {
            document.getElementById('weapon-details-panel').innerHTML = '<div class="placeholder-text" style="margin-top:50px; color:#7f8c8d; text-align:center;">Bấm vào một vật phẩm đã mở khóa<br>để xem chi tiết và nhận thưởng</div>';
            this.renderRewardPanel(null);
        }
    },

    renderRewardPanel(rarityId) {
        const btn = document.getElementById('claim-index-reward-btn');
        const desc = document.getElementById('index-reward-desc');
        
        if (!this.selectedItemKey || !rarityId) {
            btn.className = 'claim-btn disabled';
            btn.textContent = 'CHƯA CHỌN';
            desc.innerHTML = `Chọn một vật phẩm đã mở khóa để nhận thưởng!`;
            return;
        }

        const isClaimed = this.claimedItems.includes(this.selectedItemKey);
        const baseName = this.selectedItemKey.split('_')[0];
        const buffType = this.getBuffTypeForWeapon(baseName);
        
        let buffText = '';
        if (buffType === 0) buffText = `<span style="color:#f1c40f">+${(rarityId * 0.1).toFixed(1)}% Tỉ lệ Crit</span>`;
        else if (buffType === 1) buffText = `<span style="color:#e74c3c">+${(rarityId * 0.3).toFixed(1)}% ST Crit</span>`;
        else if (buffType === 2) buffText = `<span style="color:#3498db">+${(rarityId * 0.3).toFixed(1)}% ST Cơ bản</span>`;

        const goldBonus = rarityId * 100;
        
        desc.innerHTML = `<span style="color:#fff">Thưởng:</span> ${buffText} <span style="color:#7f8c8d; margin: 0 5px;">|</span> <span style="color:#f1c40f">+${goldBonus} Vàng 💰</span>`;

        if (isClaimed) {
            btn.className = 'claim-btn disabled';
            btn.textContent = 'ĐÃ NHẬN';
        } else {
            btn.className = 'claim-btn';
            btn.textContent = 'NHẬN THƯỞNG';
        }
    },

    claimReward() {
        if (!this.selectedItemKey) return;
        if (this.claimedItems.includes(this.selectedItemKey)) return;
        
        const rarityId = parseInt(this.selectedItemKey.split('_')[1]);
        const goldBonus = rarityId * 100;
        
        this.claimedItems.push(this.selectedItemKey);
        this.save();
        this.calculateBonuses();
        
        if (window.playerRef) {
            window.playerRef.gold += goldBonus;
            if (window.UI) window.UI.updateHud(window.playerRef);
            if (window.saveGameData) window.saveGameData();
        }
        AudioManager.play('coin');
        
        // Cập nhật lại giao diện ngay lập tức
        const rarityObj = Object.values(RARITY).find(r => r.id === rarityId);
        const baseName = this.selectedItemKey.split('_')[0];
        const baseItem = WEAPON_TYPES.find(w => w.name === baseName);
        
        this.renderGrid();
        this.showDetails(baseItem, rarityObj);
        this.updateProgress();
    },

    updateProgress() {
        const fill = document.getElementById('index-progress-fill');
        if (!fill) return;
        const total = WEAPON_TYPES.length * 6; // 6 rarities
        const unlocked = this.unlockedItems.length;
        const percentage = Math.round((unlocked / total) * 100);
        fill.style.width = `${percentage}%`;
        fill.textContent = `${unlocked} / ${total} (${percentage}%)`;
    }
};

// Tự động khởi tạo ngay khi nạp file thay vì phải gọi trong main.js
IndexSystem.init();