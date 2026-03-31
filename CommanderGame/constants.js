export const CONSTANTS = {
    GAME_WIDTH: window.innerWidth,
    GAME_HEIGHT: window.innerHeight,
    
    // 地图与六边形配置
    HEX_SIZE: 60, // 六边形外接圆半径
    MAP_RADIUS: 8, // 地图半径（六边形圈数）
    MIN_SPAWN_DISTANCE: 4, // 两个出生点最少间隔的格子数

    // 游戏循环频率
    TICK_RATE: 1000, // 1秒演算一次经济和基础战斗
    COMBAT_TICK: 500, // 战斗扣血频率 0.5秒

    // 基础经济参数
    STARTING_GOLD: 1000,
    STARTING_MATERIALS: 500,
    STARTING_TROOPS: 200,
    BASE_HQ_TROOP_LIMIT: 1000,

    // 阵营颜色分配 (0为中立，1为玩家，2-5为人机)
    COLORS: {
        NEUTRAL: 0x888888,
        PLAYER: 0x00ffcc,
        AI_1: 0xff3366,
        AI_2: 0xaa33ff,
        AI_3: 0xffaa00,
        AI_4: 0x00aaff
    }
};