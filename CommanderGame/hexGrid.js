// hexGrid.js
import { CONSTANTS } from './constants.js';
import { Hex, HexMath } from './hexMath.js';
import { TERRAINS } from './terrains.js';
import { Store } from './state.js';

export class HexGrid {
    constructor() {
        this.tiles = new Map(); // key: "q,r,s", value: TileData
        this.spawnPoints = [];
    }

    generateMap(radius) {
        this.tiles.clear();
        const center = new Hex(0, 0, 0);
        const allHexes = HexMath.getRange(center, radius);

        allHexes.forEach(hex => {
            // 随机分配地形权重
            let terrain = TERRAINS.PLAIN;
            const rand = Math.random();
            if (rand > 0.95) terrain = TERRAINS.RUIN;
            else if (rand > 0.85) terrain = TERRAINS.MINERAL;
            else if (rand > 0.70) terrain = TERRAINS.MOUNTAIN;

            this.tiles.set(hex.toString(), {
                hex: hex,
                terrain: terrain,
                ownerId: 0, // 0为中立，1为玩家，2~5为AI
                troops: terrain.id === 'ruin' ? 300 : 0, // 遗迹自带野怪防守
                building: null, // 当前地块上的建筑
                isSpawnPoint: false
            });
        });

        this._assignSpawnPoints();
    }

    _assignSpawnPoints() {
        const totalPlayers = 1 + Store.get().match.aiCount;
        const availableHexes = Array.from(this.tiles.values()).filter(t => t.terrain.id === 'plain');
        
        // 随机打乱
        availableHexes.sort(() => Math.random() - 0.5);

        this.spawnPoints = [];
        for (let tile of availableHexes) {
            // 检查与已选出生点的距离
            let isValid = true;
            for (let sp of this.spawnPoints) {
                if (HexMath.distance(tile.hex, sp.hex) < CONSTANTS.MIN_SPAWN_DISTANCE) {
                    isValid = false;
                    break;
                }
            }

            if (isValid) {
                this.spawnPoints.push(tile);
                if (this.spawnPoints.length >= totalPlayers) break;
            }
        }

        // 初始化出生点数据 (分配给玩家和AI)
        this.spawnPoints.forEach((tile, index) => {
            const ownerId = index + 1; // 1是玩家，2-5是AI
            tile.isSpawnPoint = true;
            tile.ownerId = ownerId;
            tile.troops = CONSTANTS.STARTING_TROOPS;
            tile.building = 'HQ'; // 开局自带大本营
            this.tiles.set(tile.hex.toString(), tile);
        });
    }

    getTile(hex) {
        return this.tiles.get(hex.toString());
    }

    getAllTiles() {
        return Array.from(this.tiles.values());
    }
}