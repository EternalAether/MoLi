// bootScene.js
// 预加载场景，负责生成纯代码美术资产

export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // 渲染加载进度条（如果资源多的话会显示）
        let progressBar = this.add.graphics();
        let progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(this.cameras.main.width / 2 - 160, this.cameras.main.height / 2 - 25, 320, 50);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x00ffcc, 1);
            progressBar.fillRect(this.cameras.main.width / 2 - 150, this.cameras.main.height / 2 - 15, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
        });

        // == 核心技巧：用代码动态生成游戏所需的贴图资源 ==
        this.generateTextures();
    }

    create() {
        console.log("[Phaser] 资源预加载完毕，进入核心战场场景");
        // 下一部分我们将创建 BattleScene
        this.scene.start('BattleScene'); 
    }

    generateTextures() {
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });

        // 1. 生成大本营建筑图标 (五角星/皇冠形)
        graphics.clear();
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(16, 16, 16);
        graphics.fillStyle(0x000000, 1);
        graphics.fillCircle(16, 16, 10);
        graphics.generateTexture('tex_hq', 32, 32);

        // 2. 生成军队移动粒子 (小光球)
        graphics.clear();
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(8, 8, 8);
        graphics.generateTexture('tex_army', 16, 16);

        // 3. 生成普通建筑通用图标 (方形)
        graphics.clear();
        graphics.fillStyle(0xcccccc, 1);
        graphics.fillRect(0, 0, 24, 24);
        graphics.generateTexture('tex_building', 24, 24);
        
        // 4. 生成特效粒子 (战斗火花)
        graphics.clear();
        graphics.fillStyle(0xff3366, 1);
        graphics.fillCircle(4, 4, 4);
        graphics.generateTexture('tex_spark', 8, 8);
    }
}