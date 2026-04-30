// js/menu.js
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';
import { SkinManager } from './skins.js';
import { RaceManager } from './races.js';
import { SpriteRenderer } from './sprite.js';
import { AudioManager } from './audio.js';

export class Menu {
    constructor() {
        this.buttons = [
            { id: 'start', text: 'BẮT ĐẦU CHƠI', width: 260, height: 50, active: true },
            { id: 'characters', text: 'NHÂN VẬT', width: 260, height: 50, active: true },
            { id: 'races', text: 'CHỦNG TỘC', width: 260, height: 50, active: true },
            { id: 'leaderboard', text: 'BẢNG XẾP HẠNG', width: 260, height: 50, active: true },
            { id: 'settings', text: 'CÀI ĐẶT', width: 260, height: 50, active: true }
        ];

        this.clouds = [];
        for (let i = 0; i < 6; i++) {
            this.clouds.push({
                x: Math.random() * CANVAS_WIDTH,
                y: Math.random() * (CANVAS_HEIGHT / 2.5),
                speed: 10 + Math.random() * 15,
                scale: 0.6 + Math.random() * 0.8
            });
        }

        this.hoveredButton = null;
        this.currentScreen = 'MAIN';
        
        // Khởi tạo thư viện trang phục mới
        SkinManager.init();
        this.skinPage = 0;
        this.rollAnimation = 0;

        let savedVol = localStorage.getItem('vucthamlangquen_volume');
        let savedMuted = localStorage.getItem('vucthamlangquen_muted');
        this.bgmVolume = savedVol !== null ? parseFloat(savedVol) : 0.4;
        this.isMusicMuted = savedMuted === 'true';
    }

    update(deltaTime, inputManager, player, onStart, saveGameData, onShowUpdateLog, onShowLeaderboard, onVolumeChange, onToggleMute, onNextTrack, onChangeName, onAdmin, onFullscreen) {
        const isAdmin = localStorage.getItem('vucthamlangquen_admin_token') === 'true';
        let visibleButtons = [...this.buttons];
        if (isAdmin) {
            visibleButtons.push({ id: 'admin', text: 'QUẢN TRỊ VIÊN', width: 260, height: 50, active: true });
        }

        const startY = CANVAS_HEIGHT / 2 - (visibleButtons.length * 60) / 2 + 130;
        visibleButtons.forEach((btn, idx) => {
            btn.y = startY + idx * 60;
        });

        this.clouds.forEach(c => {
            c.x += c.speed * (deltaTime / 1000);
            if (c.x > CANVAS_WIDTH + 100) {
                c.x = -100;
                c.y = Math.random() * (CANVAS_HEIGHT / 2.5);
            }
        });

        const mx = inputManager.mouse.x;
        const my = inputManager.mouse.y;
        this.hoveredButton = null;

        if (this.currentScreen === 'MAIN') {
            for (const btn of visibleButtons) {
                const bx = CANVAS_WIDTH / 2 - btn.width / 2;
                const by = btn.y;
                if (mx >= bx && mx <= bx + btn.width && my >= by && my <= by + btn.height) {
                    this.hoveredButton = btn.id;
                    if (inputManager.mouse.leftJustPressed && btn.active) {
                        if (btn.id === 'start') this.currentScreen = 'MODE_SELECTION';
                        else if (btn.id === 'characters') this.currentScreen = 'CHARACTERS';
                        else if (btn.id === 'races') this.currentScreen = 'RACES';
                        else if (btn.id === 'leaderboard') { if(onShowLeaderboard) onShowLeaderboard(); }
                        else if (btn.id === 'admin') { if(onAdmin) onAdmin(); }
                        else if (btn.id === 'settings') this.currentScreen = 'SETTINGS';
                    }
                }
            }

            if (mx >= CANVAS_WIDTH - 150 && mx <= CANVAS_WIDTH && my >= CANVAS_HEIGHT - 40 && my <= CANVAS_HEIGHT) {
                if (inputManager.mouse.leftJustPressed) {
                    const now = performance.now();
                    if (now - (this.lastAdminClickTime || 0) > 1000) this.adminClickCount = 0;
                    this.adminClickCount = (this.adminClickCount || 0) + 1;
                    this.lastAdminClickTime = now;
                    if (this.adminClickCount >= 5) {
                        this.adminClickCount = 0;
                        if (!isAdmin) {
                            const pwd = prompt("Nhập mật mã để mở Quản trị viên:");
                            if (pwd === "dev123") {
                                localStorage.setItem('vucthamlangquen_admin_token', 'true');
                            } else if (pwd) alert("Sai mật mã!");
                        } else {
                            if (confirm("Tắt chế độ Quản trị viên?")) localStorage.removeItem('vucthamlangquen_admin_token');
                        }
                    }
                }
            }

            if (inputManager.isActionJustPressed('attack')) {
                this.currentScreen = 'MODE_SELECTION';
            }
        } else if (this.currentScreen === 'RACES') {
            if ((mx >= 20 && mx <= 140 && my >= 20 && my <= 60) || (mx >= CANVAS_WIDTH - 65 && mx <= CANVAS_WIDTH - 15 && my >= 15 && my <= 65)) {
                this.hoveredButton = 'back';
                if (inputManager.mouse.leftJustPressed) this.currentScreen = 'MAIN';
            }
            
            const rollBtnX = CANVAS_WIDTH / 2 - 120;
            const rollBtnY = CANVAS_HEIGHT / 2 + 80;
            if (mx >= rollBtnX && mx <= rollBtnX + 240 && my >= rollBtnY && my <= rollBtnY + 50) {
                this.hoveredButton = 'roll_race';
                if (inputManager.mouse.leftJustPressed) {
                    if (player.gold >= 300) {
                        player.gold -= 300;
                        const newRace = RaceManager.rollRace();
                        player.raceId = newRace.id;
                        player.recalculateStats();
                        saveGameData();
                        AudioManager.play('chest');
                        this.rollAnimation = 60; 
                    } else { AudioManager.play('error'); }
                }
            }
        } else if (this.currentScreen === 'MODE_SELECTION') {
            if ((mx >= 20 && mx <= 140 && my >= 20 && my <= 60) || (mx >= CANVAS_WIDTH - 65 && mx <= CANVAS_WIDTH - 15 && my >= 15 && my <= 65)) {
                this.hoveredButton = 'back';
                if (inputManager.mouse.leftJustPressed) this.currentScreen = 'MAIN';
            }

            const soloX = CANVAS_WIDTH / 2 - 150; const soloY = CANVAS_HEIGHT / 2 - 90;
            if (mx >= soloX && mx <= soloX + 300 && my >= soloY && my <= soloY + 50) {
                this.hoveredButton = 'solo';
                if (inputManager.mouse.leftJustPressed) onStart('solo');
            }

            const coopX = CANVAS_WIDTH / 2 - 150; const coopY = CANVAS_HEIGHT / 2 - 20;
            if (mx >= coopX && mx <= coopX + 300 && my >= coopY && my <= coopY + 50) {
                this.hoveredButton = 'coop';
                if (inputManager.mouse.leftJustPressed) onStart('coop');
            }

            const pvpX = CANVAS_WIDTH / 2 - 150; const pvpY = CANVAS_HEIGHT / 2 + 50;
            if (mx >= pvpX && mx <= pvpX + 300 && my >= pvpY && my <= pvpY + 50) {
                this.hoveredButton = 'pvp';
                if (inputManager.mouse.leftJustPressed) onStart('pvp');
            }
        } else if (this.currentScreen === 'CHARACTERS') {
            if ((mx >= 20 && mx <= 140 && my >= 20 && my <= 60) || (mx >= CANVAS_WIDTH - 65 && mx <= CANVAS_WIDTH - 15 && my >= 15 && my <= 65)) {
                this.hoveredButton = 'back';
                if (inputManager.mouse.leftJustPressed) {
                    this.currentScreen = 'MAIN';
                    this.skinPage = 0;
                }
            }

            const isMobile = CANVAS_WIDTH <= 650;
            const itemsPerPage = isMobile ? 3 : 6;
            const maxPage = Math.ceil(SkinManager.skins.length / itemsPerPage) - 1;

            if (this.skinPage > 0 && mx >= CANVAS_WIDTH / 2 - 150 && mx <= CANVAS_WIDTH / 2 - 50 && my >= CANVAS_HEIGHT - 50 && my <= CANVAS_HEIGHT - 10) {
                this.hoveredButton = 'prev_page';
                if (inputManager.mouse.leftJustPressed) this.skinPage--;
            }
            if (this.skinPage < maxPage && mx >= CANVAS_WIDTH / 2 + 50 && mx <= CANVAS_WIDTH / 2 + 150 && my >= CANVAS_HEIGHT - 50 && my <= CANVAS_HEIGHT - 10) {
                this.hoveredButton = 'next_page';
                if (inputManager.mouse.leftJustPressed) this.skinPage++;
            }

            const startX = CANVAS_WIDTH / 2 - 290;
            const startY = 130;
            const startIndex = this.skinPage * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, SkinManager.skins.length);

            for (let i = startIndex; i < endIndex; i++) {
                const skin = SkinManager.skins[i];
                const displayIndex = i - startIndex;
                const boxX = isMobile ? CANVAS_WIDTH / 2 - 140 : startX + (displayIndex % 2) * 300;
                const boxY = isMobile ? 120 + displayIndex * 140 : startY + Math.floor(displayIndex / 2) * 140;
                
                if (mx >= boxX && mx <= boxX + 280 && my >= boxY && my <= boxY + 120) {
                    this.hoveredButton = `skin_${skin.id}`;
                    if (inputManager.mouse.leftJustPressed) {
                        if (SkinManager.ownedSkins.includes(skin.id)) {
                            SkinManager.equippedSkin = skin.id;
                            SkinManager.saveSkinData();
                        } else {
                            if (player.gold >= skin.price) {
                                player.gold -= skin.price;
                                SkinManager.ownedSkins.push(skin.id);
                                SkinManager.equippedSkin = skin.id;
                                SkinManager.saveSkinData();
                                saveGameData();
                            }
                        }
                    }
                }
            }
        } else if (this.currentScreen === 'SETTINGS') {
            if ((mx >= 10 && mx <= 170 && my >= 10 && my <= 75) || (mx >= CANVAS_WIDTH - 65 && mx <= CANVAS_WIDTH - 15 && my >= 15 && my <= 65)) {
                this.hoveredButton = 'back';
                if (inputManager.mouse.leftJustPressed) {
                    this.currentScreen = 'MAIN';
                }
            }

            const sliderWidth = 300;
            const sliderX = CANVAS_WIDTH / 2 - sliderWidth / 2;
            const sliderY = CANVAS_HEIGHT / 2 - 20;
            
            if (inputManager.mouse.leftDown && mx >= sliderX - 30 && mx <= sliderX + sliderWidth + 30 && my >= sliderY - 40 && my <= sliderY + 40) {
                let vol = (mx - sliderX) / sliderWidth;
                vol = Math.max(0, Math.min(1, vol)); 
                this.bgmVolume = vol;
                localStorage.setItem('vucthamlangquen_volume', this.bgmVolume.toString());
                if (onVolumeChange) onVolumeChange(this.bgmVolume);
            }

            const muteBtnX = CANVAS_WIDTH / 2 - 140;
            const btnY = CANVAS_HEIGHT / 2 + 20;
            if (mx >= muteBtnX - 10 && mx <= muteBtnX + 140 && my >= btnY - 10 && my <= btnY + 55) {
                this.hoveredButton = 'mute';
                if (inputManager.mouse.leftJustPressed) {
                    this.isMusicMuted = !this.isMusicMuted;
                    localStorage.setItem('vucthamlangquen_muted', this.isMusicMuted);
                    AudioManager.setMute(this.isMusicMuted);
                    if (onToggleMute) onToggleMute(this.isMusicMuted);
                }
            }

            const nextBtnX = CANVAS_WIDTH / 2 + 10;
            if (mx >= nextBtnX - 10 && mx <= nextBtnX + 140 && my >= btnY - 10 && my <= btnY + 55) {
                this.hoveredButton = 'next';
                if (inputManager.mouse.leftJustPressed) {
                    if (onNextTrack) onNextTrack();
                }
            }
            
            const renameBtnX = CANVAS_WIDTH / 2 - 140;
            const renameBtnY = CANVAS_HEIGHT / 2 + 80;
            if (mx >= renameBtnX - 10 && mx <= renameBtnX + 290 && my >= renameBtnY - 10 && my <= renameBtnY + 55) {
                this.hoveredButton = 'rename';
                if (inputManager.mouse.leftJustPressed) {
                    if (onChangeName) onChangeName();
                }
            }

            const fullscreenBtnX = CANVAS_WIDTH / 2 - 140;
            const fullscreenBtnY = CANVAS_HEIGHT / 2 + 140;
            if (mx >= fullscreenBtnX - 10 && mx <= fullscreenBtnX + 290 && my >= fullscreenBtnY - 10 && my <= fullscreenBtnY + 55) {
                this.hoveredButton = 'fullscreen';
                if (inputManager.mouse.leftJustPressed) {
                    if (onFullscreen) onFullscreen();
                }
            }
        }
        
        if (inputManager.mouse.leftJustPressed && this.hoveredButton) {
            if (this.hoveredButton === 'roll_race' && player.gold < 300) return; // Tránh phát tiếng cạch khi không đủ tiền
            AudioManager.play('click');
        }
    }
    
    updateRollAnim() { if (this.rollAnimation > 0) this.rollAnimation--; }

    draw(ctx, version, playerGold, currentTrackName) {
        const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
        this.updateRollAnim();
        
        skyGradient.addColorStop(0, '#53a8d8'); 
        skyGradient.addColorStop(1, '#9ae0ff'); 
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = '#fff466';
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH - 120, 100, 45, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.clouds.forEach(c => {
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.scale(c.scale, c.scale);
            ctx.beginPath();
            ctx.arc(0, 0, 20, Math.PI * 0.5, Math.PI * 1.5);
            ctx.arc(25, -10, 25, Math.PI * 1, Math.PI * 2);
            ctx.arc(50, 0, 20, Math.PI * 1.5, Math.PI * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });

        ctx.fillStyle = '#2f8f4a'; 
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_HEIGHT);
        for (let x = 0; x <= CANVAS_WIDTH; x += 20) {
            const y = CANVAS_HEIGHT - 120 + Math.sin(x * 0.005) * 40;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fill();

        ctx.fillStyle = '#40b95b'; 
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_HEIGHT);
        for (let x = 0; x <= CANVAS_WIDTH; x += 20) {
            const y = CANVAS_HEIGHT - 80 + Math.sin(x * 0.008 + 2) * 30;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fill();

        const time = performance.now();
        const bobbing = Math.sin(time * 0.002) * 10;
        const logoY = CANVAS_HEIGHT / 2 - 120 + bobbing;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.font = 'bold 56px "Segoe UI", Tahoma, sans-serif';
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#2c3e50';
        ctx.strokeText('VỰC THẲM', CANVAS_WIDTH / 2, logoY - 30);
        ctx.fillStyle = '#f1c40f'; 
        ctx.fillText('VỰC THẲM', CANVAS_WIDTH / 2, logoY - 30);

        ctx.font = 'bold 48px "Segoe UI", Tahoma, sans-serif';
        ctx.lineWidth = 8;
        ctx.strokeText('LÃNG QUÊN', CANVAS_WIDTH / 2, logoY + 25);
        ctx.fillStyle = '#ffffff'; 
        ctx.fillText('LÃNG QUÊN', CANVAS_WIDTH / 2, logoY + 25);
        ctx.restore();

        if (this.currentScreen === 'MAIN') {
            const isAdmin = localStorage.getItem('vucthamlangquen_admin_token') === 'true';
            let visibleButtons = [...this.buttons];
            if (isAdmin) visibleButtons.push({ id: 'admin', text: 'QUẢN TRỊ VIÊN', width: 260, height: 50, active: true });
            
            const startY = CANVAS_HEIGHT / 2 - (visibleButtons.length * 60) / 2 + 130;
            visibleButtons.forEach((btn, idx) => { btn.y = startY + idx * 60; });

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';

            for (const btn of visibleButtons) {
                const bx = CANVAS_WIDTH / 2;
                const by = btn.y;
                const isHovered = this.hoveredButton === btn.id;

                let text = btn.text;
                if (!btn.active) text += ' (Sắp ra mắt)';

                ctx.lineWidth = 5;
                ctx.strokeStyle = '#000000';
                ctx.strokeText(text, bx, by);

                if (isHovered && btn.active) ctx.fillStyle = '#f1c40f';
                else if (!btn.active) ctx.fillStyle = '#7f8c8d';
                else ctx.fillStyle = '#ffffff';
                
                ctx.fillText(text, bx, by);

                if (isHovered && btn.active) {
                    ctx.fillText('▶', bx - ctx.measureText(text).width/2 - 25, by);
                    ctx.fillText('◀', bx + ctx.measureText(text).width/2 + 25, by);
                }
            }
            ctx.restore();
        } else if (this.currentScreen === 'MODE_SELECTION') {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            const isBackHovered = this.hoveredButton === 'back';
            ctx.fillStyle = isBackHovered ? '#c0392b' : '#e74c3c';
            ctx.beginPath(); ctx.roundRect(20, 20, 140, 45, 8); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 18px "Segoe UI"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('◀ QUAY LẠI', 90, 42.5);

            ctx.fillStyle = isBackHovered ? '#c0392b' : '#e74c3c';
            ctx.beginPath(); ctx.roundRect(CANVAS_WIDTH - 65, 15, 50, 50, 8); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 24px "Segoe UI"'; ctx.fillText('X', CANVAS_WIDTH - 40, 40);

            ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 36px "Segoe UI"';
            ctx.shadowBlur = 10; ctx.shadowColor = '#e67e22';
            ctx.fillText('CHỌN CHẾ ĐỘ CHƠI', CANVAS_WIDTH / 2, 120);
            ctx.shadowBlur = 0;

            const soloX = CANVAS_WIDTH / 2 - 150; const soloY = CANVAS_HEIGHT / 2 - 90;
            ctx.fillStyle = this.hoveredButton === 'solo' ? '#2ecc71' : '#27ae60';
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(soloX, soloY, 300, 50, 10); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 20px "Segoe UI"'; ctx.fillText('👤 CHƠI ĐƠN', CANVAS_WIDTH / 2, soloY + 25);

            const coopX = CANVAS_WIDTH / 2 - 150; const coopY = CANVAS_HEIGHT / 2 - 20;
            ctx.fillStyle = this.hoveredButton === 'coop' ? '#3498db' : '#2980b9';
            ctx.beginPath(); ctx.roundRect(coopX, coopY, 300, 50, 10); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.fillText('🤝 CO-OP (PVE)', CANVAS_WIDTH / 2, coopY + 25);

            const pvpX = CANVAS_WIDTH / 2 - 150; const pvpY = CANVAS_HEIGHT / 2 + 50;
            ctx.fillStyle = this.hoveredButton === 'pvp' ? '#e74c3c' : '#c0392b';
            ctx.beginPath(); ctx.roundRect(pvpX, pvpY, 300, 50, 10); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.fillText('⚔️ ĐẤU TRƯỜNG (PVP)', CANVAS_WIDTH / 2, pvpY + 25);

            ctx.restore();
        } else if (this.currentScreen === 'CHARACTERS') {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            const isBackHovered = this.hoveredButton === 'back';
            ctx.fillStyle = isBackHovered ? '#c0392b' : '#e74c3c';
            ctx.beginPath(); ctx.roundRect(20, 20, 140, 45, 8); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 18px "Segoe UI"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('◀ QUAY LẠI', 90, 42.5);

            ctx.fillStyle = isBackHovered ? '#c0392b' : '#e74c3c';
            ctx.beginPath(); ctx.roundRect(CANVAS_WIDTH - 65, 15, 50, 50, 8); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 24px "Segoe UI"'; ctx.fillText('X', CANVAS_WIDTH - 40, 40);

            ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 36px "Segoe UI"';
            ctx.shadowBlur = 10; ctx.shadowColor = '#e67e22';
            ctx.fillText('PHÒNG THAY ĐỒ', CANVAS_WIDTH / 2, 80);
            ctx.shadowBlur = 0;

            const isMobile = CANVAS_WIDTH <= 650;
            const itemsPerPage = isMobile ? 3 : 6;
            const maxPage = Math.ceil(SkinManager.skins.length / itemsPerPage) - 1;
            const startIndex = this.skinPage * itemsPerPage;
            const endIndex = Math.min(startIndex + itemsPerPage, SkinManager.skins.length);

            const startX = CANVAS_WIDTH / 2 - 290;
            const startY = 130;
            for (let i = startIndex; i < endIndex; i++) {
                const skin = SkinManager.skins[i];
                const displayIndex = i - startIndex;
                const boxX = isMobile ? CANVAS_WIDTH / 2 - 140 : startX + (displayIndex % 2) * 300;
                const boxY = isMobile ? 120 + displayIndex * 140 : startY + Math.floor(displayIndex / 2) * 140;
                
                const isOwned = SkinManager.ownedSkins.includes(skin.id);
                const isEquipped = SkinManager.equippedSkin === skin.id;
                const isHovered = this.hoveredButton === `skin_${skin.id}`;

                const rarity = skin.rarity || { name: 'Normal', color: '#bdc3c7', glow: 'transparent' };
                
                ctx.fillStyle = isEquipped ? 'rgba(46, 204, 113, 0.15)' : (isHovered ? 'rgba(255, 255, 255, 0.1)' : 'rgba(30, 40, 50, 0.8)');
                ctx.strokeStyle = isEquipped ? '#2ecc71' : rarity.color;
                ctx.lineWidth = isHovered || isEquipped ? 3 : 2;

                if (isEquipped) {
                    ctx.shadowColor = '#2ecc71'; ctx.shadowBlur = 15;
                } else if (rarity.name !== 'Normal' || isHovered) {
                    ctx.shadowColor = rarity.glow; ctx.shadowBlur = isHovered ? 20 : 10;
                }

                ctx.beginPath(); ctx.roundRect(boxX, boxY, 280, 120, 12); ctx.fill(); ctx.stroke();
                ctx.shadowBlur = 0; // Reset bóng mờ

                const skinImg = SkinManager.getSkinImage(skin.id);
                if (skinImg) {
                    if (skin.isAdvancedSprite && skinImg.idle && skinImg.idle.down) {
                        SpriteRenderer.drawAdvancedAvatar(ctx, skinImg.idle.down, skin.framesX || 8, boxX + 20, boxY + 35, 50, skin.scale || 1);
                    }
                    else if (skin.isSpriteSheet) {
                        SpriteRenderer.drawAvatar(ctx, skinImg, skin.framesX || 4, skin.framesY || 4, boxX + 20, boxY + 35, 50);
                    } else {
                        ctx.drawImage(skinImg, boxX + 20, boxY + 35, 50, 50);
                    }
                } else {
                    SpriteRenderer.drawChibiAvatar(ctx, boxX + 20, boxY + 35, 50, skin);
                }
                ctx.strokeStyle = rarity.color + '66'; 
                ctx.lineWidth = 1.5;
                ctx.strokeRect(boxX + 20, boxY + 35, 50, 50);

                // Tên Nhân Vật (Kèm Glow)
                ctx.shadowColor = rarity.glow; ctx.shadowBlur = 8;
                ctx.fillStyle = rarity.color; ctx.textAlign = 'left'; ctx.font = 'bold 18px "Segoe UI"';
                ctx.fillText(skin.name, boxX + 90, boxY + 40);
                ctx.shadowBlur = 0;

                // Nhãn Bậc Độ Hiếm (Rarity Tag)
                ctx.font = 'bold 11px "Segoe UI"';
                ctx.fillStyle = rarity.color + '33'; // Nền trong suốt
                const tagWidth = ctx.measureText(rarity.name.toUpperCase()).width + 16;
                ctx.beginPath(); ctx.roundRect(boxX + 90, boxY + 50, tagWidth, 20, 6); ctx.fill();
                ctx.fillStyle = rarity.color;
                ctx.fillText(rarity.name.toUpperCase(), boxX + 98, boxY + 64);

                // Trạng thái / Nút mua
                ctx.font = 'bold 15px "Segoe UI"';
                if (isEquipped) {
                    ctx.fillStyle = '#2ecc71'; ctx.fillText('✔ Đang sử dụng', boxX + 90, boxY + 95);
                } else if (isOwned) {
                    ctx.fillStyle = '#3498db'; ctx.fillText('👆 Nhấp để Trang bị', boxX + 90, boxY + 95);
                } else {
                    ctx.fillStyle = playerGold >= skin.price ? '#f1c40f' : '#e74c3c';
                    ctx.fillText(`💰 Giá: ${skin.price} Vàng`, boxX + 90, boxY + 95);
                }
            }
            
            if (maxPage > 0) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 18px "Segoe UI"';
                ctx.textAlign = 'center';
                ctx.fillText(`Trang ${this.skinPage + 1} / ${maxPage + 1}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);

                if (this.skinPage > 0) {
                    ctx.fillStyle = this.hoveredButton === 'prev_page' ? '#f1c40f' : '#fff';
                    ctx.fillText('◀ QUAY LẠI', CANVAS_WIDTH / 2 - 100, CANVAS_HEIGHT - 30);
                }
                if (this.skinPage < maxPage) {
                    ctx.fillStyle = this.hoveredButton === 'next_page' ? '#f1c40f' : '#fff';
                    ctx.fillText('TIẾP THEO ▶', CANVAS_WIDTH / 2 + 100, CANVAS_HEIGHT - 30);
                }
            }

            ctx.restore();
        } else if (this.currentScreen === 'RACES') {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            const isBackHovered = this.hoveredButton === 'back';
            ctx.fillStyle = isBackHovered ? '#c0392b' : '#e74c3c';
            ctx.beginPath(); ctx.roundRect(20, 20, 140, 45, 8); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 18px "Segoe UI"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('◀ QUAY LẠI', 90, 42.5);

            ctx.fillStyle = isBackHovered ? '#c0392b' : '#e74c3c';
            ctx.beginPath(); ctx.roundRect(CANVAS_WIDTH - 65, 15, 50, 50, 8); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 24px "Segoe UI"'; ctx.fillText('X', CANVAS_WIDTH - 40, 40);

            ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 36px "Segoe UI"';
            ctx.shadowBlur = 10; ctx.shadowColor = '#e67e22';
            ctx.fillText('TẾ ĐÀN CHỦNG TỘC', CANVAS_WIDTH / 2, 80);
            ctx.shadowBlur = 0;

            const currentRace = RaceManager.getRace(window.playerRef.raceId);
            let displayRace = currentRace;
            if (this.rollAnimation > 0) { const keys = Object.keys(RaceManager.getRaces()); displayRace = RaceManager.getRace(keys[Math.floor(Math.random() * keys.length)]); }

            const cardX = CANVAS_WIDTH / 2 - 175; const cardY = CANVAS_HEIGHT / 2 - 120;
            ctx.fillStyle = 'rgba(30, 40, 50, 0.9)'; ctx.strokeStyle = displayRace.rarity.color; ctx.lineWidth = 4;
            ctx.shadowBlur = this.rollAnimation > 0 ? 30 : 15; ctx.shadowColor = displayRace.rarity.color;
            ctx.beginPath(); ctx.roundRect(cardX, cardY, 350, 170, 16); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;

            if (displayRace.imageObj && displayRace.imageObj.complete && displayRace.imageObj.naturalWidth > 0) {
                const imgW = 60; const imgH = 60 * (displayRace.imageObj.naturalHeight / displayRace.imageObj.naturalWidth);
                ctx.drawImage(displayRace.imageObj, CANVAS_WIDTH / 2 - imgW / 2, cardY + 50 - imgH / 2, imgW, imgH);
            } else {
                ctx.font = '60px Arial'; ctx.fillText(displayRace.icon, CANVAS_WIDTH / 2, cardY + 50);
            }
            ctx.font = 'bold 26px "Segoe UI"'; ctx.fillStyle = displayRace.rarity.color; ctx.fillText(displayRace.name, CANVAS_WIDTH / 2, cardY + 105);
            ctx.font = '14px "Segoe UI"'; ctx.fillStyle = '#bdc3c7'; ctx.fillText(displayRace.desc, CANVAS_WIDTH / 2, cardY + 135);
            ctx.font = 'bold 12px "Segoe UI"'; ctx.fillStyle = displayRace.rarity.color; ctx.fillText(`(${displayRace.rarity.name})`, CANVAS_WIDTH / 2, cardY + 155);

            const rollBtnX = CANVAS_WIDTH / 2 - 120; const rollBtnY = CANVAS_HEIGHT / 2 + 80;
            const isRollHovered = this.hoveredButton === 'roll_race'; const canAfford = playerGold >= 300;
            
            ctx.fillStyle = canAfford ? (isRollHovered ? '#f39c12' : '#f1c40f') : '#7f8c8d';
            ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.roundRect(rollBtnX, rollBtnY, 240, 50, 12); ctx.fill(); ctx.stroke();
            
            ctx.fillStyle = canAfford ? '#000' : '#2c3e50'; ctx.font = 'bold 18px "Segoe UI"';
            ctx.fillText(this.rollAnimation > 0 ? 'ĐANG QUAY...' : 'QUAY TỘC MỚI (300 💰)', CANVAS_WIDTH / 2, rollBtnY + 25);

            ctx.restore();
        } else if (this.currentScreen === 'SETTINGS') {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            const isBackHovered = this.hoveredButton === 'back';
            ctx.fillStyle = isBackHovered ? '#c0392b' : '#e74c3c';
            ctx.beginPath(); ctx.roundRect(20, 20, 140, 45, 8); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 18px "Segoe UI"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('◀ QUAY LẠI', 90, 42.5);

            ctx.fillStyle = isBackHovered ? '#c0392b' : '#e74c3c';
            ctx.beginPath(); ctx.roundRect(CANVAS_WIDTH - 65, 15, 50, 50, 8); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 24px "Segoe UI"'; ctx.fillText('X', CANVAS_WIDTH - 40, 40);

            ctx.fillStyle = '#2c3e50';
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.roundRect(CANVAS_WIDTH/2 - 250, CANVAS_HEIGHT/2 - 180, 500, 380, 16); ctx.fill(); ctx.stroke();

            ctx.fillStyle = '#3498db'; ctx.font = 'bold 36px "Segoe UI"';
            ctx.fillText('CÀI ĐẶT', CANVAS_WIDTH / 2, CANVAS_HEIGHT/2 - 120);

            ctx.fillStyle = '#fff'; ctx.font = 'bold 20px "Segoe UI"';
            ctx.fillText(`Âm lượng Nhạc nền: ${Math.round(this.bgmVolume * 100)}%`, CANVAS_WIDTH / 2, CANVAS_HEIGHT/2 - 60);
            
            const sliderWidth = 300;
            const sliderX = CANVAS_WIDTH / 2 - sliderWidth / 2;
            const sliderY = CANVAS_HEIGHT / 2 - 20;
            
            ctx.fillStyle = '#1a252f'; ctx.beginPath(); ctx.roundRect(sliderX, sliderY, sliderWidth, 12, 6); ctx.fill();
            ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.roundRect(sliderX, sliderY, sliderWidth * this.bgmVolume, 12, 6); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sliderX + sliderWidth * this.bgmVolume, sliderY + 6, 12, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 3; ctx.stroke();

            const muteBtnX = CANVAS_WIDTH / 2 - 140;
            const btnY = CANVAS_HEIGHT / 2 + 20;
            const isMuteHovered = this.hoveredButton === 'mute';
            ctx.fillStyle = isMuteHovered ? '#34495e' : '#2c3e50';
            ctx.strokeStyle = this.isMusicMuted ? '#e74c3c' : '#2ecc71';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.roundRect(muteBtnX, btnY, 130, 45, 6); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Segoe UI"'; ctx.fillText(this.isMusicMuted ? '🔇 Đã Tắt' : '🔊 Đang Bật', muteBtnX + 65, btnY + 22.5);

            const nextBtnX = CANVAS_WIDTH / 2 + 10;
            const isNextHovered = this.hoveredButton === 'next';
            ctx.fillStyle = isNextHovered ? '#34495e' : '#2c3e50';
            ctx.strokeStyle = '#3498db';
            ctx.beginPath(); ctx.roundRect(nextBtnX, btnY, 130, 45, 6); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Segoe UI"'; ctx.fillText('▶ Phát / Đổi', nextBtnX + 65, btnY + 22.5);

            const renameBtnX = CANVAS_WIDTH / 2 - 140;
            const renameBtnY = CANVAS_HEIGHT / 2 + 80;
            const isRenameHovered = this.hoveredButton === 'rename';
            ctx.fillStyle = isRenameHovered ? '#d35400' : '#e67e22'; ctx.strokeStyle = '#f1c40f'; ctx.beginPath(); ctx.roundRect(renameBtnX, renameBtnY, 280, 45, 6); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Segoe UI"'; ctx.fillText('✏️ Đổi Tên Hiệp Sĩ', CANVAS_WIDTH / 2, renameBtnY + 22.5);

            const fullscreenBtnX = CANVAS_WIDTH / 2 - 140;
            const fullscreenBtnY = CANVAS_HEIGHT / 2 + 140;
            const isFullscreenHovered = this.hoveredButton === 'fullscreen';
            ctx.fillStyle = isFullscreenHovered ? '#27ae60' : '#2ecc71'; ctx.strokeStyle = '#f1c40f'; ctx.beginPath(); ctx.roundRect(fullscreenBtnX, fullscreenBtnY, 280, 45, 6); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Segoe UI"'; ctx.fillText(document.fullscreenElement ? '🔳 Thu Nhỏ Màn Hình' : '🔲 Toàn Màn Hình', CANVAS_WIDTH / 2, fullscreenBtnY + 22.5);

            ctx.fillStyle = '#f1c40f';
            ctx.font = 'italic 18px "Segoe UI"';
            ctx.fillText(`🎵 Tình trạng: ${currentTrackName || 'Chưa rõ'}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 215);

            ctx.restore();
        }

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000000';
        
        ctx.textAlign = 'left';
        ctx.strokeText('Nhấp chuột hoặc nhấn phím Space để chọn', 15, CANVAS_HEIGHT - 15);
        ctx.fillText('Nhấp chuột hoặc nhấn phím Space để chọn', 15, CANVAS_HEIGHT - 15);
        
        ctx.textAlign = 'right';
        ctx.strokeText(`Phiên bản ${version}`, CANVAS_WIDTH - 15, CANVAS_HEIGHT - 15);
        ctx.fillText(`Phiên bản ${version}`, CANVAS_WIDTH - 15, CANVAS_HEIGHT - 15);

        ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#f1c40f';
        ctx.strokeText(`💰 Xu vàng: ${playerGold}`, CANVAS_WIDTH - 20, 30);
        ctx.fillText(`💰 Xu vàng: ${playerGold}`, CANVAS_WIDTH - 20, 30);
        ctx.restore();
    }
}
