class GameState {
    constructor() {
        this.state = {
            currentScreen: 'loading', // loading, main-menu, prep-room, selection, battle
            audio: {
                musicOn: true,
                sfxOn: true,
                volume: 0.5
            },
            player: {
                commanderId: 'cmd_01',
                weaponId: 'wp_01'
            },
            match: {
                aiCount: 4,
                aiPlayers: [] // 存放生成的 AI 配置
            }
        };
        this.listeners = {};
    }

    // 获取深拷贝状态
    get() {
        return JSON.parse(JSON.stringify(this.state));
    }

    // 更新状态并派发事件
    commit(keyPath, value) {
        const keys = keyPath.split('.');
        let current = this.state;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
        this._notify(keyPath, value);
    }

    // 订阅状态变化
    subscribe(keyPath, callback) {
        if (!this.listeners[keyPath]) {
            this.listeners[keyPath] = [];
        }
        this.listeners[keyPath].push(callback);
    }

    _notify(keyPath, value) {
        if (this.listeners[keyPath]) {
            this.listeners[keyPath].forEach(cb => cb(value));
        }
    }
}

export const Store = new GameState();