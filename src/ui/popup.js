// ポップアップの初期化ロジック
import '../core/event-bus.js';
import '../utils/config.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('✅ アプリケーション起動');

    const CONFIG_KEY = 'yt_speed_settings';
    const speedDisplay = document.getElementById('current-speed-display');

    if (window.ConfigManager) {
        console.log('✅ ConfigManager 利用可能');
        await window.ConfigManager.loadFromStorage(CONFIG_KEY);


        if (speedDisplay) {
            const currentSpeed = window.ConfigManager.get('speed', 1.0);
            speedDisplay.textContent = typeof currentSpeed === 'number' ? currentSpeed.toFixed(1) : currentSpeed;
        }
    }

    if (window.EventBus) {
        console.log('✅ EventBus 利用可能');
    }
});
