// js/sprite.js

export const SpriteRenderer = {
    /**
     * Vẽ nhân vật lên bản đồ trong game, giữ đúng tỷ lệ để không bị lùn (bóp méo)
     */
    drawInGame(ctx, image, cols, rows, frame, facing) {
        if (!image || !image.complete || image.naturalWidth === 0) return;

        const fw = image.naturalWidth / cols; 
        const fh = image.naturalHeight / rows;
        let row = 0;
        let flip = 1;
        
        if (rows >= 4) {
            // Xác định hướng quay mặt (0: Xuống, 1: Trái, 2: Phải, 3: Lên)
            if (Math.abs(facing.x) > Math.abs(facing.y)) { row = facing.x < 0 ? 1 : 2; } 
            else if (facing.y > 0) { row = 0; } else { row = 3; }
        } else if (rows === 3) {
            // 0: Xuống, 1: Lên, 2: Sang ngang (Phải/Trái)
            if (Math.abs(facing.x) > Math.abs(facing.y)) { 
                row = 2; 
                flip = facing.x < 0 ? -1 : 1; 
            } else if (facing.y > 0) { row = 0; } else { row = 1; }
            ctx.scale(flip, 1);
        } else {
            // Nếu Sprite 1 hàng ngang, dùng Canvas lật ảnh
            flip = facing.x < 0 ? -1 : 1; 
            ctx.scale(flip, 1);
        }
        
        // Sửa lỗi bóp méo: Giữ nguyên chiều rộng 48, tính chiều cao dựa trên Tỷ lệ khung hình (Aspect Ratio) của ảnh gốc
        const drawWidth = 48;
        const drawHeight = drawWidth * (fh / fw);
        
        // Căn giữa hình ảnh vào tâm của Hitbox
        const drawY = -drawHeight / 2; 
        const drawX = -drawWidth / 2;

        ctx.drawImage(image, frame * fw, row * fh, fw, fh, drawX, drawY, drawWidth, drawHeight);
    },

    /**
     * Vẽ khung hình tĩnh làm Avatar trong cửa hàng / UI mà không bị méo
     */
    drawAvatar(ctx, image, cols, rows, x, y, size) {
        if (!image || !image.complete || image.naturalWidth === 0) return;

        const fw = image.naturalWidth / cols; const fh = image.naturalHeight / rows;
        const scale = Math.min(size / fw, size / fh);
        const drawW = fw * scale; const drawH = fh * scale;
        ctx.drawImage(image, 0, 0, fw, fh, x + (size - drawW) / 2, y + (size - drawH) / 2, drawW, drawH);
    },

    /**
     * Vẽ nhân vật Advanced Sprite (Nhiều thư mục)
     */
    drawAdvanced(ctx, image, framesX, frame, scale = 1) {
        const fw = image.naturalWidth / framesX;
        const fh = image.naturalHeight; // Chỉ có 1 hàng
        
        const drawWidth = 48 * scale;
        const drawHeight = drawWidth * (fh / fw);
        const drawY = -drawHeight / 2; 
        const drawX = -drawWidth / 2;

        ctx.drawImage(image, frame * fw, 0, fw, fh, drawX, drawY, drawWidth, drawHeight);
    },

    drawAdvancedAvatar(ctx, image, framesX, x, y, size, customScale = 1) {
        if (!image || !image.complete || image.naturalWidth === 0) return;
        const fw = image.naturalWidth / framesX; 
        const fh = image.naturalHeight;
        const scale = Math.min(size / fw, size / fh) * Math.min(customScale, 1.8);
        const drawW = fw * scale; const drawH = fh * scale;
        ctx.drawImage(image, 0, 0, fw, fh, x + (size - drawW) / 2, y + (size - drawH) / 2, drawW, drawH);
    },

    /**
     * Vẽ nhân vật Chibi tự động nếu không có file ảnh (fallback)
     */
    drawChibiAvatar(ctx, x, y, size, skin) {
        const color = skin.color || '#fff';
        ctx.save();
        ctx.translate(x, y);
        const scale = size / 50;
        ctx.scale(scale, scale);

        if (skin.id === 'schoolgirl') {
            // Tóc đuôi ngựa
            ctx.fillStyle = '#2f3542'; ctx.beginPath(); ctx.roundRect(0, 15, 8, 20, 4); ctx.fill(); ctx.beginPath(); ctx.roundRect(42, 15, 8, 20, 4); ctx.fill();
            // Thân (Áo thủy thủ)
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.roundRect(16, 28, 18, 12, 2); ctx.fill();
            // Cổ áo viền xanh & Nơ đỏ
            ctx.fillStyle = '#0984e3'; ctx.beginPath(); ctx.moveTo(16, 28); ctx.lineTo(34, 28); ctx.lineTo(25, 36); ctx.fill();
            ctx.fillStyle = '#d63031'; ctx.beginPath(); ctx.arc(25, 35, 2, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.moveTo(25,35); ctx.lineTo(20,40); ctx.lineTo(22,40); ctx.fill(); ctx.beginPath(); ctx.moveTo(25,35); ctx.lineTo(30,40); ctx.lineTo(28,40); ctx.fill();
            // Mặt
            ctx.fillStyle = '#ffdfc4'; ctx.beginPath(); ctx.roundRect(10, 8, 30, 22, 8); ctx.fill();
            // Mắt to tròn anime
            ctx.fillStyle = '#000'; ctx.fillRect(16, 17, 4, 6); ctx.fillRect(30, 17, 4, 6);
            ctx.fillStyle = '#fff'; ctx.fillRect(17, 17, 2, 2); ctx.fillRect(31, 17, 2, 2);
            ctx.fillStyle = 'rgba(255, 105, 180, 0.5)'; ctx.fillRect(14, 22, 4, 3); ctx.fillRect(32, 22, 4, 3);
            // Tóc mái
            ctx.fillStyle = '#2f3542'; ctx.beginPath(); ctx.roundRect(8, 6, 34, 8, 4); ctx.fill(); 
            ctx.beginPath(); ctx.moveTo(8, 10); ctx.lineTo(16, 20); ctx.lineTo(22, 10); ctx.fill();
            ctx.beginPath(); ctx.moveTo(28, 10); ctx.lineTo(34, 20); ctx.lineTo(42, 10); ctx.fill();
        } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath(); ctx.ellipse(25, 44, 16, 5, 0, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = color;
            ctx.beginPath(); ctx.roundRect(12, 32, 26, 18, 6); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.15)'; 
            ctx.beginPath(); ctx.roundRect(25, 32, 13, 18, {tr: 6, br: 6, tl: 0, bl: 0}); ctx.fill();

            ctx.fillStyle = color;
            ctx.beginPath(); ctx.roundRect(4, 4, 42, 36, 16); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.1)'; 
            ctx.beginPath(); ctx.roundRect(4, 4, 21, 36, {tl: 16, bl: 16, tr: 0, br: 0}); ctx.fill();

            ctx.fillStyle = '#ffdfc4';
            ctx.beginPath(); ctx.roundRect(11, 14, 28, 22, 10); ctx.fill();

            ctx.strokeStyle = '#2c3e50';
            ctx.lineWidth = 2.5; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(15, 22); ctx.quadraticCurveTo(18, 19, 21, 22); ctx.stroke(); 
            ctx.beginPath(); ctx.moveTo(29, 22); ctx.quadraticCurveTo(32, 19, 35, 22); ctx.stroke(); 

            ctx.fillStyle = 'rgba(255, 105, 180, 0.4)';
            ctx.beginPath(); ctx.ellipse(14, 27, 3, 2, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(36, 27, 3, 2, 0, 0, Math.PI*2); ctx.fill();

            ctx.strokeStyle = '#d35400';
            ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(25, 26, 3, 0.2, Math.PI - 0.2); ctx.stroke();
        }
        ctx.restore();
    }
};