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
            this._isApplying = false; // ループ防止フラグ
            this._lastUrl = location.href; // URL変更検知用
            
            // 設定の初期化
            if (window.ConfigManager) {
                window.ConfigManager.setDefault('speed', 1.0);
                window.ConfigManager.setDefault('autoVideoTab', false);
                window.ConfigManager.loadFromStorage(CONFIG_KEY);
            }
            
            this.init();
        }

        init() {
            console.log('[YouTube Speed] Initializing SpeedController...');
            this.observeDOM();
            
            // 設定変更イベント（ボタンクリック時など）の監視
            if (window.EventBus) {
                window.EventBus.on('config:updated', ({ key, value }) => {
                    if (key === 'speed') {
                        this.applySpeed(value);
                    }
                });
            }

            // YouTube特有の遷移イベントを監視 (SPA対応)
            window.addEventListener('yt-navigate-finish', () => {
                console.log('[YouTube Speed] Navigation finished.');
                this.handleRedirect();
            });

            // ブラウザの戻る・進むボタンに対応
            window.addEventListener('popstate', () => {
                this.handleRedirect();
            });

            // 初回実行時
            this.handleRedirect();
        }

        /**
         * DOMの変更を監視して、プレイヤーが現れたらボタンを注入し、
         * ビデオ要素の状態をチェックする
         */
        observeDOM() {
            const observer = new MutationObserver(() => {
                // URLが変更されていたらリダイレクトチェック
                if (location.href !== this._lastUrl) {
                    this._lastUrl = location.href;
                    this.handleRedirect();
                }

                // コントロールバーへのボタン注入チェック
                if (!this.container || !document.contains(this.container)) {
                    this.tryInject();
                }
                
                // ビデオ要素の監視
                this.syncVideoElement();
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // 初回実行
            this.syncVideoElement();
        }

        /**
         * チャンネルホームを動画タブに自動リダイレクトする
         */
        handleRedirect() {
            if (!window.ConfigManager || !window.ConfigManager.get('autoVideoTab')) return;

            const url = window.location.href;
            // 判定: youtube.com/@user または youtube.com/@user/featured (末尾の / は任意)
            const channelHomeRegex = /^https?:\/\/(www\.)?youtube\.com\/(@[^/?#]+)(\/featured)?\/?(\?.*)?(#.*)?$/;
            const match = url.match(channelHomeRegex);

            if (match) {
                const username = match[2];
                const search = match[4] || '';
                const hash = match[5] || '';
                // 動画タブのURLを構築
                const targetUrl = `https://www.youtube.com/${username}/videos${search}${hash}`;
                
                console.log(`[YouTube Speed] Redirecting to videos tab: ${targetUrl}`);
                window.location.replace(targetUrl);
            }
        }

        /**
         * ビデオ要素を特定し、イベントリスナーを登録する
         */
        syncVideoElement() {
            const currentVideo = document.querySelector(VIDEO_SELECTOR);
            if (!currentVideo) return;

            // 新しいビデオ要素が見つかった、または要素が入れ替わった場合
            if (currentVideo !== this.video) {
                console.log('[YouTube Speed] New video element detected.');
                this.video = currentVideo;
                this.attachVideoEvents();
                this.applySpeed(window.ConfigManager.get('speed'));
            } else {
                // 要素は同じだが、速度が設定値とズレていないかチェック（念のため）
                this.checkAndFixSpeed();
            }
        }

        /**
         * ビデオ要素にイベントリスナーを登録
         */
        attachVideoEvents() {
            if (!this.video) return;

            // YouTube側による速度変更を検知
            this.video.addEventListener('ratechange', () => {
                if (this._isApplying) return; // 自分が変えた時は無視
                this.checkAndFixSpeed();
            });

            // 動画の読み込み時や再生開始時にも再適用
            this.video.addEventListener('loadedmetadata', () => this.applySpeed(window.ConfigManager.get('speed')));
            this.video.addEventListener('play', () => this.applySpeed(window.ConfigManager.get('speed')));
        }

        /**
         * 現在の再生速度が設定値と異なる場合に強制適用する
         */
        checkAndFixSpeed() {
            if (!this.video || this._isApplying) return;
            
            const targetSpeed = window.ConfigManager.get('speed');
            if (this.video.playbackRate !== targetSpeed) {
                console.log(`[YouTube Speed] Speed mismatch detected (${this.video.playbackRate}x -> ${targetSpeed}x). Fixing...`);
                this.applySpeed(targetSpeed);
            }
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
            if (!this.video) {
                this.video = document.querySelector(VIDEO_SELECTOR);
            }

            if (this.video) {
                try {
                    this._isApplying = true;
                    this.video.playbackRate = speed;
                    this.updateActiveButton();
                    // 少し遅延させてフラグを戻す（連続発生するイベントへの対策）
                    setTimeout(() => { this._isApplying = false; }, 100);
                } catch (e) {
                    this._isApplying = false;
                }
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
        if (window.ConfigManager && window.EventBus) {
            new SpeedController();
        } else {
            // 依存モジュールのロード待ち
            setTimeout(start, 50);
        }
    };

    start();

})();
