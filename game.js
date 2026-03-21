// ==========================================
// 核心引擎与音频系统
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
let W = canvas.width = window.innerWidth;
let H = canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initStars();
});

// 星空背景初始化
let stars = [];
function initStars() {
    stars = [];
    for(let i = 0; i < 150; i++) {
        stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            size: Math.random() * 2 + 0.5,
            alpha: Math.random() * 0.8 + 0.2
        });
    }
}
initStars();

// Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let isMuted = false;

function playSound(type) {
    if (isMuted || audioCtx.state !== 'running') return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'shoot') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gainNode.gain.setValueAtTime(0.02, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'explode') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'powerup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.1);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.2);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'laser') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(500, now + 0.2);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'warning') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.setValueAtTime(400, now + 0.25);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now); osc.stop(now + 0.5);
    }
}

// ==========================================
// 游戏状态与输入
// ==========================================
let gameState = 'playing'; // playing, paused, gameover
let score = 0;
let difficultyLevel = 1;
let bossMode = false;
let bossIndex = 0;
let nextBossScore = 10000;
let bossDefeatedCount = 0;

const keys = {};
const mouse = { x: W/2, y: H/2, isDown: false };

window.addEventListener('keydown', e => { 
    keys[e.key.toLowerCase()] = true; 
    if(e.code === 'Space') keys['space'] = true;
});
window.addEventListener('keyup', e => { 
    keys[e.key.toLowerCase()] = false; 
    if(e.code === 'Space') keys['space'] = false;
});
window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('mousedown', () => { mouse.isDown = true; if(audioCtx.state==='suspended') audioCtx.resume(); });
window.addEventListener('mouseup', () => { mouse.isDown = false; });
window.addEventListener('touchstart', e => { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; mouse.isDown = true; if(audioCtx.state==='suspended') audioCtx.resume(); });
window.addEventListener('touchmove', e => { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; });
window.addEventListener('touchend', () => { mouse.isDown = false; });

document.getElementById('pauseBtn').onclick = () => {
    if (gameState === 'playing') { gameState = 'paused'; document.getElementById('pauseMenu').style.display = 'flex'; }
};
document.getElementById('resumeBtn').onclick = () => {
    gameState = 'playing'; document.getElementById('pauseMenu').style.display = 'none';
};
const restartGame = () => {
    initGame(); gameState = 'playing';
    document.getElementById('pauseMenu').style.display = 'none';
    document.getElementById('gameOverMenu').style.display = 'none';
    document.getElementById('bossUI').style.display = 'none';
    document.getElementById('warningScreen').style.display = 'none';
};
document.getElementById('restartBtnPause').onclick = restartGame;
document.getElementById('restartBtn').onclick = restartGame;
document.getElementById('muteBtn').onclick = (e) => {
    isMuted = !isMuted;
    e.target.innerText = `音效: ${isMuted ? '关' : '开'}`;
};

// ==========================================
// 对象池与基础类
// ==========================================
class Pool {
    constructor(factory, size) {
        this.items = Array.from({length: size}, factory);
    }
    get() {
        for(let i=0; i<this.items.length; i++) {
            if(!this.items[i].active) {
                this.items[i].active = true;
                return this.items[i];
            }
        }
        return null;
    }
}

// 粒子特效
class Particle {
    constructor() { this.active = false; }
    spawn(x, y, vx, vy, color, life, size) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.color = color; this.life = life; this.maxLife = life;
        this.size = size; this.active = true;
    }
    update(dt) {
        if(!this.active) return;
        this.x += this.vx * dt; this.y += this.vy * dt;
        this.life -= dt;
        if(this.life <= 0) this.active = false;
    }
    draw(ctx) {
        if(!this.active) return;
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
    }
}
const particlePool = new Pool(() => new Particle(), 500);

function createExplosion(x, y, color, count) {
    playSound('explode');
    for(let i=0; i<count; i++) {
        const p = particlePool.get();
        if(p) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 150 + 50;
            p.spawn(x, y, Math.cos(angle)*speed, Math.sin(angle)*speed, color, Math.random()*0.5+0.2, Math.random()*3+1);
        }
    }
}

// 子弹
class Bullet {
    constructor() { this.active = false; }
    spawn(x, y, vx, vy, color, isPlayer, dmg) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.color = color; this.isPlayer = isPlayer; this.dmg = dmg;
        this.radius = isPlayer ? 3 : 4;
        this.active = true;
    }
    update(dt) {
        if(!this.active) return;
        this.x += this.vx * dt; this.y += this.vy * dt;
        if(this.y < -50 || this.y > H + 50 || this.x < -50 || this.x > W + 50) this.active = false;
    }
    draw(ctx) {
        if(!this.active) return;
        ctx.shadowBlur = 10; ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
    }
}
const bulletPool = new Pool(() => new Bullet(), 1000);

// ==========================================
// 玩家类
// ==========================================
class Player {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = W / 2; this.y = H - 100;
        this.hp = 100; this.power = 1; this.speed = 350;
        this.shootCooldown = 0; this.radius = 12;
        this.laserCooldown = 0;
        this.laserActiveTime = 0;
        this.wingmanAngle = 0;
    }
    update(dt) {
        let dx = 0, dy = 0;
        if(keys['a'] || keys['arrowleft']) dx -= 1;
        if(keys['d'] || keys['arrowright']) dx += 1;
        if(keys['w'] || keys['arrowup']) dy -= 1;
        if(keys['s'] || keys['arrowdown']) dy += 1;
        
        if(dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy);
            this.x += (dx/len) * this.speed * dt;
            this.y += (dy/len) * this.speed * dt;
        } else if (mouse.isDown) {
            this.x += (mouse.x - this.x) * 10 * dt;
            this.y += (mouse.y - this.y) * 10 * dt;
        }
        
        this.x = Math.max(this.radius + 20, Math.min(W - this.radius - 20, this.x));
        this.y = Math.max(this.radius + 20, Math.min(H - this.radius - 20, this.y));

        if(Math.random() < 0.5) {
            const p = particlePool.get();
            if(p) p.spawn(this.x + (Math.random()-0.5)*10, this.y + 15, 0, 150, '#0ff', 0.2, 2);
        }

        this.shootCooldown -= dt;
        if(this.shootCooldown <= 0 && (keys['space'] || mouse.isDown || bossMode)) {
            this.shoot();
        }

        // 激光逻辑 (Power >= 4)
        if (this.power >= 4) {
            if (this.laserActiveTime > 0) {
                this.laserActiveTime -= dt;
                this.processLaserDamage(dt);
            } else {
                this.laserCooldown -= dt;
                if (this.laserCooldown <= 0 && (keys['space'] || mouse.isDown || bossMode)) {
                    this.laserActiveTime = 0.5; // 激光持续0.5秒
                    this.laserCooldown = 2.0;   // 冷却2秒
                    playSound('laser');
                }
            }
        }

        this.wingmanAngle += dt * 2;
    }
    shoot() {
        playSound('shoot');
        this.shootCooldown = Math.max(0.08, 0.2 - this.power * 0.015);
        const bSpeed = -600;
        
        // 主炮
        if(this.power === 1) {
            let b = bulletPool.get(); if(b) b.spawn(this.x, this.y - 15, 0, bSpeed, '#0ff', true, 10);
        } else if(this.power === 2) {
            let b1 = bulletPool.get(); if(b1) b1.spawn(this.x - 8, this.y - 10, 0, bSpeed, '#0ff', true, 10);
            let b2 = bulletPool.get(); if(b2) b2.spawn(this.x + 8, this.y - 10, 0, bSpeed, '#0ff', true, 10);
        } else {
            let num = Math.min(5, 3 + Math.floor(this.power/3));
            for(let i=0; i<num; i++) {
                let angle = (i - (num-1)/2) * 0.1;
                let b = bulletPool.get();
                if(b) b.spawn(this.x, this.y - 15, Math.sin(angle)*bSpeed*-1, Math.cos(angle)*bSpeed, '#0ff', true, 10 + this.power);
            }
        }

        // 僚机射击 (Power >= 2)
        if (this.power >= 2) {
            let wx1 = this.x - 30; let wy1 = this.y + Math.sin(this.wingmanAngle)*5;
            let wx2 = this.x + 30; let wy2 = this.y + Math.cos(this.wingmanAngle)*5;
            let b3 = bulletPool.get(); if(b3) b3.spawn(wx1, wy1 - 10, 0, bSpeed, '#0f0', true, 8);
            let b4 = bulletPool.get(); if(b4) b4.spawn(wx2, wy2 - 10, 0, bSpeed, '#0f0', true, 8);
        }
    }
    processLaserDamage(dt) {
        // 激光是一条直线，宽度20
        const laserWidth = 20;
        enemyPool.items.forEach(e => {
            if (e.active && Math.abs(e.x - this.x) < laserWidth/2 + e.radius && e.y < this.y) {
                e.takeDamage(100 * dt);
            }
        });
        if (boss.active && Math.abs(boss.x - this.x) < laserWidth/2 + 50 && boss.y < this.y) {
            boss.takeDamage(150 * dt);
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.shadowBlur = 15; ctx.shadowColor = '#0ff';
        
        // 战机机身
        ctx.fillStyle = '#113';
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -20); ctx.lineTo(15, 10); ctx.lineTo(0, 5); ctx.lineTo(-15, 10);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, -5, 3, 0, Math.PI*2); ctx.fill();
        ctx.restore();

        // 僚机
        if (this.power >= 2) {
            ctx.save();
            ctx.shadowBlur = 10; ctx.shadowColor = '#0f0';
            ctx.fillStyle = '#131'; ctx.strokeStyle = '#0f0'; ctx.lineWidth = 1.5;
            let yo1 = Math.sin(this.wingmanAngle)*5;
            let yo2 = Math.cos(this.wingmanAngle)*5;
            // Left wingman
            ctx.beginPath(); ctx.arc(this.x - 30, this.y + yo1, 5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            // Right wingman
            ctx.beginPath(); ctx.arc(this.x + 30, this.y + yo2, 5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.restore();
        }

        // 激光
        if (this.laserActiveTime > 0) {
            ctx.save();
            ctx.shadowBlur = 20; ctx.shadowColor = '#0ff';
            ctx.fillStyle = `rgba(0, 255, 255, ${Math.random()*0.5 + 0.5})`;
            ctx.fillRect(this.x - 10, 0, 20, this.y);
            ctx.fillStyle = '#fff';
            ctx.fillRect(this.x - 3, 0, 6, this.y);
            ctx.restore();
        }
    }
}
const player = new Player();

// ==========================================
// 敌机与道具
// ==========================================
class Item {
    constructor() { this.active = false; }
    spawn(x, y, type) { // type 0 = power, type 1 = health
        this.x = x; this.y = y; this.active = true; this.radius = 10; this.vy = 80;
        this.type = type;
    }
    update(dt) {
        if(!this.active) return;
        this.y += this.vy * dt;
        
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        if(dist < 150) {
            this.x += (player.x - this.x) * 3 * dt;
            this.y += (player.y - this.y) * 3 * dt;
        }

        if(dist < player.radius + this.radius) {
            this.active = false;
            playSound('powerup');
            if(this.type === 0) {
                player.power++;
            } else {
                player.hp = Math.min(100, player.hp + 30); // 回血
            }
            updateHUD();
        }
        if(this.y > H + 20) this.active = false;
    }
    draw(ctx) {
        if(!this.active) return;
        const color = this.type === 0 ? '#ff0' : '#0f0';
        const text = this.type === 0 ? 'P' : 'H';
        ctx.shadowBlur = 15; ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.font = 'bold 12px Arial'; ctx.fillText(text, this.x-4, this.y+4);
        ctx.shadowBlur = 0;
    }
}
const itemPool = new Pool(() => new Item(), 20);

class Enemy {
    constructor() { this.active = false; }
    spawn(type, x, y, hpMulti) {
        this.type = type; this.x = x; this.y = y; this.active = true;
        this.time = 0; this.shootTimer = Math.random();
        
        this.radius = type === 2 ? 18 : 15;
        this.hp = [20, 30, 80, 60, 40, 70][type] * hpMulti;
        this.maxHp = this.hp;
        this.color = ['#f0f', '#0f0', '#ff0', '#f00', '#f80', '#b0f'][type];
        this.vx = 0; this.vy = [150, 100, 50, 80, 180, 60][type];
    }
    update(dt) {
        if(!this.active) return;
        this.time += dt;
        
        if(this.type === 1) this.vx = Math.sin(this.time * 3) * 100;
        else if(this.type === 2 || this.type === 3 || this.type === 5) {
            if(this.y > 100) this.vy = 0; 
            this.vx = Math.sin(this.time) * 50;
        } else if(this.type === 4) {
            if(player.x < this.x) this.vx = -50; else this.vx = 50;
        }
        
        this.x += this.vx * dt; this.y += this.vy * dt;

        this.shootTimer -= dt;
        if(this.shootTimer <= 0) {
            const bSpeed = 200 + difficultyLevel * 10;
            if(this.type === 3 && this.y > 50) { 
                this.shootTimer = 1.0;
                for(let i=0; i<3; i++) {
                    let angle = (i-1)*0.2 + Math.PI/2;
                    let b = bulletPool.get(); if(b) b.spawn(this.x, this.y, Math.cos(angle)*bSpeed, Math.sin(angle)*bSpeed, '#f00', false, 10);
                }
            } else if(this.type === 5 && this.y > 50) { 
                this.shootTimer = 0.5;
                for(let i=0; i<8; i++) {
                    let angle = (i/8)*Math.PI*2 + this.time;
                    let b = bulletPool.get(); if(b) b.spawn(this.x, this.y, Math.cos(angle)*bSpeed*0.6, Math.sin(angle)*bSpeed*0.6, '#f0f', false, 10);
                }
            } else if(this.type === 2) {
                this.shootTimer = 1.5;
                let b = bulletPool.get(); if(b) b.spawn(this.x, this.y, 0, bSpeed, '#ff0', false, 10);
            } else if(this.type === 0 || this.type === 1 || this.type === 4) {
                this.shootTimer = 2.0;
                let b = bulletPool.get(); if(b) b.spawn(this.x, this.y, 0, bSpeed, this.color, false, 10);
            }
        }

        if(this.y > H + 50) this.active = false;
    }
    takeDamage(amt) {
        if(!this.active) return;
        this.hp -= amt;
        playSound('hit');
        if(this.hp <= 0) {
            this.active = false;
            score += (this.type + 1) * 10; // 降低小敌机分数
            createExplosion(this.x, this.y, this.color, 10);
            if(this.type === 2) { 
                let item = itemPool.get(); if(item) item.spawn(this.x, this.y, 0); // 掉落升级
            }
            checkDifficulty();
        }
    }
    draw(ctx) {
        if(!this.active) return;
        ctx.shadowBlur = 10; ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color; ctx.lineWidth = 2;
        ctx.fillStyle = '#000';
        
        ctx.save(); ctx.translate(this.x, this.y);
        ctx.beginPath();
        if(this.type === 2) { 
            for(let i=0; i<6; i++) {
                ctx.lineTo(Math.cos(i*Math.PI/3)*this.radius, Math.sin(i*Math.PI/3)*this.radius);
            }
        } else if(this.type === 3 || this.type === 5) {
            ctx.rect(-this.radius, -this.radius, this.radius*2, this.radius*2);
        } else {
            ctx.moveTo(0, this.radius); ctx.lineTo(-this.radius, -this.radius); ctx.lineTo(this.radius, -this.radius);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        
        if(this.hp < this.maxHp) {
            ctx.fillStyle = '#f00'; ctx.fillRect(-10, -this.radius-8, 20, 3);
            ctx.fillStyle = '#0f0'; ctx.fillRect(-10, -this.radius-8, 20 * (this.hp/this.maxHp), 3);
        }
        ctx.restore();
    }
}
const enemyPool = new Pool(() => new Enemy(), 100);

// ==========================================
// BOSS 系统
// ==========================================
const bossNames = ["毁灭核心", "虚空漫游者", "霓虹撕裂者", "量子巨兽", "终焉指令"];

class Boss {
    constructor() { this.active = false; }
    spawn(idx) {
        this.active = true; 
        this.idx = Math.min(idx, 4); // 第六只及以后都是第五只
        this.x = W/2; this.y = -100;
        this.maxHp = 3000 + idx * 2000; this.hp = this.maxHp;
        this.state = 'enter'; this.time = 0;
        
        document.getElementById('bossUI').style.display = 'block';
        document.getElementById('bossName').innerText = `BOSS 0${this.idx + 1} - ${bossNames[this.idx]}`;
        this.updateHPBar();
    }
    updateHPBar() {
        document.getElementById('bossHpFill').style.width = `${(this.hp/this.maxHp)*100}%`;
    }
    update(dt) {
        if(!this.active) return;
        this.time += dt;
        
        if(this.state === 'enter') {
            this.y += 50 * dt;
            if(this.y >= 120) { this.state = 'attack'; this.time = 0; }
        } else if(this.state === 'attack') {
            this.x = W/2 + Math.sin(this.time) * (W/3); 
            
            const bSpeed = 250;
            if(this.idx === 0) { // 毁灭核心: 放射
                if(this.time % 2 < 0.1) {
                    for(let i=0; i<12; i++) {
                        let a = (i/12)*Math.PI*2 + this.time;
                        let b = bulletPool.get(); if(b) b.spawn(this.x, this.y, Math.cos(a)*bSpeed, Math.sin(a)*bSpeed, '#f00', false, 15);
                    }
                }
            } else if(this.idx === 1) { // 虚空漫游者: 螺旋+自机狙
                if(this.time % 0.2 < 0.1) {
                    let a = this.time * 5;
                    let b = bulletPool.get(); if(b) b.spawn(this.x, this.y, Math.cos(a)*bSpeed, Math.sin(a)*bSpeed, '#f0f', false, 15);
                }
                if(this.time % 1.5 < 0.1) {
                    let a = Math.atan2(player.y - this.y, player.x - this.x);
                    let b = bulletPool.get(); if(b) b.spawn(this.x, this.y, Math.cos(a)*(bSpeed+100), Math.sin(a)*(bSpeed+100), '#0ff', false, 20);
                }
            } else if(this.idx === 2) { // 霓虹撕裂者: 散弹风暴
                if(this.time % 1.0 < 0.1) {
                    for(let i=-3; i<=3; i++) {
                        let a = Math.PI/2 + i*0.2 + Math.sin(this.time)*0.5;
                        let b = bulletPool.get(); if(b) b.spawn(this.x, this.y, Math.cos(a)*bSpeed, Math.sin(a)*bSpeed, '#ff0', false, 15);
                    }
                }
            } else if(this.idx === 3) { // 量子巨兽: 环形波动
                if(this.time % 1.5 < 0.1) {
                    for(let i=0; i<20; i++) {
                        let a = (i/20)*Math.PI*2;
                        let b = bulletPool.get(); if(b) b.spawn(this.x, this.y, Math.cos(a)*bSpeed, Math.sin(a)*bSpeed, '#0f0', false, 15);
                    }
                }
            } else { // 终焉指令: 混合弹幕
                if(this.time % 0.8 < 0.1) {
                    let a = Math.atan2(player.y - this.y, player.x - this.x);
                    for(let i=-2; i<=2; i++) {
                        let b = bulletPool.get(); if(b) b.spawn(this.x, this.y, Math.cos(a+i*0.15)*300, Math.sin(a+i*0.15)*300, '#f00', false, 20);
                    }
                }
                if(this.time % 0.3 < 0.1) {
                     let a = this.time * 4;
                     let b = bulletPool.get(); if(b) b.spawn(this.x, this.y, Math.cos(a)*200, Math.sin(a)*200, '#f0f', false, 10);
                }
            }
        }
    }
    takeDamage(amt) {
        if(this.state === 'enter' || !this.active) return;
        this.hp -= amt;
        playSound('hit');
        this.updateHPBar();
        if(this.hp <= 0) {
            this.active = false;
            createExplosion(this.x, this.y, '#f00', 100);
            score += 1000; // Boss 死亡 1000分
            bossMode = false; 
            bossDefeatedCount++;
            
            // 计算下一个 Boss 分数阈值
            if (bossDefeatedCount === 1) nextBossScore = 30000;
            else if (bossDefeatedCount === 2) nextBossScore = 60000;
            else if (bossDefeatedCount === 3) nextBossScore = 100000;
            else if (bossDefeatedCount === 4) nextBossScore = 150000;
            else nextBossScore += 100000;

            document.getElementById('bossUI').style.display = 'none';
            // 击败boss只掉落恢复生命值的道具
            for(let i=0; i<3; i++) { 
                let it = itemPool.get(); if(it) it.spawn(this.x + (i-1)*30, this.y, 1); 
            }
            checkDifficulty();
        }
    }
    draw(ctx) {
        if(!this.active) return;
        ctx.save(); ctx.translate(this.x, this.y);
        ctx.shadowBlur = 20; ctx.shadowColor = '#f00';
        ctx.fillStyle = '#100'; ctx.strokeStyle = '#f00'; ctx.lineWidth = 3;
        
        ctx.beginPath();
        if (this.idx === 0) {
            ctx.arc(0, 0, 40, 0, Math.PI*2);
            ctx.moveTo(-60, -20); ctx.lineTo(60, -20); ctx.lineTo(0, 60); ctx.closePath();
        } else if (this.idx === 1) {
            ctx.rect(-40, -40, 80, 80);
        } else if (this.idx === 2) {
            ctx.moveTo(0, 50); ctx.lineTo(-50, -30); ctx.lineTo(0, -50); ctx.lineTo(50, -30); ctx.closePath();
        } else if (this.idx === 3) {
            ctx.arc(0, 0, 50, 0, Math.PI); ctx.closePath();
        } else {
            ctx.arc(0, 0, 45, 0, Math.PI*2);
            ctx.moveTo(-70, 0); ctx.lineTo(70, 0); ctx.moveTo(0, -70); ctx.lineTo(0, 70);
        }
        ctx.fill(); ctx.stroke();
        
        ctx.fillStyle = '#f00';
        ctx.globalAlpha = 0.5 + Math.sin(this.time*10)*0.5;
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
}
const boss = new Boss();

// ==========================================
// 游戏流程与生成逻辑
// ==========================================
let spawnTimer = 0;
function spawnEnemies(dt) {
    if(bossMode) return;
    spawnTimer -= dt;
    if(spawnTimer <= 0) {
        spawnTimer = Math.max(0.3, 1.5 - difficultyLevel * 0.1);
        let maxEnemies = Math.min(15, 3 + difficultyLevel); // 随难度增加敌机数量
        let activeCount = enemyPool.items.filter(e => e.active).length;
        
        if(activeCount < maxEnemies) {
            let type = Math.floor(Math.random() * 6);
            if(Math.random() < 0.1) type = 2; // 降低补给型出现率
            
            if([2,3,5].includes(type) && enemyPool.items.some(e => e.active && [2,3,5].includes(e.type))) {
                type = Math.random() < 0.5 ? 0 : 1;
            }

            let e = enemyPool.get();
            if(e) e.spawn(type, Math.random()*(W-60)+30, -30, 1 + difficultyLevel*0.2);
        }
    }
}

function checkDifficulty() {
    let newLevel = Math.floor(score / 5000) + 1;
    if(newLevel > difficultyLevel) {
        difficultyLevel = newLevel;
    }
    
    if(score >= nextBossScore && !bossMode) {
        bossMode = true;
        
        enemyPool.items.forEach(e => {
            if(e.active) { e.active = false; createExplosion(e.x, e.y, e.color, 5); }
        });
        
        document.getElementById('warningScreen').style.display = 'block';
        playSound('warning');
        setTimeout(() => {
            document.getElementById('warningScreen').style.display = 'none';
            boss.spawn(bossDefeatedCount);
        }, 3000);
    }
    updateHUD();
}

function updateHUD() {
    document.getElementById('scoreVal').innerText = score;
    document.getElementById('levelVal').innerText = difficultyLevel;
    document.getElementById('hpVal').innerText = Math.floor(player.hp);
    document.getElementById('powerVal').innerText = player.power;
}

// ==========================================
// 渲染与主循环
// ==========================================
function drawBackground() {
    ctx.fillStyle = '#000'; 
    ctx.fillRect(0, 0, W, H);
    
    // 静止的黑色星空
    ctx.fillStyle = '#fff';
    stars.forEach(star => {
        ctx.globalAlpha = star.alpha;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI*2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

let lastTime = performance.now();
function gameLoop(now) {
    requestAnimationFrame(gameLoop);
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if(dt > 0.1) dt = 0.1;

    if(gameState !== 'playing') return;

    drawBackground();

    player.update(dt);
    spawnEnemies(dt);
    boss.update(dt);

    const pools = [bulletPool, particlePool, itemPool, enemyPool];
    pools.forEach(p => p.items.forEach(item => item.update(dt)));

    bulletPool.items.forEach(b => {
        if(!b.active) return;
        if(b.isPlayer) {
            enemyPool.items.forEach(e => {
                if(e.active && Math.hypot(b.x - e.x, b.y - e.y) < e.radius + b.radius) {
                    b.active = false; e.takeDamage(b.dmg);
                    createExplosion(b.x, b.y, '#fff', 3);
                }
            });
            if(boss.active && boss.state === 'attack' && Math.hypot(b.x - boss.x, b.y - boss.y) < 50) {
                b.active = false; boss.takeDamage(b.dmg);
                createExplosion(b.x, b.y, '#ff0', 3);
            }
        } else {
            if(Math.hypot(b.x - player.x, b.y - player.y) < player.radius + b.radius) {
                b.active = false;
                player.hp -= b.dmg;
                player.power = Math.max(1, player.power - 1);
                playSound('hit');
                createExplosion(player.x, player.y, '#f00', 5);
                updateHUD();
                if(player.hp <= 0) gameOver();
            }
        }
    });

    enemyPool.items.forEach(e => {
        if(e.active && Math.hypot(e.x - player.x, e.y - player.y) < e.radius + player.radius) {
            e.active = false;
            player.hp -= 20;
            createExplosion(e.x, e.y, e.color, 10);
            updateHUD();
            if(player.hp <= 0) gameOver();
        }
    });

    if(boss.active && Math.hypot(boss.x - player.x, boss.y - player.y) < 50 + player.radius) {
         player.hp -= 1 * dt * 60; 
         updateHUD();
         if(player.hp <= 0) gameOver();
    }

    pools.forEach(p => p.items.forEach(item => item.draw(ctx)));
    boss.draw(ctx);
    player.draw(ctx);
    updateHUD();
}

function gameOver() {
    gameState = 'gameover';
    document.getElementById('finalScore').innerText = score;
    document.getElementById('gameOverMenu').style.display = 'flex';
}

function initGame() {
    score = 0; difficultyLevel = 1; bossMode = false; 
    bossDefeatedCount = 0; nextBossScore = 10000;
    player.reset();
    [bulletPool, particlePool, itemPool, enemyPool].forEach(p => p.items.forEach(i => i.active = false));
    boss.active = false;
    updateHUD();
}

// 启动
initGame();
requestAnimationFrame(gameLoop);