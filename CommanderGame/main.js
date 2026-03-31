import { Store } from './state.js';
import { AudioSystem } from './audioManager.js';
import { UI } from './uiManager.js';
// 我们将在下一部分实现 game.js (Phaser 引擎入口)
// import { initPhaserGame } from './game.js'; 

window.addEventListener('DOMContentLoaded', () => {
    // 1. 初始化系统
    AudioSystem.init();
    UI.init();

    // 2. 模拟首屏加载进度
    const progressBar = document.getElementById('loading-progress');
    let progress = 0;
    
    const loadInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadInterval);
            
            // 加载完成后，延时切换到主菜单
            setTimeout(() => {
                Store.commit('currentScreen', 'mainMenu');
                AudioSystem.playBgm('battle_bgm'); // 播放主菜单BGM
            }, 500);
        }
        progressBar.style.width = `${progress}%`;
    }, 100);

    // 3. 监听游戏启动事件 (来自 uiManager 点击"准备完毕")
    document.addEventListener('START_PHASER_GAME', () => {
        console.log("[Main] 触发核心游戏引擎加载...");
        
        // 当 game.js 完成后，取消下面这段注释即可唤起 Phaser
        import('./game.js').then(module => {
            module.initPhaserGame();
        });
    });
});