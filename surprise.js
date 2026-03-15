/* ===== SURPRISE.JS – CAKE BIRTHDAY REDESIGN ===== */
// ===== SURPRISE PAGE JS =====

if (sessionStorage.getItem('game_cleared') !== 'true') {
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const navUser = document.getElementById('navUser');
    if (navUser) {
        navUser.textContent = '👋 ' + (sessionStorage.getItem('display_name') || 'JEN 💕');
    }
});

'use strict';

// ==============================================================
//  CONFIG
// ==============================================================
const CFG = {
    BIRTHDAY_MONTH: 3,    // ← เดือนวันเกิด
    BIRTHDAY_DAY: 15,   // ← วันเกิด
    CANDLE_COUNT: 5,
};

// ==============================================================
//  CANVAS SETUP
// ==============================================================
const fwCvs = document.getElementById('fireworksCanvas');
const fwCtx = fwCvs.getContext('2d');
const cfCvs = document.getElementById('confettiCanvas');
const cfCtx = cfCvs.getContext('2d');

function resizeCvs() {
    fwCvs.width = cfCvs.width = window.innerWidth;
    fwCvs.height = cfCvs.height = window.innerHeight;
}
resizeCvs();
window.addEventListener('resize', resizeCvs);

// ==============================================================
//  BACKGROUND FLOATS  (hearts/stars always present)
// ==============================================================
(function initBgFloats() {
    const items = ['❤️', '💕', '💖', '🌸', '⭐', '✨', '💫', '🌟', '💗'];
    const c = document.getElementById('bgFloats');
    for (let i = 0; i < 22; i++) {
        const el = document.createElement('div');
        el.className = 'bf';
        el.textContent = items[Math.floor(Math.random() * items.length)];
        el.style.cssText = `
            left:${Math.random() * 100}%;
            animation-duration:${Math.random() * 10 + 12}s;
            animation-delay:${Math.random() * 10}s;
            font-size:${Math.random() * 1.2 + 0.9}rem;
        `;
        c.appendChild(el);
    }
})();

// ==============================================================
//  CANDLE BLOW
// ==============================================================
let blownCount = 0;
const totalCandles = CFG.CANDLE_COUNT;
const flameWraps = document.querySelectorAll('.flame-wrap');
const candleUnits = document.querySelectorAll('.candle-unit');
const blowInstr = document.getElementById('blowInstruction');
const blownMsg = document.getElementById('blownMsg');
const scrollHint = document.getElementById('scrollHint');

candleUnits.forEach((unit, i) => {
    unit.addEventListener('click', () => {
        const fw = unit.querySelector('.flame-wrap');
        if (fw.classList.contains('blown')) return;
        fw.classList.add('blown');
        blownCount++;

        // puff
        showPuff(unit);

        // play small pop sound via AudioContext
        playPop();

        if (blownCount === totalCandles) {
            allCandlesBlown();
        }
    });
});

function showPuff(el) {
    const puff = document.createElement('div');
    puff.style.cssText = `
        position:fixed; font-size:1.8rem; pointer-events:none; z-index:9998;
        animation: puffUp 0.9s ease forwards;
    `;
    puff.textContent = '💨';
    addTmpStyle('@keyframes puffUp{0%{opacity:1;transform:translateY(0)scale(1)}100%{opacity:0;transform:translateY(-70px)scale(2)}}', 'puffStyle');
    const r = el.getBoundingClientRect();
    puff.style.left = (r.left + r.width / 2 - 14) + 'px';
    puff.style.top = (r.top - 20) + 'px';
    document.body.appendChild(puff);
    setTimeout(() => puff.remove(), 900);
}

function allCandlesBlown() {
    blowInstr.style.display = 'none';
    blownMsg.style.display = 'block';

    // Show fireworks
    fwCvs.style.display = 'block';
    cfCvs.style.display = 'block';
    launchFireworks(40);
    launchConfetti();

    // Auto music
    playMusic();

    // Show scroll hint
    setTimeout(() => {
        scrollHint.style.opacity = '1';
        scrollHint.style.pointerEvents = 'auto';
    }, 2000);

    // Show content after a bit
    setTimeout(() => {
        const cs = document.getElementById('contentSections');
        cs.style.display = 'block';
        cs.style.animation = 'fadeIn 1s ease';
        initFooterHearts();
    }, 1000);

    // Stop fireworks after 5s
    setTimeout(() => {
        fwCvs.style.display = 'none';
        cfCvs.style.display = 'none';
        stopFireworks();
        stopConfetti();
    }, 5000);
}

// ==============================================================
//  FIREWORKS
// ==============================================================
let fwAnim, fwArr = [];

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        const a = Math.random() * Math.PI * 2;
        const s = Math.random() * 6 + 2;
        this.vx = Math.cos(a) * s; this.vy = Math.sin(a) * s;
        this.alpha = 1; this.size = Math.random() * 3 + 1;
        this.color = color; this.gravity = 0.09;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vy += this.gravity;
        this.alpha -= 0.016;
        this.vx *= 0.97; this.vy *= 0.97;
    }
    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class FW {
    constructor() {
        this.x = Math.random() * fwCvs.width;
        this.y = fwCvs.height;
        this.tx = Math.random() * fwCvs.width * 0.8 + fwCvs.width * 0.1;
        this.ty = Math.random() * fwCvs.height * 0.45 + 60;
        const ang = Math.atan2(this.ty - this.y, this.tx - this.x);
        const sp = Math.random() * 5 + 7;
        this.vx = Math.cos(ang) * sp; this.vy = Math.sin(ang) * sp;
        this.hue = Math.random() * 360;
        this.exploded = false; this.alpha = 1; this.trail = [];
        this.particles = [];
    }
    update() {
        if (!this.exploded) {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > 10) this.trail.shift();
            this.x += this.vx; this.y += this.vy;
            if (Math.hypot(this.tx - this.x, this.ty - this.y) < 8) {
                this.exploded = true;
                // burst
                for (let i = 0; i < 80; i++) {
                    const col = `hsl(${this.hue + Math.random() * 40 - 20},100%,65%)`;
                    this.particles.push(new Particle(this.x, this.y, col));
                }
                // sparkle ring
                for (let i = 0; i < 20; i++) {
                    const a = (Math.PI * 2 / 20) * i;
                    const p = new Particle(this.x, this.y, '#fff');
                    p.vx = Math.cos(a) * 3; p.vy = Math.sin(a) * 3;
                    p.size = 1.5; p.alpha = 0.8;
                    this.particles.push(p);
                }
            }
        } else {
            this.particles.forEach(p => p.update());
            this.particles = this.particles.filter(p => p.alpha > 0.02);
            if (!this.particles.length) this.alpha = 0;
        }
    }
    draw(ctx) {
        if (!this.exploded) {
            this.trail.forEach((t, i) => {
                ctx.globalAlpha = (i / this.trail.length) * 0.5;
                ctx.fillStyle = `hsl(${this.hue},100%,65%)`;
                ctx.beginPath(); ctx.arc(t.x, t.y, 2.5, 0, Math.PI * 2); ctx.fill();
            });
            ctx.globalAlpha = 1;
            ctx.fillStyle = `hsl(${this.hue},100%,70%)`;
            ctx.beginPath(); ctx.arc(this.x, this.y, 3.5, 0, Math.PI * 2); ctx.fill();
        } else {
            this.particles.forEach(p => p.draw(ctx));
        }
    }
}

function launchFireworks(count = 25) {
    let n = 0;
    const burst = () => {
        fwArr.push(new FW());
        if (++n < count) setTimeout(burst, 150 + Math.random() * 100);
    };
    burst();
    animFW();
}
function animFW() {
    fwCtx.clearRect(0, 0, fwCvs.width, fwCvs.height);
    fwArr.forEach(fw => { fw.update(); fw.draw(fwCtx); });
    fwArr = fwArr.filter(fw => fw.alpha > 0);
    fwAnim = requestAnimationFrame(animFW);
}
function stopFireworks() { cancelAnimationFrame(fwAnim); fwCtx.clearRect(0, 0, fwCvs.width, fwCvs.height); }

// ==============================================================
//  CONFETTI
// ==============================================================
let cfAnim, confetti = [];
class Conf {
    constructor() { this.reset(); }
    reset() {
        this.x = Math.random() * cfCvs.width; this.y = -12;
        this.w = Math.random() * 14 + 4; this.h = Math.random() * 7 + 3;
        this.color = `hsl(${Math.random() * 360},90%,65%)`;
        this.angle = Math.random() * Math.PI * 2;
        this.rot = (Math.random() - .5) * .18;
        this.speed = Math.random() * 4 + 1.5;
    }
    update() {
        this.y += this.speed; this.x += Math.sin(this.angle) * 1.8; this.angle += this.rot;
        if (this.y > cfCvs.height + 20) this.reset();
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.fillStyle = this.color; ctx.globalAlpha = 0.85;
        ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
        ctx.restore();
    }
}
function launchConfetti() {
    confetti = Array.from({ length: 150 }, () => new Conf());
    (function anim() {
        cfCtx.clearRect(0, 0, cfCvs.width, cfCvs.height);
        confetti.forEach(c => { c.update(); c.draw(cfCtx); });
        cfAnim = requestAnimationFrame(anim);
    })();
}
function stopConfetti() { cancelAnimationFrame(cfAnim); cfCtx.clearRect(0, 0, cfCvs.width, cfCvs.height); }

// ==============================================================
//  MUSIC
// ==============================================================
const audio = document.getElementById('bgAudio');
const fab = document.getElementById('musicFab');
let musicOn = false;

function playMusic() {
    audio.play()
        .then(() => { musicOn = true; fab.classList.add('playing'); })
        .catch(() => {
            // Autoplay blocked → show FAB pulse to invite user to tap
            fab.style.animation = 'fabSpin 0s, lovePulse 1s ease-in-out infinite';
        });
}

fab.addEventListener('click', () => {
    if (musicOn) {
        audio.pause();
        musicOn = false;
        fab.classList.remove('playing');
    } else {
        audio.play().then(() => { musicOn = true; fab.classList.add('playing'); });
    }
});

// Add lovePulse keyframe
addTmpStyle('@keyframes lovePulse{0%,100%{box-shadow:0 4px 20px rgba(255,107,157,.4)}50%{box-shadow:0 4px 40px rgba(255,107,157,.9),0 0 60px rgba(255,107,157,.5)}}', 'lovePulseStyle');

// ==============================================================
//  WEB AUDIO POP  (tiny click when blowing a candle)
// ==============================================================
let audioCtx;
function playPop() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc.start(); osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) { }
}


// ==============================================================
//  LOVE LETTER ENVELOPE
// ==============================================================
document.getElementById('openLetterBtn').addEventListener('click', function () {
    document.getElementById('envelope').classList.add('open');
    this.classList.add('hidden');
    fwCvs.style.display = 'block';
    launchFireworks(8);
    setTimeout(() => { fwCvs.style.display = 'none'; stopFireworks(); }, 2500);
});

// ==============================================================
//  FOOTER HEARTS
// ==============================================================
function initFooterHearts() {
    const c = document.getElementById('footerHearts');
    ['❤️','💕','💖','💗','💝'].forEach((h, i) => {
        const el = document.createElement('div');
        el.className = 'hf'; el.textContent = h;
        el.style.cssText = `left:${10 + i * 18}%;animation-duration:${2 + i * .5}s;animation-delay:${i * .4}s;`;
        c.appendChild(el);
    });
}

// ==============================================================
//  CLICK SPARKLES
// ==============================================================
document.addEventListener('click', e => {
    if (e.target.closest('.candle-unit') || e.target.closest('button') || e.target.closest('a')) return;
    const s = document.createElement('div');
    s.textContent = ['✨', '💕', '⭐', '🌸', '💫'][Math.floor(Math.random() * 5)];
    s.style.cssText = `position:fixed;left:${e.clientX - 12}px;top:${e.clientY - 12}px;font-size:1.4rem;pointer-events:none;z-index:9999;animation:sparkUp .7s ease forwards;`;
    addTmpStyle('@keyframes sparkUp{0%{opacity:1;transform:scale(1) translateY(0)}100%{opacity:0;transform:scale(.4) translateY(-45px)}}', 'sparkStyle');
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 700);
});

// ==============================================================
//  SCROLL HINT SMOOTH SCROLL
// ==============================================================
document.getElementById('scrollHint').addEventListener('click', () => {
    document.getElementById('contentSections').scrollIntoView({ behavior: 'smooth' });
});

// ==============================================================
//  HELPER  – inject temp <style>
// ==============================================================
function addTmpStyle(css, id) {
    if (document.getElementById(id)) return;
    const st = document.createElement('style');
    st.id = id; st.textContent = css;
    document.head.appendChild(st);
}
