import { Store } from './state.js';
import { COMMANDERS } from './commanders.js';
import { WEAPONS } from './weapons.js';
import { AudioSystem } from './audioManager.js';

class UIManager {
    constructor() {
        this.screens = {
            loading: document.getElementById('loading-screen'),
            mainMenu: document.getElementById('main-menu'),
            prepRoom: document.getElementById('prep-room'),
            selection: document.getElementById('selection-lobby'),
            battle: document.getElementById('battle-ui')
        };
        this.modal = document.getElementById('settings-modal');
        this.timerInterval = null;
    }

    init() {
        this.renderMainMenu();
        this.renderSettingsModal();
        
        // 监听状态变化，切换页面
        Store.subscribe('currentScreen', (screenId) => {
            this.switchScreen(screenId);
        });
    }

    switchScreen(screenId) {
        Object.keys(this.screens).forEach(key => {
            if (this.screens[key]) {
                this.screens[key].classList.remove('active');
                this.screens[key].classList.add('hidden');
            }
        });
        
        const target = this.screens[screenId];
        if (target) {
            target.classList.remove('hidden');
            target.classList.add('active');
        }
    }

    // --- 主菜单 ---
    renderMainMenu() {
        const container = this.screens.mainMenu;
        container.innerHTML = `
            <h1 style="font-size: 4rem; color: var(--primary-color); margin-bottom: 50px; text-shadow: var(--border-glow);">六角战纪：指挥官</h1>
            <button class="btn" id="btn-enter-game">进入游戏</button>
            <button class="btn" id="btn-settings">设置</button>
            <button class="btn" id="btn-exit">退出游戏</button>
        `;

        document.getElementById('btn-enter-game').addEventListener('click', () => {
            AudioSystem.playSfx('click');
            this.renderPrepRoom();
            Store.commit('currentScreen', 'prepRoom');
        });

        document.getElementById('btn-settings').addEventListener('click', () => {
            AudioSystem.playSfx('click');
            this.modal.classList.remove('hidden');
            this.modal.classList.add('active');
        });

        document.getElementById('btn-exit').addEventListener('click', () => {
            alert("感谢游玩！H5环境无法直接退出，请关闭浏览器标签页。");
        });
    }

    // --- 战备页面 ---
    renderPrepRoom() {
        const container = this.screens.prepRoom;
        const playerState = Store.get().player;
        
        // 渲染基础结构
        container.innerHTML = `
            <div style="position: absolute; top: 20px; left: 20px;">
                <button class="btn" id="btn-back-menu">返回主菜单</button>
            </div>
            <div style="display: flex; width: 80%; height: 70%; background: var(--panel-bg); border: 1px solid var(--primary-color);">
                <div style="width: 30%; border-right: 1px solid var(--primary-color); padding: 20px; overflow-y: auto;">
                    <h3 style="color: var(--primary-color); margin-bottom: 10px;">选择指挥官</h3>
                    <div id="cmd-list"></div>
                </div>
                <div style="width: 40%; padding: 20px; border-right: 1px solid var(--primary-color);" id="cmd-details">
                    <!-- 指挥官详情 -->
                </div>
                <div style="width: 30%; padding: 20px;">
                    <h3 style="color: var(--primary-color); margin-bottom: 10px;">选择武器</h3>
                    <div id="wp-list"></div>
                    <button class="btn" id="btn-find-match" style="width: 100%; margin-top: 50px;">进入对战</button>
                </div>
            </div>
        `;

        // 绑定返回
        document.getElementById('btn-back-menu').addEventListener('click', () => {
            Store.commit('currentScreen', 'mainMenu');
        });

        // 渲染指挥官列表
        const cmdList = document.getElementById('cmd-list');
        COMMANDERS.forEach(cmd => {
            const div = document.createElement('div');
            div.style.cssText = `padding: 10px; margin-bottom: 5px; border: 1px solid #333; cursor: pointer; ${playerState.commanderId === cmd.id ? 'border-color: var(--primary-color); background: rgba(0,255,204,0.2);' : ''}`;
            div.innerText = `${cmd.name} - ${cmd.title}`;
            div.addEventListener('click', () => {
                Store.commit('player.commanderId', cmd.id);
                this.renderPrepRoom(); // 简单粗暴重绘
            });
            cmdList.appendChild(div);
        });

        // 渲染武器列表
        const wpList = document.getElementById('wp-list');
        WEAPONS.forEach(wp => {
            const div = document.createElement('div');
            div.style.cssText = `padding: 10px; margin-bottom: 5px; border: 1px solid #333; cursor: pointer; ${playerState.weaponId === wp.id ? 'border-color: var(--primary-color); background: rgba(0,255,204,0.2);' : ''}`;
            div.innerText = wp.name;
            div.addEventListener('click', () => {
                Store.commit('player.weaponId', wp.id);
                this.renderPrepRoom();
            });
            wpList.appendChild(div);
        });

        // 渲染详情
        const currentCmd = COMMANDERS.find(c => c.id === playerState.commanderId);
        const currentWp = WEAPONS.find(w => w.id === playerState.weaponId);
        if (currentCmd) {
            document.getElementById('cmd-details').innerHTML = `
                <h2 style="color: var(--primary-color); font-size: 2rem;">${currentCmd.name}</h2>
                <p style="color: #888; margin-bottom: 20px;">${currentCmd.type}</p>
                <p><strong>属性:</strong> 攻击 ${currentCmd.stats.atk} | 防御 ${currentCmd.stats.def} | 速度 ${currentCmd.stats.spd}</p>
                <div style="margin-top: 20px; padding: 10px; background: rgba(0,0,0,0.5);">
                    <p style="color: #ffaa00;">${currentCmd.passive}</p>
                    <p style="color: #ff3366; margin-top: 10px;">${currentCmd.active} (CD: ${currentCmd.cooldown}s)</p>
                </div>
                <div style="margin-top: 20px; padding: 10px; border: 1px dashed var(--primary-color);">
                    <p><strong>已装备:</strong> ${currentWp ? currentWp.name : '无'}</p>
                    <p style="font-size: 0.9rem; color: #aaa;">${currentWp ? currentWp.desc : ''}</p>
                </div>
            `;
        }

        document.getElementById('btn-find-match').addEventListener('click', () => {
            AudioSystem.playSfx('start');
            this.generateAIOpponents();
            this.renderSelectionLobby();
            Store.commit('currentScreen', 'selection');
        });
    }

    // --- 生成AI对手 ---
    generateAIOpponents() {
        const aiPlayers = [];
        for (let i = 0; i < Store.get().match.aiCount; i++) {
            const randCmd = COMMANDERS[Math.floor(Math.random() * COMMANDERS.length)];
            const randWp = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
            aiPlayers.push({ name: `AI - ${i+1}`, commanderId: randCmd.id, weaponId: randWp.id });
        }
        Store.commit('match.aiPlayers', aiPlayers);
    }

    // --- 选人与准备页面 ---
    renderSelectionLobby() {
        const container = this.screens.selection;
        let timeLeft = 30;

        container.innerHTML = `
            <h2 style="color: var(--primary-color); margin-bottom: 20px;">即将进入战场 <span id="lobby-timer">${timeLeft}</span>s</h2>
            <div id="lobby-slots" style="display: flex; gap: 20px; margin-bottom: 40px;"></div>
            <button class="btn" id="btn-ready">准备完毕 (进入战斗)</button>
        `;

        const slotsContainer = document.getElementById('lobby-slots');
        
        // 玩家席位
        const pCmd = COMMANDERS.find(c => c.id === Store.get().player.commanderId);
        slotsContainer.innerHTML += this.createSlotHTML('玩家 (你)', pCmd.name, '#00ffcc');

        // AI 席位
        Store.get().match.aiPlayers.forEach((ai, idx) => {
            const aCmd = COMMANDERS.find(c => c.id === ai.commanderId);
            const colors = ['#ff3366', '#aa33ff', '#ffaa00', '#00aaff'];
            slotsContainer.innerHTML += this.createSlotHTML(ai.name, aCmd.name, colors[idx]);
        });

        // 倒计时逻辑
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            timeLeft--;
            document.getElementById('lobby-timer').innerText = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.startGame();
            }
        }, 1000);

        document.getElementById('btn-ready').addEventListener('click', () => {
            clearInterval(this.timerInterval);
            this.startGame();
        });
    }

    createSlotHTML(title, cmdName, color) {
        return `
            <div style="width: 150px; height: 200px; border: 2px solid ${color}; background: rgba(0,0,0,0.6); display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <h4 style="color: ${color}; margin-bottom: 10px;">${title}</h4>
                <div style="width: 80px; height: 80px; clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); background: #333; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 0.8rem;">${cmdName}</span>
                </div>
            </div>
        `;
    }

    // --- 启动游戏核心层 ---
    startGame() {
        Store.commit('currentScreen', 'battle');
        // 这里会派发事件给 main.js 去初始化 Phaser 引擎
        document.dispatchEvent(new CustomEvent('START_PHASER_GAME'));
    }

    // --- 设置模态框 ---
    renderSettingsModal() {
        const audioState = Store.get().audio;
        this.modal.innerHTML = `
            <div class="modal-content">
                <h2 style="color: var(--primary-color); margin-bottom: 20px;">系统设置</h2>
                <div style="margin-bottom: 15px;">
                    <label>音乐开关: <input type="checkbox" id="chk-music" ${audioState.musicOn ? 'checked' : ''}></label>
                </div>
                <div style="margin-bottom: 15px;">
                    <label>音效开关: <input type="checkbox" id="chk-sfx" ${audioState.sfxOn ? 'checked' : ''}></label>
                </div>
                <div style="margin-bottom: 30px;">
                    <label>主音量: <input type="range" id="rng-vol" min="0" max="1" step="0.1" value="${audioState.volume}"></label>
                </div>
                <button class="btn" id="btn-close-settings">关闭</button>
            </div>
        `;

        document.getElementById('chk-music').addEventListener('change', (e) => Store.commit('audio.musicOn', e.target.checked));
        document.getElementById('chk-sfx').addEventListener('change', (e) => Store.commit('audio.sfxOn', e.target.checked));
        document.getElementById('rng-vol').addEventListener('input', (e) => Store.commit('audio.volume', parseFloat(e.target.value)));

        document.getElementById('btn-close-settings').addEventListener('click', () => {
            this.modal.classList.remove('active');
            this.modal.classList.add('hidden');
        });
    }
}

export const UI = new UIManager();