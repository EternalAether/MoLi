class UIController {
    constructor() {
        this.boardDiv = document.getElementById('board');
        this.floatingContainer = document.getElementById('floating-text');
        this.cells = []; 
        this.selectedCell = null;
    }

    initBoard(grid) {
        this.boardDiv.innerHTML = '';
        this.cells = [];
        for (let r = 0; r < CONFIG.ROWS; r++) {
            this.cells[r] = [];
            for (let c = 0; c < CONFIG.COLS; c++) {
                let cell = document.createElement('div');
                cell.className = 'cell';
                cell.style.top = `${r * CONFIG.CELL_SIZE}px`;
                cell.style.left = `${c * CONFIG.CELL_SIZE}px`;
                
                let gem = document.createElement('div');
                this.updateGemDOM(gem, grid[r][c]);
                
                cell.appendChild(gem);
                cell.onclick = () => Game.handleCellClick(r, c);
                
                this.boardDiv.appendChild(cell);
                this.cells[r][c] = { dom: cell, gemDom: gem };
            }
        }
    }

    updateGemDOM(gemDom, gemData) {
        if (!gemData) return;
        gemDom.className = `gem ${gemData.type}`;
        gemDom.style.background = CONFIG.COLORS[gemData.color];
    }

    updateBoardVisually(grid) {
        for (let r = 0; r < CONFIG.ROWS; r++) {
            for (let c = 0; c < CONFIG.COLS; c++) {
                let domItem = this.cells[r][c];
                domItem.dom.classList.remove('removing');
                domItem.dom.style.top = `${r * CONFIG.CELL_SIZE}px`;
                domItem.dom.style.left = `${c * CONFIG.CELL_SIZE}px`;
                if (grid[r][c]) {
                    this.updateGemDOM(domItem.gemDom, grid[r][c]);
                    domItem.dom.style.opacity = 1;
                    domItem.gemDom.style.transform = 'scale(1)';
                }
            }
        }
    }

    selectCell(r, c) {
        this.clearSelection();
        this.selectedCell = {r, c};
        this.cells[r][c].dom.classList.add('selected');
    }

    clearSelection() {
        if(this.selectedCell) {
            this.cells[this.selectedCell.r][this.selectedCell.c].dom.classList.remove('selected');
        }
        this.selectedCell = null;
    }

    async animateSwap(r1, c1, r2, c2) {
        const item1 = this.cells[r1][c1];
        const item2 = this.cells[r2][c2];
        
        item1.dom.style.top = `${r2 * CONFIG.CELL_SIZE}px`;
        item1.dom.style.left = `${c2 * CONFIG.CELL_SIZE}px`;
        item2.dom.style.top = `${r1 * CONFIG.CELL_SIZE}px`;
        item2.dom.style.left = `${c1 * CONFIG.CELL_SIZE}px`;
        
        // 交换 DOM 引用
        this.cells[r1][c1] = item2;
        this.cells[r2][c2] = item1;

        await Utils.sleep(CONFIG.ANIMATION_SPEED);
    }

    async animateRemoval(matches) {
        matches.forEach(({r, c}) => {
            this.cells[r][c].dom.classList.add('removing');
        });
        await Utils.sleep(CONFIG.ANIMATION_SPEED);
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
