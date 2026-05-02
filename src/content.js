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

    /**
     * チャンネル「ホーム」相当の URL を「動画」タブ URL に変換する。変換不要なら null。
     * @param {string} fullHref
     * @returns {string|null}
     */
    function channelHomeToVideosUrl(fullHref) {
        if (!fullHref || typeof fullHref !== 'string') return null;
        let u;
        try {
            u = new URL(fullHref);
        } catch (e) {
            return null;
        }
        const host = u.hostname.replace(/^www\./, '');
        if (host !== 'youtube.com' && host !== 'm.youtube.com') return null;

        let path = u.pathname;
        if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

        if (path.includes('/videos')) return null;
        if (/^\/(feed|watch|shorts|results|playlist|embed|live|gaming|account|premium|redirect)/.test(path)) return null;

        const search = u.search;
        const hash = u.hash;

        let m = path.match(/^\/(@[^/]+)$/);
        if (m) return `${u.origin}/${m[1]}/videos${search}${hash}`;
        m = path.match(/^\/(@[^/]+)\/featured$/);
        if (m) return `${u.origin}/${m[1]}/videos${search}${hash}`;

        m = path.match(/^\/(channel\/UC[\w-]+)$/);
        if (m) return `${u.origin}/${m[1]}/videos${search}${hash}`;
        m = path.match(/^\/(channel\/UC[\w-]+)\/featured$/);
        if (m) return `${u.origin}/${m[1]}/videos${search}${hash}`;

        m = path.match(/^\/(c\/[^/]+)$/);
        if (m) return `${u.origin}/${m[1]}/videos${search}${hash}`;
        m = path.match(/^\/(user\/[^/]+)$/);
        if (m) return `${u.origin}/${m[1]}/videos${search}${hash}`;

        return null;
    }

    class SpeedController {
        constructor() {
            this.video = null;
            this.container = null;
            this._isApplying = false; // ループ防止フラグ

            // 設定の初期化（chrome.storage の読み込み完了後に init）
            if (window.ConfigManager) {
                window.ConfigManager.setDefault('speed', 1.0);
                window.ConfigManager.setDefault('autoVideoTab', false);
                window.ConfigManager.loadFromStorage(CONFIG_KEY).then(() => this.init());
            } else {
                this.init();
            }
        }

        init() {
            console.log('[YouTube Speed] Initializing SpeedController (JIT Mode)...');

            // 1. プレイヤー周りの監視 (MutationObserver)
            this.observePlayerArea();

            // 2. JITリンク書き換えリスナーの登録
            this.setupJITLinkRewrite();

            // 設定変更イベント（ポップアップからの反映など）の監視
            if (window.EventBus) {
                window.EventBus.on('config:updated', ({ key, value }) => {
                    if (key === 'speed') {
                        this.applySpeed(value);
                    }
                });
            }

            // ストレージ変更の直接監視（設定変更の即時反映）
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
                this._onStorageChanged = (changes, area) => {
                    if (area !== 'local' || !changes[CONFIG_KEY]) return;
                    window.ConfigManager.loadFromStorage(CONFIG_KEY).then(() => {
                        this.syncVideoElement();
                        this.updateActiveButton();
                    });
                };
                chrome.storage.onChanged.addListener(this._onStorageChanged);
            }
        }

        /**
         * JITリンク書き換え：遷移イベントを直接フックして目的地を捻じ曲げる
         */
        setupJITLinkRewrite() {
            // 1. YouTubeの内部遷移イベントをフック（これが一番確実）
            document.addEventListener('yt-navigate-start', (e) => {
                if (!window.ConfigManager || !window.ConfigManager.get('autoVideoTab')) return;
                
                const detail = e.detail;
                if (!detail || !detail.url) return;

                const targetUrl = channelHomeToVideosUrl(detail.url);
                if (targetUrl) {
                    const newPath = new URL(targetUrl).pathname + new URL(targetUrl).search;
                    // 遷移先URLを直接書き換える
                    detail.url = newPath;
                    console.log('[YouTube Speed] Navigation hooked & redirected to:', newPath);
                }
            }, { capture: true });

            // 2. マウス操作時の属性書き換え（右クリックコピー等のため）
            const mouseHandler = (e) => {
                if (!window.ConfigManager || !window.ConfigManager.get('autoVideoTab')) return;

                const anchor = e.target.closest('a');
                if (!anchor) return;

                const targetUrl = channelHomeToVideosUrl(anchor.href);
                if (!targetUrl) return;

                const path = new URL(targetUrl).pathname;
                anchor.setAttribute('href', path);
                console.log('[YouTube Speed] JIT Attribute rewrite:', path);
            };

            document.addEventListener('mousedown', mouseHandler, { capture: true });
            document.addEventListener('contextmenu', mouseHandler, { capture: true });
        }



        /**
         * プレイヤーエリアのみを監視（ボタン注入とビデオ要素同期用）
         */
        observePlayerArea() {
            const observer = new MutationObserver(() => {
                if (!this.container || !document.contains(this.container)) {
                    this.tryInject();
                }
                this.syncVideoElement();
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
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
