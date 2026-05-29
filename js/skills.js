// js/skills.js

/**
 * Danh sách tổng hợp các Kỹ năng (Skill Pool)
 */
export const SKILL_POOL = [
    {
        id: 'magnetic_field',
        name: 'Vòng Từ Trường',
        description: 'Tạo hào quang làm chậm kẻ địch gần kề và tăng xa tầm hút vật phẩm.',
        icon: '🧲',
        apply: (player) => {
            player.hasMagneticField = true;
            player.magneticRadius = 200; // Bán kính vòng từ trường
            player.magneticSlowMult = 0.6; // Kẻ địch chỉ còn 60% tốc độ chạy
        }
    },
    {
        id: 'blink_strike',
        name: 'Bước Nhảy Không Gian',
        description: 'Cho phép lướt một đoạn theo hướng di chuyển (Phím Shift). Hồi chiêu 3 giây.',
        icon: '⚡',
        apply: (player) => {
            player.canBlink = true;
            player.blinkCooldownTime = 3000; // Thời gian hồi chiêu là 3000ms (3 giây)
            player.blinkTimer = 0; // Thời gian đếm ngược hiện tại
        }
    },
    {
        id: 'singularity',
        name: 'Hố Đen Mini',
        description: 'Mỗi 10s, đòn tấn công trúng đích tạo ra hố đen hút kẻ địch lại gần nhau.',
        icon: '🌌',
        apply: (player) => {
            player.hasSingularity = true;
            player.singularityMaxCooldown = 10000; // Hồi chiêu 10 giây
            player.singularityTimer = 0; // Sẵn sàng ngay lập tức khi vừa học
        }
    },
    {
        id: 'meteor_strike',
        name: 'Thiên Thạch',
        description: 'Mỗi 15s, triệu hồi một thiên thạch rơi xuống ngẫu nhiên gây sát thương diện rộng.',
        icon: '☄️',
        apply: (player) => {
            player.hasMeteor = true;
            player.meteorTimer = 15000; // Hồi chiêu 15 giây
        }
    },
    {
        id: 'vampiric_strike',
        name: 'Huyết Kiếm',
        description: 'Đòn đánh có thêm 10% tỷ lệ hồi 2 Máu.',
        icon: '🦇',
        repeatable: true,
        apply: (player) => {
            player.lifestealChance = (player.lifestealChance || 0) + 0.10;
        }
    },
    {
        id: 'thorns_aura',
        name: 'Giáp Gai Phản Pháo',
        description: 'Phản lại 50% sát thương khi bị quái vật chạm vào người.',
        icon: '🌵',
        apply: (player) => {
            player.hasThorns = true;
        }
    },
    {
        id: 'evasion',
        name: 'Bóng Ma',
        description: 'Tăng 10% tỷ lệ né tránh sát thương.',
        icon: '👻',
        repeatable: true,
        apply: (player) => {
            player.dodgeChance = (player.dodgeChance || 0) + 0.10;
        }
    },
    {
        id: 'xp_boost',
        name: 'Học Giả',
        description: 'Tăng 25% lượng Kinh nghiệm nhận được.',
        icon: '📚',
        repeatable: true,
        apply: (player) => {
            player.expMultiplier = (player.expMultiplier || 1) + 0.25;
        }
    },
    {
        id: 'hp_boost',
        name: 'Sức Trẻ',
        description: 'Tăng thêm 20 Máu tối đa và hồi lại 20 Máu.',
        icon: '❤️', // Có thể thay bằng đường dẫn ảnh sau này
        repeatable: true,
        apply: (player) => {
            player.bonusMaxHp = (player.bonusMaxHp || 0) + 20;
            player.hp += 20; // Hồi luôn 20 máu khi cộng max HP
        }
    },
    {
        id: 'speed_boost',
        name: 'Giày Gió',
        description: 'Tăng 10% tốc độ di chuyển.',
        icon: '👢',
        repeatable: true,
        apply: (player) => {
            player.bonusSpeedMult = (player.bonusSpeedMult || 1) + 0.1; // Cộng dồn 10%
        }
    },
    {
        id: 'damage_boost',
        name: 'Cuồng Nộ',
        description: 'Tăng 15% sát thương vật lý và phép thuật.',
        icon: '⚔️',
        repeatable: true,
        apply: (player) => {
            player.bonusDamageMult = (player.bonusDamageMult || 0) + 0.15; // Cộng dồn 15% sát thương
        }
    },
    {
        id: 'damage_boost_small',
        name: 'Sắc Bén',
        description: 'Tăng 7% sát thương.',
        icon: '🗡️',
        repeatable: true,
        apply: (player) => {
            player.bonusDamageMult = (player.bonusDamageMult || 0) + 0.07;
        }
    },
    {
        id: 'attack_speed_boost',
        name: 'Cuồng Phong',
        description: 'Tăng 5% tốc độ đánh.',
        icon: '🏹',
        repeatable: true,
        apply: (player) => {
            player.bonusAttackSpeedMult = (player.bonusAttackSpeedMult || 0) + 0.05;
        }
    },
    {
        id: 'fairy_companion',
        name: 'Tinh Linh Hỗ Trợ',
        description: 'Triệu hồi tinh linh theo sau bắn đạn ma thuật hỗ trợ.',
        icon: '🧚',
        apply: (player) => {
            player.hasFairy = true;
        }
    },
    {
        id: 'shield_boost',
        name: 'Khiên Phép',
        description: 'Tăng 30 Giáp ảo tối đa và hồi lại 30 Giáp.',
        icon: '🛡️',
        repeatable: true,
        apply: (player) => {
            player.bonusMaxShield = (player.bonusMaxShield || 0) + 30;
            if(player.shield !== undefined) player.shield += 30;
        }
    },
    {
        id: 'heal',
        name: 'Phép Thuật Trị Thương',
        description: 'Hồi phục ngay lập tức 50% Máu tối đa.',
        icon: '✨',
        repeatable: true,
        apply: (player) => {
            player.hp = Math.min(player.maxHp, player.hp + (player.maxHp * 0.5));
        }
    }
];

export class SkillManager {
    constructor() {
        this.acquiredSkills = []; // Lưu trữ danh sách ID các kỹ năng người chơi đã lấy
    }

    /**
     * Trả về 3 kỹ năng ngẫu nhiên không trùng lặp từ kho kỹ năng
     */
    getThreeRandomSkills() {
        // Lọc bỏ những kỹ năng độc nhất (không có repeatable) mà người chơi đã lấy rồi
        let pool = SKILL_POOL.filter(skill => {
            const isAcquired = this.acquiredSkills.some(s => s.id === skill.id);
            return !isAcquired || skill.repeatable;
        });

        // Dự phòng: Nếu người chơi "phá đảo" quá lâu lấy sạch kỹ năng, lấy các kỹ năng lặp lại
        if (pool.length === 0) {
            pool = SKILL_POOL.filter(s => s.repeatable);
        }
        
        // Thuật toán xáo trộn mảng (Fisher-Yates Shuffle)
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        // Cắt lấy 3 phần tử đầu tiên
        return pool.slice(0, 3);
    }

    /**
     * Áp dụng kỹ năng cho người chơi
     * @param {string} skillId - ID của kỹ năng được chọn
     * @param {Object} player - Đối tượng người chơi
     */
    selectSkill(skillId, player) {
        const skill = SKILL_POOL.find(s => s.id === skillId);
        if (skill) {
            // Gọi hàm thực thi hiệu ứng của kỹ năng
            skill.apply(player);
            // Lưu lại lịch sử đã chọn
            this.acquiredSkills.push(skill);
            console.log(`🌟 Đã học kỹ năng: ${skill.name}`);
        } else {
            console.error("Lỗi: Không tìm thấy kỹ năng với ID -", skillId);
        }
    }
    
    /**
     * Lấy danh sách kỹ năng đã sở hữu (để vẽ ra UI nếu cần)
     */
    getAcquiredSkills() {
        return this.acquiredSkills;
    }
}