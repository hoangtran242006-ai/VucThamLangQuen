// js/camera.js
import { CANVAS_WIDTH, CANVAS_HEIGHT, MAP_WIDTH, MAP_HEIGHT } from './constants.js';

/**
 * Lớp Camera: Quản lý góc nhìn của người chơi trên bản đồ rộng.
 * Hỗ trợ lướt mượt (Smooth follow) và Rung màn hình (Screen shake).
 */
export class Camera {
    constructor() {
        // Tọa độ góc trên cùng bên trái của Camera
        this.x = 0;
        this.y = 0;
        
        // Kích thước của khung nhìn (Viewport) - thường bằng kích thước Canvas
        this.width = CANVAS_WIDTH;
        this.height = CANVAS_HEIGHT;

        // Tốc độ bám theo nhân vật (Lerp factor: 0.1 nghĩa là di chuyển 10% khoảng cách mỗi frame)
        // Số càng nhỏ camera lướt càng mượt, nhưng nếu nhỏ quá sẽ bị tụt lại phía sau
        this.lerpFactor = 0.1;

        // Trạng thái rung màn hình (Screen Shake)
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        this.offsetX = 0; // Độ lệch do rung
        this.offsetY = 0;
    }

    /**
     * Kích hoạt hiệu ứng rung màn hình
     * @param {number} duration - Thời gian rung (tính bằng mili giây)
     * @param {number} intensity - Cường độ rung (số pixel tối đa bị lệch)
     */
    shake(duration, intensity) {
        this.shakeTimer = duration;
        this.shakeTotalDuration = duration;
        this.shakeIntensity = intensity;
    }

    /**
     * Cập nhật vị trí camera bám theo một mục tiêu (thường là Player)
     * @param {Object} target - Đối tượng cần theo dõi (phải có x, y, width, height)
     * @param {number} deltaTime - Thời gian giữa 2 frame
     */
    update(target, deltaTime) {
        if (!target) return;

        // 1. Tính toán vị trí tâm của mục tiêu
        const targetCenterX = target.x + (target.width / 2);
        const targetCenterY = target.y + (target.height / 2);

        // 2. Tính toán vị trí lý tưởng của camera (để mục tiêu nằm ở giữa màn hình)
        const desiredX = targetCenterX - (this.width / 2);
        const desiredY = targetCenterY - (this.height / 2);

        // 3. Di chuyển camera mượt mà về phía vị trí lý tưởng (Nội suy tuyến tính - Lerp)
        this.x += (desiredX - this.x) * this.lerpFactor;
        this.y += (desiredY - this.y) * this.lerpFactor;

        // 4. Giới hạn (Clamp) Camera không cho vượt ra ngoài mép bản đồ
        // Tránh tình trạng người chơi đi ra mép bản đồ thì camera hiển thị vùng đen tĩnh không có gì
        this.x = Math.max(0, Math.min(this.x, MAP_WIDTH - this.width));
        this.y = Math.max(0, Math.min(this.y, MAP_HEIGHT - this.height));

        // 5. Cập nhật hiệu ứng rung màn hình
        if (this.shakeTimer > 0) {
            this.shakeTimer -= deltaTime;
            
            // Giảm dần cường độ rung về cuối
            const falloff = this.shakeTotalDuration ? (this.shakeTimer / this.shakeTotalDuration) : 1; 
            
            // Tạo ra tọa độ lệch ngẫu nhiên trong phạm vi intensity
            this.offsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity * falloff;
            this.offsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity * falloff;
        } else {
            this.shakeTimer = 0;
            this.offsetX = 0;
            this.offsetY = 0;
        }
    }

    /**
     * Lấy tọa độ X thực tế của camera (đã bao gồm hiệu ứng rung)
     * Các class vẽ (Map, Player, Enemy) sẽ gọi hàm này để dịch chuyển tọa độ vẽ
     */
    getRenderX() {
        return this.x + this.offsetX;
    }

    /**
     * Lấy tọa độ Y thực tế của camera (đã bao gồm hiệu ứng rung)
     */
    getRenderY() {
        return this.y + this.offsetY;
    }

    /**
     * Phương thức tiện ích để chuẩn bị Canvas trước khi vẽ toàn bộ game
     * Cần gọi hàm này ở đầu hàm render chung
     * @param {CanvasRenderingContext2D} ctx 
     */
    beginRender(ctx) {
        ctx.save();
        // Dịch chuyển toàn bộ hệ tọa độ của Canvas ngược lại với vị trí của Camera
        // Nếu Camera tiến tới (x tăng), thì thế giới phải lùi lại (dịch chuyển -x)
        ctx.translate(-Math.floor(this.getRenderX()), -Math.floor(this.getRenderY()));
    }

    /**
     * Khôi phục trạng thái Canvas sau khi vẽ xong
     * (Cực kỳ quan trọng để vẽ UI lớp phủ không bị dính vào tọa độ camera)
     * @param {CanvasRenderingContext2D} ctx 
     */
    endRender(ctx) {
        ctx.restore();
    }
}