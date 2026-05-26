export function drawBellion(ctx, time, entity) {
    ctx.save();
    
    // Hệ số phóng to nhân vật (Phù hợp với boss to lớn)
    const scale = 1.6; 
    
    // Dịch tâm để nhân vật đứng cân đối giữa hitbox
    ctx.translate(-22 * scale, -18 * scale); 
    
    // Nhịp thở của hộ vệ tối cao
    const breatheY = Math.sin((time || 0) / 250) * 0.4;
    ctx.translate(0, breatheY);

    // Bảng màu chuẩn "Shadow Grand Marshal" của Bellion
    const palette = {
        '0': '#040406', // Siêu đen (Áo giáp lõi, bóng tối sâu thẳm)
        '1': '#181326', // Tím đen kim loại (Khung giáp chính)
        '2': '#3d255c', // Tím trung tính (Tạo khối 3D cho giáp gân guốc)
        '3': '#913ffa', // Tím shadow phát sáng (Aura năng lượng, vân kiếm)
        '4': '#f1daff', // Tím trắng (Lõi mắt quỷ, lõi năng lượng cổ và đại kiếm)
        '5': '#0b0b10'  // Áo choàng rách bay phía sau
    };

    // Ma trận Pixel Bellion: Uy nghi, sừng sững, đại kiếm cắm thẳng trước mặt
    const spriteMap = [
        "                      00                        ",
        "                     0440                       ",
        "                    013310                      ",
        "                   01100110                     ",
        "                  0114004110                    ",
        "                 011100001110                   ",
        "                01111333311110                  ",
        "               0111110000111110         000     ",
        "    55        02111144441111120        0340     ",
        "   5555      0221111100111111220       0340     ",
        "  55  55    00221111111111112200      03340     ",
        " 55    55  0000222111111112220000     03340     ",
        " 55    55 000  00022222222000  000    03340     ",
        " 55    5500      0000000000      00   03340     ",
        "  55  5500         013310         00  03340     ",
        "   555500          013310          00 03340     ",
        "    5500           011110           0003340     ",
        "     00            011110            033340     ",
        "    00             022220             03340     ",
        "    0              011110             03340     ",
        "                   011110             03340     ",
        "                  02111120            03340     ",
        "                  02111120            03340     ",
        "                 0211  1120           03340     ",
        "                 0211  1120           03340     ",
        "                0211    1120          03340     ",
        "                0211    1120          03340     ",
        "               0211      1120         03340     ",
        "               0211      1120         03330     ",
        "              0011        1100         000      ",
        "             0011          1100                 ",
        "             000            000                 "
    ];

    // Thuật toán quét ma trận và dựng hình
    for (let y = 0; y < spriteMap.length; y++) {
        for (let x = 0; x < spriteMap[y].length; x++) {
            const char = spriteMap[y][x];
            
            if (char !== ' ') {
                ctx.fillStyle = palette[char];
                
                // Hiệu ứng đổ bóng phát sáng (Neon Glow) cực đỉnh cho Ma Thần
                if (char === '3' || char === '4') {
                    // Màu tím trắng (4) là lõi năng lượng nên sáng rực gắt hơn màu tím thường (3)
                    ctx.shadowBlur = char === '4' ? 16 : 8;
                    ctx.shadowColor = palette[char];
                } else {
                    ctx.shadowBlur = 0; // Giáp sắt đen nguyên khối không phản quang
                }
                
                // Vẽ block pixel vuông (bù 0.4 để canvas không bị hở đường chỉ)
                ctx.fillRect(x * scale, y * scale, scale + 0.4, scale + 0.4); 
            }
        }
    }
    
    ctx.restore();
}