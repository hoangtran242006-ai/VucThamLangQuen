// js/alchemy.js
import { AudioManager } from './audio.js';
import { Weapon, RARITY } from './weapons.js';
import { IndexSystem } from './indexSystem.js';

export const AlchemySystem = {
    els: {},
    playerRef: null,
    slots: [null, null, null],
    
    init(player) {
        this.playerRef = player;
        this.els = {
            screen: document.getElementById('alchemy-screen'),
            slot1: document.getElementById('alchemy-slot-1'),
            slot2: document.getElementById('alchemy-slot-2'),
            slot3: document.getElementById('alchemy-slot-3'),
            resultSlot: document.getElementById('alchemy-slot-result'),
            mergeBtn: document.getElementById('alchemy-merge-btn'),
            invList: document.getElementById('alchemy-inventory-list'),
            closeBtn: document.getElementById('close-alchemy-btn')
        };

        if (this.els.closeBtn) {
            this.els.closeBtn.addEventListener('click', () => this.close());
        }

        if (this.els.mergeBtn) {
            this.els.mergeBtn.addEventListener('click', () => this.merge());
        }

        [this.els.slot1, this.els.slot2, this.els.slot3].forEach((el, index) => {
            if (el) el.addEventListener('click', () => this.removeFromSlot(index));
        });
    },

    open() {
        if (!this.els.screen) return;
        this.slots = [null, null, null];
        this.els.screen.style.display = 'flex';
        this.render();
    },

    close() {
        if (!this.els.screen) return;
        this.els.screen.style.display = 'none';
        this.slots = [null, null, null];
        if (window.closeAlchemyCallback) window.closeAlchemyCallback();
    },

    render() {
        [this.els.slot1, this.els.slot2, this.els.slot3].forEach((el, i) => {
            const item = this.slots[i];
            if (item) {
                let iconHtml = item.imgSrc 
                    ? `<img src="${item.imgSrc}" style="width:36px; height:36px; object-fit:contain; filter:drop-shadow(0 0 10px ${item.rarity.color}); cursor:pointer; transform:translateY(-6px);" title="${item.name}\n(Bấm để gỡ ra)">` 
                    : `<div class="item-icon" style="text-shadow:0 0 15px ${item.rarity.color}; font-size: 26px; cursor: pointer; transform: translateY(-6px);" title="${item.name}\n(Bấm để gỡ ra)">${this.getIcon(item)}</div>`;
                el.innerHTML = `
                    ${iconHtml}
                    <div style="position: absolute; bottom: 2px; width: 100%; text-align: center; font-size: 10px; color: ${item.rarity.color}; text-shadow: 1px 1px 2px #000, 0 0 5px #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 4px; box-sizing: border-box; pointer-events: none; font-weight: bold;">${item.name}</div>
                `;
                el.style.borderColor = item.rarity.color;
            } else {
                el.innerHTML = `<div style="opacity:0.2; font-size:24px;">+</div>`;
                el.style.borderColor = '#57606f';
            }
        });

        let canMerge = false;
        if (this.slots[0] && this.slots[1] && this.slots[2]) {
            if (this.slots[0].baseName === this.slots[1].baseName && this.slots[1].baseName === this.slots[2].baseName &&
                this.slots[0].rarity.id === this.slots[1].rarity.id && this.slots[1].rarity.id === this.slots[2].rarity.id) {
                const rarityValues = Object.values(RARITY).sort((a,b) => a.id - b.id);
                if (this.slots[0].rarity.id < rarityValues[rarityValues.length - 1].id) {
                    canMerge = true;
                }
            }
        }

        if (canMerge) {
            this.els.mergeBtn.disabled = false;
            this.els.resultSlot.innerHTML = `<div class="item-icon" style="opacity:0.5; filter: brightness(0) invert(1); font-size: 40px;">✨</div>`;
            this.els.resultSlot.style.borderColor = '#f1c40f';
            this.els.resultSlot.style.boxShadow = '0 0 20px rgba(241, 196, 15, 0.5)';
        } else {
            this.els.mergeBtn.disabled = true;
            this.els.resultSlot.innerHTML = `<div style="opacity:0.1; font-size:40px;">?</div>`;
            this.els.resultSlot.style.borderColor = '#57606f';
            this.els.resultSlot.style.boxShadow = 'none';
        }

        this.els.invList.innerHTML = '';
        this.playerRef.inventory.forEach((item) => {
            if (this.slots.includes(item)) return;
            const div = document.createElement('div');
            div.className = 'mc-slot';
            let iconHtml = item.imgSrc 
                ? `<img src="${item.imgSrc}" style="width:32px; height:32px; object-fit:contain; filter:drop-shadow(0 0 10px ${item.rarity.color}); pointer-events:none;">` 
                : `<div class="item-icon" style="text-shadow:0 0 15px ${item.rarity.color}; pointer-events:none;">${this.getIcon(item)}</div>`;
            div.innerHTML = iconHtml;
            div.style.borderColor = item.rarity.color;
            div.onclick = () => this.addToSlot(item);
            div.title = `${item.name}\n${item.type === 'armor' ? 'Trang bị' : 'Vũ khí'} - Cấp: ${item.rarity.name}`;
            this.els.invList.appendChild(div);
        });
    },

    getIcon(item) {
        let icon = '🗡️';
        if(item.type==='ranged') icon='🏹'; else if(item.type==='magic') icon='🪄'; 
        else if(item.type==='armor') { if(item.armorType==='helmet') icon='🪖'; if(item.armorType==='armor') icon='👕'; if(item.armorType==='gloves') icon='🧤'; if(item.armorType==='boots') icon='👢'; }
        else if(item.type==='rune') icon='🪨';
        return icon;
    },

    addToSlot(item) { for (let i = 0; i < 3; i++) { if (!this.slots[i]) { this.slots[i] = item; AudioManager.play('click'); this.render(); return; } } },
    removeFromSlot(index) { if (this.slots[index]) { this.slots[index] = null; AudioManager.play('click'); this.render(); } },

    merge() {
        if (this.els.mergeBtn.disabled) return;
        const upgraded = Weapon.upgradeWeapon(this.slots[0]);
        if (upgraded) {
            AudioManager.play('chest'); 
            this.slots.forEach(item => { const idx = this.playerRef.inventory.indexOf(item); if (idx > -1) this.playerRef.inventory.splice(idx, 1); });
            this.playerRef.inventory.push(upgraded);
            IndexSystem.unlock(upgraded.baseName, upgraded.rarity.id);
            
            let iconHtml = upgraded.imgSrc 
                ? `<img src="${upgraded.imgSrc}" style="width:48px; height:48px; object-fit:contain; filter:drop-shadow(0 0 15px ${upgraded.rarity.color}); transform:translateY(-8px);">` 
                : `<div class="item-icon" style="text-shadow:0 0 20px ${upgraded.rarity.color}; font-size: 36px; transform: translateY(-8px);">${this.getIcon(upgraded)}</div>`;
            this.els.resultSlot.innerHTML = `
                ${iconHtml}
                <div style="position: absolute; bottom: 4px; width: 100%; text-align: center; font-size: 11px; color: ${upgraded.rarity.color}; font-weight: bold; text-shadow: 1px 1px 2px #000, 0 0 5px #000; padding: 0 4px; box-sizing: border-box; pointer-events: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${upgraded.name}</div>
            `;
            this.els.resultSlot.style.borderColor = upgraded.rarity.color;
            this.els.resultSlot.style.boxShadow = `0 0 30px ${upgraded.rarity.color}`;
            
            this.slots = [null, null, null];
            this.els.mergeBtn.disabled = true;
            
            this.els.resultSlot.animate([ { transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' } ], { duration: 500 });
            setTimeout(() => this.render(), 1000);
        }
    }
};
