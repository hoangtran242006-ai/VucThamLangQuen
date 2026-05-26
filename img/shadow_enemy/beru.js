/**
 * drawBeru — pixel-art Shadow Sovereign
 * 
 * Cách dùng trong game của bạn:
 *   ctx.save();
 *   ctx.translate(entity.x, entity.y);
 *   drawBeru(ctx, time, entity);
 *   ctx.restore();
 *
 * S = kích thước 1 pixel sprite (điều chỉnh theo scale game)
 */

const S = 4; // 1 sprite-pixel = 4 canvas-px

// helper: vẽ 1 block pixel tại (col, row) tính từ gốc entity
function px(ctx, col, row, color, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(col * S, row * S, w * S, h * S);
}

export function drawBeru(ctx, time, entity) {
  // ── Hiệu ứng pulse / glow ─────────────────────────────────────────────────
  const g  = Math.sin(time * 0.002) * 0.28 + 0.72;   // 0.44 – 1.00
  const p  = Math.abs(Math.sin(time * 0.004));         // 0 – 1
  const fl = Math.random() > 0.9 ? 0.55 : 0;          // flicker sét

  // ── Palette ────────────────────────────────────────────────────────────────
  const BODY  = '#0e1520';
  const BODY2 = '#141e2e';
  const BLUE  = `rgba(68,130,210,${g})`;
  const BLUE2 = `rgba(100,165,235,${g})`;
  const BLUE3 = `rgba(140,195,255,${g})`;
  const WHITE = `rgba(230,242,255,${0.55 + g * 0.45})`;
  const CYAN  = `rgba(90,200,255,${0.5 + g * 0.5})`;
  const CYAN2 = `rgba(190,235,255,${p + fl})`;
  const TEND  = `rgba(10,16,28,${0.5 + p * 0.3})`;

  // Gốc vẽ dịch sang trái trên để sprite nằm giữa entity.x/y
  ctx.save();
  ctx.translate(-12 * S, -19 * S); // căn giữa sprite ~24px wide, 38px tall

  // ─────────────────────────────────────────────────────────────────────────
  // SỪNG
  [[9,0],[10,0],[14,0],[15,0],[9,1],[15,1],[10,2],[14,2]]
    .forEach(([c,r]) => px(ctx,c,r,BODY));

  // ĐẦU
  for (let r = 1; r <= 6; r++)
    for (let c = 8; c <= 16; c++) px(ctx,c,r, r<=2?BODY:BODY2);

  // MẮT phát sáng xanh
  px(ctx, 9, 3, BLUE2, 2, 1); px(ctx, 13, 3, BLUE2, 2, 1);
  px(ctx, 10, 3, BLUE3);      px(ctx, 14, 3, BLUE3);

  // CỔ
  px(ctx, 11, 6, BODY, 2, 2);

  // THÂN
  for (let r = 7; r <= 20; r++)
    for (let c = 7; c <= 17; c++) px(ctx,c,r, r>=8&&c>=8&&c<=16 ? BODY2 : BODY);

  // ── RUNE NGỰC — khung viền trắng bên ngoài
  [[8,7],[9,7],[15,7],[16,7],[7,8],[17,8],[7,11],[17,11],
   [7,14],[17,14],[8,17],[16,17]]
    .forEach(([c,r]) => px(ctx,c,r,WHITE));

  // ── RUNE NGỰC — hình trái tim/cánh trên (rows 8–11)
  px(ctx, 10, 8, BLUE,  4, 1);
  px(ctx,  9, 9, BLUE,  1, 1); px(ctx, 14, 9, BLUE, 1, 1);
  px(ctx, 10, 9, BLUE2, 4, 1);
  px(ctx,  9,10, BLUE,  6, 1);
  px(ctx, 10,10, BLUE3, 4, 1);
  px(ctx, 11,10, WHITE, 2, 1); // điểm sáng trung tâm
  px(ctx, 10, 8, WHITE);       px(ctx, 13, 8, WHITE); // nét trắng trên
  px(ctx,  9, 9, WHITE);       px(ctx, 14, 9, WHITE);

  // ── RUNE TRÁI (cols 8-10, rows 12-15)
  [[ 8,12],[ 9,12],[10,12],
   [ 8,13],
   [ 8,14],[ 9,14],
   [ 8,15],[10,15]].forEach(([c,r]) => px(ctx,c,r,BLUE));
  px(ctx, 9, 13, WHITE);

  // ── RUNE PHẢI (cols 13-15, rows 12-15)
  [[13,12],[14,12],[15,12],
   [15,13],
   [14,14],[15,14],
   [13,15],[15,15]].forEach(([c,r]) => px(ctx,c,r,BLUE));
  px(ctx, 14, 13, WHITE);

  // ── DẢI RUNE GIỮA
  px(ctx, 11,12, WHITE); px(ctx, 12,12, WHITE);
  px(ctx, 11,13, WHITE, 2, 1);
  px(ctx, 10,16, BLUE,  4, 1); px(ctx, 11,16, WHITE, 2, 1);
  px(ctx, 10,17, BLUE,  4, 1); px(ctx, 11,18, WHITE, 2, 1);
  px(ctx, 10,19, BLUE,  2, 1); px(ctx, 13,19, BLUE,  2, 1);

  // ── TAY TRÁI
  for (let r = 9; r <= 16; r++) {
    const off = Math.max(0, r - 12);
    px(ctx, 4 + off, r, BODY2, 3, 1);
  }
  [[4,9],[6,9],[3,12],[5,12],[4,15],[6,15]].forEach(([c,r]) => px(ctx,c,r,WHITE));

  // ── TAY PHẢI
  for (let r = 9; r <= 16; r++) {
    const off = Math.max(0, r - 12);
    px(ctx, 17 - off, r, BODY2, 3, 1);
  }
  [[18,9],[20,9],[19,12],[21,12],[18,15],[20,15]].forEach(([c,r]) => px(ctx,c,r,WHITE));

  // ── CHÂN
  for (let r = 21; r <= 33; r++) {
    px(ctx,  9, r, BODY2, 3, 1);
    px(ctx, 13, r, BODY2, 3, 1);
  }
  // đầu gối
  [[9,23],[10,23],[11,23],[13,23],[14,23],[15,23]].forEach(([c,r]) => px(ctx,c,r,WHITE));
  // mắt cá
  [[9,31],[10,31],[11,31],[13,31],[14,31],[15,31]].forEach(([c,r]) => px(ctx,c,r,WHITE));
  // vòng rune đùi
  [[10,25],[14,25],[10,29],[14,29]].forEach(([c,r]) => px(ctx,c,r,BLUE));

  // ── BÓNG TỐI (tendrils phía dưới)
  [[2,26],[1,27],[0,28],[2,29],[1,30],[3,31],
   [4,28],[3,29],[5,30],
   [22,26],[23,27],[24,28],[22,29],[23,30],[21,31],
   [19,28],[20,29],
   [5,33],[6,34],[7,35],[5,35],
   [9,34],[10,35],[11,36],
   [14,34],[15,35],[14,36],
   [18,33],[17,34],[16,35]]
    .forEach(([c,r]) => px(ctx,c,r,TEND));

  // ── SÉT XANH (lightning arcs) ─────────────────────────────────────────────
  ctx.save();
  ctx.shadowBlur = 20;
  ctx.shadowColor = '#5bc8ff';

  // Sét bên trái
  [[-1,9],[-2,8],[-3,7],[-4,7],[-5,8],[-6,9],[-6,10],[-6,11],
   [-5,12],[-4,13],[-3,13],[-2,12],[-1,12],[-5,9],[-5,10],[-5,11]]
    .forEach(([c,r]) => { ctx.fillStyle = CYAN; ctx.fillRect(c*S, r*S, S, S); });

  [[-3,7],[-4,7],[-5,8],[-5,9]].forEach(([c,r]) => {
    ctx.fillStyle = CYAN2; ctx.fillRect(c*S, r*S, S, S);
  });

  // Sét bên phải
  [[25,9],[26,8],[27,7],[28,7],[29,8],[30,9],[30,10],[30,11],
   [29,12],[28,13],[27,13],[26,12],[25,12],[29,9],[29,10],[29,11]]
    .forEach(([c,r]) => { ctx.fillStyle = CYAN; ctx.fillRect(c*S, r*S, S, S); });

  [[27,7],[28,7],[29,8],[29,9]].forEach(([c,r]) => {
    ctx.fillStyle = CYAN2; ctx.fillRect(c*S, r*S, S, S);
  });

  ctx.restore();
  ctx.restore(); // khôi phục translate
}