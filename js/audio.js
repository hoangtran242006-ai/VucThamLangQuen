// js/audio.js
// Sử dụng Web Audio API để tạo hiệu ứng âm thanh Retro (8-bit) không cần file ngoài

export const AudioManager = {
    ctx: null,
    muted: false,
    
    init() {
        if (!this.ctx) {
            try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } 
            catch(e) { console.warn("Trình duyệt không hỗ trợ Web Audio API"); }
        }
    },

    setMute(isMuted) {
        this.muted = isMuted;
    },

    play(type) {
        if (this.muted || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(()=>{});

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        const volBase = 0.05; // Âm lượng cơ bản vừa đủ nghe

        try {
            if (type === 'shoot') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(400 + Math.random()*100, t);
                osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
                gain.gain.setValueAtTime(volBase, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                osc.start(t); osc.stop(t + 0.1);
            } else if (type === 'hit') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150 + Math.random()*50, t);
                osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
                gain.gain.setValueAtTime(volBase * 1.5, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                osc.start(t); osc.stop(t + 0.1);
            } else if (type === 'coin') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200 + Math.random()*200, t);
                osc.frequency.setValueAtTime(1600 + Math.random()*200, t + 0.05);
                gain.gain.setValueAtTime(volBase * 0.8, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.2);
                osc.start(t); osc.stop(t + 0.2);
            } else if (type === 'exp') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800 + Math.random()*100, t);
                gain.gain.setValueAtTime(volBase * 0.5, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
                osc.start(t); osc.stop(t + 0.1);
            } else if (type === 'chest') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(300, t);
                osc.frequency.setValueAtTime(500, t + 0.1);
                osc.frequency.setValueAtTime(700, t + 0.2);
                gain.gain.setValueAtTime(volBase * 1.5, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.4);
                osc.start(t); osc.stop(t + 0.4);
            } else if (type === 'click') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, t);
                gain.gain.setValueAtTime(volBase * 1.2, t);
                gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
                osc.start(t); osc.stop(t + 0.05);
            } else if (type === 'error') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, t);
                gain.gain.setValueAtTime(volBase * 1.5, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.2);
                osc.start(t); osc.stop(t + 0.2);
            }
        } catch(e) {}
    }
};