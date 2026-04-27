import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM環境での __dirname 相当のパス取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 実行環境の自動判定
const isTauri = fs.existsSync(path.join(__dirname, 'src-tauri'));

// 変数の宣言
let source, deployDir, destPath, fileName, deployDirName;

// 条件分岐によるパスと設定の切り替え
if (isTauri) {
    source = path.join(__dirname, 'src-tauri', 'target', 'release', `youtube_speed.exe`);
    deployDirName = 'deploy_tauri';
    fileName = `youtube_speed.exe`;
    deployDir = path.join(__dirname, deployDirName);
    destPath = path.join(deployDir, fileName);
} else {
    source = path.join(__dirname, 'dist');
    deployDirName = 'deploy_web';
    fileName = ''; // フォルダコピーの場合は空
    deployDir = path.join(__dirname, deployDirName);
    destPath = deployDir;
}

console.log(`🚀 デプロイ開始: ${isTauri ? 'TAURI' : 'WEB'} 環境を検出`);

// デプロイディレクトリが存在しない場合は作成
if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
}

// フォルダを再帰的にコピーする関数
function copyFolderRecursiveSync(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    if (fs.lstatSync(src).isDirectory()) {
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
                copyFolderRecursiveSync(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
}

// バックアップ処理（WebフォルダまたはTauri単体ファイル）
if (fs.existsSync(destPath)) {
    const isDir = fs.lstatSync(destPath).isDirectory();
    const suffix = isTauri ? '_tauri' : '_web';
    
    // バックアップ名のベース決定
    let base, ext;
    if (isDir) {
        base = 'backup';
        ext = '';
    } else {
        ext = path.extname(fileName);
        base = path.basename(fileName, ext);
    }

    // 世代管理：10個を超える場合は古いものを削除
    // v1 が一番古く、バックアップ作成前に v1 を消して枠を空ける
    const oldestBackup = path.join(deployDir, `${base}${suffix}_v1${ext}`);
    if (fs.existsSync(oldestBackup)) {
        try {
            if (fs.lstatSync(oldestBackup).isDirectory()) {
                fs.rmSync(oldestBackup, { recursive: true, force: true });
            } else {
                fs.unlinkSync(oldestBackup);
            }
        } catch (err) {
            console.warn('⚠️ 古いバックアップの削除に失敗しました:', err.message);
        }
    }

    // 既存のバックアップをリネームしてずらす (v2->v1, v3->v2, ...)
    for (let i = 2; i <= 10; i++) {
        const oldPath = path.join(deployDir, `${base}${suffix}_v${i}${ext}`);
        const newPath = path.join(deployDir, `${base}${suffix}_v${i - 1}${ext}`);
        if (fs.existsSync(oldPath)) {
            try {
                fs.renameSync(oldPath, newPath);
            } catch (err) {
                console.warn(`⚠️ バックアップのリネームに失敗しました (v${i}->v${i-1}):`, err.message);
            }
        }
    }

    // 新しいバックアップは常に v10 とする
    const backupPath = path.join(deployDir, `${base}${suffix}_v10${ext}`);
    
    try {
        if (isDir) {
            copyFolderRecursiveSync(destPath, backupPath);
        } else {
            fs.copyFileSync(destPath, backupPath);
        }
        console.log(`📦 バックアップ作成: ${path.basename(backupPath)}`);
    } catch (err) {
        console.warn('⚠️ 最新バックアップの作成に失敗しました:', err.message);
    }
}

// コピー実行（リトライ機能付き）
function copyWithRetry(src, dest, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            if (fs.lstatSync(src).isDirectory()) {
                // フォルダ（Web）の場合は deploy_web 自体をターゲットにするのではなく、
                // deploy_web 内に中身をぶち込むか、あるいは指示通りに丸ごとコピー
                // ここでは dest が deployDir になっているのでそのまま流し込む
                copyFolderRecursiveSync(src, dest);
            } else {
                // 単体ファイル（Tauri）の場合
                fs.copyFileSync(src, dest);
            }
            console.log(`✅ デプロイ成功: ${path.basename(dest)}`);
            return true;
        } catch (error) {
            if (i === maxRetries - 1) {
                console.error(`❌ デプロイ失敗（${maxRetries}回リトライ後）:`, error);
                return false;
            }
            console.warn(`🔄 デプロイリトライ (${i + 1}/${maxRetries}):`, error.message);
            // 1秒待機
            const start = Date.now();
            while (Date.now() - start < 1000) {}
        }
    }
    return false;
}

if (fs.existsSync(source)) {
    copyWithRetry(source, destPath);
} else {
    console.error(`❌ ソースが見つかりません: ${source}`);
    console.error(isTauri ? 'tauri build を先に実行してください。' : 'npm run build を先に実行してください。');
    process.exit(1);
}
