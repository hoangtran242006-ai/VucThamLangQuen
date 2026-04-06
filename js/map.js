// js/map.js
import { TILE_SIZE, MAP_COLS, MAP_ROWS, TILE_TYPES } from './constants.js';

/**
 * Lớp GameMap: Chịu trách nhiệm sinh bản đồ, quản lý va chạm và vẽ (Render) thế giới.
 * Bao gồm hệ thống tối ưu hóa Camera Culling.
 */
export class GameMap {
    constructor(mode = 'solo') {
        // Mảng 2D chứa dữ liệu bản đồ
        this.grid = [];
        
        // Bảng màu tạm thời cho các loại Tile (Sau này sẽ thay bằng Pixel Art Sprite)
        this.tileColors = {
            [TILE_TYPES.GRASS]: '#7ec850', // Xanh lá tươi (Cỏ)
            [TILE_TYPES.DIRT]: '#9b7653',  // Nâu nhạt (Đất nông trại)
            [TILE_TYPES.WATER]: '#4fa4b8', // Xanh dương (Nước)
            [TILE_TYPES.TREE]: '#2d6a4f',  // Xanh lá đậm (Rừng cây/Vật cản)
            [TILE_TYPES.ROCK]: '#6c7a89',  // Xám đá (Vách hầm ngục)
            [TILE_TYPES.PATH]: '#d2b48c'   // Vàng nhạt (Đường mòn)
        };

        if (mode === 'pvp') this.generateArenaMap();
        else this.generateProceduralMap();
    }

    /**
     * Thuật toán sinh bản đồ tự động (Procedural Generation) kiểu hữu cơ (Organic)
     * Tạo ra các cụm cỏ, đất và bao quanh bởi vách đá/rừng cây.
     */
    generateProceduralMap() {
        // 1. Khởi tạo toàn bộ là Cỏ (GRASS)
        for (let row = 0; row < MAP_ROWS; row++) {
            this.grid[row] = [];
            for (let col = 0; col < MAP_COLS; col++) {
                this.grid[row][col] = TILE_TYPES.GRASS;
            }
        }

        // 2. Tạo viền bản đồ (Biên giới không thể đi qua)
        for (let row = 0; row < MAP_ROWS; row++) {
            for (let col = 0; col < MAP_COLS; col++) {
                // Viền trên/dưới là Đá, viền trái/phải là Cây
                if (row === 0 || row === MAP_ROWS - 1) {
                    this.grid[row][col] = TILE_TYPES.ROCK;
                } else if (col === 0 || col === MAP_COLS - 1) {
                    this.grid[row][col] = TILE_TYPES.TREE;
                }
            }
        }

        // 3. Rải các "cụm" chướng ngại vật ngẫu nhiên (Hồ nước, Cụm đá)
        this._spawnClusters(TILE_TYPES.WATER, 5, 10); // 5 hồ nước, mỗi hồ lan ra khoảng 10 ô
        this._spawnClusters(TILE_TYPES.ROCK, 15, 6);  // 15 cụm đá hầm ngục

        // 4. Tạo một khu vực "Làng" (Hub/Đường mòn) ở giữa bản đồ
        const centerRow = Math.floor(MAP_ROWS / 2);
        const centerCol = Math.floor(MAP_COLS / 2);
        for (let r = centerRow - 3; r <= centerRow + 3; r++) {
            for (let c = centerCol - 3; c <= centerCol + 3; c++) {
                this.grid[r][c] = TILE_TYPES.PATH;
            }
        }
    }

    /**
     * Thuật toán sinh bản đồ Đấu trường (PvP Arena)
     * Thu nhỏ, đối xứng, không có góc chết.
     */
    generateArenaMap() {
        for (let r = 0; r < MAP_ROWS; r++) {
            this.grid[r] = [];
            for (let c = 0; c < MAP_COLS; c++) {
                // Bo viền bằng vách đá
                if (r < 2 || r > MAP_ROWS - 3 || c < 2 || c > MAP_COLS - 3) {
                    this.grid[r][c] = TILE_TYPES.ROCK;
                } else {
                    this.grid[r][c] = TILE_TYPES.DIRT; // Đấu trường đất nện
                }
            }
        }
        // Các chướng ngại vật đối xứng (Hồ nước ở giữa, 4 cột đá)
        for (let r = 17; r <= 22; r++) for (let c = 17; c <= 22; c++) this.grid[r][c] = TILE_TYPES.WATER;
        const pillars = [[8,8], [8,30], [30,8], [30,30]];
        pillars.forEach(([r, c]) => { this.grid[r][c] = TILE_TYPES.ROCK; this.grid[r+1][c] = TILE_TYPES.ROCK; this.grid[r][c+1] = TILE_TYPES.ROCK; this.grid[r+1][c+1] = TILE_TYPES.ROCK; });
    }

    /**
     * Hàm hỗ trợ rải các cụm địa hình (Dùng thuật toán Random Walker cơ bản)
     */
    _spawnClusters(tileType, numClusters, sizePerCluster) {
        for (let i = 0; i < numClusters; i++) {
            // Chọn một điểm bắt đầu ngẫu nhiên (tránh sát viền)
            let r = Math.floor(Math.random() * (MAP_ROWS - 4)) + 2;
            let c = Math.floor(Math.random() * (MAP_COLS - 4)) + 2;

            for (let j = 0; j < sizePerCluster; j++) {
                this.grid[r][c] = tileType;
                
                // Di chuyển ngẫu nhiên (Lên, Xuống, Trái, Phải)
                const dir = Math.floor(Math.random() * 4);
                if (dir === 0 && r > 2) r--;
                if (dir === 1 && r < MAP_ROWS - 3) r++;
                if (dir === 2 && c > 2) c--;
                if (dir === 3 && c < MAP_COLS - 3) c++;
            }
        }
    }

    /**
     * Kiểm tra xem một ô TỌA ĐỘ PIXEL có bị chặn hay không (Va chạm môi trường)
     * Trả về true nếu là Tường/Nước/Cây
     * @param {number} pixelX 
     * @param {number} pixelY 
     */
    isSolidPixel(pixelX, pixelY) {
        // Chuyển đổi tọa độ Pixel sang tọa độ Ô (Grid/Tile)
        const col = Math.floor(pixelX / TILE_SIZE);
        const row = Math.floor(pixelY / TILE_SIZE);

        // Chặn nếu đi ra ngoài giới hạn mảng (Chống lỗi Out of Bounds)
        if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) {
            return true; 
        }

        const tile = this.grid[row][col];
        // Quy định: WATER, TREE, ROCK là các vật cản rắn
        if (tile === TILE_TYPES.WATER || tile === TILE_TYPES.TREE || tile === TILE_TYPES.ROCK) return true;
        
        if (this.solidEntities) {
            for (let i = 0; i < this.solidEntities.length; i++) {
                const ent = this.solidEntities[i];
                if (ent && pixelX >= ent.x && pixelX <= ent.x + ent.width && pixelY >= ent.y && pixelY <= ent.y + ent.height) return true;
            }
        }
        
        return false;
    }

    /**
     * Vẽ bản đồ lên màn hình (CÓ TỐI ƯU HÓA CAMERA CULLING)
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} camera - Đối tượng Camera từ camera.js
     */
    draw(ctx, camera) {
        // 1. Tính toán ô bắt đầu và kết thúc dựa trên vị trí Camera
        // Trừ đi/Cộng thêm 1 ô (Buffer) để khi camera lướt nhanh không bị lộ viền đen
        const startCol = Math.max(0, Math.floor(camera.x / TILE_SIZE) - 1);
        const endCol = Math.min(MAP_COLS, Math.floor((camera.x + camera.width) / TILE_SIZE) + 1);
        
        const startRow = Math.max(0, Math.floor(camera.y / TILE_SIZE) - 1);
        const endRow = Math.min(MAP_ROWS, Math.floor((camera.y + camera.height) / TILE_SIZE) + 1);

        // 2. Chỉ lặp qua những ô nằm trong khung nhìn
        for (let row = startRow; row < endRow; row++) {
            for (let col = startCol; col < endCol; col++) {
                const tileType = this.grid[row][col];
                
                // Vẽ màu nền của Tile
                ctx.fillStyle = this.tileColors[tileType];
                ctx.fillRect(
                    col * TILE_SIZE, 
                    row * TILE_SIZE, 
                    TILE_SIZE, 
                    TILE_SIZE
                );

                // Thêm một chút chi tiết (Hoa văn/Texture giả) để map bớt nhàm chán
                this._drawTileDetails(ctx, tileType, col * TILE_SIZE, row * TILE_SIZE);
            }
        }
    }

    /**
     * Vẽ thêm chi tiết nhỏ lên từng ô để tạo phong cách Pixel Art sinh động
     */
    _drawTileDetails(ctx, tileType, x, y) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'; // Màu bóng râm mờ
        
        if (tileType === TILE_TYPES.GRASS) {
            // Vẽ 2 cọng cỏ nhỏ
            ctx.fillRect(x + 5, y + 10, 4, 8);
            ctx.fillRect(x + 25, y + 20, 4, 6);
        } 
        else if (tileType === TILE_TYPES.TREE) {
            // Vẽ tán cây tròn (Giả 3D top-down)
            ctx.beginPath();
            ctx.arc(x + TILE_SIZE/2, y + TILE_SIZE/2, TILE_SIZE/2 - 2, 0, Math.PI * 2);
            ctx.fill();
        }
        else if (tileType === TILE_TYPES.ROCK) {
            // Vẽ vân nứt của vách đá hầm ngục
            ctx.fillRect(x + 8, y + 8, TILE_SIZE - 16, TILE_SIZE - 16);
        }
        else if (tileType === TILE_TYPES.WATER) {
            // Gợn sóng nước (Màu sáng hơn)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(x + 10, y + 15, 15, 4);
            ctx.fillRect(x + 20, y + 25, 10, 4);
        }
    }
}