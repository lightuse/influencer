.. influencer documentation master file, created by
   sphinx-quickstart on Fri Sep  5 17:01:53 2025.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

influencer documentation
===========================

システム構成
------------

本システムは以下のコンポーネントで構成されています。

- フロントエンド（例: Vite, TypeScript）
- バックエンドAPI（Node.js, Express）
- データベース（例: PostgreSQL, Prisma）
- バッチ処理・CLIツール
- ドキュメント生成（Sphinx, MkDocs, TypeDoc）

.. toctree::
   :maxdepth: 2
   :caption: Contents:


その他必要なドキュメント
-------------------------

想定されるAPIの利用用途
~~~~~~~~~~~~~~~~~~~~~~~
本プロジェクトのAPIは、以下のような用途で利用されることを想定しています。

- インフルエンサー情報の取得・管理
- 投稿データのインポートおよび分析
- テキスト分析による投稿内容の傾向把握
- 健康チェックAPIによるシステム監視
- 外部システムとの連携やデータ連携


