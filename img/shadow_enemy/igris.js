export function drawIgris(ctx, time, entity) {
    ctx.save();
    
    // Hệ số phóng to nhân vật (Có thể đổi thành 1, 1.5, hoặc 2 tùy ý bạn)
    const scale = 1.5; 
    
    // Dịch tâm để nhân vật nằm giữa hitbox
    ctx.translate(-18 * scale, -16 * scale); 
    
    // Nhịp thở: Tạo hiệu ứng nhấp nhô nhẹ nhàng (nếu game bạn truyền biến time)
    const breatheY = Math.sin((time || 0) / 300) * 0.5;
    ctx.translate(0, breatheY);

    // Bảng màu chuẩn Dark Fantasy của Igris
    const palette = {
        '0': '#050508', // Giáp đen tuyền
        '1': '#1a1a24', // Vệt sáng viền giáp (Tạo khối kim loại)
        '2': '#e61932', // Lông mào đỏ rực
        '3': '#900014', // Lông mào đỏ thẫm (Bóng râm)
        '4': '#2be3fa', // Năng lượng Cyan (Gân sáng ngực/cổ)
        '5': '#ffffff', // Mắt trắng sáng chói
        '6': '#3a6cf5', // Viền aura thanh kiếm xanh lam
        '7': '#dce7ff', // Lõi đại kiếm phát sáng
        '8': '#08080f'  // Áo choàng / Khói đen phía sau
    };

    // Bản đồ Pixel - Nhìn vào đây bạn có thể thấy rõ hình dáng của Igris!
    const spriteMap = [
        "                                        ",
        "                   2222                 ",
        "                 2222223                ",
        "                022222333               ",
        "               00222333333              ",
        "              01022233  33              ",
        "             001022233                  ",
        "            0001022233                  ",
        "            0050022233                  ",
        "            0040022233                  ",
        "            0000022233                  ",
        "           000400 223                   ",
        "         0000040000000                  ",
        "        000000400000000          000    ",
        "       00010004000000100       0006000  ",
        "      0000104444400001000        06760  ",
        "     000000040004000000000      6677766 ",
        "     0800 0440004400 08000     6777776  ",
        "    0880  0400000400  0880     6777776  ",
        "   08880  0440004400  08880    6777776  ",
        "   0888   0004440000   0888    6777776  ",
        "  0888    0 00400 00    8880   6777776  ",
        "  0888      00400       8880    677776  ",
        " 0888      0000000      88880   677776  ",
        " 0888     000000000     88880    67776  ",
        "08888    0000   0000    888880   67776  ",
        "08888   0000     0000   888880    6776  ",
        "0888    000      00000  8888880   6776  ",
        "0888   000        0000008888880    676  ",
        "088    00          000000888888     6   ",
        "088   00            00000088888         ",
        " 88   0              00000 8888         ",
        "                      0000              "
    ];

    // Thuật toán quét ma trận và vẽ Pixel
    for (let y = 0; y < spriteMap.length; y++) {
        for (let x = 0; x < spriteMap[y].length; x++) {
            const char = spriteMap[y][x];
            
            // Nếu không phải khoảng trắng (trong suốt) thì tiến hành vẽ
            if (char !== ' ') {
                ctx.fillStyle = palette[char];
                
                // Kích hoạt hiệu ứng phát sáng (Glow) cho Mắt, Năng lượng ngực, và Lõi kiếm
                if (char === '4' || char === '5' || char === '7') {
                    // Lõi kiếm (7) sáng rực hơn các viền (4)
                    ctx.shadowBlur = char === '7' ? 15 : 10;
                    ctx.shadowColor = palette[char];
                } else {
                    ctx.shadowBlur = 0; // Tắt glow cho áo giáp đen
                }
                
                // Vẽ 1 "pixel" vuông
                // Cộng thêm 0.5 để vá khe hở chống nứt viền giữa các pixel trên Canvas
                ctx.fillRect(x * scale, y * scale, scale + 0.5, scale + 0.5); 
            }
        }
    }
    
    ctx.restore();
}