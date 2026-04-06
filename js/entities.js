// js/entities.js
import { MAP_WIDTH, MAP_HEIGHT } from './constants.js';
import { Weapon, Projectile, RARITY } from './weapons.js';
import { SpriteRenderer } from './sprite.js';
import { AudioManager } from './audio.js';

export class Entity {
    constructor(x, y, width, height, maxHp, speed) {
        this.x = x; this.y = y; this.width = width; this.height = height;
        this.maxHp = maxHp; this.hp = maxHp; this.speed = speed;
        this.shield = 0; this.maxShield = 0; this.shieldRegenTimer = 0;
        this.facing = { x: 0, y: 1 }; this.invulnerableTimer = 0; this.isDead = false;
    }

    takeDamage(amount) {
        if (this.invulnerableTimer > 0 || this.isDead) return;
        
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
        this.equipment = { helmet: null, armor: null, gloves: null, boots: null };
        this.currentWeapon = new Weapon({ name: 'Cung Gỗ Tập Sự', baseName: 'Cung Gỗ', type: 'ranged', rarity: RARITY.COMMON, baseDmg: 10, baseSpeed: 350, fireRate: 400, range: 300, color: '#f1c40f', imgSrc: 'img/weapon/wodden-bow.png' });
        this.activeChat = null;
        this.chatExpiry = 0;
        this.animFrame = 0; // Khung hình hiện tại
        this.animTimer = 0; // Bộ đếm thời gian lật frame
        this.animState = 'idle';
        this.isAttackingAnim = false;
    }

    recalculateStats() {
        const isHoang = this.skin && this.skin.id === 'hoang';
        let baseMaxHp = isHoang ? 200 + (this.level - 1) * 40 : 100 + (this.level - 1) * 20;
        let baseMaxShield = isHoang ? 100 + (this.level - 1) * 10 : 0;
        let baseSpeed = 200 + (this.level * 5); 

        let bonusHp = 0, bonusShield = 0, bonusSpeed = 0;
        for (let key in this.equipment) {
            const item = this.equipment[key];
            if (item) {
                if (item.hpBonus) bonusHp += item.hpBonus * item.rarity.statMultiplier;
                if (item.shieldBonus) bonusShield += item.shieldBonus * item.rarity.statMultiplier;
                if (item.speedBonus) bonusSpeed += item.speedBonus * item.rarity.statMultiplier;
            }
        }
        this.maxHp = Math.floor(baseMaxHp + bonusHp); this.maxShield = Math.floor(baseMaxShield + bonusShield); this.speed = Math.floor(baseSpeed + bonusSpeed);
        if (this.hp > this.maxHp) this.hp = this.maxHp; if (this.shield > this.maxShield) this.shield = this.maxShield;
    }

    equipItem(item) {
        if (!this.inventory.includes(item)) return;
        this.inventory.splice(this.inventory.indexOf(item), 1);
        let oldItem = null;
        if (item.type === 'ranged' || item.type === 'magic') { oldItem = this.currentWeapon; this.currentWeapon = item; } 
        else if (item.type === 'armor') { oldItem = this.equipment[item.armorType]; this.equipment[item.armorType] = item; }
        if (oldItem) this.inventory.push(oldItem);
        this.recalculateStats();
    }
    unequipItem(slot) { if (slot === 'weapon') return; let item = this.equipment[slot]; if (item) { this.equipment[slot] = null; this.inventory.push(item); this.recalculateStats(); } }

    getSpriteTopY() {
        let drawHeight = 48;
        if (this.skin && this.skin.scale) {
            drawHeight = 48 * this.skin.scale;
        } else if (this.skin && this.skin.id === 'schoolgirl') {
            drawHeight = 55;
        }
        return (this.y + this.height / 2) - (drawHeight / 2);
    }

    gainExp(amount) { this.exp += amount; if (this.exp >= this.expToNextLevel) this.levelUp(); }

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

    update(deltaTime, inputManager, map, camera, gameProjectiles) {
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

        const moveVec = inputManager.getMovementVector();
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
        if (!this.currentWeapon) return;
        if ((currentTime - (this.currentWeapon.lastFiredTime || 0)) >= this.currentWeapon.fireRate) {
            const count = this.currentWeapon.projectilesPerShot || 1;
            const spread = this.currentWeapon.spreadAngle || 0;
            const baseAngle = Math.atan2(this.facing.y, this.facing.x);
            const isHoang = this.skin && this.skin.id === 'hoang';

            for (let i = 0; i < count; i++) {
                let angleOffset = count > 1 ? -spread / 2 + (spread / (count - 1)) * i : 0;
                if (count > 1 && this.currentWeapon.effectType === 'fire') angleOffset = (Math.random() - 0.5) * spread;
                const finalAngle = baseAngle + angleOffset;
                const proj = new Projectile(this.x + this.width / 2, this.y + this.height / 2, Math.cos(finalAngle), Math.sin(finalAngle), this.currentWeapon, isEnemy);
                
                // Hoàng đánh cận chiến: Đạn vô hình, tầm cực ngắn, hitbox cực to
                if (isHoang) {
                    proj.isMelee = true;
                    proj.radius = 40; 
                    proj.maxRange = 50; 
                    proj.pierceCount = 999;
                    proj.speed = 800; 
                    proj.damage *= 2; // Gấp đôi sát thương cho Hoàng
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
        } else {
            ctx.fillStyle = this.color; ctx.beginPath(); ctx.roundRect(this.x + 2, this.y + 10 + breath, 20, 14 - breath, 4); ctx.fill();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; ctx.beginPath(); ctx.roundRect(this.x + 12, this.y + 10 + breath, 10, 14 - breath, {tr: 4, br: 4, tl: 0, bl: 0}); ctx.fill();
            ctx.fillStyle = this.color; ctx.beginPath(); ctx.roundRect(this.x, this.y + breath - 2, 24, 18, 8); ctx.fill();
            ctx.fillStyle = '#ffdfc4'; ctx.beginPath(); ctx.roundRect(this.x + 4, this.y + breath + 2, 16, 12, 4); ctx.fill();
            ctx.fillStyle = '#2c3e50'; ctx.fillRect(this.x + 7 + this.facing.x * 2.5, this.y + breath + 5 + this.facing.y * 2.5, 3, 5); ctx.fillRect(this.x + 14 + this.facing.x * 2.5, this.y + breath + 5 + this.facing.y * 2.5, 3, 5);
            ctx.fillStyle = '#ffdfc4'; ctx.beginPath(); ctx.arc(this.x + 4, this.y + 16 + breath, 3.5, 0, Math.PI * 2); ctx.fill();
        }

        if (!this.skin.isSpriteSheet && !(this.skin && this.skin.isAdvancedSprite)) {
            const recoilX = (this.skin.id === 'schoolgirl' && isShooting) ? -this.facing.x * 6 : 0;
            const recoilY = (this.skin.id === 'schoolgirl' && isShooting) ? -this.facing.y * 6 : 0;

            const endX = this.x + this.width / 2 + this.facing.x * 20 + recoilX; 
            const endY = this.y + this.height / 2 + breath + this.facing.y * 20 + recoilY;
            const handX = this.x + this.width / 2 - this.facing.x * 4 + recoilX; 
            const handY = this.y + this.height / 2 + breath - this.facing.y * 4 + recoilY;
            const effectType = this.currentWeapon.effectType || 'standard';

            ctx.fillStyle = '#ffdfc4'; ctx.beginPath(); ctx.arc(handX, handY, 3.5, 0, Math.PI * 2); ctx.fill();
            
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
