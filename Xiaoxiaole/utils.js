const Utils = {
    // 获取 [min, max] 范围内的随机整数
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    
    // 获取随机颜色ID
    randomColor: () => Utils.randomInt(0, CONFIG.COLORS.length - 1),
    
    // 异步等待，用于串联动画和逻辑逻辑
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    // 深拷贝棋盘数据
    cloneBoard: (board) => board.map(row => row.map(cell => ({...cell}))),
    
    // 生成唯一ID
    generateId: () => Math.random().toString(36).substr(2, 9)
};
