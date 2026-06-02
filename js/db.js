// js/db.js
// Tự động nhận diện domain/IP hiện tại (Hỗ trợ Localhost, LAN, và Web Link)
const SERVER_URL = window.location.origin;

// Lấy hoặc tạo ID thiết bị duy nhất
export function getDeviceId() {
    let id = localStorage.getItem('vucthamlangquen_device_id');
    if (!id) {
        id = 'player_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem('vucthamlangquen_device_id', id);
    }
    return id;
}

export function checkAndPromptPlayerName() {
    let name = localStorage.getItem('vucthamlangquen_player_name');
    if (!name) {
        name = prompt("Nhập Tên Hiệp Sĩ của bạn để ghi danh lên Bảng Xếp Hạng:") || "Ẩn danh";
        localStorage.setItem('vucthamlangquen_player_name', name);
    }
    return name;
}

export function changePlayerName() {
    let name = prompt("Nhập Tên Hiệp Sĩ mới của bạn:", getPlayerName());
    if (name) {
        localStorage.setItem('vucthamlangquen_player_name', name);
    }
    return getPlayerName();
}

export function getPlayerName() {
    return localStorage.getItem('vucthamlangquen_player_name') || "Ẩn danh";
}

export async function syncDataToCloud(data) {
    try {
        const playerId = getDeviceId();
        data.playerName = getPlayerName();
        await fetch(`${SERVER_URL}/api/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: playerId, data: data }),
            keepalive: true // Đảm bảo tín hiệu được truyền đi kể cả khi tắt tab / ấn F5
        });
    } catch (e) {
        console.error("⚠️ Lỗi đồng bộ Server:", e);
    }
}

export async function loadDataFromCloud() {
    try {
        const response = await fetch(`${SERVER_URL}/api/load/${getDeviceId()}`);
        if (response.ok) return await response.json();
    } catch (e) {
        console.error("⚠️ Lỗi tải dữ liệu Server:", e);
    }
    return null;
}

export async function getTopPlayers() {
    try {
        const response = await fetch(`${SERVER_URL}/api/leaderboard`);
        if (response.ok) return await response.json();
    } catch (e) {
        console.error("⚠️ Lỗi lấy Bảng xếp hạng:", e);
    }
    return [];
}

export async function getAllPlayersAdmin() {
    try {
        const response = await fetch(`${SERVER_URL}/api/admin/players`);
        if (response.ok) return await response.json();
    } catch (e) {
        console.error("⚠️ Lỗi lấy dữ liệu Admin:", e);
        return [];
    }
}

export async function updatePlayerAdmin(playerId, data) {
    try {
        await fetch(`${SERVER_URL}/api/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: playerId, data: data })
        });
    } catch (e) {
        console.error("⚠️ Lỗi cập nhật Admin:", e);
    }
}

export async function registerAccount(username, password) {
    try {
        const response = await fetch(`${SERVER_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // BẮT BUỘC GỬI ID KHÁCH LÊN ĐỂ CHUYỂN THÀNH ID CHÍNH THỨC
            body: JSON.stringify({ username, password, playerId: getDeviceId() }) 
        });
        const data = await response.json();
        if (data.success) {
            localStorage.setItem('vucthamlangquen_player_name', data.username);
            return { success: true };
        }
        return { success: false, error: data.error };
    } catch (e) {
        return { success: false, error: "Không thể kết nối máy chủ" };
    }
}

export async function loginAccount(username, password) {
    try {
        const response = await fetch(`${SERVER_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (data.success) {
            localStorage.setItem('vucthamlangquen_player_name', data.username);
            // CỰC KỲ QUAN TRỌNG: Ghi đè ID Khách bằng ID Tài khoản lấy từ trên mây về
            localStorage.setItem('vucthamlangquen_device_id', data.id); 
            return { success: true, id: data.id };
        }
        return { success: false, error: data.error };
    } catch (e) {
        return { success: false, error: "Không thể kết nối máy chủ" };
    }
}
