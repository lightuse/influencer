# ドキュメントビルド手順

このドキュメントは、Sphinx・TypeDoc・MkDocs を用いたプロジェクトドキュメントのビルドとサーブ手順をまとめたものです。

## 前提条件

以下がインストールされていることを確認してください：

- [Node.js](https://nodejs.org/)（v20以上）および `pnpm`
- [uv](https://github.com/astral-sh/uv)（Pythonパッケージマネージャ）

## 1. 依存パッケージのインストール

1.  **Node.js依存パッケージ：**
    TypeDocを含むすべてのNode.jsパッケージをインストールします。

    ```bash
    pnpm install
    ```

2.  **Python依存パッケージ：**
    MkDocsおよびSphinx関連パッケージをインストールします。
    ```bash
    uv pip install -r docs/requirements.txt
    uv pip install -r docs/sphinx/requirements.txt
    ```

## 2. ドキュメントソースのビルド

1.  **TypeDocドキュメントのビルド：**
    下記コマンドで `typedoc.json` を読み込み、APIドキュメントを生成します。出力は自動的に `docs/mkdocs_content/typedoc` に配置されます。

    ```bash
    pnpm run docs
    ```

2.  **Sphinxドキュメントのビルド：**
    下記コマンドでSphinxドキュメントをビルドし、MkDocs用ディレクトリに出力します。
    ```bash
    sphinx-build -b html docs/sphinx/ docs/mkdocs_content/sphinx/
    ```

## 3. MkDocsでドキュメントをサーブ

すべてのソースをビルドしたら、MkDocsで統合ドキュメントサイトをサーブできます。

1.  **プロジェクトルートディレクトリへ移動**

2.  **MkDocs開発サーバーの起動：**

    ```bash
    mkdocs serve -f docs/mkdocs.yml
    ```

3.  ブラウザで `http://127.0.0.1:8000` にアクセスしてください。

`docs/mkdocs_content` 配下のファイルを編集すると、サイトは自動でリロードされます。
