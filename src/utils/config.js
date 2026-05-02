/**
 * ConfigManager - 設定管理
 *
 * 拡張機能コンテキストでは chrome.storage.local を使用し、
 * ポップアップ（chrome-extension://）とコンテンツスクリプト（youtube.com）で設定を共有する。
 * 初回のみ、従来の localStorage に残っている値をマージして移行する。
 */

class ConfigManager {
    constructor() {
        this.config = {};
        this.defaults = {};
    }

    _hasChromeStorage() {
        return (
            typeof chrome !== 'undefined' &&
            chrome.storage &&
            typeof chrome.storage.local !== 'undefined' &&
            typeof chrome.storage.local.get === 'function'
        );
    }

    setDefault(key, value) {
        this.defaults[key] = value;
    }

    get(key, defaultValue = null) {
        if (key in this.config) {
            return this.config[key];
        }
        if (key in this.defaults) {
            return this.defaults[key];
        }
        return defaultValue;
    }

    set(key, value) {
        this.config[key] = value;
        if (window.EventBus) {
            window.EventBus.emit('config:updated', { key, value });
        }
    }

    /**
     * @param {string} storageKey
     * @returns {Promise<void>}
     */
    loadFromStorage(storageKey = 'app_config') {
        if (this._hasChromeStorage()) {
            return new Promise((resolve) => {
                chrome.storage.local.get([storageKey], (result) => {
                    if (chrome.runtime.lastError) {
                        console.error('[ConfigManager] load:', chrome.runtime.lastError);
                        resolve();
                        return;
                    }

                    const fromChrome = result[storageKey];
                    let legacy = {};
                    try {
                        const raw = localStorage.getItem(storageKey);
                        if (raw) legacy = JSON.parse(raw);
                    } catch {
                        /* ignore */
                    }

                    const chromeObj =
                        fromChrome && typeof fromChrome === 'object' && !Array.isArray(fromChrome)
                            ? fromChrome
                            : {};
                    const legacyObj =
                        legacy && typeof legacy === 'object' && !Array.isArray(legacy) ? legacy : {};
                    const merged = { ...legacyObj, ...chromeObj };
                    this.config = merged;

                    const needsPersist =
                        Object.keys(merged).length > 0 &&
                        JSON.stringify(chromeObj) !== JSON.stringify(merged);

                    if (needsPersist) {
                        chrome.storage.local.set({ [storageKey]: merged }, () => {
                            if (chrome.runtime.lastError) {
                                console.error('[ConfigManager] migrate save:', chrome.runtime.lastError);
                            }
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                });
            });
        }

        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                this.config = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Config load error:', error);
        }
        return Promise.resolve();
    }

    /**
     * @param {string} storageKey
     * @returns {Promise<void>}
     */
    saveToStorage(storageKey = 'app_config') {
        const payload = { ...this.config };

        if (this._hasChromeStorage()) {
            return new Promise((resolve) => {
                chrome.storage.local.set({ [storageKey]: payload }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('[ConfigManager] save:', chrome.runtime.lastError);
                    }
                    resolve();
                });
            });
        }

        try {
            localStorage.setItem(storageKey, JSON.stringify(payload));
        } catch (error) {
            console.error('Config save error:', error);
        }
        return Promise.resolve();
    }

    reset() {
        this.config = {};
    }
}

const configManagerInstance = new ConfigManager();
if (typeof window !== 'undefined') {
    window.ConfigManager = configManagerInstance;
}

export default configManagerInstance;
export { ConfigManager };
