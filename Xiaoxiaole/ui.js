class UIController {
    constructor() {
        this.boardDiv = document.getElementById('board');
        this.floatingContainer = document.getElementById('floating-text');
        this.domMap = new Map(); // id -> DOM element
        this.selectedCell = null;
    }

    initBoard(grid) {
        this.boardDiv.innerHTML = '';
        this.domMap.clear();
        
        // 绘制底层格子背景
        for (let r = 0; r < CONFIG.ROWS; r++) {
            for (let c = 0; c < CONFIG.COLS; c++) {
                let bg = document.createElement('div');
                bg.className = 'board-grid-bg';
                bg.style.top = `${r * CONFIG.CELL_SIZE}px`;
                bg.style.left = `${c * CONFIG.CELL_SIZE}px`;
                this.boardDiv.appendChild(bg);
            }
        }

        // 绘制宝石
        this.updateBoardVisually(grid, true);
    }

    updateBoardVisually(grid, isInit = false) {
        // 创建或移动现有的宝石
        for (let r = 0; r < CONFIG.ROWS; r++) {
            for (let c = 0; c < CONFIG.COLS; c++) {
                const gemData = grid[r][c];
                if (!gemData) continue;

                let cellDom;
                if (!this.domMap.has(gemData.id)) {
                    // 新生成的宝石
                    cellDom = document.createElement('div');
                    cellDom.className = 'cell';
                    
                    let gem = document.createElement('div');
                    gem.className = `gem ${gemData.type}`;
                    gem.style.background = CONFIG.COLORS[gemData.color];
                    cellDom.appendChild(gem);
                    
                    // 新宝石从顶部上方掉落
                    cellDom.style.left = `${c * CONFIG.CELL_SIZE}px`;
                    cellDom.style.top = isInit ? `${r * CONFIG.CELL_SIZE}px` : `${-CONFIG.CELL_SIZE}px`;
                    
                    this.boardDiv.appendChild(cellDom);
                    this.domMap.set(gemData.id, cellDom);

                    // 强制重绘以触发 transition
                    if (!isInit) {
                        cellDom.offsetHeight; 
                    }
                } else {
                    cellDom = this.domMap.get(gemData.id);
                    // 如果道具类型发生变化（比如普通变成了特殊），更新 DOM
                    let gemDom = cellDom.firstChild;
                    gemDom.className = `gem ${gemData.type}`;
                }

                // 更新物理位置（触发移动动画）
                cellDom.style.top = `${r * CONFIG.CELL_SIZE}px`;
                cellDom.style.left = `${c * CONFIG.CELL_SIZE}px`;
            }
        }
    }

    selectCell(r, c, grid) {
        this.clearSelection(grid);
        this.selectedCell = {r, c};
        const id = grid[r][c]?.id;
        if(id && this.domMap.has(id)) {
            this.domMap.get(id).classList.add('selected');
        }
    }

    clearSelection(grid) {
        if(this.selectedCell && grid) {
            const id = grid[this.selectedCell.r]?.[this.selectedCell.c]?.id;
            if(id && this.domMap.has(id)) {
                this.domMap.get(id).classList.remove('selected');
            }
        }
        this.selectedCell = null;
    }

    async animateSwap(item1, item2, r1, c1, r2, c2) {
        if (item1 && this.domMap.has(item1.id)) {
            let dom1 = this.domMap.get(item1.id);
            dom1.style.top = `${r2 * CONFIG.CELL_SIZE}px`;
            dom1.style.left = `${c2 * CONFIG.CELL_SIZE}px`;
        }
        if (item2 && this.domMap.has(item2.id)) {
            let dom2 = this.domMap.get(item2.id);
            dom2.style.top = `${r1 * CONFIG.CELL_SIZE}px`;
            dom2.style.left = `${c1 * CONFIG.CELL_SIZE}px`;
        }
        await Utils.sleep(CONFIG.ANIMATION_SPEED);
    }

    async animateRemoval(matches, grid) {
        matches.forEach(({r, c}) => {
            const gemData = grid[r][c];
            if (gemData && this.domMap.has(gemData.id)) {
                const dom = this.domMap.get(gemData.id);
                dom.classList.add('removing');
                // 动画结束后移除DOM
                setTimeout(() => {
                    dom.remove();
                    this.domMap.delete(gemData.id);
                }, 300);
            }
        });
        await Utils.sleep(300);
    }

    showFloatingText(text, color = '#fff') {
        const msg = document.createElement('div');
        msg.className = 'float-msg';
        msg.innerText = text;
        msg.style.color = color;
        this.floatingContainer.appendChild(msg);
        setTimeout(() => msg.remove(), 1000);
    }

    updateStats(stage, score, moves, target) {
        document.getElementById('ui-stage').innerText = stage;
        document.getElementById('ui-score').innerText = score;
        document.getElementById('ui-moves').innerText = moves;
        document.getElementById('ui-target').innerText = target;
    }
}
