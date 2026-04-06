// js/races.js

export const RACE_RARITY = {
    COMMON: { name: 'Thường', color: '#bdc3c7' },
    RARE: { name: 'Hiếm', color: '#00d8d6' },
    LEGENDARY: { name: 'Huyền thoại', color: '#ff3f34' }
};

export const RACES = {
    'human': { id: 'human', name: 'Người', icon: '👤', imgSrc: 'img/race/human.png', rarity: RACE_RARITY.COMMON, dropRate: 0.70, stats: { hp: 0, shield: 0, speed: 0, dmgMult: 1.0 }, desc: 'Ý chí kiên cường: Không có buff đặc biệt' },
    'rabbit': { id: 'rabbit', name: 'Thỏ', icon: '🐰', imgSrc: 'img/race/rabit.png', rarity: RACE_RARITY.RARE, dropRate: 0.15, stats: { hp: 0, shield: 0, speed: 40, dmgMult: 1.0 }, desc: 'Nhanh nhẹn: Tốc độ di chuyển +40' },
    'merfolk': { id: 'merfolk', name: 'Người Cá', icon: '🧜', imgSrc: 'img/race/fish.png', rarity: RACE_RARITY.RARE, dropRate: 0.10, stats: { hp: 50, shield: 0, speed: 10, dmgMult: 1.0 }, desc: 'Biển cả che chở: HP +50, Tốc chạy +10' },
    'angel': { id: 'angel', name: 'Thiên Thần', icon: '👼', imgSrc: 'img/race/angel.png', rarity: RACE_RARITY.LEGENDARY, dropRate: 0.03, stats: { hp: 100, shield: 50, speed: 20, dmgMult: 1.5 }, desc: 'Phước lành: HP+100, Giáp+50, ST x1.5' },
    'demon': { id: 'demon', name: 'Ác Quỷ', icon: '😈', imgSrc: 'img/race/demon.png', rarity: RACE_RARITY.LEGENDARY, dropRate: 0.02, stats: { hp: 20, shield: 0, speed: 30, dmgMult: 1.9 }, desc: 'Bóng tối: Sát thương x1.9, Tốc+30, HP+20' }
};

for (let key in RACES) {
    if (RACES[key].imgSrc) {
        RACES[key].imageObj = new Image();
        RACES[key].imageObj.src = RACES[key].imgSrc;
    }
}

export const RaceManager = {
    getRaces() { return RACES; },
    
    getRace(id) { return RACES[id] || RACES['human']; },
    
    rollRace() {
        let rand = Math.random();
        let cumulative = 0;
        
        for (const key in RACES) {
            cumulative += RACES[key].dropRate;
            if (rand <= cumulative) {
                return RACES[key];
            }
        }
        return RACES['human'];
    }
};