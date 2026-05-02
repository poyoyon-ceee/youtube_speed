// ポップアップの初期化ロジック
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ アプリケーション起動');
    
    const CONFIG_KEY = 'yt_speed_settings';
    const toggle = document.getElementById('auto-video-tab-toggle');
    const speedDisplay = document.getElementById('current-speed-display');

    // ConfigManagerが利用可能な場合
    if (window.ConfigManager) {
        console.log('✅ ConfigManager 利用可能');
        window.ConfigManager.loadFromStorage(CONFIG_KEY);

        // 初期状態の反映
        if (toggle) {
            toggle.checked = window.ConfigManager.get('autoVideoTab', false);
            
            // 設定変更のハンドリング
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
    
    // EventBusが利用可能な場合
    if (window.EventBus) {
        console.log('✅ EventBus 利用可能');
    }
});
