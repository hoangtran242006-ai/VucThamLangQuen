// js/rng.js
// Thuật toán Sinh số ngẫu nhiên theo Hạt giống (Seeded RNG)

export const RNG = {
    originalRandom: Math.random,
    seed: 0,
    
    // Kích hoạt đồng bộ trước khi tạo Map / Quái / Rương
    beginSync(waveNumber) {
        // Cố định Hạt giống theo Tầng (Wave) để mọi người chơi đều sinh ra chung 1 bản đồ vĩnh viễn
        this.seed = 1337 + waveNumber * 999; 
        
        Math.random = () => {
            this.seed = (this.seed * 9301 + 49297) % 233280;
            return this.seed / 233280;
        };
    },
    
    // Trả lại ngẫu nhiên bình thường cho các Hiệu ứng (VFX)
    endSync() {
        Math.random = this.originalRandom;
    }
};