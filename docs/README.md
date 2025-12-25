# influencer ドキュメント

このリポジトリは、インフルエンサーの投稿データを管理・分析するためのシステムです。

## ディレクトリ構成

```
docker-compose copy.yml
docker-compose.yml
Dockerfile
eslint.config.js
init.sql
package.json
pnpm-lock.yaml
QUALITY_CHECK_REPORT.md
README.md
tsconfig.json
typedoc.json
vite.config.ts
vitest.config.js
cli/
    import-csv.ts
client/
    health.http
    influencer.http
data/
    t_influencer_posts_202401121334.csv
docs/
    mkdocs.yml
    README.md
    requirements.txt
    mkdocs_content/
        build_procedure.md
        index.md
        sphinx/
            genindex.html
            index.html
            objects.inv
            search.html
            searchindex.js
            _sources/
                index.rst.txt
            _static/
                _sphinx_javascript_frameworks_compat.js
                basic.css
                doctools.js
                ...
        typedoc/
            hierarchy.html
            index.html
            modules.html
            assets/
            classes/
            functions/
            interfaces/
            modules/
            variables/
site/
    404.html
    index.html
    sitemap.xml
    sitemap.xml.gz
    assets/
        images/
        javascripts/
        stylesheets/
    build_procedure/
        index.html
    js/
        open_in_new_tab.js
    sphinx/
        genindex.html
        index.html
        objects.inv
        search.html
        searchindex.js
        _sources/
        _static/
    typedoc/
        hierarchy.html
        index.html
        modules.html
        assets/
        classes/
        functions/
        interfaces/
        modules/
        variables/
sphinx/
    conf.py
    index.rst
    requirements.txt
generated/
    api-types.ts
logs/
prisma/
    schema.prisma
schemas/
    main.tsp
    tspconfig.yaml
scripts/
    dev.js
src/
    app.ts
    application/
        import.service.ts
        influencer.service.ts
        text-analysis.service.ts
    domain/
        entities.ts
        repositories.ts
    infrastructure/
        prisma-influencer-post.repository.ts
    presentation/
        health.controller.ts
        import.controller.ts
        influencer.controller.ts
        routes/
            import.routes.ts
            influencer.routes.ts
    types/
        kuromoji.d.ts
tests/
    import.controller.test.ts
    import.routes.test.ts
    import.service.test.ts
    influencer.controller.test.ts
    influencer.routes.test.ts
    influencer.service.test.ts
    prisma-influencer-post.repository.test.ts
    setup.js
    text-analysis.service.test.ts
tsp-output/
    @typespec/
        openapi3/
            openapi.yaml
```

## 主な機能

- CSVファイルによるインフルエンサーポストの一括インポート（バッチ処理・バリデーションあり）
- インフルエンサーごとの統計情報取得（平均いいね数・平均コメント数・投稿数）
- いいね数・コメント数ランキング取得（limit指定可）
- 投稿本文から名詞の出現回数ランキング（日本語テキスト解析、kuromoji利用）
- APIエンドポイントによるデータ取得・分析

## 主なAPIエンドポイント

### インポート関連

- `POST /import/csv` : CSVファイルをアップロードし、投稿データを一括インポート
- `GET /import/status` : インポートサービスの状態・サポート仕様を取得

#### CSVインポート仕様

- サポート形式: CSV（最大50MB）
- 必須カラム: `influencer_id`, `post_id`, `likes`, `comments`
- 任意カラム: `shortcode`, `thumbnail`, `text`, `post_date`
- バッチサイズ: 1000件ごとにDB登録
- 既存post_idはスキップ

### インフルエンサー関連

- `GET /influencer/:influencerId/stats` : 指定IDの統計情報を取得
- `GET /influencer/top-likes?limit=10` : いいね数ランキング
- `GET /influencer/top-comments?limit=10` : コメント数ランキング
- `GET /influencer/:influencerId/nouns?limit=10` : 投稿本文から名詞ランキング

### ヘルスチェック

- `GET /health` : サーバー稼働確認

## テキスト分析（名詞抽出）

日本語テキストからkuromojiで名詞のみを抽出し、出現回数順で返します。
名詞は2文字以上のみカウントされます。

## エラー・バリデーション

- 各APIはパラメータ・ファイル形式・サイズ等を厳密にバリデーションし、エラー時は詳細なメッセージを返します。

## セットアップ方法

1. リポジトリをクローン
2. 必要な依存パッケージをインストール
3. データベースのセットアップ
4. サーバーの起動

## 開発・ビルド

開発用サーバーの起動:

```bash
pnpm dev
```

ビルド:

```bash
pnpm build
```

テスト:

```bash
pnpm test
```

## ドキュメント生成

typedoc, mkdocs, sphinx などでドキュメントを生成できます。

## ライセンス

このリポジトリは MIT ライセンスの下で公開されています。
