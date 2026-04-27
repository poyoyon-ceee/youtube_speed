/**
 * YouTube Speed Controller
 * ワンクリックで再生速度を変更する拡張機能のメインロジック
 */

(function() {
    'use strict';

    // 定数定義
    const SPEEDS = [1.0, 1.25, 1.5, 2.0, 3.0];
    const CONTROLS_SELECTOR = '.ytp-right-controls';
    const VIDEO_SELECTOR = 'video.html5-main-video';
    const CONFIG_KEY = 'yt_speed_settings';

    class SpeedController {
        constructor() {
            this.video = null;
            this.container = null;
            
            // 設定の初期化
            window.ConfigManager.setDefault('speed', 1.0);
            window.ConfigManager.loadFromStorage(CONFIG_KEY);
            
            this.init();
        }

        init() {
            console.log('[YouTube Speed] Initializing with ConfigManager...');
            this.observeDOM();
            
            // 設定変更イベントの監視
            window.EventBus.on('config:updated', ({ key, value }) => {
                if (key === 'speed') {
                    this.applySpeed(value);
                }
            });
        }

        /**
         * DOMの変更を監視して、プレイヤーが現れたらボタンを注入する
         */
        observeDOM() {
            const observer = new MutationObserver((mutations) => {
                if (!this.container || !document.contains(this.container)) {
                    this.tryInject();
                }
                
                const currentVideo = document.querySelector(VIDEO_SELECTOR);
                if (currentVideo && currentVideo !== this.video) {
                    this.video = currentVideo;
                    this.applySpeed(window.ConfigManager.get('speed'));
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        /**
         * コントロールバーにボタンを注入する
         */
        tryInject() {
            const controls = document.querySelector(CONTROLS_SELECTOR);
            if (!controls || document.getElementById('yt-speed-container')) return;

            this.container = document.createElement('div');
            this.container.id = 'yt-speed-container';
            this.container.className = 'yt-speed-controller';

            SPEEDS.forEach(speed => {
                const btn = document.createElement('button');
                btn.className = 'yt-speed-btn';
                btn.textContent = speed.toFixed(1);
                btn.dataset.speed = speed;
                btn.dataset.tooltip = `${speed}x Speed`;
                
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.setSpeed(speed);
                });

                this.container.appendChild(btn);
            });

            controls.insertBefore(this.container, controls.firstChild);
            this.updateActiveButton();
        }

        /**
         * ユーザー操作による速度設定
         */
        setSpeed(speed) {
            window.ConfigManager.set('speed', speed);
            window.ConfigManager.saveToStorage(CONFIG_KEY);
        }

        /**
         * 実際の再生速度への反映
         */
        applySpeed(speed) {
            this.video = document.querySelector(VIDEO_SELECTOR);
            if (this.video) {
                this.video.playbackRate = speed;
                this.updateActiveButton();
                console.log(`[YouTube Speed] Applied speed: ${speed}`);
            }
        }

        /**
         * アクティブなボタンのスタイルを更新
         */
        updateActiveButton() {
            if (!this.container) return;
            
            const currentSpeed = window.ConfigManager.get('speed');
            const buttons = this.container.querySelectorAll('.yt-speed-btn');
            
            buttons.forEach(btn => {
                if (parseFloat(btn.dataset.speed) === currentSpeed) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
    }

    // 実行
    const start = () => {
        if (window.ConfigManager) {
            new SpeedController();
        } else {
            // ConfigManagerがロードされるのを待つ（Viteのバンドル順序に依存する場合）
            setTimeout(start, 50);
        }
    };

    start();

})();
