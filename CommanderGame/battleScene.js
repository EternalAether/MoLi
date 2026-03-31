import { CONSTANTS } from './constants.js';
import { HexGrid } from './hexGrid.js';
import { HexMath } from './hexMath.js';
import { Economy } from './economySystem.js';
import { Combat } from './combatSystem.js';
import { Store } from './state.js';
import { AIController } from './aiController.js';
import { BUILDINGS } from './buildings.js';

export default class BattleScene extends Phaser.Scene {
    constructor() {
        super('BattleScene');
        this.grid = new HexGrid();
        this.tileViews = new Map();
        this.selectedTile = null;
        this.tickTimer = 0;
        this.ai = null;
    }

    create() {
        console.log("[BattleScene] 核心战场初始化...");
        const totalPlayers = 1 + Store.get().match.aiCount;
        Economy.init(totalPlayers);
        Combat.init();
        this.grid.generateMap(CONSTANTS.MAP_RADIUS);
        
        this.ai = new AIController(this.grid, this);
        this.ai.init();

        this.cameras.main.setBackgroundColor('#0a0a12');
        this.cameras.main.setZoom(0.8);
        this.input.on('pointermove', (pointer) => {
            if (!pointer.isDown) return;
            this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x) / this.cameras.main.zoom;
            this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y) / this.cameras.main.zoom;
        });
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            let newZoom = this.cameras.main.zoom - deltaY * 0.001;
            this.cameras.main.setZoom(Phaser.Math.Clamp(newZoom, 0.3, 2));
        });

        this.drawMap();
        this.initHUD();
    }

    drawMap() {
        const hexSize = CONSTANTS.HEX_SIZE;
        const points = [];
        for (let i = 0; i < 6; i++) {
            let angle_rad = Math.PI / 180 * (60 * i - 30);
            points.push({x: hexSize * Math.cos(angle_rad), y: hexSize * Math.sin(angle_rad)});
        }

        const tiles = this.grid.getAllTiles();
        tiles.forEach(tile => {
            const pos = HexMath.hexToPixel(tile.hex, hexSize);
            tile.pixelX = pos.x;
            tile.pixelY = pos.y;

            const container = this.add.container(pos.x, pos.y);
            const poly = this.add.polygon(0, 0, points, tile.terrain.color).setStrokeStyle(2, 0x333333);
            poly.setInteractive(new Phaser.Geom.Polygon(points), Phaser.Geom.Polygon.Contains);
            
            const text = this.add.text(0, 5, tile.troops > 0 ? tile.troops.toString() : '', {
                font: '14px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5);

            const bIcon = this.add.image(0, -15, 'tex_hq').setVisible(tile.building !== null);

            container.add([poly, bIcon, text]);
            this.tileViews.set(tile.hex.toString(), { container, poly, text, bIcon });

            poly.on('pointerdown', () => this.handleTileClick(tile));
            this.refreshTile(tile);
        });

        const playerSpawn = this.grid.spawnPoints.find(t => t.ownerId === 1);
        if (playerSpawn) this.cameras.main.centerOn(playerSpawn.pixelX, playerSpawn.pixelY);
    }

    handleTileClick(tile) {
        // 取消上一个高亮
        if (this.selectedTile) {
            this.tileViews.get(this.selectedTile.hex.toString()).poly.setStrokeStyle(2, 0x333333);
        }

        if (!this.selectedTile || this.selectedTile === tile) {
            // 选中己方地块，呼出建筑菜单
            if (tile.ownerId === 1) {
                this.selectedTile = tile;
                this.tileViews.get(tile.hex.toString()).poly.setStrokeStyle(4, 0xffffff);
                this.showBuildMenu(tile);
            } else {
                this.selectedTile = null;
                this.hideBuildMenu();
            }
        } else {
            // 出兵指令 (从 selectedTile 到 tile)
            Combat.sendTroops(this.selectedTile, tile, 0.5, this); // 默认派出50%
            this.selectedTile = null;
            this.hideBuildMenu();
        }
    }

    refreshTile(tile) {
        const view = this.tileViews.get(tile.hex.toString());
        if (!view) return;

        const colors = [tile.terrain.color, CONSTANTS.COLORS.PLAYER, CONSTANTS.COLORS.AI_1, CONSTANTS.COLORS.AI_2, CONSTANTS.COLORS.AI_3, CONSTANTS.COLORS.AI_4];
        view.poly.setFillStyle(colors[tile.ownerId] || tile.terrain.color, tile.ownerId === 0 ? 1 : 0.8);
        view.text.setText(tile.troops > 0 ? Math.floor(tile.troops).toString() : '');
        
        view.bIcon.setVisible(tile.building !== null);
        if (tile.building === 'HQ') view.bIcon.setTexture('tex_hq');
        else if (tile.building) view.bIcon.setTexture('tex_building');
    }

    playExplosion(x, y) {
        let particles = this.add.particles(x, y, 'tex_spark', {
            speed: { min: -100, max: 100 }, angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 }, lifespan: 500, quantity: 15
        });
        this.time.delayedCall(500, () => particles.destroy());
    }

    update(time, delta) {
        Combat.update(delta, this.grid, this);
        this.ai.update(delta / 1000); // 驱动AI思考

        this.tickTimer += delta;
        if (this.tickTimer >= CONSTANTS.TICK_RATE) {
            Economy.tick(this.grid);
            this.tickTimer = 0;
            this.grid.getAllTiles().forEach(t => this.refreshTile(t));
            this.updateHUD();
        }
    }

    // --- UI 与 建造系统 ---

    initHUD() {
        const uiContainer = document.getElementById('battle-ui');
        uiContainer.innerHTML = `
            <div style="position: absolute; top: 10px; left: 10px; background: var(--panel-bg); padding: 15px; border: 1px solid var(--primary-color); pointer-events: auto;">
                <h3 style="color: var(--primary-color); margin-bottom: 5px;">资源统计</h3>
                <p>💰 资金: <span id="hud-gold" style="color:#ffcc00; font-weight:bold;">0</span></p>
                <p>🧱 建材: <span id="hud-mat" style="color:#aaaaaa; font-weight:bold;">0</span></p>
            </div>
            
            <!-- 建造操作面板 (底部居中) -->
            <div id="build-panel" class="hidden" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: var(--panel-bg); padding: 15px; border: 2px solid var(--primary-color); pointer-events: auto; display: flex; gap: 10px; align-items: center;">
                <!-- 动态生成按钮 -->
            </div>
            
            <div style="position: absolute; top: 10px; right: 10px; pointer-events: none;">
                <p style="color: #aaa; background: rgba(0,0,0,0.7); padding: 10px; border: 1px dashed #555;">操作：<br>1. 点击己方发光地块：打开建造面板<br>2. 选中己方 + 点击其他地块：出兵50%</p>
            </div>
        `;
    }

    updateHUD() {
        const playerRes = Economy.getPlayerRes(1);
        if (playerRes) {
            document.getElementById('hud-gold').innerText = Math.floor(playerRes.gold);
            document.getElementById('hud-mat').innerText = Math.floor(playerRes.materials);
        }
    }

    showBuildMenu(tile) {
        const panel = document.getElementById('build-panel');
        panel.classList.remove('hidden');
        panel.innerHTML = `<h4 style="color: #fff; margin-right: 15px;">地块操作</h4>`;

        if (tile.building) {
            // 如果已有建筑，显示拆除按钮
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.style.borderColor = 'var(--danger-color)';
            btn.style.color = 'var(--danger-color)';
            btn.innerText = tile.building === 'HQ' ? '大本营(不可拆)' : `拆除 ${BUILDINGS[tile.building]?.name || ''} (返还50%)`;
            
            if (tile.building !== 'HQ') {
                btn.onclick = () => {
                    const bData = BUILDINGS[tile.building];
                    const pRes = Economy.getPlayerRes(1);
                    pRes.gold += Math.floor(bData.costGold * 0.5);
                    pRes.materials += Math.floor(bData.costMat * 0.5);
                    tile.building = null;
                    this.playExplosion(tile.pixelX, tile.pixelY);
                    this.refreshTile(tile);
                    this.hideBuildMenu();
                };
            }
            panel.appendChild(btn);
        } else {
            // 如果是空地，显示可建造列表
            ['BARRACKS', 'MINE', 'MARKET', 'RADAR'].forEach(bKey => {
                const bData = BUILDINGS[bKey];
                const btn = document.createElement('button');
                btn.className = 'btn';
                btn.style.fontSize = '0.9rem';
                btn.style.padding = '8px 15px';
                btn.innerHTML = `${bData.name}<br><span style="font-size:0.7rem; color:#aaa;">💰${bData.costGold} 🧱${bData.costMat}</span>`;
                
                btn.onclick = () => {
                    const pRes = Economy.getPlayerRes(1);
                    if (pRes.gold >= bData.costGold && pRes.materials >= bData.costMat) {
                        pRes.gold -= bData.costGold;
                        pRes.materials -= bData.costMat;
                        
                        // 模拟建造延迟：显示建造中
                        tile.building = 'BUILDING...';
                        this.refreshTile(tile);
                        this.hideBuildMenu();
                        
                        this.time.delayedCall(2000, () => { // 2秒建造时间
                            if(tile.ownerId === 1) { // 确保地还没被抢走
                                tile.building = bKey;
                                this.refreshTile(tile);
                            }
                        });
                    } else {
                        alert("资源不足！");
                    }
                };
                panel.appendChild(btn);
            });
        }
    }

    hideBuildMenu() {
        const panel = document.getElementById('build-panel');
        if (panel) panel.classList.add('hidden');
    }
}