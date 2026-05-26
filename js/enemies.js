// js/enemies.js
import { Entity } from './entities.js';
import * as VFX from './vfx.js';
import { AudioManager } from './audio.js';
import { drawIgris } from '../img/shadow_enemy/igris.js';
import { drawBellion } from '../img/shadow_enemy/bellion.js';

const beruImg = new Image();
beruImg.src = 'img/shadow_enemy/beru.png';

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
        this.isAlly = false;
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

        // Tìm mục tiêu gần nhất (Người chơi hoặc Quái địch)
        let closestDist = Infinity;
        let targetPlayer = null;
        let isFollowingPlayer = false;
        
        if (this.isAlly) {
            // Tìm mục tiêu là kẻ địch hoặc người chơi khác phe
            for (const e of enemiesArray) {
                if (e.isDead || e.isAlly || e === this) continue;
                const dX = (e.x + e.width/2) - (this.x + this.width/2);
                const dY = (e.y + e.height/2) - (this.y + this.height/2);
                const distance = Math.hypot(dX, dY);
                if (distance < closestDist && distance < 600) { closestDist = distance; targetPlayer = e; }
            }
            if (!targetPlayer) {
                for (const p of players) {
                    if (p.isDead) continue;
                    const dX = (p.x + p.width/2) - (this.x + this.width/2);
                    const dY = (p.y + p.height/2) - (this.y + this.height/2);
                    const distance = Math.hypot(dX, dY);
                    if (distance < closestDist) { closestDist = distance; targetPlayer = p; isFollowingPlayer = true; }
                }
                if (isFollowingPlayer && closestDist < 80 && this.shadowType !== 'beru' && !this.isTaunting) targetPlayer = null;
            }
        } else {
            // Tìm quái có Taunt trước
            const tauntingAllies = enemiesArray.filter(en => en.isAlly && en.isTaunting && !en.isDead);
            if (tauntingAllies.length > 0) {
                for (const a of tauntingAllies) {
                    const dX = (a.x + a.width/2) - (this.x + this.width/2);
                    const dY = (a.y + a.height/2) - (this.y + this.height/2);
                    const distance = Math.hypot(dX, dY);
                    if (distance < closestDist) { closestDist = distance; targetPlayer = a; }
                }
            } else {
                for (const p of players) {
                    if (p.isDead) continue;
                    const dX = (p.x + p.width/2) - (this.x + this.width/2);
                    const dY = (p.y + p.height/2) - (this.y + this.height/2);
                    const distance = Math.hypot(dX, dY);
                    if (distance < closestDist) { closestDist = distance; targetPlayer = p; }
                }
            }
        }
        
        // Vòng từ trường làm chậm
        if (!this.isAlly && targetPlayer && targetPlayer.hasMagneticField && closestDist < targetPlayer.magneticRadius) {
            currentSpeedModifier *= targetPlayer.magneticSlowMult;
        }
        
        // ----- KỸ NĂNG CỦA QUÂN ĐOÀN BÓNG TỐI -----
        if (this.isAlly) {
            if (this.skillTimer === undefined) this.skillTimer = this.skillCooldown || 5000;
            if (this.skillTimer > 0) this.skillTimer -= deltaTime;

            if (this.skillTimer <= 0 && targetPlayer && !isFollowingPlayer) {
                this.skillTimer = this.skillCooldown || 5000;
                if (this.shadowType === 'beru') { this.isDashing = true; this.dashTime = 800; } 
                else if (this.shadowType === 'igris') { this.isSpinning = true; this.spinTime = 1200; this.spinDamageDealtFrame = 0; } 
                else if (this.shadowType === 'bellion') { this.isSmashing = true; this.smashTime = 1500; }
            }

            if (this.isDashing) {
                this.dashTime -= deltaTime; currentSpeedModifier *= 5; // Lướt cực nhanh
                for (const e of enemiesArray) {
                    if (e.isDead || e.isAlly) continue;
                    if (this.isCollidingWith(e) && (!e.lastHitByDash || performance.now() - e.lastHitByDash > 150)) {
                        e.takeDamage(Math.floor(this.damage * 0.8)); // Gây sát thương nhiều lần khi lướt qua
                        VFX.spawnFloatingText(e.x + e.width/2, e.y, Math.floor(this.damage * 0.8), '#3498db');
                        e.lastHitByDash = performance.now();
                        VFX.spawnImpactEffect(e.x + e.width/2, e.y + e.height/2, 'blink');
                    }
                }
                if (this.dashTime <= 0) this.isDashing = false;
            }

            if (this.isSpinning) {
                this.spinTime -= deltaTime; currentSpeedModifier *= 0.3; // Chậm lại để múa kiếm
                this.spinDamageDealtFrame -= deltaTime;
                if (this.spinDamageDealtFrame <= 0) {
                    this.spinDamageDealtFrame = 200; // Cắt mỗi 0.2s
                    for (const e of enemiesArray) {
                        if (e.isDead || e.isAlly) continue;
                        if (Math.hypot(e.x + e.width/2 - (this.x + this.width/2), e.y + e.height/2 - (this.y + this.height/2)) < 120) {
                            e.takeDamage(Math.floor(this.damage * 0.6));
                            VFX.spawnFloatingText(e.x + e.width/2, e.y, Math.floor(this.damage * 0.6), '#e74c3c');
                        }
                    }
                }
                if (this.spinTime <= 0) this.isSpinning = false;
            }

            if (this.isSmashing) {
                this.smashTime -= deltaTime; currentSpeedModifier = 0; // Đứng gồng
                if (this.smashTime <= 0) {
                    this.isSmashing = false;
                    VFX.spawnImpactEffect(this.x + this.width/2, this.y + this.height/2, 'meteor'); // Hiệu ứng nện đất
                    for (const e of enemiesArray) {
                        if (e.isDead || e.isAlly) continue;
                        if (Math.hypot(e.x + e.width/2 - (this.x + this.width/2), e.y + e.height/2 - (this.y + this.height/2)) < 250) {
                            e.takeDamage(this.damage * 5); // Nổ phát chí mạng
                            VFX.spawnFloatingText(e.x + e.width/2, e.y, this.damage * 5, '#9b59b6');
                        }
                    }
                }
            }
        }
        
        // Trail cho Aura của Quân Đoàn Bóng Tối
        if (this.isAlly) {
            if (!this.trail) this.trail = [];
            this.trail.unshift({x: this.x, y: this.y, facingDir: this.facingDir || 1});
            if (this.trail.length > 15) this.trail.pop();
        }

        this.speed = this.baseSpeed * currentSpeedModifier;
        if (this.isDead) return;

        if (!targetPlayer) return; // Nếu tất cả đều chết thì đứng im

        let dx = (targetPlayer.x + targetPlayer.width/2) - (this.x + this.width/2);
        let dy = (targetPlayer.y + targetPlayer.height/2) - (this.y + this.height/2);

        if (this.isAlly && this.shadowType === 'beru' && isFollowingPlayer) {
             if (this.wanderTimer === undefined || this.wanderTimer <= 0) {
                 this.wanderTimer = 100 + Math.random() * 400; // Thay đổi hướng liên tục
                 const angle = Math.random() * Math.PI * 2;
                 const distance = 40 + Math.random() * 120; // Bay xung quanh chủ
                 this.wanderOffsetX = Math.cos(angle) * distance;
                 this.wanderOffsetY = Math.sin(angle) * distance;
             }
             this.wanderTimer -= deltaTime;
             dx = (targetPlayer.x + targetPlayer.width/2 + this.wanderOffsetX) - (this.x + this.width/2);
             dy = (targetPlayer.y + targetPlayer.height/2 + this.wanderOffsetY) - (this.y + this.height/2);
        }

        if (this.pathTimer === undefined) this.pathTimer = 0;
        this.pathTimer -= deltaTime;

        if (this.isAlly && this.isGoliath && window.playerRef && window.playerRef.mergedTarget === this) {
            // Được người chơi điều khiển
            const moveVec = window.playerRef.lastMoveVec || {x:0, y:0};
            if (moveVec.x !== 0 || moveVec.y !== 0) {
                const distActual = Math.hypot(moveVec.x, moveVec.y) || 1;
                const moveX = (moveVec.x / distActual) * this.speed * (deltaTime / 1000);
                const moveY = (moveVec.y / distActual) * this.speed * (deltaTime / 1000);
                if (!this._checkMapCollision(this.x + moveX, this.y, map)) this.x += moveX;
                if (!this._checkMapCollision(this.x, this.y + moveY, map)) this.y += moveY;
            }
        } else if (closestDist > 0 && closestDist < 1000) {
            const distActual = Math.hypot(dx, dy) || 1;
            const moveX = (dx / distActual) * this.speed * (deltaTime / 1000), moveY = (dy / distActual) * this.speed * (deltaTime / 1000);
            
            const targetX = (this.x + this.width/2) + dx;
            const targetY = (this.y + this.height/2) + dy;

            if (this.typeInfo && this.typeInfo.noClip) { this.x += moveX; this.y += moveY; } 
            else {
                // Kiểm tra Tầm nhìn (Line of Sight)
                let hasLOS = true;
                let steps = Math.max(1, Math.floor(distActual / 20));
                for (let i = 1; i <= steps; i++) {
                    let cx = (this.x + this.width/2) + (dx * i / steps);
                    let cy = (this.y + this.height/2) + (dy * i / steps);
                    if (this._checkMapCollision(cx - this.width/2, cy - this.height/2, map)) { hasLOS = false; break; }
                }

                if (hasLOS) {
                    this.path = [];
                    let canX = !this._checkMapCollision(this.x + moveX, this.y, map);
                    let canY = !this._checkMapCollision(this.x, this.y + moveY, map);
                    if (canX && canY) { this.x += moveX; this.y += moveY; } else if (canX) { this.x += moveX; } else if (canY) { this.y += moveY; }
                    else {
                        let angle = Math.atan2(dy, dx);
                        for (let a of [Math.PI/4, -Math.PI/4, Math.PI/2, -Math.PI/2]) {
                            let nx = Math.cos(angle + a) * this.speed * (deltaTime / 1000);
                            let ny = Math.sin(angle + a) * this.speed * (deltaTime / 1000);
                            if (!this._checkMapCollision(this.x + nx, this.y + ny, map)) { this.x += nx; this.y += ny; break; }
                        }
                    }
                } else {
                    // Sử dụng Lộ trình A* (A-Star Pathfinding)
                    if (this.pathTimer <= 0 || !this.path || this.path.length === 0) {
                        this.pathTimer = 600 + Math.random() * 200; // Tần suất tính toán ~0.7s để chống lag
                        this.path = this._findPath(targetX, targetY, map);
                    }
                    if (this.path && this.path.length > 0) {
                        let targetNode = this.path[0];
                        let pdx = targetNode.x - (this.x + this.width/2), pdy = targetNode.y - (this.y + this.height/2);
                        let pDist = Math.hypot(pdx, pdy);
                        if (pDist < 15) { this.path.shift(); if (this.path.length > 0) { targetNode = this.path[0]; pdx = targetNode.x - (this.x + this.width/2); pdy = targetNode.y - (this.y + this.height/2); pDist = Math.hypot(pdx, pdy); } }
                        if (pDist > 0) {
                            let px = (pdx / pDist) * this.speed * (deltaTime / 1000), py = (pdy / pDist) * this.speed * (deltaTime / 1000);
                            let canX = !this._checkMapCollision(this.x + px, this.y, map), canY = !this._checkMapCollision(this.x, this.y + py, map);
                            if (canX && canY) { this.x += px; this.y += py; } else if (canX) { this.x += px; } else if (canY) { this.y += py; }
                            else {
                                let angle = Math.atan2(pdy, pdx);
                                for (let a of [Math.PI/4, -Math.PI/4, Math.PI/2, -Math.PI/2]) {
                                    let nx = Math.cos(angle + a) * this.speed * (deltaTime / 1000), ny = Math.sin(angle + a) * this.speed * (deltaTime / 1000);
                                    if (!this._checkMapCollision(this.x + nx, this.y + ny, map)) { this.x += nx; this.y += ny; break; }
                                }
                            }
                        }
                    } else {
                        // Kẹt nặng, dùng thuật toán lách tường thủ công
                        let canX = !this._checkMapCollision(this.x + moveX, this.y, map), canY = !this._checkMapCollision(this.x, this.y + moveY, map);
                        if (canX && canY) { this.x += moveX; this.y += moveY; } else if (canX) { this.x += moveX; } else if (canY) { this.y += moveY; }
                        else {
                            let angle = Math.atan2(dy, dx);
                            for (let a of [Math.PI/4, -Math.PI/4, Math.PI/2, -Math.PI/2]) {
                                let nx = Math.cos(angle + a) * this.speed * (deltaTime / 1000), ny = Math.sin(angle + a) * this.speed * (deltaTime / 1000);
                                if (!this._checkMapCollision(this.x + nx, this.y + ny, map)) { this.x += nx; this.y += ny; break; }
                            }
                        }
                    }
                }
            }
        }

        // Áp dụng sức hút của Hố Đen Mini (Singularity)
        for (const fx of VFX.impactEffects) {
            if (fx.type === 'singularity') {
                const distToBlackHole = Math.hypot(fx.x - (this.x + this.width/2), fx.y - (this.y + this.height/2));
                if (distToBlackHole > 0 && distToBlackHole < 200) {
                    const pullForce = 250;
                    const pullX = ((fx.x - (this.x + this.width/2)) / distToBlackHole) * pullForce * (deltaTime / 1000);
                    const pullY = ((fx.y - (this.y + this.height/2)) / distToBlackHole) * pullForce * (deltaTime / 1000);
                    if (this.typeInfo && this.typeInfo.noClip) { this.x += pullX; this.y += pullY; } 
                    else { if (!this._checkMapCollision(this.x + pullX, this.y, map)) this.x += pullX; if (!this._checkMapCollision(this.x, this.y + pullY, map)) this.y += pullY; }
                }
            }
        }

        if (this.isCollidingWith(targetPlayer) && !isFollowingPlayer) { 
            if (!this.isAlly && !window.isGodMode) {
                targetPlayer.takeDamage(this.damage); 
                if (targetPlayer.hasThorns) {
                    const reflectDmg = Math.max(1, Math.floor(this.damage * 0.5));
                    this.takeDamage(reflectDmg);
                    VFX.spawnFloatingText(this.x + this.width/2, this.y, reflectDmg, '#e67e22');
                }
            } else if (this.isAlly) {
                targetPlayer.takeDamage(this.damage);
                if (this.applyWithering) {
                    targetPlayer.applyStatusEffect('ice', 3000, 0.2); 
                }
                if (this.isParasite && this.damage > 0) {
                    // Bơm giáp ảo nhưng không được vượt qua mức Tối đa cho phép
                    window.playerRef.shield = Math.min(window.playerRef.maxShield, window.playerRef.shield + this.damage);
                }
                if (this.cleaveAttack) {
                    enemiesArray.forEach(en => {
                        if (!en.isDead && !en.isAlly && en !== targetPlayer && Math.hypot(en.x - targetPlayer.x, en.y - targetPlayer.y) < 100) {
                            en.takeDamage(this.damage);
                        }
                    });
                }
            }
            const distActual = Math.hypot(dx, dy) || 1;
            if (distActual > 0 && !this.isDashing && !this.isSmashing) { this.x -= (dx / distActual) * 10; this.y -= (dy / distActual) * 10; } 
        }
    }

    _checkMapCollision(newX, newY, map) { return map.isSolidPixel(newX, newY) || map.isSolidPixel(newX + this.width, newY) || map.isSolidPixel(newX, newY + this.height) || map.isSolidPixel(newX + this.width, newY + this.height); }

    // --- THUẬT TOÁN TÌM ĐƯỜNG A-STAR (A*) ---
    _findPath(targetX, targetY, map) {
        const TILE_SIZE = 40;
        const maxRows = map.grid.length;
        const maxCols = map.grid[0].length;
        
        let startX = Math.floor((this.x + this.width/2) / TILE_SIZE);
        let startY = Math.floor((this.y + this.height/2) / TILE_SIZE);
        let goalX = Math.floor(targetX / TILE_SIZE);
        let goalY = Math.floor(targetY / TILE_SIZE);

        if (startX === goalX && startY === goalY) return [];
        if (startX < 0 || startX >= maxCols || startY < 0 || startY >= maxRows) return [];

        let openSet = [{x: startX, y: startY, g: 0, h: 0, f: 0, parent: null}];
        let closedSet = new Set();
        let dirs = [[0,-1], [0,1], [-1,0], [1,0], [-1,-1], [1,-1], [-1,1], [1,1]];

        while(openSet.length > 0) {
            let lowestIdx = 0;
            for (let i = 1; i < openSet.length; i++) if (openSet[i].f < openSet[lowestIdx].f) lowestIdx = i;
            let current = openSet.splice(lowestIdx, 1)[0];
            closedSet.add(current.x + ',' + current.y);

            if (current.x === goalX && current.y === goalY) {
                let path = []; let curr = current;
                while(curr.parent) { path.unshift({x: curr.x * TILE_SIZE + TILE_SIZE/2, y: curr.y * TILE_SIZE + TILE_SIZE/2}); curr = curr.parent; }
                return path;
            }
            if (closedSet.size > 150) return []; // Giới hạn tìm tối đa 150 ô để không làm giật game

            for (let dir of dirs) {
                let nx = current.x + dir[0], ny = current.y + dir[1];
                if (nx < 0 || nx >= maxCols || ny < 0 || ny >= maxRows) continue;
                if (closedSet.has(nx + ',' + ny)) continue;
                
                const tile = map.grid[ny] ? map.grid[ny][nx] : 2;
                if (tile === 2 || tile === 3 || tile === 4) continue; // Nước, Cây, Đá là chướng ngại vật

                let g = current.g + (dir[0]!==0 && dir[1]!==0 ? 1.414 : 1), h = Math.hypot(goalX - nx, goalY - ny);
                let neighbor = openSet.find(n => n.x === nx && n.y === ny);
                if (!neighbor) { openSet.push({x: nx, y: ny, g: g, h: h, f: g + h, parent: current}); } 
                else if (g < neighbor.g) { neighbor.g = g; neighbor.f = g + h; neighbor.parent = current; }
            }
        }
        return [];
    }

    draw(ctx) {
        if (this.isDead) return;
        ctx.save();
        const isGhost = this.typeInfo && this.typeInfo.name === 'Ghost'; if (isGhost) ctx.globalAlpha = 0.6;
        if (!isGhost) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.x + this.width/2, this.y + this.height, this.width/1.5, this.height/4, 0, 0, Math.PI * 2); ctx.fill(); }

        const hasIce = this.statusEffects.some(e => e.type === 'ice'), hasFire = this.statusEffects.some(e => e.type === 'fire');
        if (hasIce) { ctx.fillStyle = 'rgba(100, 200, 255, 0.4)'; ctx.fillRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4); ctx.strokeStyle = 'rgba(180, 230, 255, 0.8)'; ctx.lineWidth = 1.5; ctx.strokeRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4); }
        if (this.shadowType) {
            const time = performance.now();
            const breath = Math.sin(time * 0.005) * 2;
            ctx.save();
            ctx.translate(this.x + this.width/2, this.y + this.height/2 + breath);
            
            // --- LẬT NGANG THEO HƯỚNG ---
            if (this.speed > 0) {
                if (this.lastX === undefined) this.lastX = this.x;
                const moveDx = this.x - this.lastX;
                if (moveDx < 0) this.facingDir = -1;
                else if (moveDx > 0) this.facingDir = 1;
                this.lastX = this.x;
            }
            // ---------------------------
            
            if (this.shadowType === 'beru') {
                if (beruImg.complete && beruImg.width > 0) {
                    const aspect = beruImg.width / beruImg.height;
                    const drawH = this.height * 2.5; 
                    const drawW = drawH * aspect;
                    
                    // Vẽ Aura/Dư ảnh
                    if (this.trail) {
                        this.trail.forEach((pos, idx) => {
                            if (idx % 2 !== 0) return;
                            ctx.save();
                            const alpha = (1 - idx / this.trail.length) * 0.4;
                            ctx.globalAlpha = alpha;
                            ctx.translate(pos.x - this.x, pos.y - this.y);
                            if (pos.facingDir === -1) ctx.scale(-1, 1);
                            ctx.shadowBlur = 20; ctx.shadowColor = '#00d8d6';
                            ctx.globalCompositeOperation = 'screen';
                            ctx.drawImage(beruImg, -drawW/2, -drawH/2, drawW, drawH);
                            ctx.restore();
                        });
                    }

                    ctx.save();
                    if (this.facingDir === -1) ctx.scale(-1, 1);
                    if (this.isDashing) ctx.globalAlpha = 0.5;
                    ctx.shadowBlur = 15; ctx.shadowColor = this.isTaunting ? '#f1c40f' : '#3498db';
                    ctx.drawImage(beruImg, -drawW/2, -drawH/2, drawW, drawH);
                    ctx.restore();
                }
            } else if (this.shadowType === 'igris') {
                ctx.save();
                if (this.facingDir === -1) ctx.scale(-1, 1);
                ctx.shadowBlur = 15; ctx.shadowColor = this.isTaunting ? '#f1c40f' : '#3498db';
                drawIgris(ctx, time, this);
                if (this.isSpinning) {
                    ctx.save();
                    ctx.rotate(time * 0.015);
                    ctx.beginPath(); ctx.arc(0, 0, 120, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(231, 76, 60, 0.4)'; ctx.lineWidth = 4; ctx.stroke();
                    ctx.fillStyle = 'rgba(231, 76, 60, 0.15)'; ctx.fill();
                    // Hiệu ứng vòng xoáy chém
                    for(let i=0; i<3; i++) {
                        ctx.beginPath(); ctx.arc(0, 0, 100, Math.PI*2/3 * i, Math.PI*2/3 * i + Math.PI/2);
                        ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 6; ctx.stroke();
                    }
                    ctx.restore();
                }
                ctx.restore();
            } else if (this.shadowType === 'bellion') {
                ctx.save();
                if (this.facingDir === -1) ctx.scale(-1, 1);
                ctx.shadowBlur = 15; ctx.shadowColor = this.isTaunting ? '#f1c40f' : '#3498db';
                drawBellion(ctx, time, this);
                if (this.isSmashing) {
                    const progress = 1 - (this.smashTime / 1500);
                    ctx.beginPath(); ctx.arc(0, 0, progress * 250, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(155, 89, 182, ${1 - progress})`; ctx.lineWidth = 12; ctx.stroke();
                    ctx.fillStyle = `rgba(155, 89, 182, ${(1 - progress) * 0.2})`; ctx.fill();
                }
                ctx.restore();
            }
            ctx.restore();
        } else {
            ctx.fillStyle = hasIce ? '#9b59b6' : this.color; ctx.fillRect(this.x, this.y, this.width, this.height);
            if (this.typeInfo) {
                if (this.typeInfo.name === 'Bat') { ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.arc(this.x, this.y + 6, 6, Math.PI/2, Math.PI*1.5); ctx.fill(); ctx.beginPath(); ctx.arc(this.x + this.width, this.y + 6, 6, -Math.PI/2, Math.PI/2); ctx.fill(); }
                const eyeSize = this.width / 6; ctx.fillStyle = (this.typeInfo.name === 'Skeleton' || this.typeInfo.name === 'Ghost') ? '#000' : '#fff';
                ctx.fillRect(this.x + eyeSize, this.y + eyeSize, eyeSize, eyeSize); ctx.fillRect(this.x + this.width - eyeSize * 2, this.y + eyeSize, eyeSize, eyeSize);
                if (this.typeInfo.name !== 'Skeleton' && this.typeInfo.name !== 'Ghost') { ctx.fillStyle = '#000'; ctx.fillRect(this.x + eyeSize + 1, this.y + eyeSize + 1, eyeSize/2, eyeSize/2); ctx.fillRect(this.x + this.width - eyeSize * 2 + 1, this.y + eyeSize + 1, eyeSize/2, eyeSize/2); }
            }
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
            this.speed = this.baseSpeed * 3.5; 
        } else {
            this.speed = this.baseSpeed;
        }

        super.update(deltaTime, players, map, enemiesArray);
        if (this.isDead) return;

        this.skillTimer += deltaTime;
        if (this.skillTimer >= 4000) { 
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
