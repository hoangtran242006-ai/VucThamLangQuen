// js/input.js

/**
 * Lớp InputManager chịu trách nhiệm quản lý toàn bộ tương tác của người chơi
 * Bao gồm: Bàn phím (Di chuyển, kỹ năng) và Chuột (Nhắm hướng, Tấn công)
 */
export class InputManager {
    constructor() {
        // Lưu trữ trạng thái thô của các phím (true nếu đang giữ, false nếu đã nhả)
        this.keys = {};
        
        // Lưu trữ các phím "vừa mới bấm" trong frame hiện tại (Dùng cho lướt/dash hoặc tương tác)
        this.keysJustPressed = {};
        
        // Trạng thái của chuột
        this.mouse = {
            x: 0,
            y: 0,
            leftDown: false,
            rightDown: false,
            leftJustPressed: false,
            rightJustPressed: false
        };

        // Trạng thái Joystick ảo
        this.joystickMove = { x: 0, y: 0 };
        this.joystickAim = { x: 0, y: 0 };
        this.isShooting = false; // Kích hoạt khi ngón tay đang chạm nòng ngắm

        // Hệ thống Key Mapping: Gắn hành động với nhiều phím khác nhau
        // Giúp người chơi dùng được cả WASD hoặc Phím mũi tên
        this.actionMap = {
            'move_up': ['KeyW', 'ArrowUp'],
            'move_down': ['KeyS', 'ArrowDown'],
            'move_left': ['KeyA', 'ArrowLeft'],
            'move_right': ['KeyD', 'ArrowRight'],
            'attack': ['Space'], // Có thể đánh bằng Space nếu không dùng chuột
            'dash': ['ShiftLeft', 'ShiftRight'], // Lướt
            'interact': ['KeyF', 'Enter'], // Nhặt đồ, Luyện kim
            'inventory': ['KeyE'], // Mở túi đồ
            'escape': ['Escape'], // Phím ESC để Pause/Đóng menu
            'map': ['Tab'] // Xem bản đồ lớn
        };

        // Ràng buộc context (bind) cho các event listener để không bị mất 'this'
        this._handleKeyDown = this._handleKeyDown.bind(this);
        this._handleKeyUp = this._handleKeyUp.bind(this);
        this._handleMouseMove = this._handleMouseMove.bind(this);
        this._handleMouseDown = this._handleMouseDown.bind(this);
        this._handleMouseUp = this._handleMouseUp.bind(this);
        // Ngăn menu chuột phải hiện lên khi click chuột phải trong game
        this._handleContextMenu = (e) => e.preventDefault(); 
    }

    /**
     * Khởi tạo các bộ lắng nghe sự kiện (Event Listeners)
     * Gọi hàm này một lần khi khởi động game.
     * @param {HTMLCanvasElement} canvas - Thẻ canvas để tính tọa độ chuột chuẩn xác
     */
    init(canvas) {
        this.canvas = canvas;

        // Lắng nghe bàn phím
        window.addEventListener('keydown', this._handleKeyDown);
        window.addEventListener('keyup', this._handleKeyUp);

        // Lắng nghe chuột
        window.addEventListener('mousemove', this._handleMouseMove);
        window.addEventListener('mousedown', this._handleMouseDown);
        window.addEventListener('mouseup', this._handleMouseUp);
        window.addEventListener('contextmenu', this._handleContextMenu);

        // Nhận diện thiết bị cảm ứng
        this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (this.isTouchDevice) {
            document.body.classList.add('touch-device');
            
            // Khởi tạo Joystick ảo
            const joyMove = document.getElementById('joystick-move');
            const knobMove = document.getElementById('knob-move');
            const joyAim = document.getElementById('joystick-aim');
            const knobAim = document.getElementById('knob-aim');
            
            if (joyMove && knobMove) this._setupJoystick(joyMove, knobMove, (vec) => { this.joystickMove = vec; });
            if (joyAim && knobAim) this._setupJoystick(joyAim, knobAim, (vec, active) => { this.joystickAim = vec; this.isShooting = active; });

            // Khởi tạo nút ảo
            const bindVirtualBtn = (id, key) => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.keysJustPressed[key] = true; this.keys[key] = true; });
                    btn.addEventListener('touchend', (e) => { e.preventDefault(); this.keys[key] = false; });
                }
            };
            bindVirtualBtn('btn-interact', 'KeyF');
            bindVirtualBtn('btn-inventory', 'KeyE');
            bindVirtualBtn('btn-pause-mobile', 'Escape');
            bindVirtualBtn('btn-dash', 'ShiftLeft');

            // Cho phép chạm vào màn hình game để giả lập click chuột (hữu ích cho Menu Shop)
            window.addEventListener('touchstart', (e) => {
                if (e.target !== this.canvas) return;
                const rect = this.canvas.getBoundingClientRect();
                const scaleX = this.canvas.width / rect.width;
                const scaleY = this.canvas.height / rect.height;
                this.mouse.x = (e.touches[0].clientX - rect.left) * scaleX;
                this.mouse.y = (e.touches[0].clientY - rect.top) * scaleY;
                this.mouse.leftDown = true;
                this.mouse.leftJustPressed = true;
            }, { passive: false });
            window.addEventListener('touchend', () => { this.mouse.leftDown = false; });
        }
        console.log("🎮 InputManager đã được khởi tạo thành công.");
    }

    // --- CÁC HÀM XỬ LÝ SỰ KIỆN NỘI BỘ (PRIVATE) ---

    _handleKeyDown(e) {
        // Nếu đang gõ chat thì bỏ qua phím
        if (document.activeElement && document.activeElement.tagName === 'INPUT') {
            if (e.code === 'Escape') document.activeElement.blur(); // Ấn ESC để thoát chat
            return;
        }

        // Ngăn chặn trình duyệt cuộn trang, quay lại trang trước hoặc nhảy Focus (Tab)
        if (['Space', 'Tab', 'Enter', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
            e.preventDefault();
        }

        if (!this.keys[e.code]) {
            this.keysJustPressed[e.code] = true; // Chỉ gán true ở frame đầu tiên bấm
        }
        this.keys[e.code] = true;
    }

    _handleKeyUp(e) {
        this.keys[e.code] = false;
        this.keysJustPressed[e.code] = false;
    }

    _handleMouseMove(e) {
        if (!this.canvas) return;
        // Tính toán tọa độ chuột tương đối so với canvas (bỏ qua margin/padding của trang web)
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        this.mouse.x = (e.clientX - rect.left) * scaleX;
        this.mouse.y = (e.clientY - rect.top) * scaleY;
    }

    _handleMouseDown(e) {
        if (e.target !== this.canvas) return; // Không bắn đạn khi đang bấm vào UI (Chat, Shop...)
        if (e.button === 0) { // Chuột trái
            if (!this.mouse.leftDown) this.mouse.leftJustPressed = true;
            this.mouse.leftDown = true;
        } else if (e.button === 2) { // Chuột phải
            if (!this.mouse.rightDown) this.mouse.rightJustPressed = true;
            this.mouse.rightDown = true;
        }
    }

    _handleMouseUp(e) {
        if (e.button === 0) {
            this.mouse.leftDown = false;
            this.mouse.leftJustPressed = false;
        } else if (e.button === 2) {
            this.mouse.rightDown = false;
            this.mouse.rightJustPressed = false;
        }
    }

    // --- CÁC HÀM API ĐỂ CÁC CLASS KHÁC GỌI VÀO ---

    _setupJoystick(zoneEl, knobEl, callback) {
        let active = false;
        let touchId = null;
        
        const updateKnob = (touch) => {
            const rect = zoneEl.getBoundingClientRect();
            const maxRadius = rect.width / 2;
            const centerX = rect.left + maxRadius;
            const centerY = rect.top + maxRadius;
            
            let dx = touch.clientX - centerX;
            let dy = touch.clientY - centerY;
            let dist = Math.hypot(dx, dy);
            
            if (dist > maxRadius) { dx = (dx/dist)*maxRadius; dy = (dy/dist)*maxRadius; }
            knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            
            let normX = dx / maxRadius; let normY = dy / maxRadius;
            if (Math.hypot(normX, normY) < 0.15) { normX = 0; normY = 0; } // Deadzone
            callback({ x: normX, y: normY }, true);
        };

        const handleStart = (e) => {
            e.preventDefault();
            if (!active && e.changedTouches.length > 0) {
                active = true; touchId = e.changedTouches[0].identifier; updateKnob(e.changedTouches[0]);
            }
        };
        const handleMove = (e) => {
            e.preventDefault();
            for (let t of e.changedTouches) if (t.identifier === touchId) { updateKnob(t); break; }
        };
        const handleEnd = (e) => {
            for (let t of e.changedTouches) if (t.identifier === touchId) {
                active = false; touchId = null; knobEl.style.transform = `translate(-50%, -50%)`; callback({ x: 0, y: 0 }, false); break;
            }
        };
        zoneEl.addEventListener('touchstart', handleStart, { passive: false });
        zoneEl.addEventListener('touchmove', handleMove, { passive: false });
        zoneEl.addEventListener('touchend', handleEnd, { passive: false });
        zoneEl.addEventListener('touchcancel', handleEnd, { passive: false });
    }

    /**
     * Kiểm tra xem một "hành động" có đang được giữ không (Ví dụ: Đang giữ phím đi tới)
     * @param {string} actionName - Tên hành động (vd: 'move_up')
     * @returns {boolean}
     */
    isActionActive(actionName) {
        const mappedKeys = this.actionMap[actionName];
        if (!mappedKeys) return false;
        // Trả về true nếu BẤT KỲ phím nào trong mảng mappedKeys đang được giữ
        return mappedKeys.some(key => this.keys[key]);
    }

    /**
     * Kiểm tra xem một "hành động" vừa mới được bấm trong frame này không (Ví dụ: Bấm lướt 1 lần)
     * @param {string} actionName 
     * @returns {boolean}
     */
    isActionJustPressed(actionName) {
        const mappedKeys = this.actionMap[actionName];
        if (!mappedKeys) return false;
        return mappedKeys.some(key => this.keysJustPressed[key]);
    }

    /**
     * Lấy vector di chuyển (đã được chuẩn hóa để đi chéo không bị nhanh hơn)
     * @returns {Object} {x, y} giá trị từ -1 đến 1
     */
    getMovementVector() {
        let dx = 0;
        let dy = 0;

        if (this.isActionActive('move_left')) dx -= 1;
        if (this.isActionActive('move_right')) dx += 1;
        if (this.isActionActive('move_up')) dy -= 1;
        if (this.isActionActive('move_down')) dy += 1;

        if (dx !== 0 || dy !== 0) {
            // Chuẩn hóa vector (Normalize) để vận tốc đi chéo = vận tốc đi thẳng
            if (dx !== 0 && dy !== 0) {
                const length = Math.sqrt(dx * dx + dy * dy);
                dx /= length;
                dy /= length;
            }
        } else {
            // Ưu tiên Joystick nếu không có bất kỳ phím nào được bấm
            dx = this.joystickMove?.x || 0;
            dy = this.joystickMove?.y || 0;
        }

        return { x: dx, y: dy };
    }

    /**
     * Hàm này PHẢI được gọi ở cuối mỗi vòng lặp game (Game Loop)
     * Để reset lại trạng thái "Vừa mới bấm" (JustPressed)
     */
    update() {
        // Reset bàn phím
        for (let key in this.keysJustPressed) {
            this.keysJustPressed[key] = false;
        }
        // Reset chuột
        this.mouse.leftJustPressed = false;
        this.mouse.rightJustPressed = false;
    }

    /**
     * Dọn dẹp bộ nhớ nếu cần thiết (khi chuyển scene hoặc thoát game)
     */
    destroy() {
        window.removeEventListener('keydown', this._handleKeyDown);
        window.removeEventListener('keyup', this._handleKeyUp);
        window.removeEventListener('mousemove', this._handleMouseMove);
        window.removeEventListener('mousedown', this._handleMouseDown);
        window.removeEventListener('mouseup', this._handleMouseUp);
        window.removeEventListener('contextmenu', this._handleContextMenu);
    }
}