// ポップアップの初期化ロジック
import '../core/event-bus.js';
import '../utils/config.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('✅ アプリケーション起動');

    const CONFIG_KEY = 'yt_speed_settings';
    const toggle = document.getElementById('auto-video-tab-toggle');
    const speedDisplay = document.getElementById('current-speed-display');

    if (window.ConfigManager) {
        console.log('✅ ConfigManager 利用可能');
        await window.ConfigManager.loadFromStorage(CONFIG_KEY);

        if (toggle) {
            toggle.checked = window.ConfigManager.get('autoVideoTab', false);

            toggle.addEventListener('change', () => {
                window.ConfigManager.set('autoVideoTab', toggle.checked);
                window.ConfigManager.saveToStorage(CONFIG_KEY);
                console.log('✅ autoVideoTab 設定を保存:', toggle.checked);
            });
        }

        if (speedDisplay) {
            const currentSpeed = window.ConfigManager.get('speed', 1.0);
            speedDisplay.textContent = typeof currentSpeed === 'number' ? currentSpeed.toFixed(1) : currentSpeed;
        }
    }

    if (window.EventBus) {
        console.log('✅ EventBus 利用可能');
    }
});
