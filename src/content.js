/**
 * YouTube Speed Controller
 * ワンクリックで再生速度を変更する拡張機能のメインロジック
 */

import './core/event-bus.js';
import './core/state-manager.js';
import './utils/config.js';

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
            this._isApplying = false;
            this.lastUrl = window.location.href; // URL監視用

            if (window.ConfigManager) {
                window.ConfigManager.setDefault('speed', 1.0);
                window.ConfigManager.setDefault('autoVideoTab', false);
                window.ConfigManager.loadFromStorage(CONFIG_KEY).then(() => this.init());
            } else {
                this.init();
            }
        }

        init() {
            console.log('[YouTube Speed] Initializing SpeedController (Redirect Mode)...');
            
            // 1. 初期ロード時のリダイレクトチェック
            this.handleAutoVideoTabRedirect();

            // 2. プレイヤーエリアとURLの監視開始
            this.observeNavigationAndPlayer();

            // 設定変更の反映
            if (window.EventBus) {
                window.EventBus.on('config:updated', ({ key, value }) => {
                    if (key === 'speed') this.applySpeed(value);
                    if (key === 'autoVideoTab' && value) this.handleAutoVideoTabRedirect();
                });
            }

            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
                this._onStorageChanged = (changes, area) => {
                    if (area === 'local' && changes[CONFIG_KEY]) {
                        window.ConfigManager.loadFromStorage(CONFIG_KEY).then(() => {
                            this.handleAutoVideoTabRedirect();
                            this.syncVideoElement();
                            this.updateActiveButton();
                        });
                    }
                };
                chrome.storage.onChanged.addListener(this._onStorageChanged);
            }
        }

        /**
         * チャンネルホームにいる場合、自動的に動画タブへリダイレクトする
         */
        handleAutoVideoTabRedirect() {
            if (!window.ConfigManager || !window.ConfigManager.get('autoVideoTab')) return;

            const currentUrl = window.location.href;
            // 指定された正規表現でチャンネルホームを判定
            const isChannelHome = /^https:\/\/(www\.)?youtube\.com\/(@[^/]+|(c|user|channel)\/[^/]+)(\/featured)?\/?$/;

            if (isChannelHome.test(currentUrl)) {
                // 末尾の / や /featured を削って /videos を付与
                const baseUrl = currentUrl.replace(/\/featured\/?$/, '').replace(/\/$/, '');
                const targetUrl = baseUrl + '/videos';
                
                console.log('[YouTube Speed] Redirecting to videos tab:', targetUrl);
                window.location.replace(targetUrl);
            }
        }

        /**
         * プレイヤーエリアとURLの変更を同時に監視
         */
        observeNavigationAndPlayer() {
            const observer = new MutationObserver(() => {
                // URLが変更されたかチェック（SPA遷移対策）
                if (this.lastUrl !== window.location.href) {
                    this.lastUrl = window.location.href;
                    this.handleAutoVideoTabRedirect();
                }

                // プレイヤーの注入とビデオ要素の同期
                if (!this.container || !document.contains(this.container)) {
                    this.tryInject();
                }
                this.syncVideoElement();
            });

            observer.observe(document.body, { childList: true, subtree: true });
        }


        /**
         * ビデオ要素を特定し、イベントリスナーを登録する
         */
        syncVideoElement() {
            const currentVideo = document.querySelector(VIDEO_SELECTOR);
            if (!currentVideo) return;

            if (currentVideo !== this.video) {
                this.video = currentVideo;
                this.attachVideoEvents();
                this.applySpeed(window.ConfigManager.get('speed'));
            } else {
                this.checkAndFixSpeed();
            }
        }

        attachVideoEvents() {
            if (!this.video) return;
            this.video.addEventListener('ratechange', () => {
                if (this._isApplying) return;
                this.checkAndFixSpeed();
            });
            this.video.addEventListener('loadedmetadata', () => this.applySpeed(window.ConfigManager.get('speed')));
            this.video.addEventListener('play', () => this.applySpeed(window.ConfigManager.get('speed')));
        }

        checkAndFixSpeed() {
            if (!this.video || this._isApplying) return;
            const targetSpeed = window.ConfigManager.get('speed');
            if (this.video.playbackRate !== targetSpeed) {
                this.applySpeed(targetSpeed);
            }
        }

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

        setSpeed(speed) {
            window.ConfigManager.set('speed', speed);
            window.ConfigManager.saveToStorage(CONFIG_KEY);
        }

        applySpeed(speed) {
            if (!this.video) this.video = document.querySelector(VIDEO_SELECTOR);
            if (this.video) {
                try {
                    this._isApplying = true;
                    this.video.playbackRate = speed;
                    this.updateActiveButton();
                    setTimeout(() => { this._isApplying = false; }, 100);
                } catch (e) {
                    this._isApplying = false;
                }
            }
        }

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
