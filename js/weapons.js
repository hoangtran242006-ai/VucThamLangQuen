// js/weapons.js

// --- 1. ĐỊNH NGHĨA HỆ THỐNG ĐỘ HIẾM (RARITY) ---
export const RARITY = {
    COMMON: { id: 1, name: 'Thường', color: '#ffffff', dropRate: 0.50, statMultiplier: 1.0 },
    UNCOMMON: { id: 2, name: 'Khá', color: '#1eff00', dropRate: 0.30, statMultiplier: 1.3 },
    RARE: { id: 3, name: 'Hiếm', color: '#0070dd', dropRate: 0.15, statMultiplier: 1.8 },
    EPIC: { id: 4, name: 'Sử thi', color: '#a335ee', dropRate: 0.04, statMultiplier: 2.5 },
    LEGENDARY: { id: 5, name: 'Huyền thoại', color: '#ff8000', dropRate: 0.01, statMultiplier: 4.0 },
    MYTHIC: { id: 6, name: 'Thần thoại', color: '#ff0033', dropRate: 0.0, statMultiplier: 6.0 }
};

// --- 2. CÁC LOẠI VŨ KHÍ CƠ BẢN ---
export const WEAPON_TYPES = [
    { name: 'Cung Gỗ', type: 'ranged', baseDmg: 10, baseSpeed: 450, fireRate: 350, range: 350, color: '#8B4513', ability: 'Bắn xa, chuẩn xác và ổn định.', effectType: 'standard', pierceCount: 1, imgSrc: 'img/weapon/wodden-bow.png' },
    { name: 'Súng Hoa Cải', type: 'ranged', baseDmg: 8, baseSpeed: 500, fireRate: 800, range: 250, color: '#bdc3c7', ability: 'Bắn chùm 5 viên đạn cự ly gần cực mạnh.', effectType: 'shotgun', projectilesPerShot: 5, spreadAngle: 0.6, pierceCount: 1, imgSrc: 'img/weapon/shotgun.png' },
    { name: 'Trượng Lửa', type: 'magic', baseDmg: 4, baseSpeed: 300, fireRate: 80, range: 220, color: '#ff4500', ability: 'Phun lửa liên tục thành dải, thiêu rụi kẻ địch.', effectType: 'fire', projectilesPerShot: 2, spreadAngle: 0.5, pierceCount: 2, imgSrc: 'img/weapon/fire-staff.png' },
    { name: 'Đũa Phép Băng', type: 'magic', baseDmg: 14, baseSpeed: 360, fireRate: 400, range: 360, color: '#00ffff', ability: 'Băng giá xuyên thấu làm chậm nhiều kẻ địch.', effectType: 'ice', pierceCount: 3, imgSrc: 'img/weapon/ice-wand.png' },
    { name: 'Phi Tiêu Độc', type: 'ranged', baseDmg: 9, baseSpeed: 620, fireRate: 240, range: 280, color: '#6b8e23', ability: 'Độc lan, gây thêm sát thương theo thời gian.', effectType: 'poison', pierceCount: 1, imgSrc: 'img/weapon/poison-dart.png' },
    { name: 'Thương Sét', type: 'ranged', baseDmg: 18, baseSpeed: 500, fireRate: 550, range: 400, color: '#7cfc00', ability: 'Sét đánh loang, thẳng và có hiệu ứng điện.', effectType: 'lightning', pierceCount: 1, imgSrc: 'img/weapon/lightning-spear.png' },
    { name: 'Phi Tiêu', type: 'ranged', baseDmg: 8, baseSpeed: 600, fireRate: 150, range: 280, color: '#a9a9a9', ability: 'Bắn cực nhanh, ưu thế khi quét mục tiêu đơn lẻ.', effectType: 'rapid', pierceCount: 1, imgSrc: 'img/weapon/poison-dart.png' },
    { name: 'Kiếm Phép', type: 'magic', baseDmg: 28, baseSpeed: 400, fireRate: 700, range: 250, color: '#e056fd', ability: 'Chém ra luồng kiếm khí rộng xuyên thấu vô hạn.', effectType: 'slash', pierceCount: 999, imgSrc: 'img/weapon/magic-sword.png' },
    { name: 'Mũ Da', type: 'armor', armorType: 'helmet', hpBonus: 20, color: '#e67e22', ability: 'Tăng cường sinh lực tối đa.' },
    { name: 'Áo Giáp Sắt', type: 'armor', armorType: 'armor', shieldBonus: 40, color: '#bdc3c7', ability: 'Tạo lớp khiên từ trường bảo vệ.' },
    { name: 'Bao Tay Vải', type: 'armor', armorType: 'gloves', speedBonus: 15, color: '#3498db', ability: 'Tăng nhẹ tốc độ di chuyển.' },
    { name: 'Giày Thợ Săn', type: 'armor', armorType: 'boots', speedBonus: 30, color: '#2ecc71', ability: 'Bước đi nhẹ nhàng và nhanh nhẹn hơn.' },
    // --- RUNE PHÁP SƯ XƯƠNG ---
    { name: 'Triều Cường Xương Khô', type: 'rune', branch: 'SWARM', runeId: 'undead_tide', color: '#8e44ad', buff: 'Tăng 50% max quái triệu hồi. Giảm 30% hồi chiêu.', debuff: 'Giảm 25% Máu và Sát thương quái.', imgSrc: 'img/rune/rune1.png' },
    { name: 'Cộng Hưởng Cuồng Nộ', type: 'rune', branch: 'SWARM', runeId: 'mass_frenzy', color: '#8e44ad', buff: 'Mỗi quái đồng minh tăng 4% Tốc đánh & 2% Tốc chạy.', debuff: 'Bạn bị giảm 20% tốc độ và nhận thêm 15% ST.', imgSrc: 'img/rune/rune2.png' },
    { name: 'Nghi Thức Khổng Lồ', type: 'rune', branch: 'TITAN', runeId: 'goliath', color: '#e74c3c', buff: 'Chỉ 1 quái duy nhất hóa Khổng Lồ: +300% HP, +200% ST lan.', debuff: 'Quái chết bạn bị choáng 3s.', imgSrc: 'img/rune/rune3.png' },
    { name: 'Ký Sinh Linh Hồn', type: 'rune', branch: 'TITAN', runeId: 'parasite', color: '#e74c3c', buff: 'ST của Cự Thần tạo Giáp ảo cho bạn.', debuff: 'Rút 3% máu bạn mỗi giây, tự hủy nếu máu bạn <15%.', imgSrc: 'img/rune/rune4.png' },
    { name: 'Bộc Phá Tủy Xương', type: 'rune', branch: 'SACRIFICE', runeId: 'bone_burst', color: '#2ecc71', buff: 'Quái chết nổ lan gây 25% HP và làm chậm.', debuff: 'Tuổi thọ quái giảm 50%.', imgSrc: 'img/rune/rune5.png' },
    { name: 'Lời Nguyền Suy Kiệt', type: 'rune', branch: 'SACRIFICE', runeId: 'withering', color: '#2ecc71', buff: 'Đòn đánh của quái làm chậm địch 20%.', debuff: 'ST của quái bị giảm 30%.', imgSrc: 'img/rune/rune6.png' },
    { name: 'Binh Đoàn Bất Tử', type: 'rune', branch: 'SWARM', runeId: 'undead_legion', color: '#8e44ad', buff: 'Tăng 20% Máu cho quái đồng minh.', debuff: 'Giảm 10% Máu tối đa của bạn.', imgSrc: 'img/rune/rune7.png' },
    { name: 'Sức Mạnh Tuyệt Đối', type: 'rune', branch: 'TITAN', runeId: 'absolute_power', color: '#e74c3c', buff: 'Tăng 50% Tốc đánh cho Cự Thần.', debuff: 'Bạn bị giảm 20% Tốc chạy.', imgSrc: 'img/rune/rune8.png' },
    { name: 'Hấp Thụ Oán Hồn', type: 'rune', branch: 'SACRIFICE', runeId: 'soul_absorb', color: '#2ecc71', buff: 'Quái chết hồi cho bạn 5% Máu.', debuff: 'Mất 5 Máu khi triệu hồi quái.', imgSrc: 'img/rune/rune9.png' }
];

/**
 * Lớp Weapon: Đại diện cho vũ khí người chơi hoặc quái vật đang cầm.
 * Chứa các chỉ số sát thương, tốc độ bắn và ngoại hình.
 */
export class Weapon {
    constructor(config) {
        this.name = config.name;
        this.baseName = config.baseName || config.name;
        this.type = config.type;
        this.rarity = config.rarity;
        this.imgSrc = config.imgSrc || null;
        this.spriteX = config.spriteX !== undefined ? config.spriteX : null;
        this.spriteY = config.spriteY !== undefined ? config.spriteY : null;
        
        // Chỉ số chiến đấu thực tế
        this.damage = Math.floor(config.baseDmg * this.rarity.statMultiplier);
        this.projectileSpeed = config.baseSpeed;
        this.fireRate = Math.max(100, config.fireRate - (this.rarity.id * 20)); // Vũ khí xịn bắn nhanh hơn
        this.range = config.range * (1 + (this.rarity.id * 0.05));
        
        // Ngoại hình viên đạn
        this.projectileColor = config.color;
        
        this.armorType = config.armorType || null;
        this.hpBonus = config.hpBonus || 0;
        this.shieldBonus = config.shieldBonus || 0;
        this.speedBonus = config.speedBonus || 0;
        
        if (this.type === 'armor' || this.type === 'rune') { this.damage = 0; this.projectileSpeed = 0; this.fireRate = 9999; this.range = 0; }
        this.branch = config.branch || null;
        this.runeId = config.runeId || null;
        this.buff = config.buff || null;
        this.debuff = config.debuff || null;
        
        // Quản lý thời gian hồi chiêu
        this.lastFiredTime = 0;
        this.ability = config.ability || (this.type === 'rune' ? `[${this.branch}] ${this.buff} | ${this.debuff}` : 'Vũ khí cơ bản, không có hiệu ứng đặc biệt.');
        this.effectType = config.effectType || this.type;
        
        // Đặc tính nâng cao
        this.projectilesPerShot = config.projectilesPerShot || 1;
        this.spreadAngle = config.spreadAngle || 0; // Góc tản đạn (radian)
        this.pierceCount = config.pierceCount || 1; // Số quái xuyên qua được
        
        // Cấp độ Cường hóa (Upgrade)
        this.upgradeDmgLevel = config.upgradeDmgLevel || 0;
        this.upgradeSpeedLevel = config.upgradeSpeedLevel || 0;
    }

    /**
     * Hàm tính toán để sinh ra một vũ khí NGẪU NHIÊN hoàn toàn.
     * Dùng khi mở rương hoặc quái vật chết rớt đồ.
     */
    static rollRandomWeapon(isMage = false) {
        // 1. Quay "Gacha" để xác định độ hiếm dựa trên tỉ lệ dropRate
        let rand = Math.random();
        let cumulative = 0;
        let selectedRarity = RARITY.COMMON;

        // Chuyển object RARITY thành mảng để duyệt
        const rarityList = Object.values(RARITY);
        for (let r of rarityList) {
            cumulative += r.dropRate;
            if (rand <= cumulative) {
                selectedRarity = r;
                break;
            }
        }

        // 2. Chọn ngẫu nhiên một loại vũ khí cơ bản
        const availableTypes = WEAPON_TYPES.filter(w => isMage ? (w.type === 'rune' || w.type === 'armor') : (w.type !== 'rune'));
        const baseWeapon = availableTypes[Math.floor(Math.random() * availableTypes.length)];

        // 3. Ghép tiền tố (Prefix) để tên vũ khí ngầu hơn
        const prefixes = ['Tàn bạo', 'Cổ đại', 'Linh thiêng', 'Bị nguyền rủa', 'Khát máu'];
        const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const finalName = `${selectedRarity.name} ${baseWeapon.name} ${randomPrefix}`;

        return new Weapon({
            ...baseWeapon, // Kế thừa toàn bộ chỉ số gốc
            name: finalName,
            baseName: baseWeapon.name,
            rarity: selectedRarity
        });
    }

    static rollRandomLightning(isMage = false) {
        let rand = Math.random();
        let cumulative = 0;
        let selectedRarity = RARITY.COMMON;
        const rarityList = Object.values(RARITY);
        for (let r of rarityList) {
            cumulative += r.dropRate;
            if (rand <= cumulative) {
                selectedRarity = r;
                break;
            }
        }

        const availableTypes = WEAPON_TYPES.filter(w => isMage ? (w.type === 'rune' || w.type === 'armor') : (w.type !== 'rune'));
        const baseWeapon = availableTypes.find(w => w.effectType === 'lightning') || availableTypes[0];
        const prefixes = ['Tàn bạo', 'Cổ đại', 'Linh thiêng', 'Bị nguyền rủa', 'Khát máu'];
        const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const finalName = `${selectedRarity.name} ${baseWeapon.name} ${randomPrefix}`;

        return new Weapon({
            ...baseWeapon,
            name: finalName,
            baseName: baseWeapon.name,
            rarity: selectedRarity
        });
    }

    /**
     * Hàm đặc biệt dành cho Thương gia: Sinh vũ khí với độ hiếm (Rarity) được ép định sẵn.
     */
    static rollWithRarity(forcedRarity, isMage = false) {
        const availableTypes = WEAPON_TYPES.filter(w => isMage ? (w.type === 'rune' || w.type === 'armor') : (w.type !== 'rune'));
        const baseWeapon = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        const prefixes = ['Tàn bạo', 'Cổ đại', 'Linh thiêng', 'Bị nguyền rủa', 'Khát máu', 'Huyền bí'];
        const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const finalName = `${forcedRarity.name} ${baseWeapon.name} ${randomPrefix}`;

        return new Weapon({
            ...baseWeapon,
            name: finalName,
            baseName: baseWeapon.name,
            rarity: forcedRarity
        });
    }

    static upgradeWeapon(weapon1) {
        const rarityValues = Object.values(RARITY).sort((a,b) => a.id - b.id);
        const currentRarityIndex = rarityValues.findIndex(r => r.id === weapon1.rarity.id);
        if (currentRarityIndex >= rarityValues.length - 1) return null; 
        
        const nextRarity = rarityValues[currentRarityIndex + 1];
        const baseWeapon = WEAPON_TYPES.find(w => w.name === weapon1.baseName);
        if (!baseWeapon) return null;

        const prefixes = ['Tàn bạo', 'Cổ đại', 'Linh thiêng', 'Bị nguyền rủa', 'Khát máu', 'Thần thánh', 'Hủy diệt'];
        const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const finalName = `${nextRarity.name} ${baseWeapon.name} ${randomPrefix}`;

        return new Weapon({
            ...baseWeapon,
            name: finalName,
            baseName: baseWeapon.name,
            rarity: nextRarity
        });
    }

    /**
     * Kiểm tra xem vũ khí đã sẵn sàng để bắn tiếp chưa
     */
    canFire(currentTime) {
        return (currentTime - this.lastFiredTime) >= this.fireRate;
    }
}

/**
 * Lớp Projectile: Xử lý vòng đời, di chuyển và va chạm của từng viên đạn trên bản đồ
 */
export class Projectile {
    constructor(x, y, dirX, dirY, weapon, isEnemyProjectile = false) {
        this.x = x;
        this.y = y;
        
        // Chuẩn hóa vector hướng bay để đảm bảo đạn bay đều mọi hướng
        const length = Math.sqrt(dirX * dirX + dirY * dirY);
        this.dx = length === 0 ? 0 : dirX / length;
        this.dy = length === 0 ? 0 : dirY / length;

        // Lấy chỉ số từ vũ khí bắn ra nó
        this.speed = weapon.projectileSpeed;
        this.damage = weapon.damage;
        this.color = weapon.projectileColor;
        this.maxRange = weapon.range;
        this.effectType = weapon.effectType;
        this.pierceCount = weapon.pierceCount || 1;
        
        // Cờ phân biệt đạn của ta hay của địch (để không tự bắn trúng mình)
        this.isEnemyProjectile = isEnemyProjectile;

        // Trạng thái va chạm để tạo hiệu ứng
        this.hitTarget = null;
        this.hitX = null;
        this.hitY = null;
        this.spawnedImpact = false;

        // Trạng thái sống/chết của viên đạn
        this.distanceTraveled = 0;
        this.markedForDeletion = false;
        this.hitEnemies = new Set(); // Lưu danh sách quái đã trúng để xuyên thấu không nổ nhiều lần 1 quái
        
        this.radius = 4 + (weapon.rarity.id); // Đạn vũ khí xịn thì to hơn một chút
        if (this.effectType === 'slash') this.radius = 18 + (weapon.rarity.id * 2); // Kiếm khí rất to
    }

    /**
     * Cập nhật vị trí viên đạn
     * @param {number} deltaTime 
     * @param {Object} map - Bản đồ để kiểm tra va chạm tường
     */
    update(deltaTime, map) {
        if (this.markedForDeletion) return;

        // Tính quãng đường di chuyển trong frame này
        const moveDist = this.speed * (deltaTime / 1000);
        const nextX = this.x + this.dx * moveDist;
        const nextY = this.y + this.dy * moveDist;

        // 1. Kiểm tra va chạm với Tường/Chướng ngại vật trên Map
        // Cực kỳ quan trọng: Nếu đạn bay xuyên tường game sẽ hỏng!
        if (map.isSolidPixel(nextX, nextY)) {
            this.hitTarget = 'wall';
            this.hitX = nextX;
            this.hitY = nextY;
            this.markedForDeletion = true;
            return;
        }

        // 2. Cập nhật vị trí nếu không chạm tường
        this.x = nextX;
        this.y = nextY;
        this.distanceTraveled += moveDist;

        // 3. Nếu đạn bay quá tầm bắn tối đa của vũ khí -> Hủy đạn
        if (this.distanceTraveled >= this.maxRange) {
            this.markedForDeletion = true;
        }
    }

    /**
     * Vẽ viên đạn lên màn hình có tính toán trừ hao góc Camera
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        if (this.isMelee) return; // Ẩn hoàn toàn đạn cận chiến
        ctx.save();

        const isFire = this.effectType === 'fire';
        const isIce = this.effectType === 'ice';
        const isRapid = this.effectType === 'rapid';
        const isPoison = this.effectType === 'poison';
        const isLightning = this.effectType === 'lightning';
        const isSlash = this.effectType === 'slash';

        ctx.shadowBlur = isFire || isLightning || isSlash ? 18 : isIce ? 14 : 10;
        ctx.shadowColor = isFire ? '#ff4500' : isIce ? '#79f2ff' : isLightning ? '#c0d6ff' : isSlash ? '#e056fd' : this.color;

        if (isSlash) {
            // Vẽ hình bán nguyệt (Lưỡi kiếm khí)
            const angle = Math.atan2(this.dy, this.dx);
            ctx.translate(this.x, this.y);
            ctx.rotate(angle);
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, -Math.PI / 2, Math.PI / 2);
            ctx.quadraticCurveTo(-this.radius, 0, 0, -Math.PI / 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(4, 0, this.radius * 0.5, -Math.PI / 2.5, Math.PI / 2.5);
            ctx.quadraticCurveTo(-this.radius * 0.4, 0, 4, -Math.PI / 2.5);
            ctx.fill();
            ctx.restore();
            return; // Kiếm khí vẽ xong thoát luôn
        }

        if (isFire) {
            // Hiệu ứng phun lửa chuẩn Pixel Art (Lớn dần và nhạt màu đi)
            const lifeRatio = 1 - (this.distanceTraveled / this.maxRange); // 1.0 -> 0.0
            const currentSize = this.radius * (1 + (1 - lifeRatio) * 3); // Lửa phình to ra
            
            // Đổi màu theo vòng đời: Trắng -> Vàng -> Cam -> Đỏ sẫm
            ctx.fillStyle = lifeRatio > 0.8 ? '#ffffff' : (lifeRatio > 0.5 ? '#f1c40f' : (lifeRatio > 0.2 ? '#e67e22' : '#c0392b'));
            
            // Vẽ khối lửa trung tâm
            ctx.fillRect(this.x - currentSize / 2, this.y - currentSize / 2, currentSize, currentSize);
            
            // Vẽ các mạt lửa nổ xung quanh
            ctx.fillStyle = lifeRatio > 0.4 ? '#f39c12' : '#d35400';
            for(let i=0; i<3; i++) {
                const px = this.x + (Math.random() - 0.5) * currentSize * 1.5;
                const py = this.y + (Math.random() - 0.5) * currentSize * 1.5;
                const ps = currentSize * (0.2 + Math.random() * 0.3);
                ctx.fillRect(px - ps/2, py - ps/2, ps, ps);
            }
            ctx.restore();
            return;
        }

        if (isPoison) {
            for (let i = 1; i <= 2; i += 1) {
                ctx.fillStyle = `rgba(110, ${255 - i * 60}, 100, ${0.16 - i * 0.05})`;
                ctx.beginPath();
                ctx.arc(this.x - this.dx * i * 3 + (i * 2), this.y - this.dy * i * 3 - (i * 2), this.radius * (1.6 + i * 0.4), 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (isRapid) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            for (let i = 1; i <= 3; i += 1) {
                ctx.fillRect(this.x - this.dx * i * 4 - this.radius, this.y - this.dy * i * 4 - 1, this.radius * 2.4, 2);
            }
        }

        if (isIce) {
            ctx.strokeStyle = '#a8f0ff';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 4; i += 1) {
                const angle = Math.PI * 2 * i / 4;
                const sx = this.x + Math.cos(angle) * (this.radius + 3);
                const sy = this.y + Math.sin(angle) * (this.radius + 3);
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + Math.cos(angle) * 4, sy + Math.sin(angle) * 4);
                ctx.stroke();
            }
        }

        if (isLightning) {
            ctx.strokeStyle = 'rgba(180, 220, 255, 0.95)';
            ctx.lineWidth = 2.2;
            ctx.lineCap = 'square';
            let startX = this.x;
            let startY = this.y;
            for (let i = 0; i < 3; i += 1) {
                const segmentX = startX - this.dx * 4 + (Math.random() - 0.5) * 4;
                const segmentY = startY - this.dy * 4 + (Math.random() - 0.5) * 4;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(segmentX, segmentY);
                ctx.stroke();
                startX = segmentX;
                startY = segmentY;
            }
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(this.x - this.dx * 10, this.y - this.dy * 10);
            ctx.stroke();

            ctx.fillStyle = '#d6f3ff';
            ctx.fillRect(this.x - 2, this.y - 2, 4, 4);
            ctx.fillRect(this.x - this.dx * 4 - 1, this.y - this.dy * 4 - 1, 2, 2);
            ctx.fillRect(this.x - this.dx * 7 - 1, this.y - this.dy * 7 - 1, 2, 2);
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        if (!isFire && !isIce && !isRapid && !isPoison && !isLightning) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 1.8, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}
