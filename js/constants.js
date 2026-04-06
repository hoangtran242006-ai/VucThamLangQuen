// js/constants.js

export let CANVAS_WIDTH = 800;
export let CANVAS_HEIGHT = 600;

export function setCanvasSize(w, h) {
    CANVAS_WIDTH = w;
    CANVAS_HEIGHT = h;
}

// Kích thước của một ô gạch (Tile) trên bản đồ
export const TILE_SIZE = 40; 

// Kích thước bản đồ thực tế (Ví dụ map rộng 40x40 ô = 1600x1600 pixels)
export const MAP_COLS = 40;
export const MAP_ROWS = 40;
export const MAP_WIDTH = MAP_COLS * TILE_SIZE;
export const MAP_HEIGHT = MAP_ROWS * TILE_SIZE;

// Các loại định danh (ID) cho Tile trên Map (Phong cách Stardew Valley)
export const TILE_TYPES = {
    GRASS: 0,   // Cỏ (Có thể đi qua)
    DIRT: 1,    // Đất (Có thể đi qua)
    WATER: 2,   // Nước (Không thể đi qua)
    TREE: 3,    // Cây cối / Rừng chướng ngại vật (Không thể đi qua)
    ROCK: 4,    // Vách đá hầm ngục (Không thể đi qua)
    PATH: 5     // Đường mòn (Có thể đi qua)
};

// Khung hình trên giây (FPS) giới hạn
export const FPS = 60;
export const FRAME_TIME = 1000 / FPS;