# youtube_speed - プロジェクト概要

> **AI向け**: このファイルを最初に読んでください。プロジェクトの全体像を把握するためのエントリーポイントです。

## プロジェクト情報

| 項目 | 内容 |
|------|------|
| プロジェクト名 | youtube_speed |
| 説明 | youtubeのspeedコントロール拡張 & チャンネル動画タブ自動遷移 |
| リポジトリ | [GitHub](https://github.com/poyoyon-ceee/youtube_speed) |
| ブランチ戦略 | `main`(安定版), `develop`(開発用) |
| 最終更新 | 2026-05-02 |
| バージョン | 0.2.0 |

## 機能一覧

- ✅ **スピードコントロール**: プレイヤー上のボタンで再生速度を変更
- ✅ **動画タブ自動遷移**: チャンネルアクセス時に自動で「動画」タブへ遷移（ON/OFF可能）

## 技術スタック

| カテゴリ | 技術 |
|---------|-----|
| フロントエンド | HTML/CSS/JavaScript |
| CSSフレームワーク | Vanilla CSS |
| 配布形式 | Webアプリケーション |
| 接続形態 | オンライン |

## 技術制約

- ✅ **オフライン必須**: 外部CDN・API参照禁止

## 再利用モジュール

| モジュール | 場所 | 役割 |
|-----------|------|------|
| EventBus | `src/core/event-bus.js` | コンポーネント間イベント通信 |
| StateManager | `src/core/state-manager.js` | アプリケーション状態管理 |
| HTMLSanitizer | `src/utils/sanitizer.js` | XSS対策・入力サニタイズ |
| DataMigration | `src/utils/migration.js` | データマイグレーション・バージョン管理 |
| ConfigManager | `src/utils/config.js` | 設定管理・永続化 |
| DiffRenderer | `src/utils/diff.js` | 差分描画・変更箇所ハイライト |


## 📚 ドキュメント読み順

1. **このファイル（PROJECT.md）** ← 今ここ
2. 🚨 **`.idx_rules/MASTER_PROTOCOL.md`** - **絶対厳守の最優先ルール（次に必ず読むこと）**
3. `INDEX.md` - クイックスタート
4. `docs/` 配下 - 詳細ドキュメント

---

*このファイルはAIがプロジェクトを理解するためのメインエントリーポイントです。*
