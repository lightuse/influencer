# 🚀 Influencer Posts Analysis API

TypeScript, pnpm, TypeSpec を使用した **設計駆動開発** によるインフルエンサー投稿分析APIです。オニオンアーキテクチャを採用し、保守性と拡張性の高いコードベースを目指しています。

## 🌟 特徴

- **設計駆動開発**: `TypeSpec`でAPIスキーマを定義し、コードを自動生成。
- **クリーンな設計**: `Onion Architecture`を採用し、関心事を分離。
- **統計・分析機能**: インフルエンサーごとの平均いいね数や投稿数を分析。
- **ランキング機能**: いいね数やコメント数に基づいたランキングを提供。
- **日本語テキスト分析**: `Kuromoji.js`による形態素解析で、投稿から名詞を抽出・集計。
- **一括データ登録**: `CSV`ファイルによるデータインポート機能。
- **型安全性**: `TypeScript`と`Prisma`によるエンドツーエンドの型安全性を確保。
- **コンテナ対応**: `Docker`と`Docker Compose`で環境構築を簡略化。
- **包括的なテスト**: `Vitest`による単体・統合テストを整備。

## 🏗️ 技術スタック

| カテゴリ          | 技術            | バージョン |
| ----------------- | --------------- | ---------- |
| 言語・ランタイム  | **TypeScript**  | 5.9.x      |
|                   | Node.js         | 20+        |
| スキーマ定義      | **TypeSpec**    | 1.3.x      |
| パッケージ管理    | **pnpm**        | 9.7.x      |
| Webフレームワーク | **Express**     | 4.18.x     |
| ORM               | **Prisma**      | 6.15.x     |
| データベース      | **PostgreSQL**  | 15+        |
| テスト            | **Vitest**      | 3.2.x      |
| コンテナ          | **Docker**      |            |
|                   | Docker Compose  |            |
| テキスト分析      | **Kuromoji.js** | 0.1.x      |

## 🚀 クイックスタート

### 前提条件

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### Docker Composeでの起動

```bash
# 1. 依存関係をインストール
pnpm install

# 2. Dockerコンテナを起動
pnpm run docker:up

# 3. コード生成とマイグレーションを実行
pnpm run prebuild
pnpm run db:push
pnpm run build

# 4. 動作確認
curl http://localhost:3000/api/health
```

## 📡 APIエンドポイント

| Method | Endpoint                                         | 説明                                                                                      |
| :----- | :----------------------------------------------- | :---------------------------------------------------------------------------------------- |
| `GET`  | `/api/health`                                    | ヘルスチェック                                                                            |
| `GET`  | `/api/influencers/{influencerId}/stats`          | 特定インフルエンサーの統計情報                                                            |
| `GET`  | `/api/influencers/top/likes?limit=10`            | いいね数ランキング（limit: 1-100）                                                        |
| `GET`  | `/api/influencers/top/comments?limit=10`         | コメント数ランキング（limit: 1-100）                                                      |
| `GET`  | `/api/influencers/{influencerId}/nouns?limit=10` | 投稿の名詞分析結果（limit: 1-100）                                                        |
| `POST` | `/api/import/csv`                                | CSVファイルによるデータインポート（multipart/form-data, フィールド名: csvFile, 最大50MB） |
| `GET`  | `/api/import/status`                             | インポート機能のステータス確認                                                            |

### 使用例

```bash
# いいね数トップ3を取得
curl "http://localhost:3000/api/influencers/top/likes?limit=3"

# コメント数トップ5を取得
curl "http://localhost:3000/api/influencers/top/comments?limit=5"

# 特定インフルエンサーの統計情報を取得
curl "http://localhost:3000/api/influencers/1/stats"

# 特定インフルエンサーの名詞分析（上位10件）
curl "http://localhost:3000/api/influencers/1/nouns?limit=10"

# CSVファイルをインポート（サンプルデータ）
curl -X POST -F "csvFile=@./data/t_influencer_posts_202401121334.csv" http://localhost:3000/api/import/csv

# インポートステータス確認
curl http://localhost:3000/api/import/status
```

## 🔄 開発ワークフロー

### 利用可能なスクリプト

| コマンド              | 説明                                       |
| :-------------------- | :----------------------------------------- |
| `pnpm run dev`        | 開発サーバーを起動 (Vite)                  |
| `pnpm run build`      | プロダクション用にビルド                   |
| `pnpm test`           | Vitestによるテストを実行                   |
| `pnpm run lint`       | ESLintによる静的解析を実行                 |
| `pnpm run format`     | Prettierによるコードフォーマット           |
| `pnpm run api:build`  | TypeSpecからAPI関連コードを生成            |
| `pnpm run db:migrate` | Prismaでデータベースマイグレーションを実行 |
| `pnpm run db:studio`  | Prisma Studioを起動                        |

### TypeSpec + Prisma 駆動開発

1.  **スキーマ更新**: `schemas/main.tsp` を編集します。
2.  **コード生成**: `pnpm run api:build` を実行し、型定義やサーバーの雛形を生成します。
3.  **実装**: 生成されたファイルを元に、ビジネスロジックを実装します。
4.  **DBスキーマ更新**: `prisma/schema.prisma` を編集します。
5.  **マイグレーション**: `pnpm run db:migrate` を実行してDBスキーマを更新します。

## 📁 プロジェクト構造

```
.
├── schemas/          # TypeSpecスキーマ定義
├── prisma/           # Prismaスキーマ、マイグレーション
├── generated/        # 自動生成されたコード (型定義など)
├── src/              # TypeScriptソースコード (Onion Architecture)
│   ├── app.ts        # エントリーポイント、DIコンテナ
│   ├── presentation/ # プレゼンテーション層 (Controller, Routes)
│   ├── application/  # アプリケーション層 (Service, Usecase)
│   ├── domain/       # ドメイン層 (Entity, Repository Interface)
│   └── infrastructure/ # インフラストラクチャ層 (DB実装, 外部API)
├── tests/            # テストコード
├── data/             # サンプルデータ
├── docs/             # ドキュメント静的サイト出力（mkdocs, sphinx, typedoc等）
└── ...               # 設定ファイル (package.json, tsconfig.jsonなど)
├── tsp-output/       # TypeSpecのOpenAPI等自動生成物
```

## 🌍 環境変数

プロジェクトルートの `.env` ファイルで設定します。`.env.example` を参考にしてください。

| 変数名         | 説明                                     | 必須 |
| :------------- | :--------------------------------------- | :--- |
| `DATABASE_URL` | PostgreSQL接続文字列                     | ✅   |
| `PORT`         | APIサーバーがリッスンするポート          |      |
| `NODE_ENV`     | 実行環境 (`development` or `production`) |      |

## 💡 GitHub運用ガイド

- プルリクエスト（Pull Request）ベースで開発・レビュー推奨
- Issueでタスク・バグ管理
- コミットメッセージは簡潔かつ内容が分かるように記述
- `.gitignore` で不要ファイルは除外
- mainブランチは常にデプロイ可能な状態を維持

## 📝 補足

- `tsp-output/` や `site/` などの自動生成物はgit管理外です
- Python仮想環境（.venv/）は各自作成し、git管理しません
- 依存バージョンやコマンドは `package.json` などで随時確認してください

## 📑 CSVインポート仕様

- エンドポイント: `POST /api/import/csv`（multipart/form-data, フィールド名: csvFile, 最大50MB）
- 必須カラム: `influencer_id`, `post_id`, `likes`, `comments`
- 任意カラム: `shortcode`, `thumbnail`, `text`, `post_date`
- 既存post_idはスキップ（重複登録なし）
- インポート結果は件数・エラー数等をJSONで返却
