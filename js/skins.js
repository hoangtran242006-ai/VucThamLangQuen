// js/skins.js

export const SKIN_RARITY = {
    NORMAL: { name: 'Normal', color: '#bdc3c7', glow: 'rgba(189, 195, 199, 0.4)' },
    LEGENDARY: { name: 'Legendary', color: '#f1c40f', glow: 'rgba(241, 196, 15, 0.8)' },
    LIMITED: { name: 'Limited', color: '#00d8d6', glow: 'rgba(0, 216, 214, 0.8)' },
    SECRET: { name: 'Secret', color: '#ff3f34', glow: 'rgba(255, 63, 52, 0.9)' }
};

export const SKINS = [
    { id: 'blue', name: 'Tân Binh', color: '#3498db', price: 0, rarity: SKIN_RARITY.NORMAL },
    { id: 'red', name: 'Cuồng Nộ', color: '#e74c3c', price: 200, rarity: SKIN_RARITY.NORMAL },
    { id: 'purple', name: 'Hư Không', color: '#9b59b6', price: 800, rarity: SKIN_RARITY.NORMAL },
    { id: 'gold', name: 'Hoàng Kim', color: '#f1c40f', price: 3000, rarity: SKIN_RARITY.NORMAL },
    { id: 'bocchi', name: 'Bocchi', color: '#ffb6c1', isImage: true, src: 'img/bocchi.png', price: 9000, isSpriteSheet: true, framesX: 9, framesY: 4, rarity: SKIN_RARITY.LEGENDARY },
    { id: 'schoolgirl', name: 'Nữ Sinh', color: '#0984e3', isImage: false, price: 9900, rarity: SKIN_RARITY.LEGENDARY },
    { id: 'tien', name: 'Tiên', color: '#a29bfe', isImage: true, src: 'img/character-1.png', price: 15000, isSpriteSheet: true, framesX: 10, framesY: 4, rarity: SKIN_RARITY.LIMITED },
    { id: 'ami', name: 'Nhi', color: '#ff9ff3', isImage: true, src: 'img/Ami.png', price: 18000, isSpriteSheet: true, framesX: 10, framesY: 4, rarity: SKIN_RARITY.LEGENDARY },
    { id: 'bao', name: 'Tèo', color: '#1abc9c', isImage: true, src: 'img/bao.png', price: 20000, isSpriteSheet: true, framesX: 6, framesY: 3, rarity: SKIN_RARITY.LIMITED },
    { id: 'skeleton_mage', name: 'Pháp Sư Xương', color: '#9b59b6', isImage: false, price: 35000, rarity: SKIN_RARITY.SECRET },
    { 
        id: 'hoang', name: 'Hoàng (Thức Tỉnh)', color: '#34495e', price: 50000, 
        isAdvancedSprite: true, framesX: 8, scale: 2.2, rarity: SKIN_RARITY.SECRET,
        animations: {
            idle: { up: 'img/hoang/IDLE/idle_up.png', down: 'img/hoang/IDLE/idle_down.png', left: 'img/hoang/IDLE/idle_left.png', right: 'img/hoang/IDLE/idle_right.png' },
            run: { up: 'img/hoang/RUN/run_up.png', down: 'img/hoang/RUN/run_down.png', left: 'img/hoang/RUN/run_left.png', right: 'img/hoang/RUN/run_right.png' },
            attack: { up: 'img/hoang/ATTACK 1/attack1_up.png', down: 'img/hoang/ATTACK 1/attack1_down.png', left: 'img/hoang/ATTACK 1/attack1_left.png', right: 'img/hoang/ATTACK 1/attack1_right.png' }
        }
    }
];

export const SkinManager = {
    skins: SKINS,
    ownedSkins: ['blue'],
    equippedSkin: 'blue',
    skinImages: {},

    init() {
        this.loadSkinData();
        this.skins.forEach(s => {
            if (s.isAdvancedSprite) {
                this.skinImages[s.id] = {};
                for (let state in s.animations) {
                    this.skinImages[s.id][state] = {};
                    for (let dir in s.animations[state]) {
                        const img = new Image();
                        img.src = s.animations[state][dir];
                        this.skinImages[s.id][state][dir] = img;
                    }
                }
            } else if (s.isImage) {
                const img = new Image();
                img.onerror = () => { console.warn(`⚠️ Không thể tải ảnh nhân vật: ${s.src}`); };
                img.src = s.src;
                this.skinImages[s.id] = img;
            }
        });
    },

    loadSkinData() {
        try { const owned = localStorage.getItem('vucthamlangquen_owned_skins'); const equipped = localStorage.getItem('vucthamlangquen_equipped_skin'); if (owned) this.ownedSkins = JSON.parse(owned); if (equipped) this.equippedSkin = equipped; } catch (e) {}
    },

    saveSkinData() {
        try { localStorage.setItem('vucthamlangquen_owned_skins', JSON.stringify(this.ownedSkins)); localStorage.setItem('vucthamlangquen_equipped_skin', this.equippedSkin); } catch (e) {}
    },

    getEquippedSkin() {
        const skin = this.skins.find(s => s.id === this.equippedSkin); return skin ? skin : this.skins[0];
    },

    getSkinImage(id) {
        const skinDef = this.skins.find(s => s.id === id);
        const img = this.skinImages[id];
        if (!img) return null;
        if (skinDef && skinDef.isAdvancedSprite) {
            return img; // Trả về toàn bộ Object chứa nhiều ảnh
        }
        // Khóa an toàn: Chỉ trả về ảnh nếu ảnh ĐÃ TẢI XONG và KHÔNG BỊ LỖI
        return (img.complete && img.naturalWidth > 0) ? img : null;
    }
};