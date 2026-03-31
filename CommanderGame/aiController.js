import { Store } from './state.js';
import { Economy } from './economySystem.js';
import { Combat } from './combatSystem.js';
import { HexMath } from './hexMath.js';
import { BUILDINGS } from './buildings.js';

export class AIController {
    constructor(grid, scene) {
        this.grid = grid;
        this.scene = scene;
        this.aiIds = [];
        this.tickCounter = 0;
    }

    init() {
        const aiCount = Store.get().match.aiCount;
        for (let i = 0; i < aiCount; i++) {
            this.aiIds.push(i + 2); // 玩家是1，AI从2开始
        }
    }

    // 在 BattleScene 的 update 中调用，每秒执行一次
    update(deltaSec) {
        this.tickCounter += deltaSec;
        if (this.tickCounter >= 2) { // AI 每 2 秒进行一次决策思考
            this.tickCounter = 0;
            this.makeDecisions();
        }
    }

    makeDecisions() {
        const tiles = this.grid.getAllTiles();
        
        this.aiIds.forEach(aiId => {
            const myTiles = tiles.filter(t => t.ownerId === aiId);
            const myRes = Economy.getPlayerRes(aiId);
            if (!myRes || myTiles.length === 0) return; // 已经被淘汰

            // --- 1. 建造逻辑 (Build) ---
            // 找出没有建筑的空地
            const emptyTiles = myTiles.filter(t => t.building === null);
            if (emptyTiles.length > 0) {
                const targetTile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
                
                // 简单策略：缺钱建贸易站，缺兵建兵工厂
                if (myRes.gold >= BUILDINGS.BARRACKS.costGold && myRes.materials >= BUILDINGS.BARRACKS.costMat) {
                    // 60% 概率建兵营，40% 概率建贸易站或矿场
                    const rand = Math.random();
                    let buildType = 'BARRACKS';
                    if (rand > 0.8) buildType = 'MARKET';
                    else if (rand > 0.6) buildType = 'MINE';

                    const costG = BUILDINGS[buildType].costGold;
                    const costM = BUILDINGS[buildType].costMat;
                    
                    if (myRes.gold >= costG && myRes.materials >= costM) {
                        myRes.gold -= costG;
                        myRes.materials -= costM;
                        targetTile.building = buildType;
                        this.scene.refreshTile(targetTile);
                    }
                }
            }

            // --- 2. 扩张与攻击逻辑 (Attack & Expand) ---
            // 找出兵力充足的地块 (例如兵力大于 150)
            const strongholds = myTiles.filter(t => t.troops > 150);
            strongholds.forEach(sourceTile => {
                // 找相邻格子
                let neighbors = [];
                for (let i = 0; i < 6; i++) {
                    let neighborHex = HexMath.neighbor(sourceTile.hex, i);
                    let nTile = this.grid.getTile(neighborHex);
                    if (nTile) neighbors.push(nTile);
                }

                // 筛选出��是自己的格子 (中立或敌人)
                let targets = neighbors.filter(t => t.ownerId !== aiId);
                if (targets.length > 0) {
                    // 优先打兵少的
                    targets.sort((a, b) => a.troops - b.troops);
                    let target = targets[0];

                    // 如果自己兵力比目标多，则发起进攻，派出 60% 的兵力
                    if (sourceTile.troops * 0.6 > target.troops || target.ownerId === 0) {
                        Combat.sendTroops(sourceTile, target, 0.6, this.scene);
                    }
                }
            });
        });
    }
}