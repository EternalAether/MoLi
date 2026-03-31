export const COMMANDERS = [
    {
        id: "cmd_01",
        name: "泰勒",
        title: "铁血狂人",
        type: "狂战突击",
        stats: { atk: 1.3, def: 0.8, spd: 1.1 },
        passive: "【破釜沉舟】单次出兵超80%，该部队攻击力+20%。",
        active: "【嗜血狂热】指定领地兵力翻倍，随后30秒内每秒流失2%。",
        cooldown: 60
    },
    {
        id: "cmd_02",
        name: "艾格斯",
        title: "重装堡垒",
        type: "坚壁阵地",
        stats: { atk: 0.8, def: 1.5, spd: 0.7 },
        passive: "【铜墙铁壁】己方领地内作战受伤害-30%。",
        active: "【绝对力场】指定领地15秒内无敌（免疫攻击与负面状态）。",
        cooldown: 75
    },
    {
        id: "cmd_03",
        name: "迈达斯",
        title: "财阀巨头",
        type: "经济运营",
        stats: { atk: 1.0, def: 1.0, spd: 1.0 },
        passive: "【资本运作】拆除建筑的资源返还比例提升至100%。",
        active: "【重金悬赏】耗费2000资金，瞬间买通并占领一个兵力少于500的非大本营领地。",
        cooldown: 90
    },
    {
        id: "cmd_04",
        name: "幽灵",
        title: "疾风刺客",
        type: "诡道控制",
        stats: { atk: 1.1, def: 0.7, spd: 1.5 },
        passive: "【神出鬼没】经过中立空地无需等待，瞬间占领。",
        active: "【空降打击】无视距离，将某领地50%兵力瞬间空降到地图任意位置。",
        cooldown: 60
    },
    {
        id: "cmd_05",
        name: "奥尔恩",
        title: "建筑大师",
        type: "坚壁阵地",
        stats: { atk: 1.0, def: 1.2, spd: 0.8 },
        passive: "【基建狂魔】建筑建造时间缩短50%。",
        active: "【要塞化】将一个仓库变为武装要塞，自动对周围一圈射击。",
        cooldown: 60
    }
    // 篇幅限制，此处展示核心的5个代表流派，后续循环可扩充至12个
];