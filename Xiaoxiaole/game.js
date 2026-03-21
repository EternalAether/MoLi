const Game = {
    state: 'MENU', // MENU, PLAYING, PAUSED, ANIMATING, GAMEOVER
    logic: new BoardLogic(),
    ui: new UIController(),
    
    stage: 1,
    score: 0,
    moves: 0,
    target: 0,

    init() {
        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('btn-start').onclick = () => {
            AudioSys.init();
            AudioSys.click();
            this.startNewGame();
        };
        document.getElementById('btn-pause').onclick = () => {
            AudioSys.click();
            this.togglePause();
        };
        document.getElementById('btn-resume').onclick = () => {
            AudioSys.click();
            this.togglePause();
        };
        document.getElementById('btn-quit').onclick = () => {
            AudioSys.click();
            this.showScreen('main-menu');
        };
        document.getElementById('btn-restart').onclick = () => {
            AudioSys.click();
            this.startNewGame();
        };
    },

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        document.getElementById('pause-menu').classList.add('hidden');
        document.getElementById('game-over').classList.add('hidden');
    },

    startNewGame() {
        this.stage = 1;
        this.score = 0;
        this.setupStage();
        this.showScreen('game-ui');
    },

    setupStage() {
        this.target = Math.floor(CONFIG.STAGE.BASE_TARGET * Math.pow(CONFIG.STAGE.TARGET_GROWTH, this.stage - 1));
        this.moves = CONFIG.STAGE.BASE_MOVES + (this.stage > 1 ? CONFIG.STAGE.BONUS_MOVES : 0);
        
        this.logic.init();
        this.ui.initBoard(this.logic.grid);
        this.ui.updateStats(this.stage, this.score, this.moves, this.target);
        this.state = 'PLAYING';
        
        if (this.stage > 1) this.ui.showFloatingText(`Stage ${this.stage}`, '#3b82f6');
    },

    togglePause() {
        if (this.state === 'PLAYING') {
            this.state = 'PAUSED';
            document.getElementById('pause-menu').classList.remove('hidden');
        } else if (this.state === 'PAUSED') {
            this.state = 'PLAYING';
            document.getElementById('pause-menu').classList.add('hidden');
        }
    },

    async handleCellClick(r, c) {
        if (this.state !== 'PLAYING') return;

        if (!this.ui.selectedCell) {
            this.ui.selectCell(r, c);
            AudioSys.click();
        } else {
            const sr = this.ui.selectedCell.r;
            const sc = this.ui.selectedCell.c;
            this.ui.clearSelection();

            // 验证是否相邻交换
            if (Math.abs(sr - r) + Math.abs(sc - c) === 1) {
                this.state = 'ANIMATING';
                AudioSys.swap();
                
                // 执行UI和逻辑交换
                await this.ui.animateSwap(sr, sc, r, c);
                this.logic.swapCoords(sr, sc, r, c);

                let matchResult = this.logic.findMatches();
                
                if (matchResult.cells.length > 0) {
                    this.moves--;
                    await this.processCascades(matchResult, 1);
                } else {
                    // 无消除，退回
                    AudioSys.error();
                    await this.ui.animateSwap(sr, sc, r, c); // 动画退回
                    this.logic.swapCoords(sr, sc, r, c); // 逻辑退回
                    this.state = 'PLAYING';
                }
            } else {
                this.ui.selectCell(r, c);
                AudioSys.click();
            }
        }
    },

    async processCascades(matchResult, combo) {
        while (matchResult.cells.length > 0) {
            AudioSys.match(combo);
            if (combo > 1) this.ui.showFloatingText(`${combo} 連擊!`, '#facc15');

            // 触发炸弹等特效扩展消除区域
            let allToRemove = this.logic.getExplosionArea(matchResult.cells);

            // 分数计算
            let points = allToRemove.length * CONFIG.SCORE.BASE * (1 + (combo - 1) * 0.5);
            this.score += Math.floor(points);
            this.ui.updateStats(this.stage, this.score, this.moves, this.target);

            // 执行消除动画
            await this.ui.animateRemoval(allToRemove);

            // 逻辑层置空并创建特殊道具
            allToRemove.forEach(({r, c}) => { this.logic.grid[r][c] = null; });
            matchResult.specials.forEach(sp => {
                if (!this.logic.grid[sp.r][sp.c]) { // 如果该位置被清空了，则生成道具
                    this.logic.grid[sp.r][sp.c] = { id: Utils.generateId(), color: sp.color, type: sp.type };
                }
            });

            // 下落
            this.logic.applyGravity();
            this.ui.updateBoardVisually(this.logic.grid);
            await Utils.sleep(CONFIG.ANIMATION_SPEED);

            combo++;
            matchResult = this.logic.findMatches();
        }

        // 核心：智能重排检测
        if (!this.logic.hasPossibleMoves()) {
            this.state = 'ANIMATING';
            this.ui.showFloatingText('死局重排!', '#ec4899');
            await Utils.sleep(800);
            this.logic.smartShuffle();
            this.ui.updateBoardVisually(this.logic.grid);
            await Utils.sleep(500);
        }

        this.checkGameState();
    },

    checkGameState() {
        if (this.score >= this.target) {
            AudioSys.levelUp();
            this.stage++;
            this.setupStage();
        } else if (this.moves <= 0) {
            this.state = 'GAMEOVER';
            AudioSys.gameOver();
            document.getElementById('final-score').innerText = this.score;
            document.getElementById('final-stage').innerText = this.stage;
            document.getElementById('game-over').classList.remove('hidden');
        } else {
            this.state = 'PLAYING';
        }
    }
};

window.onload = () => Game.init();
