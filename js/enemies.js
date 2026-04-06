// js/enemies.js
import { Entity } from './entities.js';
import * as VFX from './vfx.js';
import { AudioManager } from './audio.js';

const ENEMY_TYPES = [
    { name: 'Slime', color: '#2ecc71', hpMult: 0.8, speedMult: 0.8, dmgMult: 0.8, width: 22, height: 22 }, 
    { name: 'Demon', color: '#e74c3c', hpMult: 1.2, speedMult: 0.8, dmgMult: 1.2, width: 24, height: 24 }, 
    { name: 'Bat', color: '#8e44ad', hpMult: 0.5, speedMult: 1.6, dmgMult: 0.6, width: 18, height: 18 }, 
    { name: 'Skeleton', color: '#ecf0f1', hpMult: 1.0, speedMult: 1.1, dmgMult: 1.0, width: 22, height: 22 }, 
    { name: 'Orc', color: '#d35400', hpMult: 1.5, speedMult: 0.9, dmgMult: 1.5, width: 28, height: 28 }, 
    { name: 'Ghost', color: '#95a5a6', hpMult: 0.6, speedMult: 1.2, dmgMult: 0.8, width: 20, height: 20, noClip: true },
    { name: 'Spider', color: '#27ae60', hpMult: 0.7, speedMult: 1.4, dmgMult: 1.1, width: 20, height: 20 },
    { name: 'Golem', color: '#7f8c8d', hpMult: 2.5, speedMult: 0.5, dmgMult: 2.0, width: 32, height: 32 },
    { name: 'Vampire', color: '#8b0000', hpMult: 1.3, speedMult: 1.3, dmgMult: 1.3, width: 24, height: 24 }
];

export class Merchant extends Entity {
    constructor(x, y) { super(x, y, 32, 32, 9999, 0); this.color = '#8e44ad'; }
    takeDamage() { return; }
    draw(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(this.x + this.width/2, this.y + this.height, this.width/1.5, this.height/4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2c3e50'; ctx.fillRect(this.x, this.y + 8, this.width, this.height - 8);
        ctx.fillStyle = '#1a252f'; ctx.beginPath(); ctx.arc(this.x + this.width/2, this.y + 12, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f1c40f'; ctx.fillRect(this.x + 8, this.y + 10, 4, 4); ctx.fillRect(this.x + 20, this.y + 10, 4, 4);
        ctx.fillStyle = '#8e44ad'; ctx.fillRect(this.x - 6, this.y + 10, 10, 20);
        ctx.restore();
    }
}

export class Enemy extends Entity {
    constructor(x, y, level, id = null) {
        const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
        const hp = (50 + (level * 20)) * type.hpMult; 
        const speed = (80 + (Math.random() * 40) + (level * 1.5)) * type.speedMult;
        super(x, y, type.width, type.height, hp, speed);
        this.level = level;
        this.id = id || `enemy_${Math.random()}`;
        this.typeInfo = type; this.baseSpeed = speed; this.statusEffects = []; this.expGranted = false;
        this.color = type.color; this.damage = Math.floor((15 + (level * 4)) * type.dmgMult); 
        this.expValue = Math.floor((25 + (level * 6)) * ((type.hpMult + type.speedMult)/2));
    }

    takeDamage(amount) {
        if (this.isDead) return; this.hp -= amount;
        if (this.hp <= 0) { this.hp = 0; this.die(); } else this.invulnerableTimer = 100;
        AudioManager.play('hit');
    }

    applyStatusEffect(type, duration, power) {
        const existing = this.statusEffects.find(e => e.type === type);
        if (existing) { existing.timer = Math.max(existing.timer, duration); existing.power = Math.max(existing.power, power); } 
        else this.statusEffects.push({ type, timer: duration, power, tickTimer: 0 });
    }

    update(deltaTime, players, map, enemiesArray) {
        if (this.isDead) return;
        if (this.invulnerableTimer > 0) this.invulnerableTimer -= deltaTime;

        let currentSpeedModifier = 1;
        for (let i = this.statusEffects.length - 1; i >= 0; i--) {
            const effect = this.statusEffects[i]; effect.timer -= deltaTime;
            if (effect.type === 'ice') currentSpeedModifier *= (1 - effect.power);
            else if (effect.type === 'fire') { effect.tickTimer += deltaTime; if (effect.tickTimer >= 500) { this.takeDamage(effect.power); effect.tickTimer -= 500; } }
            if (effect.timer <= 0) this.statusEffects.splice(i, 1);
        }
        this.speed = this.baseSpeed * currentSpeedModifier;
        if (this.isDead) return;

        // Tìm người chơi gần nhất (Local hoặc Multiplayer)
        let closestDist = Infinity;
        let targetPlayer = null;
        for (const p of players) {
            if (p.isDead) continue;
            const dX = (p.x + p.width/2) - (this.x + this.width/2);
            const dY = (p.y + p.height/2) - (this.y + this.height/2);
            const distance = Math.hypot(dX, dY);
            if (distance < closestDist) { closestDist = distance; targetPlayer = p; }
        }

        if (!targetPlayer) return; // Nếu tất cả đều chết thì đứng im

        const dx = (targetPlayer.x + targetPlayer.width/2) - (this.x + this.width/2);
        const dy = (targetPlayer.y + targetPlayer.height/2) - (this.y + this.height/2);

        if (closestDist > 0 && closestDist < 400) {
            const moveX = (dx / closestDist) * this.speed * (deltaTime / 1000), moveY = (dy / closestDist) * this.speed * (deltaTime / 1000);
            if (this.typeInfo && this.typeInfo.noClip) { this.x += moveX; this.y += moveY; } 
            else { if (!this._checkMapCollision(this.x + moveX, this.y, map)) this.x += moveX; if (!this._checkMapCollision(this.x, this.y + moveY, map)) this.y += moveY; }
        }

        if (this.isCollidingWith(targetPlayer) && !window.isGodMode) { targetPlayer.takeDamage(this.damage); if (closestDist > 0) { this.x -= (dx / closestDist) * 10; this.y -= (dy / closestDist) * 10; } }
    }

    _checkMapCollision(newX, newY, map) { return map.isSolidPixel(newX, newY) || map.isSolidPixel(newX + this.width, newY) || map.isSolidPixel(newX, newY + this.height) || map.isSolidPixel(newX + this.width, newY + this.height); }

    draw(ctx) {
        if (this.isDead) return;
        ctx.save();
        const isGhost = this.typeInfo && this.typeInfo.name === 'Ghost'; if (isGhost) ctx.globalAlpha = 0.6;
        if (!isGhost) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.x + this.width/2, this.y + this.height, this.width/1.5, this.height/4, 0, 0, Math.PI * 2); ctx.fill(); }

        const hasIce = this.statusEffects.some(e => e.type === 'ice'), hasFire = this.statusEffects.some(e => e.type === 'fire');
        if (hasIce) { ctx.fillStyle = 'rgba(100, 200, 255, 0.4)'; ctx.fillRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4); ctx.strokeStyle = 'rgba(180, 230, 255, 0.8)'; ctx.lineWidth = 1.5; ctx.strokeRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4); }
        ctx.fillStyle = hasIce ? '#9b59b6' : this.color; ctx.fillRect(this.x, this.y, this.width, this.height);

        if (this.typeInfo) {
            if (this.typeInfo.name === 'Bat') { ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.arc(this.x, this.y + 6, 6, Math.PI/2, Math.PI*1.5); ctx.fill(); ctx.beginPath(); ctx.arc(this.x + this.width, this.y + 6, 6, -Math.PI/2, Math.PI/2); ctx.fill(); }
            const eyeSize = this.width / 6; ctx.fillStyle = (this.typeInfo.name === 'Skeleton' || this.typeInfo.name === 'Ghost') ? '#000' : '#fff';
            ctx.fillRect(this.x + eyeSize, this.y + eyeSize, eyeSize, eyeSize); ctx.fillRect(this.x + this.width - eyeSize * 2, this.y + eyeSize, eyeSize, eyeSize);
            if (this.typeInfo.name !== 'Skeleton' && this.typeInfo.name !== 'Ghost') { ctx.fillStyle = '#000'; ctx.fillRect(this.x + eyeSize + 1, this.y + eyeSize + 1, eyeSize/2, eyeSize/2); ctx.fillRect(this.x + this.width - eyeSize * 2 + 1, this.y + eyeSize + 1, eyeSize/2, eyeSize/2); }
        }

        if (hasFire) {
            const time = performance.now(); ctx.save(); ctx.fillStyle = 'rgba(255, 80, 0, 0.85)'; ctx.beginPath();
            for (let i = 0; i < 3; i++) { const fx = this.x + 3 + (i * 8); const fy = this.y + this.height + 2; const wave = Math.sin(time * 0.01 + i) * 4; ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + wave, fy - 12, fx + 4, fy - 18 + wave); ctx.quadraticCurveTo(fx + 8 - wave, fy - 8, fx + 8, fy); } ctx.fill();
            ctx.fillStyle = 'rgba(255, 200, 0, 0.9)'; ctx.beginPath();
            for (let i = 0; i < 3; i++) { const fx = this.x + 5 + (i * 8); const fy = this.y + this.height + 2; const wave = Math.sin(time * 0.015 + i) * 3; ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + wave, fy - 8, fx + 2, fy - 12 + wave); ctx.quadraticCurveTo(fx + 4 - wave, fy - 5, fx + 4, fy); } ctx.fill(); ctx.restore();
        }

        if (this.hp < this.maxHp) {
            const hpBarWidth = 30; const hpBarHeight = 4; const hpRatio = this.hp / this.maxHp;
            ctx.fillStyle = '#c0392b'; ctx.fillRect(this.x + this.width/2 - hpBarWidth/2, this.y - 10, hpBarWidth, hpBarHeight);
            ctx.fillStyle = '#2ecc71'; ctx.fillRect(this.x + this.width/2 - hpBarWidth/2, this.y - 10, hpBarWidth * hpRatio, hpBarHeight);
        }
        ctx.restore();
    }
}

export class EliteBoss extends Enemy {
    constructor(x, y, level, id = null) {
        super(x, y, level, id);
        this.isBoss = true; this.width = 64; this.height = 64;
        this.maxHp = (150 + (level * 50)) * 12; this.hp = this.maxHp;
        this.baseSpeed = 60 + (Math.random() * 20) + level * 2; this.speed = this.baseSpeed;
        this.color = '#8b0000'; this.damage = 40 + (level * 8); this.expValue = (50 + (level * 10)) * 15;
        this.skillTimer = 0;
        this.dashTimer = 0;
    }

    update(deltaTime, players, map, enemiesArray) {
        if (this.dashTimer > 0) {
            this.dashTimer -= deltaTime;
            this.speed = this.baseSpeed * 3.5; // Boss Lướt
        } else {
            this.speed = this.baseSpeed;
        }

        super.update(deltaTime, players, map, enemiesArray);
        if (this.isDead) return;

        this.skillTimer += deltaTime;
        if (this.skillTimer >= 4000) { // Mỗi 4 giây tung 1 chiêu
            this.skillTimer = 0;
            const rand = Math.random();
            if (rand < 0.35) {
                this.dashTimer = 1000;
                VFX.spawnFloatingText(this.x + this.width/2, this.y - 20, 'CUỒNG NỘ!', '#e74c3c');
            } else if (rand < 0.7) {
                VFX.spawnFloatingText(this.x + this.width/2, this.y - 20, 'HÚT MÁU!', '#9b59b6');
                players.forEach(p => {
                    if (p.isDead) return;
                    const dist = Math.hypot((p.x + p.width/2) - (this.x + this.width/2), (p.y + p.height/2) - (this.y + this.height/2));
                    if (dist < 250 && !window.isGodMode) {
                        p.takeDamage(this.damage * 0.6);
                        this.hp = Math.min(this.maxHp, this.hp + this.damage * 2);
                        VFX.spawnFloatingText(p.x + p.width/2, p.y, '- Máu', '#9b59b6');
                        VFX.spawnImpactEffect(p.x + p.width/2, p.y + p.height/2, 'death', 0);
                    }
                });
                VFX.spawnImpactEffect(this.x + this.width/2, this.y + this.height/2, 'lightning', 0); 
            } else {
                VFX.spawnFloatingText(this.x + this.width/2, this.y - 20, 'TRIỆU HỒI!', '#3498db');
                if (enemiesArray) {
                    for(let i = 0; i < 3; i++) {
                        const ex = this.x + (Math.random() - 0.5) * 200; const ey = this.y + (Math.random() - 0.5) * 200;
                        if (!map.isSolidPixel(ex, ey)) {
                            const minion = new Enemy(ex, ey, this.level, `boss_minion_${Math.random()}`);
                            minion.baseSpeed *= 1.5; minion.color = '#2c3e50'; minion.width = 18; minion.height = 18;
                            enemiesArray.push(minion);
                            VFX.spawnImpactEffect(ex, ey, 'death', 0);
                        }
                    }
                }
            }
        }
    }

    draw(ctx) {
        super.draw(ctx);
        if (this.isDead) return;
        ctx.save();
        if (this.hp < this.maxHp) {
            const hpBarWidth = 60; const hpBarHeight = 8; const hpRatio = this.hp / this.maxHp;
            ctx.fillStyle = '#000'; ctx.fillRect(this.x + this.width/2 - hpBarWidth/2 - 2, this.y - 18, hpBarWidth + 4, hpBarHeight + 4);
            ctx.fillStyle = '#7f1d1d'; ctx.fillRect(this.x + this.width/2 - hpBarWidth/2, this.y - 16, hpBarWidth, hpBarHeight);
            ctx.fillStyle = '#ef4444'; ctx.fillRect(this.x + this.width/2 - hpBarWidth/2, this.y - 16, hpBarWidth * hpRatio, hpBarHeight);
            ctx.fillStyle = '#ffeb3b'; ctx.font = 'bold 12px "Segoe UI"'; ctx.textAlign = 'center'; ctx.fillText('TINH ANH', this.x + this.width/2, this.y - 22);
        }
        ctx.restore();
    }
}

export class AlchemyTable extends Entity {
    constructor(x, y) { super(x, y, 40, 100, 9999, 0); this.color = '#e67e22'; }
    takeDamage() { return; }
    draw(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        const gifW = 64; const gifH = 64;
        const dx = this.x + this.width / 2 - gifW / 2;
        const dy = this.y + this.height / 2 - 15 - gifH / 2;
        ctx.fillRect(dx + 2, dy + 2, gifW - 4, gifH - 4);
        ctx.restore();
    }
}
