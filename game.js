/* ===== GAME.JS – BALLOON POP BIRTHDAY GAME ===== */
'use strict';

// ===== GAME LOGIC =====
if (sessionStorage.getItem('logged_in') !== 'true') {
    window.location.href = 'index.html';
}

// ==============================================================
//  CONSTANTS
// ==============================================================
const TARGET = 60;    // balloons to pop
const GAME_SEC = 50;    // seconds to beat
const RING_CIRC = 2 * Math.PI * 34;  // SVG ring circumference

// balloon pools
const REGULAR_EMOJIS = ['🎈', '🎈', '🎈', '🎈', '🎈', '🎈', '🎁', '🌸', '💕', '💖'];
const SPECIAL_EMOJIS = ['⭐', '🌟', '💫', '🏆'];   // 2× points
const BOMB_EMOJI = '💣';

// ==============================================================
//  STATE
// ==============================================================
let popped = 0;
let score = 0;
let timeLeft = GAME_SEC;
let timerID = null;
let spawnID = null;
let running = false;
let comboCount = 0;
let comboTimer = null;

// ==============================================================
//  ELEMENTS
// ==============================================================
const introScreen = document.getElementById('introScreen');
const gameScreen = document.getElementById('gameScreen');
const winScreen = document.getElementById('winScreen');
const loseScreen = document.getElementById('loseScreen');
const arena = document.getElementById('arena');
const arenaHint = document.getElementById('arenaHint');
const ringFill = document.getElementById('ringFill');
const hudSecs = document.getElementById('hudSecs');
const hudPopped = document.getElementById('hudPopped');
const hudScore = document.getElementById('hudScore');
const progressFill = document.getElementById('progressFill');
const progressTxt = document.getElementById('progressTxt');
const progressCake = document.getElementById('progressCake');
const comboDisplay = document.getElementById('comboDisplay');

// win screen
const finalScore = document.getElementById('finalScore');
const finalPopped = document.getElementById('finalPopped');
const finalTime = document.getElementById('finalTime');
// lose screen
const losePopped = document.getElementById('losePopped');

// ==============================================================
//  BACKGROUND CANVAS
// ==============================================================
const bgCvs = document.getElementById('bgCanvas');
const bgCtx = bgCvs.getContext('2d');
bgCvs.width = window.innerWidth; bgCvs.height = window.innerHeight;
window.addEventListener('resize', () => {
    bgCvs.width = window.innerWidth; bgCvs.height = window.innerHeight;
});

// floating stars background
const bgStars = Array.from({ length: 80 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: Math.random() * 2 + 0.5,
    s: Math.random() * .4 + .1,
    col: `hsl(${Math.random() * 360},90%,70%)`,
    dy: Math.random() * .15 + .05
}));
(function bgLoop() {
    bgCtx.clearRect(0, 0, bgCvs.width, bgCvs.height);
    bgStars.forEach(s => {
        bgCtx.beginPath();
        bgCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        bgCtx.fillStyle = s.col;
        bgCtx.globalAlpha = s.s;
        bgCtx.fill();
        bgCtx.globalAlpha = 1;
        s.y -= s.dy;
        if (s.y < -s.r) { s.y = bgCvs.height + s.r; s.x = Math.random() * bgCvs.width; }
    });
    requestAnimationFrame(bgLoop);
})();

// ==============================================================
//  AUDIO (Web Audio API)
// ==============================================================
let actx;
function getActx() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    return actx;
}
function playPop(type = 'normal') {
    try {
        const ctx = getActx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        if (type === 'special') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(1200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + .15);
            gain.gain.setValueAtTime(.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .2);
            osc.start(); osc.stop(ctx.currentTime + .2);
        } else if (type === 'bomb') {
            const noise = ctx.createBufferSource();
            const buf = ctx.createBuffer(1, ctx.sampleRate * .3, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * .5;
            noise.buffer = buf;
            const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 200;
            noise.connect(lp); lp.connect(gain); gain.connect(ctx.destination);
            gain.gain.setValueAtTime(.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .3);
            noise.start(); noise.stop(ctx.currentTime + .3);
        } else {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(900, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + .15);
            gain.gain.setValueAtTime(.18, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .2);
            osc.start(); osc.stop(ctx.currentTime + .2);
        }
    } catch (e) { }
}

function playWin() {
    try {
        const ctx = getActx();
        [523, 659, 784, 1046].forEach((freq, i) => {
            const osc = ctx.createOscillator(), g = ctx.createGain();
            osc.connect(g); g.connect(ctx.destination);
            osc.type = 'triangle'; osc.frequency.value = freq;
            g.gain.setValueAtTime(0, ctx.currentTime + i * .15);
            g.gain.linearRampToValueAtTime(.25, ctx.currentTime + i * .15 + .05);
            g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + i * .15 + .4);
            osc.start(ctx.currentTime + i * .15);
            osc.stop(ctx.currentTime + i * .15 + .5);
        });
    } catch (e) { }
}

// ==============================================================
//  START / RESTART
// ==============================================================
document.getElementById('startBtn').addEventListener('click', () => {
    introScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    gameScreen.style.flexDirection = 'column';
    startGame();
});
document.getElementById('retryBtn').addEventListener('click', () => {
    loseScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    startGame();
});

function startGame() {
    popped = 0; score = 0; timeLeft = GAME_SEC; running = true;
    comboCount = 0;
    hudPopped.textContent = '0'; hudScore.textContent = '0';
    hudSecs.textContent = GAME_SEC;
    progressFill.style.width = '0%';
    progressTxt.textContent = `0 / ${TARGET}`;
    progressCake.style.right = '-12px';
    progressCake.style.filter = 'grayscale(1) brightness(.6)';
    ringFill.style.strokeDashoffset = '0';
    ringFill.classList.remove('urgent');
    arenaHint.style.display = 'block';
    // clear arena
    arena.querySelectorAll('.balloon').forEach(b => b.remove());

    // Play BGM (volume lowered just a bit so pops can be heard)
    const bgm = document.getElementById('bgMusic');
    if (bgm) {
        bgm.volume = 0.4;
        bgm.currentTime = 0;
        bgm.play().catch(e => console.log('Audio autoplay prevented'));
    }

    startTimer();
    scheduleSpawn();
}

// ==============================================================
//  TIMER
// ==============================================================
function startTimer() {
    clearInterval(timerID);
    timerID = setInterval(() => {
        if (!running) return;
        timeLeft--;
        hudSecs.textContent = timeLeft;
        // ring
        const pct = timeLeft / GAME_SEC;
        ringFill.style.strokeDashoffset = RING_CIRC * (1 - pct);
        if (timeLeft <= 15) ringFill.classList.add('urgent');
        if (timeLeft <= 0) { clearInterval(timerID); running = false; endGame(false); }
    }, 1000);
}

// ==============================================================
//  BALLOON SPAWNER
// ==============================================================
function scheduleSpawn() {
    clearTimeout(spawnID);
    if (!running) return;
    // MEDIUM SPAWN: Starts at 400ms, drops to 200ms
    const delay = Math.max(200, 400 - (popped * 2));
    spawnID = setTimeout(() => { spawnBalloon(); scheduleSpawn(); }, delay);
}

function spawnBalloon() {
    if (!running) return;
    const arRect = arena.getBoundingClientRect();
    const w = arRect.width, h = arRect.height;
    if (w < 1 || h < 1) return;

    // determine type – more bombs & specials for higher difficulty
    const rand = Math.random();
    let type, emoji;
    if (rand < .10) {                 // 10% bomb
        type = 'bomb'; emoji = BOMB_EMOJI;
    } else if (rand < .25) {          // 15% special
        type = 'special'; emoji = SPECIAL_EMOJIS[Math.floor(Math.random() * SPECIAL_EMOJIS.length)];
    } else {
        type = 'normal'; emoji = REGULAR_EMOJIS[Math.floor(Math.random() * REGULAR_EMOJIS.length)];
    }

    const el = document.createElement('div');
    el.className = 'balloon' + (type === 'special' ? ' special' : '') + (type === 'bomb' ? ' bomb' : '');
    el.dataset.type = type;

    const size = type === 'special' ? 3.4 : type === 'bomb' ? 2.6 : (Math.random() * 1 + 2.5);
    el.style.fontSize = size + 'rem';

    // Start coordinates (Bottom edge only)
    const startX = Math.random() * (w - 60) + 10;
    const startY = h + 80;

    el.style.left = startX + 'px';
    el.style.top = startY + 'px';
    el.style.bottom = 'auto'; // override CSS default
    el.style.animation = 'none'; // disable CSS animation
    el.style.transformOrigin = 'center bottom';

    el.innerHTML = `${emoji}<div class="string"></div>`;

    // MEDIUM SPEED: 2.5 - 4.5s
    const dur = type === 'bomb' ? (Math.random() * 1.5 + 2.0) : (Math.random() * 2.0 + 2.5);

    // Target (Straight up to the very top edge of arena)
    const topY = -80;
    const transY = topY - startY;

    // Use Web Animations API
    const anim = el.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(0, ${transY}px) scale(0.9)`, opacity: 0.2 }
    ], {
        duration: dur * 1000,
        easing: 'linear',
        fill: 'forwards'
    });

    anim.onfinish = () => {
        el.remove();
        if (running) {
            // Auto explode at top (visual only, no points)
            const sx = arRect.left + startX + 25; // center of balloon X
            const sy = Math.max(arRect.top + 30, 0); // show burst just below top edge
            burstAt(sx, sy, 'missed');
        }
    };

    el.addEventListener('click', (e) => {
        e.stopPropagation();
        anim.cancel(); // Stop animation 
        onBalloonClick(el, type, e);
    });

    arena.appendChild(el);
    arenaHint.style.display = 'none';
}

// ==============================================================
//  CLICK HANDLER
// ==============================================================
function onBalloonClick(el, type, e) {
    if (!running) return;
    if (type === 'bomb') {
        // bomb hit – lose 10 seconds
        timeLeft = Math.max(0, timeLeft - 15);  // -15s penalty (was -10s)
        hudSecs.textContent = timeLeft;
        playPop('bomb');
        showFloatingText(e.clientX, e.clientY, '-10s ⏰', '#ff4060');
        el.style.animation = 'none'; el.remove();
        // shake HUD
        document.querySelector('.g-hud').style.animation = 'none';
        void document.querySelector('.g-hud').offsetWidth;
        document.querySelector('.g-hud').style.animation = 'hudShake .4s ease';
        addTmpStyle('@keyframes hudShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}', 'hudShakeStyle');
        comboCount = 0; clearTimeout(comboTimer);
        return;
    }

    // normal / special
    const pts = type === 'special' ? 20 : 10;

    // combo
    comboCount++;
    clearTimeout(comboTimer);
    comboTimer = setTimeout(() => { comboCount = 0; }, 1200);

    const multiplier = comboCount >= 5 ? 3 : comboCount >= 3 ? 2 : 1;
    const gained = pts * multiplier;
    score += gained;
    popped++;

    hudScore.textContent = score;
    hudPopped.textContent = popped;
    updateProgress();

    playPop(type);
    burstAt(e.clientX, e.clientY, type);
    showFloatingText(e.clientX, e.clientY, `+${gained}`, type === 'special' ? '#ffd700' : '#ff6b9d');

    if (multiplier >= 2) showCombo(comboCount, multiplier);

    el.style.animation = 'none';
    el.remove();

    if (popped >= TARGET) { running = false; clearInterval(timerID); clearTimeout(spawnID); endGame(true); }
}

// ==============================================================
//  PROGRESS BAR
// ==============================================================
function updateProgress() {
    const pct = Math.min(100, (popped / TARGET) * 100);
    progressFill.style.width = pct + '%';
    progressTxt.textContent = `${popped} / ${TARGET}`;
    // cake position
    const track = document.querySelector('.progress-track');
    const trackW = track.offsetWidth;
    const pos = (pct / 100) * (trackW - 24);
    progressCake.style.right = (trackW - pos - 24) + 'px';
    if (pct >= 100) progressFill.classList.add('done');
}

// ==============================================================
//  BURST ANIMATION
// ==============================================================
function burstAt(cx, cy, type) {
    const burst = document.createElement('div');
    burst.className = 'burst';
    burst.style.cssText = `left:${cx}px;top:${cy}px;`;

    // ring
    const ring = document.createElement('div');
    ring.className = 'burst-ring';
    ring.style.borderColor = type === 'special' ? '#ffd700' : '#ff6b9d';
    burst.appendChild(ring);

    // emoji particles
    const emojis = type === 'special' ? ['⭐', '💫', '✨'] : ['💥', '🎊', '✨'];
    emojis.forEach((em, i) => {
        const e2 = document.createElement('div');
        e2.className = 'burst-emoji';
        e2.textContent = em;
        const angle = (Math.PI * 2 / emojis.length) * i - Math.PI / 2;
        const d = 50;
        e2.style.cssText = `
            left:${Math.cos(angle) * d}px; top:${Math.sin(angle) * d}px;
            position:absolute; font-size:1.3rem;
            animation:burstPart .6s ease forwards;
        `;
        addTmpStyle(`@keyframes burstPart{
            from{opacity:1;transform:translate(0,0) scale(1)}
            to{opacity:0;transform:translate(${Math.cos(angle) * 60}px,${Math.sin(angle) * 60}px) scale(.3)}
        }`, 'burstPartStyle');
        burst.appendChild(e2);
    });

    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), 700);
}

// ==============================================================
//  FLOATING TEXT
// ==============================================================
function showFloatingText(x, y, text, color) {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = `
        position:fixed; left:${x}px; top:${y}px;
        font-size:1.4rem; font-weight:900; color:${color};
        pointer-events:none; z-index:9999;
        text-shadow:0 0 10px ${color};
        animation:floatTxt .7s ease forwards;
        transform:translate(-50%,-50%);
    `;
    addTmpStyle('@keyframes floatTxt{0%{opacity:1;transform:translate(-50%,-50%)scale(1)}100%{opacity:0;transform:translate(-50%,-200%)scale(.5)}}', 'floatTxtStyle');
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 700);
}

// ==============================================================
//  COMBO DISPLAY
// ==============================================================
function showCombo(count, mult) {
    comboDisplay.style.display = 'none';
    void comboDisplay.offsetWidth;
    comboDisplay.textContent = count >= 5 ? `🔥 ${count}× MEGA COMBO! ${mult}×` : `⚡ ${count}× COMBO! ${mult}×`;
    comboDisplay.style.display = 'block';
    comboDisplay.style.animation = 'comboPop .5s ease forwards';
    clearTimeout(comboDisplay._t);
    comboDisplay._t = setTimeout(() => comboDisplay.style.display = 'none', 600);
}

// ==============================================================
//  WIN / LOSE
// ==============================================================
function endGame(won) {
    running = false;
    clearInterval(timerID); clearTimeout(spawnID);
    arena.querySelectorAll('.balloon').forEach(b => { b.style.animation = 'none'; b.remove(); });

    // Stop BGM
    const bgm = document.getElementById('bgMusic');
    if (bgm) bgm.pause();

    if (won) {
        finalScore.textContent = score;
        finalPopped.textContent = popped;
        finalTime.textContent = timeLeft + 's';
        winScreen.style.display = 'flex';
        playWin();
        // run fireworks on win canvas
        launchWinFireworks();
    } else {
        losePopped.textContent = popped;
        loseScreen.style.display = 'flex';
    }
}

// ==============================================================
//  WIN FIREWORKS
// ==============================================================
const wCvs = document.getElementById('winCanvas');
const wCtx = wCvs.getContext('2d');
let wAnimId, wFWs = [];

class WFW {
    constructor() {
        this.x = Math.random() * window.innerWidth;
        this.y = window.innerHeight;
        this.tx = Math.random() * window.innerWidth * .8 + window.innerWidth * .1;
        this.ty = Math.random() * window.innerHeight * .45 + 60;
        const a = Math.atan2(this.ty - this.y, this.tx - this.x), sp = Math.random() * 5 + 8;
        this.vx = Math.cos(a) * sp; this.vy = Math.sin(a) * sp;
        this.hue = Math.random() * 360; this.exploded = false; this.alpha = 1;
        this.trail = []; this.parts = [];
    }
    update() {
        if (!this.exploded) {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > 8) this.trail.shift();
            this.x += this.vx; this.y += this.vy;
            if (Math.hypot(this.tx - this.x, this.ty - this.y) < 8) {
                this.exploded = true;
                for (let i = 0; i < 100; i++) {
                    const a = Math.random() * Math.PI * 2, sp = Math.random() * 6 + 2;
                    this.parts.push({
                        x: this.x, y: this.y,
                        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                        alpha: 1, size: Math.random() * 3 + 1,
                        col: `hsl(${this.hue + Math.random() * 50 - 25},100%,65%)`
                    });
                }
            }
        } else {
            this.parts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .08; p.alpha -= .016; p.vx *= .97; p.vy *= .97; });
            this.parts = this.parts.filter(p => p.alpha > .02);
            if (!this.parts.length) this.alpha = 0;
        }
    }
    draw(ctx) {
        if (!this.exploded) {
            this.trail.forEach((t, i) => {
                ctx.globalAlpha = (i / this.trail.length) * .5;
                ctx.fillStyle = `hsl(${this.hue},100%,65%)`;
                ctx.beginPath(); ctx.arc(t.x, t.y, 2, 0, Math.PI * 2); ctx.fill();
            });
            ctx.globalAlpha = 1;
            ctx.fillStyle = `hsl(${this.hue},100%,70%)`;
            ctx.beginPath(); ctx.arc(this.x, this.y, 3.5, 0, Math.PI * 2); ctx.fill();
        } else {
            this.parts.forEach(p => {
                ctx.globalAlpha = Math.max(0, p.alpha);
                ctx.fillStyle = p.col;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
            });
        }
    }
}

function launchWinFireworks() {
    wCvs.width = window.innerWidth; wCvs.height = window.innerHeight;
    let n = 0;
    const burst = () => { wFWs.push(new WFW()); if (++n < 30) setTimeout(burst, 180 + Math.random() * 120); };
    burst();
    (function anim() {
        wCtx.clearRect(0, 0, wCvs.width, wCvs.height);
        wFWs.forEach(fw => { fw.update(); fw.draw(wCtx); });
        wFWs = wFWs.filter(fw => fw.alpha > 0);
        wAnimId = requestAnimationFrame(anim);
    })();
}

// ==============================================================
//  WIN BUTTON – nav to surprise.html
// ==============================================================
document.getElementById('winBtn').addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.setItem('game_cleared', 'true');
    window.location.href = 'surprise.html';
});

// ==============================================================
//  HELPER
// ==============================================================
function addTmpStyle(css, id) {
    if (document.getElementById(id)) return;
    const st = document.createElement('style'); st.id = id; st.textContent = css;
    document.head.appendChild(st);
}
