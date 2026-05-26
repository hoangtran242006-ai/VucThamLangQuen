// js/db.js
// Tự động nhận diện domain/IP hiện tại (Hỗ trợ Localhost, LAN, và Web Link)
const SERVER_URL = window.location.origin;

// --- HỆ THỐNG TÀI KHOẢN ---
export function isLoggedIn() {
    return localStorage.getItem('vucthamlangquen_logged_in') === 'true';
}

export async function registerAccount(username, password) {
    try {
        const res = await fetch(`${SERVER_URL}/api/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('vucthamlangquen_device_id', data.id);
            localStorage.setItem('vucthamlangquen_player_name', data.username);
            localStorage.setItem('vucthamlangquen_logged_in', 'true');
            return { success: true };
        }
        return { success: false, error: data.error };
    } catch (e) { return { success: false, error: "Lỗi kết nối máy chủ" }; }
}

export async function loginAccount(username, password) {
    try {
        const res = await fetch(`${SERVER_URL}/api/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('vucthamlangquen_device_id', data.id);
            localStorage.setItem('vucthamlangquen_player_name', data.username);
            localStorage.setItem('vucthamlangquen_logged_in', 'true');
            return { success: true };
        }
        return { success: false, error: data.error };
    } catch (e) { return { success: false, error: "Lỗi kết nối máy chủ" }; }
}

export function logoutAccount() {
    localStorage.removeItem('vucthamlangquen_device_id');
    localStorage.removeItem('vucthamlangquen_logged_in');
}

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
            body: JSON.stringify({ id: playerId, data: data })
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
        return [];
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

// --- HỆ THỐNG HÒM THƯ (MAILBOX API) ---
export async function getMailboxAPI() {
    try {
        const response = await fetch(`${SERVER_URL}/api/mail/${getDeviceId()}`);
        if (response.ok) return await response.json();
        return [];
    } catch (e) {
        console.error("⚠️ Lỗi tải Hòm thư:", e);
    }
    return [];
}

export async function claimMailAPI(mailId) {
    try {
        const response = await fetch(`${SERVER_URL}/api/mail/claim`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: getDeviceId(), mailId })
        });
        return await response.json();
    } catch (e) { console.error("⚠️ Lỗi nhận quà:", e); }
    return { success: false, error: "Lỗi kết nối máy chủ" };
}

export async function sendAdminMailAPI(target, title, content, gold, souls) {
    try {
        const response = await fetch(`${SERVER_URL}/api/admin/mail`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target, title, content, gold, souls })
        });
        return await response.json();
    } catch (e) { console.error("⚠️ Lỗi gửi thư Admin:", e); }
    return { success: false, error: "Lỗi kết nối máy chủ" };
}
