import { Store } from './state.js';

class AudioManager {
    constructor() {
        this.bgm = null;
        this.sounds = {};
        this.musicEnabled = Store.get().audio.musicOn;
        this.sfxEnabled = Store.get().audio.sfxOn;

        // 监听全局状态变化
        Store.subscribe('audio.musicOn', (val) => {
            this.musicEnabled = val;
            if (this.bgm) {
                val ? this.bgm.play() : this.bgm.pause();
            }
        });

        Store.subscribe('audio.sfxOn', (val) => {
            this.sfxEnabled = val;
        });

        Store.subscribe('audio.volume', (val) => {
            Howler.volume(val);
        });
    }

    init() {
        // 初始化全局音量
        Howler.volume(Store.get().audio.volume);
        
        // 由于没有真实音频文件，这里使用空Howl对象作为占位符防止报错
        // 实际开发时替换为真实的mp3路径
        this.sounds = {
            click: new Howl({ src: ['data:audio/mp3;base64,'] }), // 占位
            start: new Howl({ src: ['data:audio/mp3;base64,'] }),
            battle_bgm: new Howl({ src: ['data:audio/mp3;base64,'], loop: true })
        };
    }

    playBgm(name) {
        if (this.bgm) this.bgm.stop();
        if (this.sounds[name]) {
            this.bgm = this.sounds[name];
            if (this.musicEnabled) this.bgm.play();
        }
    }

    playSfx(name) {
        if (this.sfxEnabled && this.sounds[name]) {
            this.sounds[name].play();
        } else {
            console.log(`[Audio] 播放音效: ${name}`); // 占位输出
        }
    }
}

export const AudioSystem = new AudioManager();