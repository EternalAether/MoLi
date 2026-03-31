import { CONSTANTS } from './constants.js';
import { BUILDINGS } from './buildings.js';

class EconomySystem {
    constructor() {
        this.players = {}; // 存储1个玩家 + 4个AI的资源
    }

    init(totalPlayers) {
        for (let i = 1; i <= totalPlayers; i++) {
            this.players[i] = {
                gold: CONSTANTS.STARTING_GOLD,
                materials: CONSTANTS.STARTING_MATERIALS,
                troopCap: CONSTANTS.BASE_HQ_TROOP_LIMIT
            };
        }
    }

    // 每秒调用一次
    tick(grid) {
        const tiles = grid.getAllTiles();
        
        // 基础自然增长
        for (let id in this.players) {
            this.players[id].gold += 5; 
            this.players[id].materials += 2;
        }

        tiles.forEach(tile => {
            if (tile.ownerId === 0) return; // 中立地块跳过
            
            const ownerRes = this.players[tile.ownerId];
            if (!ownerRes) return;

            // 建筑产出逻辑
            if (tile.building) {
                const bData = BUILDINGS[tile.building.toUpperCase()];
                if (bData) {
                    if (bData.goldRate) ownerRes.gold += bData.goldRate;
                    if (bData.matRate) ownerRes.materials += bData.matRate;
                    
                    // 兵工厂自动产兵
                    if (bData.prodRate && tile.troops < bData.troopCap) {
                        tile.troops += bData.prodRate;
                        if (tile.troops > bData.troopCap) tile.troops = bData.troopCap;
                    }
                }
            }
        });
    }

    // 获取玩家资源
    getPlayerRes(ownerId) {
        return this.players[ownerId];
    }
}

export const Economy = new EconomySystem();