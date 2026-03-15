// ===== LOGIN PAGE JAVASCRIPT =====

// --- Particles ---
function createParticles() {
    const container = document.getElementById('particles');
    const colors = ['#ff6b9d', '#c44dff', '#4d79ff', '#ffd700', '#00e5cc', '#ff9500'];
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 8 + 3;
        p.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            left: ${Math.random() * 100}%;
            animation-duration: ${Math.random() * 8 + 6}s;
            animation-delay: ${Math.random() * 5}s;
        `;
        container.appendChild(p);
    }
}

// --- Balloons ---
function createBalloons() {
    const balloonContainer = document.getElementById('balloons');
    const balloonEmojis = ['🎈', '🎉', '🎊', '🎁', '🌸', '⭐', '💫', '🦋'];
    for (let i = 0; i < 12; i++) {
        const b = document.createElement('div');
        b.className = 'balloon';
        b.textContent = balloonEmojis[Math.floor(Math.random() * balloonEmojis.length)];
        b.style.cssText = `
            left: ${Math.random() * 95}%;
            animation-duration: ${Math.random() * 8 + 8}s;
            animation-delay: ${Math.random() * 6}s;
            font-size: ${Math.random() * 1.5 + 1.5}rem;
        `;
        balloonContainer.appendChild(b);
    }
}

// --- Emoji Rain ---
function createEmojiRain() {
    const container = document.getElementById('emojiRain');
    const emojis = ['🎂', '🎉', '🎊', '🌸', '⭐', '💕', '🎈', '✨'];
    for (let i = 0; i < 15; i++) {
        const e = document.createElement('div');
        e.className = 'rain-emoji';
        e.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        e.style.cssText = `
            left: ${Math.random() * 100}%;
            animation-duration: ${Math.random() * 6 + 5}s;
            animation-delay: ${Math.random() * 8}s;
            font-size: ${Math.random() * 0.8 + 1}rem;
        `;
        container.appendChild(e);
    }
}

// --- Toggle Password ---
document.getElementById('togglePw').addEventListener('click', function() {
    const pwInput = document.getElementById('password');
    if (pwInput.type === 'password') {
        pwInput.type = 'text';
        this.textContent = '🙈';
    } else {
        pwInput.type = 'password';
        this.textContent = '👁️';
    }
});

// --- Login Form ---
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault(); // Prevent standard form submission

    const btnText = document.querySelector('.btn-text');
    const btnLoading = document.querySelector('.btn-loading');
    const errBox = document.getElementById('loginError');
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value;

    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    errBox.style.display = 'none';

    const card = document.getElementById('loginCard');
    card.style.transform = 'scale(0.98)';
    setTimeout(() => card.style.transform = '', 300);

    // Hardcoded logic for GitHub Pages (Client-side)
    setTimeout(() => {
        if (user.toUpperCase() === 'JEN' && pass === '19march') {
            sessionStorage.setItem('logged_in', 'true');
            sessionStorage.setItem('display_name', 'JEN 💕');
            window.location.href = 'game.html';
        } else {
            errBox.style.display = 'block';
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    }, 500); // simulate tiny delay
});

// --- Input focus effects ---
document.querySelectorAll('.input-group input').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'scale(1.01)';
        this.parentElement.style.transition = 'transform 0.2s';
    });
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = '';
    });
});

// --- Music Button & Auto Play ---
const musicBtn = document.getElementById('musicBtn');
const bgMusic = document.getElementById('bgMusic');
if (bgMusic) bgMusic.volume = 0.4;
let musicPlaying = false;

function toggleMusic() {
    if (musicPlaying) {
        bgMusic.pause();
        musicBtn.classList.remove('playing');
        musicPlaying = false;
    } else {
        bgMusic.play().then(() => {
            musicBtn.classList.add('playing');
            musicPlaying = true;
        }).catch(() => {
            // Error handling
            console.log('Audio error');
        });
    }
}

musicBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMusic();
});

// Auto-play on first interaction
let interactionDone = false;
function initAudioOnInteract() {
    if(interactionDone) return;
    interactionDone = true;
    if(!musicPlaying) {
        bgMusic.play().then(() => {
            musicBtn.classList.add('playing');
            musicPlaying = true;
        }).catch(()=>{});
    }
    ['click', 'keydown', 'touchstart'].forEach(e => document.removeEventListener(e, initAudioOnInteract));
}
['click', 'keydown', 'touchstart'].forEach(e => document.addEventListener(e, initAudioOnInteract));

// --- Card 3D tilt on mouse move ---
const card = document.getElementById('loginCard');
document.addEventListener('mousemove', function(e) {
    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (e.clientX - centerX) / (window.innerWidth / 2);
    const deltaY = (e.clientY - centerY) / (window.innerHeight / 2);
    const maxTilt = 8;
    const tiltX = -deltaY * maxTilt;
    const tiltY = deltaX * maxTilt;
    card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px)`;
});
document.addEventListener('mouseleave', function() {
    card.style.transform = '';
});

// --- Keyboard shortcut: Enter ---
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && document.activeElement.tagName !== 'INPUT') {
        document.getElementById('btnLogin').click();
    }
});

// --- Init ---
// Redirect if already logged in (client-side check)
if (sessionStorage.getItem('logged_in') === 'true') {
    window.location.href = 'game.html';
}

createParticles();
createBalloons();
createEmojiRain();

// --- Small sparkle on click ---
document.addEventListener('click', function(e) {
    if (e.target.tagName === 'BUTTON' || e.target.closest('.login-card')) return;
    const sparkle = document.createElement('div');
    sparkle.textContent = ['✨', '⭐', '💫', '🌟'][Math.floor(Math.random() * 4)];
    sparkle.style.cssText = `
        position: fixed;
        left: ${e.clientX - 10}px;
        top: ${e.clientY - 10}px;
        font-size: 1.5rem;
        pointer-events: none;
        z-index: 9999;
        animation: sparkleUp 0.8s ease forwards;
    `;
    const style = document.createElement('style');
    style.textContent = `
        @keyframes sparkleUp {
            0% { opacity: 1; transform: scale(1) translateY(0); }
            100% { opacity: 0; transform: scale(0.5) translateY(-40px); }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 800);
});
