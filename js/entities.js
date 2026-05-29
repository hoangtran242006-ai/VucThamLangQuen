// js/entities.js
import { MAP_WIDTH, MAP_HEIGHT } from './constants.js';
import { Weapon, Projectile, RARITY } from './weapons.js';
import { SpriteRenderer } from './sprite.js';
import { AudioManager } from './audio.js';
import { RaceManager } from './races.js';
import * as VFX from './vfx.js';
import { IndexSystem } from './indexSystem.js';

export class Entity {
    constructor(x, y, width, height, maxHp, speed) {
        this.x = x; this.y = y; this.width = width; this.height = height;
        this.maxHp = maxHp; this.hp = maxHp; this.speed = speed;
        this.shield = 0; this.maxShield = 0; this.shieldRegenTimer = 0;
        this.facing = { x: 0, y: 1 }; this.invulnerableTimer = 0; this.isDead = false;
    }

    takeDamage(amount) {
        if (this.invulnerableTimer > 0 || this.isDead) return;
        
        if (this.dodgeChance && Math.random() < this.dodgeChance) {
            VFX.spawnFloatingText(this.x + this.width / 2, this.y, 'NÉ!', '#ffffff');
            return;
        }

        // Tính toán sát thương khuếch đại (từ Debuff) trước khi trừ vào Giáp ảo
        amount = amount * (this.damageTakenMult || 1);

        if (this.shield > 0) {
            if (amount <= this.shield) { this.shield -= amount; amount = 0; } 
            else { amount -= this.shield; this.shield = 0; }
        }

        if (this.maxShield > 0) {
            this.shieldRegenTimer = 5000; // Delay hồi giáp 5 giây sau khi bị đánh
        }

        if (amount > 0) this.hp -= amount;

        if (this.hp <= 0) { this.hp = 0; this.die(); } 
        else this.invulnerableTimer = 200; 
        AudioManager.play('hit');
    }

    die() { this.isDead = true; }
    isCollidingWith(other) { return this.x < other.x + other.width && this.x + this.width > other.x && this.y < other.y + other.height && this.y + this.height > other.y; }
}

export class Player extends Entity {
    constructor(x, y) {
        super(x, y, 24, 24, 100, 200);
        
        this.skin = { id: 'blue', color: '#3498db' };
        this.color = '#3498db'; // Dùng cho Minimap
        this.skinImage = null; // Chứa ảnh nhân vật
        
        this.level = 1; this.exp = 0; this.expToNextLevel = 100;
        this.gold = 0; this.souls = 0; this.dustParticles = []; this.dustTimer = 0;
        this.inventory = [];
        this.equipment = { helmet: null, armor: null, gloves: null, boots: null, rune1: null, rune2: null, rune3: null };
        this.runes = [];
        this.currentWeapon = new Weapon({ name: 'Cung Gỗ Tập Sự', baseName: 'Cung Gỗ', type: 'ranged', rarity: RARITY.COMMON, baseDmg: 10, baseSpeed: 350, fireRate: 400, range: 300, color: '#f1c40f', imgSrc: 'img/weapon/wodden-bow.png' });
        this.activeChat = null;
        this.raceId = 'human';
        this.damageMult = 1.0;
        this.chatExpiry = 0;
        this.animFrame = 0; // Khung hình hiện tại
        this.animTimer = 0; // Bộ đếm thời gian lật frame
        this.animState = 'idle';
        this.isAttackingAnim = false;
        this.critRate = 0.05; // Mặc định 5%
        this.critDamage = 1.5; // Mặc định 150%
        this.luck = 0; // Mặc định 0
        this.bonusMaxHp = 0; // Kỹ năng cộng Máu
        this.bonusSpeedMult = 1; // Kỹ năng cộng Tốc độ (Hệ số)
        this.bonusDamageMult = 0; // Kỹ năng cộng Sát thương (Hệ số)
    }

    recalculateStats() {
        const isHoang = this.skin && this.skin.id === 'hoang';
        const isMage = this.skin && this.skin.id === 'skeleton_mage';
        let baseMaxHp = isHoang ? 200 + (this.level - 1) * 40 : 100 + (this.level - 1) * 20;
        let baseMaxShield = isHoang ? 100 + (this.level - 1) * 10 : 0;
        let baseSpeed = 200 + (this.level * 5); 

        const race = RaceManager.getRace(this.raceId);
        baseMaxHp += race.stats.hp;
        baseMaxShield += race.stats.shield;
        baseSpeed += race.stats.speed;
        
        // --- HỆ THỐNG TÍNH BUFF CHUẨN XÁC ---
        // 1. Chỉ số Chí Mạng (Gốc + Sổ Mục Lục)
        this.critRate = 0.05 + (IndexSystem.bonusStats ? IndexSystem.bonusStats.critRate : 0);
        this.critDamage = 1.5 + (IndexSystem.bonusStats ? IndexSystem.bonusStats.critDamage : 0);
        
        // 2. Tổng Sát Thương (Gốc của Tộc + Kỹ năng + Mục lục)
        let skillDmg = this.bonusDamageMult || 0;
        let indexDmg = IndexSystem.bonusStats ? IndexSystem.bonusStats.baseDamageMult : 0;
        this.damageMult = race.stats.dmgMult + skillDmg + indexDmg;
        
        if (isHoang) this.damageMult *= 2; // Hoàng Thức Tỉnh được x2 tổng sát thương

        let bonusHp = 0, bonusShield = 0, bonusSpeed = 0;
        for (let key in this.equipment) {
            const item = this.equipment[key];
            if (item && item.type === 'armor') {
                if (item.hpBonus) bonusHp += item.hpBonus * item.rarity.statMultiplier;
                if (item.shieldBonus) bonusShield += item.shieldBonus * item.rarity.statMultiplier;
                if (item.speedBonus) bonusSpeed += item.speedBonus * item.rarity.statMultiplier;
            }
        }
        
        // 3. Tính toán Máu, Giáp, Tốc chạy (Gộp với Kỹ Năng)
        let finalMaxHp = baseMaxHp + bonusHp + (this.bonusMaxHp || 0);
        let finalMaxShield = baseMaxShield + bonusShield + (this.bonusMaxShield || 0);
        let finalSpeed = (baseSpeed + bonusSpeed) * (this.bonusSpeedMult || 1);
        this.attackSpeedMult = 1 + (this.bonusAttackSpeedMult || 0);
        
        this.runes = [this.equipment.rune1, this.equipment.rune2, this.equipment.rune3].filter(Boolean);
        let runeHpMult = 1; let runeSpeedMult = 1; this.damageTakenMult = 1;

        if (isMage) {
            if (this.runes.some(r => r.runeId === 'mass_frenzy')) { runeSpeedMult *= 0.8; this.damageTakenMult *= 1.15; }
            if (this.runes.some(r => r.runeId === 'undead_legion')) { runeHpMult *= 0.9; }
            if (this.runes.some(r => r.runeId === 'absolute_power')) { runeSpeedMult *= 0.8; }
            // Cấp Giới hạn Giáp Ảo tối đa (Bằng 100% HP gốc) khi mang Rune Ký Sinh để UI hiển thị chuẩn
            if (this.runes.some(r => r.runeId === 'parasite')) { bonusShield += baseMaxHp; }
        }

        this.maxHp = Math.floor(finalMaxHp * runeHpMult); this.maxShield = Math.floor(finalMaxShield); this.speed = Math.floor(finalSpeed * runeSpeedMult);
        if (this.hp > this.maxHp) this.hp = this.maxHp; if (this.shield > this.maxShield) this.shield = this.maxShield;
    }

    equipItem(item) {
        if (!this.inventory.includes(item)) return;
        this.inventory.splice(this.inventory.indexOf(item), 1);
        let oldItem = null;
        if (item.type === 'ranged' || item.type === 'magic') { 
            if (this.skin && this.skin.id === 'skeleton_mage') { this.inventory.push(item); return; }
            oldItem = this.currentWeapon; this.currentWeapon = item; 
        } 
        else if (item.type === 'armor') { oldItem = this.equipment[item.armorType]; this.equipment[item.armorType] = item; }
        else if (item.type === 'rune') {
            if (this.skin && this.skin.id === 'skeleton_mage') {
                if (!this.equipment.rune1) { this.equipment.rune1 = item; }
                else if (!this.equipment.rune2) { this.equipment.rune2 = item; }
                else if (!this.equipment.rune3) { this.equipment.rune3 = item; }
                else { oldItem = this.equipment.rune1; this.equipment.rune1 = item; }
            } else { this.inventory.push(item); return; }
        }
        if (oldItem) this.inventory.push(oldItem);
        this.recalculateStats();
    }
    unequipItem(slot) { 
        if (slot === 'weapon') return; 
        let item = this.equipment[slot]; 
        if (item) { this.equipment[slot] = null; this.inventory.push(item); this.recalculateStats(); } 
    }

    getSpriteTopY() {
        let drawHeight = 48;
        if (this.skin && this.skin.scale) {
            drawHeight = 48 * this.skin.scale;
        } else if (this.skin && this.skin.id === 'schoolgirl') {
            drawHeight = 55;
        }
        return (this.y + this.height / 2) - (drawHeight / 2);
    }

    gainExp(amount) { 
        this.exp += amount * (this.expMultiplier || 1); 
        while (this.exp >= this.expToNextLevel) {
            this.levelUp(); 
        }
    }

    levelUp() {
        this.level++; this.exp -= this.expToNextLevel; this.expToNextLevel = Math.floor(this.expToNextLevel * 1.5);
        this.recalculateStats(); this.hp = this.maxHp; this.shield = this.maxShield;
    }

    setChat(text) {
        this.activeChat = text;
        this.chatExpiry = performance.now() + 4000; // 4 giây
    }

    setSkin(skinObj, loadedImages) {
        this.skin = skinObj;
        this.color = skinObj.color || '#fff';
        this.skinImage = ((skinObj.isImage || skinObj.isAdvancedSprite) && loadedImages && loadedImages[skinObj.id]) ? loadedImages[skinObj.id] : null;
        this.recalculateStats(); this.hp = this.maxHp; this.shield = this.maxShield;
    }

    updateAnimation(deltaTime, isAttacking) {
        if (this.skin && this.skin.isAdvancedSprite) {
            let targetState = 'idle';
            if (isAttacking) {
                targetState = 'attack';
                this.isAttackingAnim = true;
            } else if (this.isMoving) {
                targetState = 'run';
            }
            
            if (this.isAttackingAnim) targetState = 'attack';

            if (this.animState !== targetState) {
                this.animState = targetState;
                this.animFrame = 0;
                this.animTimer = 0;
            }

            this.animTimer += deltaTime;
            if (this.animTimer >= 70) { 
                this.animTimer = 0;
                this.animFrame++;
                if (this.animFrame >= this.skin.framesX) {
                    this.animFrame = 0;
                    if (this.animState === 'attack') {
                        this.isAttackingAnim = false;
                        if (!isAttacking) this.animState = this.isMoving ? 'run' : 'idle';
                    }
                }
            }
        } else {
            if (this.isMoving) {
                this.animTimer += deltaTime;
                const frameDelay = (this.skin.framesX || 4) > 4 ? 60 : 150;
                if (this.animTimer >= frameDelay) { 
                    this.animTimer = 0;
                    this.animFrame = (this.animFrame + 1) % (this.skin.framesX || 4);
                }
            } else {
                this.animFrame = 0; this.animTimer = 0;
            }
        }
    }

    update(deltaTime, inputManager, map, camera, gameProjectiles, enemiesArray) {
        if (this.stunTimer > 0) {
            this.stunTimer -= deltaTime;
            this.isMoving = false;
            this.updateAnimation(deltaTime, false);
            return;
        }
        
        if (this.isDead) {
            const moveVec = inputManager.getMovementVector();
            if (moveVec.x !== 0 || moveVec.y !== 0) {
                const moveX = moveVec.x * (this.speed * 1.5) * (deltaTime / 1000);
                const moveY = moveVec.y * (this.speed * 1.5) * (deltaTime / 1000);
                this.x += moveX; this.y += moveY;
                // Hồn ma bay xuyên tường (Không check va chạm)
                this.x = Math.max(0, Math.min(this.x, MAP_WIDTH - this.width));
                this.y = Math.max(0, Math.min(this.y, MAP_HEIGHT - this.height));
                if (moveVec.x !== 0) this.facing.x = moveVec.x > 0 ? 1 : -1;
            }
            return;
        }

        if (!this.isDead && this.maxShield > 0 && this.shield < this.maxShield) {
            if (this.shieldRegenTimer > 0) {
                this.shieldRegenTimer -= deltaTime;
            } else {
                this.shield = Math.min(this.maxShield, this.shield + 10 * (deltaTime / 1000));
            }
        }

        if (this.invulnerableTimer > 0) this.invulnerableTimer -= deltaTime;

        if (this.mergedTarget && !this.mergedTarget.isDead) {
            this.x = this.mergedTarget.x + this.mergedTarget.width/2 - this.width/2;
            this.y = this.mergedTarget.y + this.mergedTarget.height/2 - this.height/2;
            this.invulnerableTimer = 100;
            this.lastMoveVec = inputManager.getMovementVector();
            this.isMoving = (this.lastMoveVec.x !== 0 || this.lastMoveVec.y !== 0);
            this.updateAnimation(deltaTime, false);
            return; 
        }

        this.lastMoveVec = inputManager.getMovementVector();
        const moveVec = this.lastMoveVec;
        let isAttacking = inputManager.mouse.leftDown || inputManager.isActionActive('attack');
        
        if (inputManager.joystickAim && inputManager.isShooting) {
            const aimLen = Math.hypot(inputManager.joystickAim.x, inputManager.joystickAim.y);
            if (aimLen > 0) this.facing = { x: inputManager.joystickAim.x / aimLen, y: inputManager.joystickAim.y / aimLen };
            isAttacking = true;
        } else if (inputManager.mouse.x !== 0 || inputManager.mouse.y !== 0) {
            const dx = inputManager.mouse.x + camera.x - (this.x + this.width / 2);
            const dy = inputManager.mouse.y + camera.y - (this.y + this.height / 2);
            const dist = Math.hypot(dx, dy);
            if (dist > 0) this.facing = { x: dx / dist, y: dy / dist };
        }

        this.isMoving = (moveVec.x !== 0 || moveVec.y !== 0);
        
        this.updateAnimation(deltaTime, isAttacking);

        // Hố đen Mini (Trừ thời gian hồi)
        if (this.hasSingularity && this.singularityTimer > 0) {
            this.singularityTimer -= deltaTime;
        }

        // Kỹ năng Z: Triệu hồi (Skeleton Mage)
        if (this.summonTimer === undefined) this.summonTimer = 0;
        if (this.summonAnimTimer === undefined) this.summonAnimTimer = 0;
        if (this.summonTimer > 0) this.summonTimer -= deltaTime;
        if (this.summonAnimTimer > 0) this.summonAnimTimer -= deltaTime;
        if (this.skin && this.skin.id === 'skeleton_mage' && inputManager.isActionJustPressed('skill_z') && this.summonTimer <= 0) {
            let cd = 15000;
            if (this.runes && this.runes.some(r => r.runeId === 'undead_tide')) cd *= 0.7;
            this.summonTimer = cd; 
            this.wantsToSummon = true;
            this.summonAnimTimer = 600; // Hiệu ứng triệu hồi kéo dài 0.6s
        }

        // Bước nhảy không gian (Lướt)
        if (this.canBlink) {
            if (this.blinkTimer > 0) this.blinkTimer -= deltaTime;
            if (this.blinkTimer <= 0 && inputManager.isActionJustPressed('dash')) {
                let dashDir = { x: moveVec.x, y: moveVec.y };
                if (dashDir.x === 0 && dashDir.y === 0) dashDir = this.facing;
                const dashDist = 150;
                let targetX = this.x + dashDir.x * dashDist;
                let targetY = this.y + dashDir.y * dashDist;
                if (!this._checkMapCollision(targetX, targetY, map)) {
                    VFX.spawnImpactEffect(this.x + this.width/2, this.y + this.height/2, 'blink');
                    this.x = targetX; this.y = targetY;
                    VFX.spawnImpactEffect(this.x + this.width/2, this.y + this.height/2, 'blink');
                    this.blinkTimer = this.blinkCooldownTime;
                }
            }
        }

        // Tinh linh hỗ trợ
        if (this.hasFairy) {
            if (this.fairyX === undefined) this.fairyX = this.x + this.width / 2;
            if (this.fairyY === undefined) this.fairyY = this.y + this.height / 2;

            // Hướng sau lưng
            let backX = -this.facing.x;
            let backY = -this.facing.y;
            
            let targetX = this.x + this.width / 2 + backX * 35;
            let targetY = this.y + this.height / 2 + backY * 35 - 10; // Bay lệch lên cao một chút

            // Lerp mượt mà
            this.fairyX += (targetX - this.fairyX) * 0.08;
            this.fairyY += (targetY - this.fairyY) * 0.08;
            
            if (this.fairyShootTimer === undefined) this.fairyShootTimer = 0;
            this.fairyShootTimer -= deltaTime;
            
            if (this.fairyShootTimer <= 0 && enemiesArray && enemiesArray.length > 0) {
                let target = null;
                let minDist = 400; // Tầm bắn của tinh linh
                for (let e of enemiesArray) {
                    if (!e.isDead && !e.isAlly) {
                        let dist = Math.hypot(e.x + e.width/2 - this.fairyX, e.y + e.height/2 - this.fairyY);
                        if (dist < minDist) {
                            minDist = dist;
                            target = e;
                        }
                    }
                }
                
                if (target) {
                    this.fairyShootTimer = 1500; // Bắn chậm mỗi 1.5s
                    
                    let angle = Math.atan2(target.y + target.height/2 - this.fairyY, target.x + target.width/2 - this.fairyX);
                    
                    let fairyWeapon = new Weapon({ name: 'Đạn Tinh Linh', type: 'magic', rarity: RARITY.COMMON, baseDmg: 5 + (this.level || 1), baseSpeed: 300, fireRate: 1500, range: 400, color: '#a29bfe', effectType: 'standard' });
                    let proj = new Projectile(this.fairyX, this.fairyY, Math.cos(angle), Math.sin(angle), fairyWeapon, false);
                    proj.damage = fairyWeapon.damage;
                    proj.radius = 4;
                    if (gameProjectiles) gameProjectiles.push(proj);
                }
            }
        }

        if (this.isMoving) {
            const moveX = moveVec.x * this.speed * (deltaTime / 1000);
            const moveY = moveVec.y * this.speed * (deltaTime / 1000);

            this.dustTimer -= deltaTime;
            if (this.dustTimer <= 0) {
                for (let i = 0; i < 2; i++) this.dustParticles.push({ x: this.x + this.width / 2 + (Math.random() - 0.5) * 12, y: this.y + this.height - 2 + (Math.random() - 0.5) * 4, vx: -moveVec.x * (15 + Math.random() * 20) + (Math.random() - 0.5) * 10, vy: -moveVec.y * (15 + Math.random() * 20) + (Math.random() - 0.5) * 10, life: 0.4 + Math.random() * 0.2, maxLife: 0.6, size: 2 + Math.random() * 3 });
                this.dustTimer = 40;
            }

            if (!this._checkMapCollision(this.x + moveX, this.y, map)) this.x += moveX;
            if (!this._checkMapCollision(this.x, this.y + moveY, map)) this.y += moveY;
            
            this.x = Math.max(0, Math.min(this.x, MAP_WIDTH - this.width));
            this.y = Math.max(0, Math.min(this.y, MAP_HEIGHT - this.height));
        }

        for (let i = this.dustParticles.length - 1; i >= 0; i--) {
            let p = this.dustParticles[i]; p.x += p.vx * (deltaTime / 1000); p.y += p.vy * (deltaTime / 1000); p.life -= deltaTime / 1000; p.size += deltaTime / 60;
            if (p.life <= 0) this.dustParticles.splice(i, 1);
        }

        if (isAttacking) {
            this.fireWeapon(gameProjectiles, performance.now());
        }
    }

    fireWeapon(gameProjectiles, currentTime, isEnemy = false) {
        if (this.skin && this.skin.id === 'skeleton_mage') return;
        if (!this.currentWeapon) return;
        const effectiveFireRate = this.currentWeapon.fireRate / (this.attackSpeedMult || 1);
        if ((currentTime - (this.currentWeapon.lastFiredTime || 0)) >= effectiveFireRate) {
            const count = this.currentWeapon.projectilesPerShot || 1;
            const spread = this.currentWeapon.spreadAngle || 0;
            const baseAngle = Math.atan2(this.facing.y, this.facing.x);
            const isHoang = this.skin && this.skin.id === 'hoang';

            for (let i = 0; i < count; i++) {
                let angleOffset = count > 1 ? -spread / 2 + (spread / (count - 1)) * i : 0;
                if (count > 1 && this.currentWeapon.effectType === 'fire') angleOffset = (Math.random() - 0.5) * spread;
                const finalAngle = baseAngle + angleOffset;
                const proj = new Projectile(this.x + this.width / 2, this.y + this.height / 2, Math.cos(finalAngle), Math.sin(finalAngle), this.currentWeapon, isEnemy);
                proj.damage = Math.floor(proj.damage * this.damageMult);
                
                // Hoàng đánh cận chiến: Đạn vô hình, tầm cực ngắn, hitbox cực to
                if (isHoang) {
                    proj.isMelee = true;
                    proj.radius = 40; 
                    proj.maxRange = 50; 
                    proj.pierceCount = 999;
                    proj.speed = 800; 
                }
                
                gameProjectiles.push(proj);
            }
            AudioManager.play(isHoang ? 'hit' : 'shoot');
            this.currentWeapon.lastFiredTime = currentTime;
        }
    }

    _checkMapCollision(nX, nY, map) { return map.isSolidPixel(nX, nY) || map.isSolidPixel(nX + this.width, nY) || map.isSolidPixel(nX, nY + this.height) || map.isSolidPixel(nX + this.width, nY + this.height); }

    _drawChatBubble(ctx) {
        if (this.activeChat && performance.now() < this.chatExpiry) {
            ctx.save();
            ctx.font = 'bold 12px "Segoe UI", sans-serif';
            let textToDraw = this.activeChat;
            if (textToDraw.length > 25) textToDraw = textToDraw.substring(0, 25) + '...'; // Giới hạn độ dài để bong bóng không quá to
            
            const textWidth = ctx.measureText(textToDraw).width;
            const bubbleW = textWidth + 16;
            const bubbleH = 24;
            const bubbleX = this.x + this.width / 2 - bubbleW / 2;
            const spriteTop = this.getSpriteTopY();
            const bubbleY = this.isDead ? this.y - 35 : spriteTop - bubbleH - 12;

            // Vẽ nền bong bóng
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.strokeStyle = '#bdc3c7';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 8); ctx.fill(); ctx.stroke();

            // Vẽ đuôi bong bóng chỉ xuống
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2 - 5, bubbleY + bubbleH);
            ctx.lineTo(this.x + this.width / 2 + 5, bubbleY + bubbleH);
            ctx.lineTo(this.x + this.width / 2, bubbleY + bubbleH + 6);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            
            // Xóa viền cắt ngang ở giữa thân và đuôi bong bóng
            ctx.beginPath(); ctx.moveTo(this.x + this.width / 2 - 4, bubbleY + bubbleH); ctx.lineTo(this.x + this.width / 2 + 4, bubbleY + bubbleH); 
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'; ctx.lineWidth = 2; ctx.stroke();

            // Vẽ chữ
            ctx.fillStyle = '#2c3e50';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(textToDraw, this.x + this.width / 2, bubbleY + bubbleH / 2 + 1);
            ctx.restore();
        }
    }

    draw(ctx) {
        ctx.save();
        if (this.isDead) {
            // Vẽ Hồn ma dễ thương
            const time = performance.now();
            const bobbing = Math.sin(time * 0.005) * 3;
            
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2 + bobbing);
            const flip = this.facing.x < 0 ? -1 : 1;
            ctx.scale(flip, 1);
            
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = '#ecf0f1';
            
            ctx.beginPath(); ctx.arc(0, -5, 12, Math.PI, 0); ctx.lineTo(12, 10);
            ctx.quadraticCurveTo(8, 15, 4, 10); ctx.quadraticCurveTo(0, 15, -4, 10); ctx.quadraticCurveTo(-8, 15, -12, 10);
            ctx.closePath(); ctx.fill();
            
            ctx.fillStyle = '#2c3e50';
            ctx.beginPath(); ctx.ellipse(4, -5, 2, 3, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(9, -5, 2, 3, 0, 0, Math.PI*2); ctx.fill();
            
            ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(0, -20, 10, 3, 0, 0, Math.PI*2); ctx.stroke();
            
            ctx.restore();
            this._drawChatBubble(ctx);
            ctx.restore(); return;
        }
        
        ctx.save();
        for (let p of this.dustParticles) { ctx.fillStyle = `rgba(180, 170, 150, ${Math.max(0, p.life / p.maxLife) * 0.6})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();

        if (this.invulnerableTimer > 0 && Math.floor(performance.now() / 100) % 2 === 0) ctx.globalAlpha = 0.5;

        const time = performance.now(); const breath = Math.sin(time * 0.005) * 1.5; 
        if (!this.skin.isSpriteSheet && !(this.skin && this.skin.isAdvancedSprite)) {
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.x + this.width/2, this.y + this.height, this.width/1.5, this.height/4, 0, 0, Math.PI * 2); ctx.fill();
        }

        const isShooting = (performance.now() - (this.currentWeapon.lastFiredTime || 0)) < 150;
        const recoil = (this.skin.id === 'schoolgirl' && isShooting) ? -3 : 0;
        
        if (this.skinImage) {
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2 + breath);
            
            if (this.skin.isAdvancedSprite) {
                let dir = 'down';
                if (Math.abs(this.facing.x) > Math.abs(this.facing.y)) {
                    dir = this.facing.x < 0 ? 'left' : 'right';
                } else {
                    dir = this.facing.y < 0 ? 'up' : 'down';
                }
                const currentImg = this.skinImage[this.animState][dir];
                if (currentImg && currentImg.complete && currentImg.naturalWidth > 0) {
                    SpriteRenderer.drawAdvanced(ctx, currentImg, this.skin.framesX, this.animFrame, this.skin.scale || 1);
                }
            } else if (this.skin.isSpriteSheet) {
                SpriteRenderer.drawInGame(ctx, this.skinImage, this.skin.framesX || 4, this.skin.framesY || 4, this.animFrame, this.facing);
            } else {
                const flip = this.facing.x < 0 ? -1 : 1; 
                ctx.scale(flip, 1);
                ctx.drawImage(this.skinImage, -20, -20, 40, 40); 
            }
            ctx.restore();
        } else if (this.skin.id === 'schoolgirl') {
            const flip = this.facing.x < 0 ? -1 : 1; 
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2 + breath);
            ctx.scale(flip, 1);
            
            // Tóc đuôi ngựa 2 bên đung đưa khi chạy
            ctx.fillStyle = '#2f3542';
            const tailSwing = this.isMoving ? Math.sin(time * 0.02) * 5 : 0;
            ctx.beginPath(); ctx.roundRect(-14 + recoil/2, -12, 8, 20 + tailSwing, 4); ctx.fill();
            ctx.beginPath(); ctx.roundRect(6 + recoil/2, -12, 8, 20 - tailSwing, 4); ctx.fill();

            // Chân & Giày
            ctx.fillStyle = '#ffdfc4';
            const legSwing = this.isMoving ? Math.sin(time * 0.02) * 6 : 0;
            ctx.fillRect(-6 + legSwing, 8, 4, 10); ctx.fillRect(2 - legSwing, 8, 4, 10);
            ctx.fillStyle = '#34495e'; ctx.fillRect(-7 + legSwing, 15, 6, 3); ctx.fillRect(1 - legSwing, 15, 6, 3);
            ctx.fillStyle = '#fff'; ctx.fillRect(-6 + legSwing, 11, 4, 4); ctx.fillRect(2 - legSwing, 11, 4, 4);

            // Váy xếp ly
            ctx.fillStyle = '#0984e3';
            ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.lineTo(13 - recoil, 9); ctx.lineTo(-13 - recoil, 9); ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-11-recoil, 7); ctx.lineTo(11-recoil, 7); ctx.stroke();

            // Thân áo & Cổ áo thủy thủ & Nơ
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(-8 + recoil/2, -8, 16, 10, 2); ctx.fill();
            ctx.fillStyle = '#0984e3'; ctx.beginPath(); ctx.moveTo(-8 + recoil/2, -8); ctx.lineTo(8 + recoil/2, -8); ctx.lineTo(0 + recoil/2, 0); ctx.fill();
            ctx.fillStyle = '#d63031'; ctx.beginPath(); ctx.arc(0 + recoil/2, -1, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(0 + recoil/2, -1); ctx.lineTo(-4 + recoil/2, 4); ctx.lineTo(-1 + recoil/2, 4); ctx.fill();
            ctx.beginPath(); ctx.moveTo(0 + recoil/2, -1); ctx.lineTo(4 + recoil/2, 4); ctx.lineTo(1 + recoil/2, 4); ctx.fill();

            // Khuôn mặt
            ctx.fillStyle = '#ffdfc4'; ctx.beginPath(); ctx.roundRect(-10 + recoil, -20, 20, 16, 6); ctx.fill();
            ctx.fillStyle = '#000';
            if (isShooting) {
                ctx.fillRect(1 + recoil, -14, 5, 2); ctx.fillRect(10 + recoil, -14, 5, 2);
                ctx.fillStyle = 'rgba(255, 105, 180, 0.8)'; ctx.fillRect(2 + recoil, -10, 3, 2); ctx.fillRect(11 + recoil, -10, 3, 2);
            } else {
                if (Math.floor(time / 100) % 40 === 0) {
                    ctx.fillRect(2 + recoil, -13, 3, 1); ctx.fillRect(11 + recoil, -13, 3, 1);
                } else {
                    ctx.fillRect(2 + recoil, -15, 3, 4); ctx.fillRect(11 + recoil, -15, 3, 4);
                    ctx.fillStyle = '#fff'; ctx.fillRect(3 + recoil, -15, 1, 1); ctx.fillRect(12 + recoil, -15, 1, 1);
                }
                ctx.fillStyle = 'rgba(255, 105, 180, 0.4)'; ctx.fillRect(1 + recoil, -11, 3, 2); ctx.fillRect(12 + recoil, -11, 3, 2);
            }

            // Tóc mái
            ctx.fillStyle = '#2f3542'; ctx.beginPath(); ctx.roundRect(-11 + recoil, -22, 22, 7, 3); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-11 + recoil, -18); ctx.lineTo(-5 + recoil, -11); ctx.lineTo(-1 + recoil, -18); ctx.fill();
            ctx.beginPath(); ctx.moveTo(1 + recoil, -18); ctx.lineTo(5 + recoil, -12); ctx.lineTo(9 + recoil, -18); ctx.fill();

            ctx.restore();
        } else if (this.skin.id === 'skeleton_mage') {
            const isSummoning = this.summonAnimTimer > 0;
            const isAttacking = isShooting;
            
            // Xoay hướng (Animation Walk)
            const isSide = Math.abs(this.facing.x) > Math.abs(this.facing.y);
            const isUp = !isSide && this.facing.y < 0;
            const isDown = !isSide && !isUp;
            const flip = isSide && this.facing.x < 0 ? -1 : 1; 

            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2 + breath);

            // Aura đen tím ngầu (Aura effect)
            const auraScale = 1 + Math.sin(time * 0.005) * 0.1 + (isSummoning ? 0.3 : 0);
            ctx.save();
            ctx.scale(auraScale, auraScale);
            ctx.shadowBlur = isSummoning ? 30 : 20;
            ctx.shadowColor = '#9b59b6';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.beginPath(); ctx.ellipse(0, -5, 22, 28, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();

            // Những đốm lửa linh hồn bay xung quanh (Floating soul fire)
            const numFires = isSummoning ? 5 : 3;
            const fireSpeed = isSummoning ? 0.01 : 0.005;
            for (let i = 0; i < numFires; i++) {
                const angle = (time * fireSpeed) + (i * Math.PI * 2 / numFires);
                const radius = (isSummoning ? 35 : 25) + Math.sin(time * 0.005 + i) * 5;
                const ox = Math.cos(angle) * radius;
                const oy = Math.sin(angle) * 10 - 15 - (isSummoning ? 10 : 0);
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#8e44ad';
                ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.arc(ox, oy, 4, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = isSummoning ? '#e056fd' : '#9b59b6';
                ctx.beginPath(); ctx.arc(ox, oy, 2, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0;
            }

            ctx.scale(flip, 1);
            ctx.translate(-25, -25); // Lùi trục tọa độ lại để khớp với box 50x50 của ảnh

            const C_BONE = '#e3d1b5';
            const C_BONE_SHADOW = '#bba07d';
            const C_SHIRT = '#5c4033';
            const C_SHIRT_SHADOW = '#3e2723';
            const C_PANTS = '#363636';
            const C_BOOTS = '#4a3018';
            const C_BELT_GOLD = '#d4af37';
            const C_BLACK = '#111111';

            const walkCycle = time * 0.015;
            const swing1 = this.isMoving ? Math.sin(walkCycle) * 5 : 0;
            const swing2 = this.isMoving ? Math.sin(walkCycle + Math.PI) * 5 : 0;

            const drawMagicGlow = (hx, hy) => {
                if (isSummoning || isAttacking) {
                    ctx.save();
                    ctx.shadowBlur = 15; ctx.shadowColor = '#e056fd';
                    ctx.fillStyle = '#e056fd';
                    ctx.beginPath(); ctx.arc(hx, hy, isSummoning ? 5 : 3, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = '#fff';
                    ctx.beginPath(); ctx.arc(hx, hy, isSummoning ? 2 : 1, 0, Math.PI*2); ctx.fill();
                    ctx.restore();
                }
            };

            const drawSideArms = () => {
                ctx.fillStyle = C_BONE_SHADOW;
                let bArmY = isSummoning ? 12 : (isAttacking ? 22 : 25 + swing1);
                ctx.fillRect(20, bArmY, 2, 5); ctx.fillRect(19, bArmY + 4, 4, 2); ctx.fillRect(20, bArmY + 6, 2, 5);
            };

            const drawFrontArms = () => {
                ctx.fillStyle = C_BONE;
                let fArmY = isSummoning ? 12 : (isAttacking ? 22 : 25 + swing2);
                if (isAttacking) {
                    ctx.fillRect(24, fArmY, 2, 5); ctx.fillRect(23, fArmY + 4, 4, 2); 
                    ctx.fillRect(26, fArmY + 4, 5, 2); ctx.fillRect(31, fArmY + 4, 2, 3); 
                    drawMagicGlow(32, fArmY + 5);
                } else if (isSummoning) {
                    ctx.fillRect(24, fArmY, 2, 5); ctx.fillRect(23, fArmY - 2, 4, 2); ctx.fillRect(24, fArmY - 7, 2, 5);
                    drawMagicGlow(25, fArmY - 8);
                } else {
                    ctx.fillRect(24, fArmY, 2, 5); ctx.fillRect(23, fArmY + 4, 4, 2); ctx.fillRect(25, fArmY + 6, 2, 5);
                }
            };

            const drawBothArms = () => {
                let lArmY = isSummoning ? 15 : (isAttacking ? 22 : 25 + swing2);
                let rArmY = isSummoning ? 15 : (isAttacking ? 22 : 25 + swing1);
                ctx.fillStyle = C_BONE;
                ctx.fillRect(13, lArmY, 2, 5); ctx.fillRect(12, lArmY + 4, 4, 2); ctx.fillRect(11, lArmY + 6, 2, 5);
                ctx.fillRect(35, rArmY, 2, 5); ctx.fillRect(34, rArmY + 4, 4, 2); ctx.fillRect(36, rArmY + 6, 2, 6);
                if (!isUp && (isAttacking || isSummoning)) {
                    drawMagicGlow(12, lArmY + 11);
                    drawMagicGlow(37, rArmY + 11);
                }
            };

            // 1. CHÂN XƯƠNG & GIÀY
            if (isSide) {
                ctx.fillStyle = C_BONE_SHADOW;
                ctx.fillRect(23 + swing2, 38, 2, 5); ctx.fillRect(22 + swing2, 41, 4, 2);
                ctx.fillStyle = '#3a2512';
                ctx.fillRect(20 + swing2, 43, 7, 3); ctx.fillRect(21 + swing2, 46, 6, 4); ctx.fillRect(25 + swing2, 47, 4, 3);
                ctx.fillStyle = C_BONE;
                ctx.fillRect(25 + swing1, 38, 2, 5); ctx.fillRect(24 + swing1, 41, 4, 2);
                ctx.fillStyle = C_BOOTS;
                ctx.fillRect(22 + swing1, 43, 7, 3); ctx.fillRect(23 + swing1, 46, 6, 4); ctx.fillRect(27 + swing1, 47, 4, 3);
            } else {
                const leftSwing = isUp ? swing2 : swing1;
                const rightSwing = isUp ? swing1 : swing2;
                ctx.fillStyle = C_BONE;
                ctx.fillRect(19 + leftSwing, 38, 2, 5); ctx.fillRect(18 + leftSwing, 41, 4, 2);
                ctx.fillRect(29 + rightSwing, 38, 2, 5); ctx.fillRect(28 + rightSwing, 41, 4, 2);
                ctx.fillStyle = C_BOOTS;
                ctx.fillRect(15 + leftSwing, 43, 9, 3); ctx.fillRect(16 + leftSwing, 46, 7, 4); 
                if (!isUp) ctx.fillRect(12 + leftSwing, 47, 4, 3);
                ctx.fillRect(26 + rightSwing, 43, 9, 3); ctx.fillRect(27 + rightSwing, 46, 7, 4); 
                if (!isUp) ctx.fillRect(34 + rightSwing, 47, 4, 3);
            }

            // 2. QUẦN ĐÙI XÁM RÁCH
            ctx.fillStyle = C_PANTS;
            if (isSide) {
                ctx.fillRect(21, 32, 8, 6);
                ctx.fillRect(20, 38, 2, 2); ctx.fillRect(23, 38, 3, 3); ctx.fillRect(27, 38, 2, 1);
            } else {
                ctx.fillRect(16, 32, 8, 6); ctx.fillRect(26, 32, 8, 6);
                if (!isUp) {
                    ctx.fillRect(15, 38, 2, 2); ctx.fillRect(18, 38, 3, 3); ctx.fillRect(22, 38, 2, 1);
                    ctx.fillRect(26, 38, 3, 2); ctx.fillRect(30, 38, 2, 3); ctx.fillRect(33, 38, 2, 2);
                }
            }

            if (isSide) drawSideArms();
            else if (isUp) drawBothArms();

            // 3. ÁO NÂU RÁCH & THẮT LƯNG
            if (isSide) {
                ctx.fillStyle = C_SHIRT;
                ctx.fillRect(20, 18, 10, 14); ctx.fillRect(18, 18, 4, 7);
                ctx.fillRect(19, 31, 3, 2); ctx.fillRect(24, 31, 2, 3); ctx.fillRect(27, 31, 2, 2);
                ctx.fillStyle = C_SHIRT_SHADOW; ctx.fillRect(19, 27, 12, 4); 
                ctx.fillStyle = C_BELT_GOLD; ctx.fillRect(27, 26, 3, 6); 
            } else {
                ctx.fillStyle = C_SHIRT;
                ctx.fillRect(16, 18, 18, 14); ctx.fillRect(13, 18, 5, 7); ctx.fillRect(32, 18, 5, 7);
                if (isUp) {
                    ctx.fillRect(16, 31, 3, 2); ctx.fillRect(21, 31, 2, 3); ctx.fillRect(26, 31, 4, 2); ctx.fillRect(31, 31, 3, 3);
                    ctx.fillStyle = C_SHIRT_SHADOW; ctx.fillRect(16, 27, 18, 4);
                } else {
                    ctx.fillRect(15, 31, 3, 2); ctx.fillRect(20, 31, 2, 3); ctx.fillRect(25, 31, 4, 2); ctx.fillRect(31, 31, 4, 3);
                    ctx.fillStyle = C_SHIRT_SHADOW; ctx.fillRect(20, 18, 10, 4);
                    ctx.fillStyle = C_BONE; ctx.fillRect(23, 16, 4, 4); ctx.fillRect(21, 19, 8, 2);
                    ctx.fillStyle = C_BLACK; ctx.fillRect(24, 21, 2, 1);
                    ctx.fillStyle = C_SHIRT_SHADOW; ctx.fillRect(16, 27, 18, 4);
                    ctx.fillStyle = C_BELT_GOLD; ctx.fillRect(21, 26, 8, 6);
                    ctx.fillStyle = C_SHIRT_SHADOW; ctx.fillRect(23, 28, 4, 2);
                }
            }

            if (isSide) drawFrontArms();
            else if (!isUp) drawBothArms();

            // 4. HỘP SỌ (SKULL)
            if (isSide) {
                ctx.fillStyle = C_BONE;
                ctx.fillRect(19, 2, 14, 12); ctx.fillRect(21, 14, 12, 5);
                ctx.fillStyle = C_BONE_SHADOW;
                ctx.fillRect(19, 12, 3, 2); ctx.fillRect(21, 17, 2, 2);
                ctx.fillStyle = C_BLACK;
                if (isAttacking) { ctx.beginPath(); ctx.moveTo(27, 8); ctx.lineTo(31, 11); ctx.lineTo(31, 12); ctx.lineTo(27, 12); ctx.fill(); }
                else { ctx.beginPath(); ctx.moveTo(27, 7); ctx.lineTo(31, 9); ctx.lineTo(31, 12); ctx.lineTo(27, 12); ctx.fill(); }
                ctx.fillRect(32, 13, 1, 2); ctx.fillRect(26, 16, 7, 1); ctx.fillRect(28, 15, 1, 3); ctx.fillRect(31, 15, 1, 3);
                ctx.fillStyle = '#e056fd'; ctx.shadowBlur = 10; ctx.shadowColor = '#e056fd';
                if (isSummoning) { ctx.fillRect(28, 10, 3, 2); ctx.shadowBlur = 20; ctx.fillRect(29, 9, 1, 4); } 
                else { ctx.fillRect(29, 9, 2, 2); ctx.fillRect(31, 9, 1, 1); }
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = C_BONE;
                ctx.fillRect(15, 2, 20, 12); 
                if (isUp) {
                    ctx.fillStyle = C_BONE_SHADOW;
                    ctx.fillRect(15, 12, 3, 2); ctx.fillRect(32, 12, 3, 2); 
                    ctx.fillRect(18, 5, 2, 4); ctx.fillRect(20, 7, 3, 2); ctx.fillRect(28, 4, 1, 5);
                } else {
                    ctx.fillRect(18, 14, 14, 5);
                    ctx.fillStyle = C_BONE_SHADOW;
                    ctx.fillRect(15, 12, 3, 2); ctx.fillRect(32, 12, 3, 2); ctx.fillRect(18, 17, 2, 2); ctx.fillRect(30, 17, 2, 2);
                    ctx.fillStyle = C_BLACK;
                    if (isAttacking) {
                        ctx.beginPath(); ctx.moveTo(16, 8); ctx.lineTo(23, 11); ctx.lineTo(23, 12); ctx.lineTo(16, 12); ctx.fill();
                        ctx.beginPath(); ctx.moveTo(34, 8); ctx.lineTo(27, 11); ctx.lineTo(27, 12); ctx.lineTo(34, 12); ctx.fill();
                    } else {
                        ctx.beginPath(); ctx.moveTo(16, 7); ctx.lineTo(23, 9); ctx.lineTo(23, 12); ctx.lineTo(16, 12); ctx.fill();
                        ctx.beginPath(); ctx.moveTo(34, 7); ctx.lineTo(27, 9); ctx.lineTo(27, 12); ctx.lineTo(34, 12); ctx.fill();
                    }
                    ctx.beginPath(); ctx.moveTo(24, 13); ctx.lineTo(26, 13); ctx.lineTo(25, 15); ctx.fill();
                    ctx.fillRect(19, 16, 12, 1); ctx.fillRect(21, 15, 1, 3); ctx.fillRect(24, 15, 1, 3); ctx.fillRect(27, 15, 1, 3);
                    ctx.fillStyle = '#e056fd'; ctx.shadowBlur = 10; ctx.shadowColor = '#e056fd';
                    if (isSummoning) {
                        ctx.fillRect(19, 10, 4, 2); ctx.fillRect(27, 10, 4, 2);
                        ctx.shadowBlur = 20; ctx.fillRect(20, 9, 2, 4); ctx.fillRect(28, 9, 2, 4);
                    } else {
                        ctx.fillRect(19, 9, 2, 2); ctx.fillRect(29, 9, 2, 2); ctx.fillRect(21, 9, 2, 1); ctx.fillRect(27, 9, 2, 1);
                    }
                    ctx.shadowBlur = 0;
                }
            }

            ctx.restore();
        } else {
            ctx.fillStyle = this.color; ctx.beginPath(); ctx.roundRect(this.x + 2, this.y + 10 + breath, 20, 14 - breath, 4); ctx.fill();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; ctx.beginPath(); ctx.roundRect(this.x + 12, this.y + 10 + breath, 10, 14 - breath, {tr: 4, br: 4, tl: 0, bl: 0}); ctx.fill();
            ctx.fillStyle = this.color; ctx.beginPath(); ctx.roundRect(this.x, this.y + breath - 2, 24, 18, 8); ctx.fill();
            ctx.fillStyle = '#ffdfc4'; ctx.beginPath(); ctx.roundRect(this.x + 4, this.y + breath + 2, 16, 12, 4); ctx.fill();
            ctx.fillStyle = '#2c3e50'; ctx.fillRect(this.x + 7 + this.facing.x * 2.5, this.y + breath + 5 + this.facing.y * 2.5, 3, 5); ctx.fillRect(this.x + 14 + this.facing.x * 2.5, this.y + breath + 5 + this.facing.y * 2.5, 3, 5);
            ctx.fillStyle = '#ffdfc4'; ctx.beginPath(); ctx.arc(this.x + 4, this.y + 16 + breath, 3.5, 0, Math.PI * 2); ctx.fill();
        }

        if (this.hasFairy) {
            ctx.save();
            let fx = this.fairyX !== undefined ? this.fairyX : this.x + this.width/2;
            let fy = this.fairyY !== undefined ? this.fairyY : this.y + this.height/2;
            const time = performance.now();
            const wingFlap = Math.sin(time * 0.02) * 4;
            const bobbing = Math.sin(time * 0.005) * 3;
            
            fy += bobbing; // Tinh linh nhấp nhô nhẹ
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            // Math.max để chống crash game khi bán kính cánh rơi xuống số âm
            ctx.beginPath(); ctx.ellipse(fx - 4, fy - 2, 6, Math.max(0.1, 3 + wingFlap), Math.PI / 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(fx + 4, fy - 2, 6, Math.max(0.1, 3 + wingFlap), -Math.PI / 4, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 10; ctx.shadowColor = '#a29bfe';
            ctx.fillStyle = '#a29bfe';
            ctx.beginPath(); ctx.arc(fx, fy, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        if (this.hasMagneticField) {
            ctx.fillStyle = 'rgba(52, 152, 219, 0.05)'; ctx.strokeStyle = 'rgba(52, 152, 219, 0.2)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(this.x + this.width/2, this.y + this.height/2, this.magneticRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }

        if (!this.skin.isSpriteSheet && !(this.skin && this.skin.isAdvancedSprite)) {
            const recoilX = (this.skin.id === 'schoolgirl' && isShooting) ? -this.facing.x * 6 : 0;
            const recoilY = (this.skin.id === 'schoolgirl' && isShooting) ? -this.facing.y * 6 : 0;

            let endX = this.x + this.width / 2 + this.facing.x * 20 + recoilX; 
            let endY = this.y + this.height / 2 + breath + this.facing.y * 20 + recoilY;
            let handX = this.x + this.width / 2 - this.facing.x * 4 + recoilX; 
            let handY = this.y + this.height / 2 + breath - this.facing.y * 4 + recoilY;
            const effectType = this.currentWeapon.effectType || 'standard';

            if (this.skin.id === 'skeleton_mage') {
                const isSummoning = this.summonAnimTimer > 0;
                const walkCycle = time * 0.015;
                const swing1 = this.isMoving ? Math.sin(walkCycle) * 5 : 0;
                const swing2 = this.isMoving ? Math.sin(walkCycle + Math.PI) * 5 : 0;
                
                const isSide = Math.abs(this.facing.x) > Math.abs(this.facing.y);
                const isUp = !isSide && this.facing.y < 0;
                const flip = isSide && this.facing.x < 0 ? -1 : 1; 

                let relX = 0;
                let relY = 0;

                if (isSide) {
                    let fArmY = isSummoning ? 12 : (isShooting ? 22 : 25 + swing2);
                    let localX = isShooting ? 32 : (isSummoning ? 25 : 25);
                    let localY = isSummoning ? fArmY - 8 : fArmY + 5;
                    relX = (localX - 25) * flip;
                    relY = localY - 25;
                } else if (isUp) {
                    let rArmY = isSummoning ? 15 : (isShooting ? 22 : 25 + swing1);
                    relX = 37 - 25; 
                    relY = rArmY + 11 - 25;
                } else {
                    let lArmY = isSummoning ? 15 : (isShooting ? 22 : 25 + swing2);
                    relX = 12 - 25; 
                    relY = lArmY + 11 - 25;
                }
                
                handX = this.x + this.width / 2 + relX;
                handY = this.y + this.height / 2 + breath + relY;
                endX = handX + this.facing.x * 20;
                endY = handY + this.facing.y * 20;
            }

            ctx.fillStyle = this.skin.id === 'skeleton_mage' ? '#e3d1b5' : '#ffdfc4'; 
            ctx.beginPath(); ctx.arc(handX, handY, 3.5, 0, Math.PI * 2); ctx.fill();
            
            if (this.currentWeapon.imgSrc) {
                if (!this.currentWeapon.imageObj) {
                    this.currentWeapon.imageObj = new Image();
                    this.currentWeapon.imageObj.src = this.currentWeapon.imgSrc;
                }
                if (this.currentWeapon.imageObj.complete && this.currentWeapon.imageObj.naturalWidth > 0) {
                    ctx.save();
                    ctx.translate(handX, handY);
                    if (this.facing.x < 0) {
                        ctx.scale(-1, 1);
                        let mirroredAngle = Math.atan2(this.facing.y, -this.facing.x);
                        ctx.rotate(mirroredAngle);
                        ctx.rotate(Math.PI / 4);
                    } else {
                        let angle = Math.atan2(this.facing.y, this.facing.x);
                        ctx.rotate(angle);
                        ctx.rotate(Math.PI / 4);
                    }
                    ctx.drawImage(this.currentWeapon.imageObj, -16, -16, 32, 32); 
                    ctx.restore();
                }
            } else {
                ctx.lineCap = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = '#4b4b4b'; ctx.beginPath(); ctx.moveTo(handX, handY); ctx.lineTo(endX, endY); ctx.stroke();
                ctx.lineWidth = 2.5; ctx.strokeStyle = this.currentWeapon.projectileColor; ctx.beginPath(); ctx.moveTo(handX, handY); ctx.lineTo(endX, endY); ctx.stroke();

                if (effectType === 'fire') {
                    ctx.save(); ctx.strokeStyle = '#59371f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(handX, handY); ctx.lineTo(endX, endY); ctx.stroke();
                    ctx.strokeStyle = '#c07c2e'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(handX, handY); ctx.lineTo(endX, endY); ctx.stroke();
                    const fX = endX + this.facing.x * 8; const fY = endY + this.facing.y * 8;
                    ctx.fillStyle = 'rgba(255, 180, 40, 0.95)'; ctx.beginPath(); ctx.moveTo(fX, fY); ctx.bezierCurveTo(fX-6, fY-12, fX+10, fY-16, fX+2, fY-28); ctx.bezierCurveTo(fX+18, fY-20, fX+14, fY-8, fX+16, fY); ctx.bezierCurveTo(fX+6, fY-6, fX-2, fY+8, fX, fY); ctx.fill();
                    ctx.fillStyle = 'rgba(255, 90, 0, 0.85)'; ctx.beginPath(); ctx.moveTo(fX+4, fY-6); ctx.bezierCurveTo(fX-3, fY-18, fX+5, fY-22, fX+6, fY-28); ctx.bezierCurveTo(fX+9, fY-20, fX+8, fY-10, fX+4, fY-6); ctx.fill();
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; ctx.beginPath(); ctx.arc(fX+3, fY-10, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
                } else if (effectType === 'ice') {
                    ctx.save(); ctx.strokeStyle = '#a8f0ff'; ctx.lineWidth = 2;
                    for (let i = 0; i < 3; i++) { const px = endX + (Math.random() - 0.5) * 4; const py = endY + (Math.random() - 0.5) * 4; ctx.beginPath(); ctx.moveTo(px, py-4); ctx.lineTo(px-3, py+3); ctx.lineTo(px+3, py+3); ctx.closePath(); ctx.stroke(); } ctx.restore();
                } else if (effectType === 'poison') {
                    ctx.save(); ctx.fillStyle = 'rgba(110, 255, 100, 0.35)'; ctx.beginPath(); ctx.arc(endX + this.facing.x * 4, endY + this.facing.y * 4, 5, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(endX, endY); ctx.lineTo(endX + this.facing.x * 4, endY + this.facing.y * 4); ctx.stroke(); ctx.restore();
                } else if (effectType === 'lightning') {
                    ctx.save(); ctx.strokeStyle = '#c0d6ff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(endX - this.facing.x, endY - this.facing.y);
                    ctx.lineTo(endX + this.facing.x * 4 - this.facing.y * 2, endY + this.facing.y * 4 + this.facing.x * 2); ctx.lineTo(endX + this.facing.x * 8 + this.facing.y * 2, endY + this.facing.y * 8 - this.facing.x * 2); ctx.stroke(); ctx.restore();
                } else if (effectType === 'rapid') {
                    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.arc(endX - this.facing.x * i * 2, endY - this.facing.y * i * 2, 1.5, 0, Math.PI * 2); ctx.fill(); } ctx.restore();
                }
            }
        }
        ctx.restore();
        
        this._drawChatBubble(ctx);
    }
}
