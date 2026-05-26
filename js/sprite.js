// js/sprite.js

export const SpriteRenderer = {
    drawInGame(ctx, img, framesX, framesY, currentFrame, facing) {
        if (!img || !img.complete || img.naturalWidth === 0) return;
        const frameW = img.naturalWidth / framesX;
        const frameH = img.naturalHeight / framesY;
        
        let row = 0;
        if (framesY >= 4) {
            if (facing.y > 0.5) row = 0; // Xuống
            else if (facing.x < -0.5) row = 1; // Trái
            else if (facing.x > 0.5) row = 2; // Phải
            else row = 3; // Lên
        } else if (framesY === 3) {
            if (facing.y > 0.5) row = 0; // Xuống
            else if (facing.y < -0.5) row = 2; // Lên
            else row = 1; // Ngang (cần lật ảnh nếu sang trái)
            
            if (row === 1 && facing.x < 0) {
                ctx.save();
                ctx.scale(-1, 1);
                ctx.drawImage(img, currentFrame * frameW, row * frameH, frameW, frameH, -frameW/2, -frameH/2, frameW, frameH);
                ctx.restore();
                return;
            }
        }
        
        ctx.drawImage(img, currentFrame * frameW, row * frameH, frameW, frameH, -frameW/2, -frameH/2, frameW, frameH);
    },

    drawAvatar(ctx, img, framesX, framesY, x, y, size) {
        if (!img || !img.complete || img.naturalWidth === 0) return;
        const frameW = img.naturalWidth / framesX;
        const frameH = img.naturalHeight / framesY;
        
        const scale = Math.min(size / frameW, size / frameH);
        const drawW = frameW * scale;
        const drawH = frameH * scale;
        
        ctx.drawImage(img, 0, 0, frameW, frameH, x + size/2 - drawW/2, y + size/2 - drawH/2, drawW, drawH);
    },

    drawAdvanced(ctx, img, framesX, currentFrame, scale = 1) {
        if (!img || !img.complete || img.naturalWidth === 0) return;
        const frameW = img.naturalWidth / framesX;
        const frameH = img.naturalHeight;
        
        const targetW = frameW * scale;
        const targetH = frameH * scale;
        
        ctx.drawImage(img, currentFrame * frameW, 0, frameW, frameH, -targetW/2, -targetH/2, targetW, targetH);
    },

    drawAdvancedAvatar(ctx, img, framesX, x, y, size, scale = 1) {
        if (!img || !img.complete || img.naturalWidth === 0) return;
        const frameW = img.naturalWidth / framesX;
        const frameH = img.naturalHeight;
        
        const targetW = size * scale;
        const targetH = size * (frameH / frameW) * scale;
        const drawX = x + size/2 - targetW/2;
        const drawY = y + size/2 - targetH/2 + 5; // Căn giữa chuẩn xác, chỉ bù nhẹ 5px để không đụng nóc khung
        
        ctx.drawImage(img, 0, 0, frameW, frameH, drawX, drawY, targetW, targetH);
    },

    drawChibiAvatar(ctx, x, y, size, skin) {
        const color = skin.color || '#fff';
        ctx.save();
        ctx.translate(x, y);
        const scale = size / 50;
        ctx.scale(scale, scale);

        if (skin.id === 'schoolgirl') {
            ctx.fillStyle = '#ffdfc4'; ctx.beginPath(); ctx.roundRect(15, 10, 20, 16, 6); ctx.fill();
            ctx.fillStyle = '#2f3542'; ctx.beginPath(); ctx.roundRect(14, 8, 22, 7, 3); ctx.fill();
            ctx.beginPath(); ctx.moveTo(14, 12); ctx.lineTo(20, 19); ctx.lineTo(24, 12); ctx.fill();
            ctx.beginPath(); ctx.moveTo(26, 12); ctx.lineTo(30, 18); ctx.lineTo(34, 12); ctx.fill();
            ctx.fillStyle = '#000'; ctx.fillRect(17, 15, 3, 4); ctx.fillRect(26, 15, 3, 4);
            ctx.fillStyle = '#fff'; ctx.fillRect(18, 15, 1, 1); ctx.fillRect(27, 15, 1, 1);
            ctx.fillStyle = 'rgba(255, 105, 180, 0.4)'; ctx.fillRect(16, 19, 3, 2); ctx.fillRect(27, 19, 3, 2);
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(17, 26, 16, 10, 2); ctx.fill();
            ctx.fillStyle = '#0984e3'; ctx.beginPath(); ctx.moveTo(17, 26); ctx.lineTo(33, 26); ctx.lineTo(25, 34); ctx.fill();
            ctx.fillStyle = '#d63031'; ctx.beginPath(); ctx.arc(25, 33, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(25, 33); ctx.lineTo(21, 38); ctx.lineTo(24, 38); ctx.fill();
            ctx.beginPath(); ctx.moveTo(25, 33); ctx.lineTo(29, 38); ctx.lineTo(26, 38); ctx.fill();
            ctx.fillStyle = '#2f3542'; ctx.beginPath(); ctx.roundRect(11, 18, 6, 15, 3); ctx.fill(); ctx.beginPath(); ctx.roundRect(31, 18, 6, 15, 3); ctx.fill();
        } else if (skin.id === 'skeleton_mage') {
            const C_BONE = '#e3d1b5';      // Màu xương trắng ngà
            const C_BONE_SHADOW = '#bba07d'; // Bóng xương
            const C_SHIRT = '#5c4033';     // Áo nâu
            const C_SHIRT_SHADOW = '#3e2723';// Bóng áo
            const C_PANTS = '#363636';     // Quần đùi xám đen
            const C_BOOTS = '#4a3018';     // Giày nâu đậm
            const C_BELT_GOLD = '#d4af37'; // Khóa thắt lưng vàng
            const C_BLACK = '#111111';     // Đen (Mắt, mũi, miệng)

            ctx.fillStyle = C_BONE;
            ctx.fillRect(19, 38, 2, 5); // Xương đùi trái
            ctx.fillRect(18, 41, 4, 2); // Đầu gối trái
            ctx.fillRect(29, 38, 2, 5); // Xương đùi phải
            ctx.fillRect(28, 41, 4, 2); // Đầu gối phải

            ctx.fillStyle = C_BOOTS;
            ctx.fillRect(15, 43, 9, 3); // Cổ giày
            ctx.fillRect(16, 46, 7, 4); // Thân giày
            ctx.fillRect(12, 47, 4, 3); // Mũi giày hướng trái
            ctx.fillRect(26, 43, 9, 3); // Cổ giày
            ctx.fillRect(27, 46, 7, 4); // Thân giày
            ctx.fillRect(34, 47, 4, 3); // Mũi giày hướng phải

            ctx.fillStyle = C_PANTS;
            ctx.fillRect(16, 32, 8, 6); // Ống trái
            ctx.fillRect(26, 32, 8, 6); // Ống phải
            ctx.fillRect(15, 38, 2, 2); ctx.fillRect(18, 38, 3, 3); ctx.fillRect(22, 38, 2, 1);
            ctx.fillRect(26, 38, 3, 2); ctx.fillRect(30, 38, 2, 3); ctx.fillRect(33, 38, 2, 2);

            ctx.fillStyle = C_BONE;
            ctx.fillRect(13, 25, 2, 5); // Bắp tay
            ctx.fillRect(12, 29, 4, 2); // Khớp cùi chỏ
            ctx.fillRect(11, 31, 2, 5); // Cẳng tay
            ctx.fillRect(35, 25, 2, 5); // Bắp tay
            ctx.fillRect(34, 29, 4, 2); // Khớp cùi chỏ
            ctx.fillRect(36, 31, 2, 6); // Cẳng tay rủ xuống thẳng

            ctx.fillStyle = C_SHIRT;
            ctx.fillRect(16, 18, 18, 14); // Thân áo
            ctx.fillRect(13, 18, 5, 7);   // Vai áo trái
            ctx.fillRect(32, 18, 5, 7);   // Vai áo phải
            ctx.fillRect(15, 31, 3, 2); ctx.fillRect(20, 31, 2, 3); 
            ctx.fillRect(25, 31, 4, 2); ctx.fillRect(31, 31, 4, 3);

            ctx.fillStyle = C_SHIRT_SHADOW;
            ctx.fillRect(20, 18, 10, 4);
            ctx.fillStyle = C_BONE;
            ctx.fillRect(23, 16, 4, 4); // Cổ sọ
            ctx.fillRect(21, 19, 8, 2); // Xương đòn (Clavicle)
            ctx.fillStyle = C_BLACK;
            ctx.fillRect(24, 21, 2, 1); // Khe giữa ngực

            ctx.fillStyle = C_SHIRT_SHADOW;
            ctx.fillRect(16, 27, 18, 4); // Dây nịt tối màu
            ctx.fillStyle = C_BELT_GOLD;
            ctx.fillRect(21, 26, 8, 6); // Khóa vàng
            ctx.fillStyle = C_SHIRT_SHADOW;
            ctx.fillRect(23, 28, 4, 2); // Lỗ khóa thắt lưng

            ctx.fillStyle = C_BONE;
            ctx.fillRect(15, 2, 20, 12); // Đỉnh sọ
            ctx.fillRect(18, 14, 14, 5); // Xương hàm dưới
            
            ctx.fillStyle = C_BONE_SHADOW;
            ctx.fillRect(15, 12, 3, 2);
            ctx.fillRect(32, 12, 3, 2);
            ctx.fillRect(18, 17, 2, 2);
            ctx.fillRect(30, 17, 2, 2);

            ctx.fillStyle = C_BLACK;
            ctx.beginPath(); 
            ctx.moveTo(16, 7); ctx.lineTo(23, 9); ctx.lineTo(23, 12); ctx.lineTo(16, 12); 
            ctx.fill();
            ctx.beginPath(); 
            ctx.moveTo(34, 7); ctx.lineTo(27, 9); ctx.lineTo(27, 12); ctx.lineTo(34, 12); 
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(24, 13); ctx.lineTo(26, 13); ctx.lineTo(25, 15);
            ctx.fill();
            ctx.fillRect(19, 16, 12, 1); // Răng xương hàm
            ctx.fillRect(21, 15, 1, 3); 
            ctx.fillRect(24, 15, 1, 3); 
            ctx.fillRect(27, 15, 1, 3);
            
            ctx.fillStyle = '#e056fd';
            ctx.shadowBlur = 10; ctx.shadowColor = '#e056fd';
            ctx.fillRect(19, 9, 2, 2); ctx.fillRect(29, 9, 2, 2); 
            ctx.fillRect(21, 9, 2, 1); ctx.fillRect(27, 9, 2, 1); 
            
            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(15, 27, 20, 14, 4); ctx.fill();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; ctx.beginPath(); ctx.roundRect(25, 27, 10, 14, {tr: 4, br: 4, tl: 0, bl: 0}); ctx.fill();
            ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(13, 15, 24, 18, 8); ctx.fill();
            ctx.fillStyle = '#ffdfc4'; ctx.beginPath(); ctx.roundRect(17, 19, 16, 12, 4); ctx.fill();
            ctx.fillStyle = '#2c3e50'; ctx.fillRect(20, 22, 3, 5); ctx.fillRect(27, 22, 3, 5);
            ctx.fillStyle = '#ffdfc4'; ctx.beginPath(); ctx.arc(17, 33, 3.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
};
