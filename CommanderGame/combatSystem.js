import { CONSTANTS } from './constants.js';
import { Store } from './state.js';

class CombatSystem {
    constructor() {
        this.activeArmies = []; // 在路上移动的军队
        this.battles = [];      // 正在交战的地块
    }

    init() {
        this.activeArmies = [];
        this.battles = [];
    }

    // 派兵出征
    sendTroops(sourceTile, targetTile, percentage, scene) {
        if (sourceTile.troops <= 1) return; // 没兵不能出
        
        const amount = Math.floor(sourceTile.troops * percentage);
        sourceTile.troops -= amount;

        // 创建视觉实体
        const armySprite = scene.add.sprite(sourceTile.pixelX, sourceTile.pixelY, 'tex_army');
        armySprite.setTint(this._getColorByOwner(sourceTile.ownerId));

        const army = {
            id: Math.random().toString(36).substr(2, 9),
            ownerId: sourceTile.ownerId,
            source: sourceTile,
            target: targetTile,
            troops: amount,
            sprite: armySprite,
            speed: 50 // 像素/秒
        };

        this.activeArmies.push(army);
    }

    // 在游戏每帧循环中更新
    update(delta, grid, scene) {
        const deltaSec = delta / 1000;

        // 1. 处理军队移动
        for (let i = this.activeArmies.length - 1; i >= 0; i--) {
            let army = this.activeArmies[i];
            let tx = army.target.pixelX;
            let ty = army.target.pixelY;
            
            let dist = Phaser.Math.Distance.Between(army.sprite.x, army.sprite.y, tx, ty);
            
            if (dist < 5) {
                // 到达目标
                this._resolveArrival(army, grid, scene);
                army.sprite.destroy();
                this.activeArmies.splice(i, 1);
            } else {
                // 移动
                let angle = Phaser.Math.Angle.Between(army.sprite.x, army.sprite.y, tx, ty);
                army.sprite.x += Math.cos(angle) * army.speed * deltaSec;
                army.sprite.y += Math.sin(angle) * army.speed * deltaSec;
            }
        }

        // 2. 简易战斗扣血演算 (如果目标领地有敌军)
        // 完整版需要把战斗做成持续的状态，此处简化为瞬间/快速结算
    }

    _resolveArrival(army, grid, scene) {
        let target = army.target;

        if (target.ownerId === army.ownerId || target.ownerId === 0) {
            // 自己人或空地 -> 驻扎/占领
            if (target.ownerId === 0) target.ownerId = army.ownerId; // 占领
            target.troops += army.troops;
        } else {
            // 遭遇敌军 -> 简易战斗结算
            if (army.troops > target.troops) {
                // 进攻方获胜
                target.troops = army.troops - target.troops;
                target.ownerId = army.ownerId;
                if (target.building === 'HQ') {
                    console.log(`玩家 ${target.ownerId} 的大本营被摧毁！`);
                }
                target.building = null; // 摧毁原有建筑
                scene.playExplosion(target.pixelX, target.pixelY);
            } else {
                // 防守方获胜
                target.troops -= army.troops;
            }
        }

        // 更新目标地块外观
        scene.refreshTile(target);
    }

    _getColorByOwner(ownerId) {
        const colors = [CONSTANTS.COLORS.NEUTRAL, CONSTANTS.COLORS.PLAYER, CONSTANTS.COLORS.AI_1, CONSTANTS.COLORS.AI_2, CONSTANTS.COLORS.AI_3, CONSTANTS.COLORS.AI_4];
        return colors[ownerId] || CONSTANTS.COLORS.NEUTRAL;
    }
}

export const Combat = new CombatSystem();