import { MAP_WIDTH, MAP_HEIGHT } from './constants.js';
import { AudioManager } from './audio.js';

// Mảng chứa các thực thể đồ họa
export const goldCoins = [];
export const soulDrops = [];
export const expOrbs = [];
export const floatingTexts = [];
export const impactEffects = [];

export function clearAllVFX() {
    goldCoins.length = 0;
    soulDrops.length = 0;
    expOrbs.length = 0;
    floatingTexts.length = 0;
    impactEffects.length = 0;
}

// --- TIỀN VÀNG ---
export function spawnGoldCoins(x, y, amount) {
    const numCoins = Math.min(8, Math.max(1, Math.floor(amount / 2)));
    const goldPerCoin = Math.ceil(amount / numCoins);
    for (let i = 0; i < numCoins; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 100 + Math.random() * 150;
        goldCoins.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, value: goldPerCoin, radius: 4 });
    }
}
export function updateGoldCoins(deltaTime, player, saveGameData) {
    const pX = player.x + player.width / 2; const pY = player.y + player.height / 2;
    for (let i = goldCoins.length - 1; i >= 0; i--) {
        const coin = goldCoins[i];
        const friction = Math.exp(-4 * deltaTime / 1000);
        coin.vx *= friction; coin.vy *= friction;
        const dist = Math.hypot(pX - coin.x, pY - coin.y);
        const pullRadius = player.hasMagneticField ? Math.max(150, player.magneticRadius) : 150;
        if (dist < pullRadius) {
            const pullForce = 1500;
            coin.vx += ((pX - coin.x) / dist) * pullForce * (deltaTime / 1000);
            coin.vy += ((pY - coin.y) / dist) * pullForce * (deltaTime / 1000);
        }
        coin.x += coin.vx * (deltaTime / 1000); coin.y += coin.vy * (deltaTime / 1000);
        if (dist < player.width / 2 + coin.radius) {
            player.gold += coin.value;
            AudioManager.play('coin');
            saveGameData();
            goldCoins.splice(i, 1);
        }
    }
}
export function drawGoldCoins(ctx) {
    goldCoins.forEach(coin => {
        ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = '#f39c12'; ctx.fillStyle = '#f1c40f';
        ctx.beginPath(); ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });
}

// --- LINH HỒN ---
export function spawnSoulDrops(x, y, amount) {
    for (let i = 0; i < amount; i++) {
        const angle = Math.random() * Math.PI * 2; const speed = 80 + Math.random() * 100;
        soulDrops.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 4 + Math.random() * 2 });
    }
}
export function updateSoulDrops(deltaTime, player, saveGameData) {
    const pX = player.x + player.width / 2; const pY = player.y + player.height / 2;
    for (let i = soulDrops.length - 1; i >= 0; i--) {
        const soul = soulDrops[i];
        const friction = Math.exp(-3 * deltaTime / 1000);
        soul.vx *= friction; soul.vy *= friction;
        const dist = Math.hypot(pX - soul.x, pY - soul.y);
        const pullRadius = player.hasMagneticField ? Math.max(180, player.magneticRadius) : 180;
        if (dist < pullRadius) {
            const pull = 1800;
            soul.vx += ((pX - soul.x) / dist) * pull * (deltaTime / 1000);
            soul.vy += ((pY - soul.y) / dist) * pull * (deltaTime / 1000);
        }
        soul.x += soul.vx * (deltaTime / 1000); soul.y += soul.vy * (deltaTime / 1000);
        if (dist < player.width / 2 + soul.radius) {
            player.souls += 1;
            AudioManager.play('coin');
            saveGameData();
            soulDrops.splice(i, 1);
        }
    }
}
export function drawSoulDrops(ctx) {
    soulDrops.forEach(soul => {
        ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = '#00d8d6'; ctx.fillStyle = '#00d8d6';
        ctx.beginPath(); ctx.arc(soul.x, soul.y, soul.radius, 0, Math.PI); ctx.lineTo(soul.x, soul.y - soul.radius * 2.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e0ffff'; ctx.beginPath(); ctx.arc(soul.x, soul.y, soul.radius * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });
}

// --- KINH NGHIỆM ---
export function spawnExpOrbs(x, y, totalExp) {
    const numOrbs = Math.min(12, Math.max(3, Math.floor(totalExp / 5)));
    const expPerOrb = totalExp / numOrbs;
    for (let i = 0; i < numOrbs; i++) {
        const angle = Math.random() * Math.PI * 2; const speed = 100 + Math.random() * 200;
        expOrbs.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, value: expPerOrb, radius: 3 + Math.random() * 2 });
    }
}
export function updateExpOrbs(deltaTime, player) {
    const pX = player.x + player.width / 2; const pY = player.y + player.height / 2;
    for (let i = expOrbs.length - 1; i >= 0; i--) {
        const orb = expOrbs[i];
        const friction = Math.exp(-4 * deltaTime / 1000);
        orb.vx *= friction; orb.vy *= friction;
        const dist = Math.hypot(pX - orb.x, pY - orb.y);
        const pullRadius = player.hasMagneticField ? Math.max(120, player.magneticRadius) : 120;
        if (dist < pullRadius) {
            const pull = 1200;
            orb.vx += ((pX - orb.x) / dist) * pull * (deltaTime / 1000);
            orb.vy += ((pY - orb.y) / dist) * pull * (deltaTime / 1000);
        }
        orb.x += orb.vx * (deltaTime / 1000); orb.y += orb.vy * (deltaTime / 1000);
        orb.x = Math.max(0, Math.min(orb.x, MAP_WIDTH)); orb.y = Math.max(0, Math.min(orb.y, MAP_HEIGHT));
        if (dist < player.width / 2 + orb.radius) {
            player.gainExp(orb.value);
            AudioManager.play('exp');
            expOrbs.splice(i, 1);
        }
    }
}
export function drawExpOrbs(ctx) {
    expOrbs.forEach(orb => {
        ctx.save(); ctx.shadowBlur = 8; ctx.shadowColor = '#9b59b6'; ctx.fillStyle = '#8e44ad';
        ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d2b4de'; ctx.beginPath(); ctx.arc(orb.x - orb.radius * 0.3, orb.y - orb.radius * 0.3, orb.radius * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });
}

// --- CHỮ SÁT THƯƠNG ---
export function spawnFloatingText(x, y, text, color = '#ff4757') {
    floatingTexts.push({ x: x + (Math.random() - 0.5) * 16, y: y - 10, vx: (Math.random() - 0.5) * 40, vy: -80 - Math.random() * 40, text, color, alpha: 1, life: 0.8 });
}
export function updateFloatingTexts(deltaTime) {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.life -= deltaTime / 1000;
        if (ft.life <= 0) { floatingTexts.splice(i, 1); continue; }
        ft.x += ft.vx * (deltaTime / 1000); ft.y += ft.vy * (deltaTime / 1000);
        ft.vy += 300 * (deltaTime / 1000);
        ft.alpha = Math.max(0, ft.life / 0.8);
    }
}
export function drawFloatingTexts(ctx) {
    floatingTexts.forEach(ft => {
        ctx.save(); ctx.globalAlpha = ft.alpha; ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'center';
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 3; ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color; ctx.fillText(ft.text, ft.x, ft.y); ctx.restore();
    });
}

// --- SẤM SÉT & CHÁY NỔ ---
export function spawnImpactEffect(x, y, type, power = 0, enemies = []) {
    const duration = type === 'singularity' ? 3000 : (type === 'meteor' ? 600 : (type === 'blink' ? 300 : 160));
    impactEffects.push({ x, y, type, age: 0, duration: duration, seed: Math.random() * 1000 });
    if (type === 'lightning' && power > 0) applyLightningImpactDamage(x, y, power, enemies);
}
export function applyLightningImpactDamage(x, y, power, enemies) {
    const radius = 46;
    for (const enemy of enemies) {
        if (enemy.isDead) continue;
        const dist = Math.hypot(enemy.x + enemy.width / 2 - x, enemy.y + enemy.height / 2 - y);
        if (dist <= radius) {
            const damageScale = 0.6 + 0.4 * (1 - dist / radius);
            const strikeDamage = Math.max(2, Math.ceil(power * damageScale));
            enemy.takeDamage(strikeDamage);
            spawnFloatingText(enemy.x + enemy.width / 2, enemy.y, strikeDamage, '#79f2ff');
        }
    }
}
export function spawnLightningChainEffect(sourceEnemy, power, enemies) {
    const nearby = enemies.filter(enemy => !enemy.isDead && enemy !== sourceEnemy)
        .map(enemy => ({ enemy, dist: Math.hypot(enemy.x + enemy.width/2 - (sourceEnemy.x + sourceEnemy.width/2), enemy.y + enemy.height/2 - (sourceEnemy.y + sourceEnemy.height/2)) }))
        .filter(item => item.dist <= 120).sort((a, b) => a.dist - b.dist).slice(0, 3);

    const chainTargets = [sourceEnemy];
    nearby.forEach(item => {
        chainTargets.push(item.enemy);
        const chainDamage = Math.max(2, Math.ceil(power * 0.55));
        item.enemy.takeDamage(chainDamage);
        spawnFloatingText(item.enemy.x + item.enemy.width / 2, item.enemy.y, chainDamage, '#79f2ff');
    });

    if (chainTargets.length > 1) impactEffects.push({ type: 'lightningChain', chainTargets, age: 0, duration: 1000, seed: Math.random() * 1000 });
}
export function updateImpactEffects(deltaTime) {
    for (let i = impactEffects.length - 1; i >= 0; i--) {
        const effect = impactEffects[i];
        if (effect.type === 'lightningChain') {
            if (effect.chainTargets.some(enemy => enemy.isDead)) { impactEffects.splice(i, 1); continue; }
        }
        effect.age += deltaTime;
        if (effect.age >= effect.duration) impactEffects.splice(i, 1);
    }
}
export function drawImpactEffects(ctx) {
    impactEffects.forEach(effect => {
        const progress = effect.age / effect.duration; const alpha = 1 - progress;
        if (effect.type === 'lightning') {
            const strength = 14 + (1 - progress) * 10;
            ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = `rgba(200, 240, 255, ${alpha})`; ctx.strokeStyle = `rgba(220, 245, 255, ${alpha})`; ctx.lineWidth = 2 + (1 - progress) * 1.2;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath(); ctx.moveTo(effect.x, effect.y);
                ctx.lineTo(effect.x + (Math.random() - 0.5) * 4, effect.y - strength * 0.4 + (Math.random() - 0.5) * 4);
                ctx.lineTo(effect.x + (Math.random() - 0.5) * 12, effect.y + strength * 0.3 + (Math.random() - 0.5) * 6);
                ctx.lineTo(effect.x + (Math.random() - 0.5) * 8, effect.y + strength * 0.7 + (Math.random() - 0.5) * 8);
                ctx.stroke();
            }
            ctx.fillStyle = `rgba(220, 250, 255, ${alpha * 0.7})`; ctx.beginPath(); ctx.arc(effect.x, effect.y, 10 * (1 - progress) + 6, 0, Math.PI * 2); ctx.fill();
            for (let i = 0; i < 5; i++) {
                const size = 1 + Math.round((1 - progress) * 2);
                ctx.fillStyle = `rgba(200, 245, 255, ${alpha * 0.6})`;
                ctx.fillRect(effect.x + (Math.random() - 0.5) * 20 - size / 2, effect.y + (Math.random() - 0.5) * 20 - size / 2, size, size);
            }
            ctx.restore();
        } else if (effect.type === 'lightningChain') {
            ctx.save(); ctx.shadowBlur = 16; ctx.shadowColor = `rgba(190, 240, 255, ${alpha})`; ctx.strokeStyle = `rgba(180, 230, 255, ${alpha})`; ctx.lineWidth = 2.8;
            const points = effect.chainTargets.map(enemy => ({ x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2 }));
            for (let i = 0; i < points.length - 1; i++) {
                ctx.beginPath(); ctx.moveTo(points[i].x, points[i].y);
                ctx.lineTo(points[i].x + (points[i+1].x - points[i].x) * 0.5 + (Math.random() - 0.5) * 8, points[i].y + (points[i+1].y - points[i].y) * 0.5 + (Math.random() - 0.5) * 8);
                ctx.lineTo(points[i+1].x, points[i+1].y); ctx.stroke();
            }
            ctx.fillStyle = `rgba(200, 245, 255, ${alpha * 0.85})`; points.forEach(p => ctx.fillRect(p.x - 4, p.y - 4, 8, 8)); ctx.restore();
        } else if (effect.type === 'death') {
            ctx.save();
            const scale = 1 + progress * 2;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#c0392b';
            ctx.beginPath(); ctx.arc(effect.x, effect.y, 25 * scale, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = `${24 * scale}px Arial`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('💀', effect.x, effect.y);
            ctx.restore();
        } else if (effect.type === 'singularity') {
            ctx.save();
            ctx.translate(effect.x, effect.y);
            ctx.rotate(effect.age * 0.01);
            const scale = Math.sin(Math.PI * progress);
            ctx.globalAlpha = alpha;
            ctx.shadowBlur = 20; ctx.shadowColor = '#9b59b6';
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, 25 * scale, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#8e44ad'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 35 * scale, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        } else if (effect.type === 'blink') {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#3498db';
            ctx.shadowBlur = 15; ctx.shadowColor = '#2980b9';
            ctx.beginPath(); ctx.arc(effect.x, effect.y, 20 * (1 - progress), 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        } else if (effect.type === 'meteor') {
            ctx.save();
            const scale = Math.sin(Math.PI * progress);
            ctx.globalAlpha = alpha;
            ctx.shadowBlur = 30; ctx.shadowColor = '#ff4757';
            ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(effect.x, effect.y, 150 * scale, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f39c12'; ctx.beginPath(); ctx.arc(effect.x, effect.y, 90 * scale, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(effect.x, effect.y, 40 * scale, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    });
}