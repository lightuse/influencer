# インフルエンサーAPIドキュメントへようこそ

これはインフルエンサーAPIドキュメントのメインページです。

## システム構成図

```mermaid
flowchart LR
  FE["フロントエンド<br/>(Vite, TypeScript)"] -- API通信 --> API["バックエンドAPI<br/>(Express)"]
  API -- サービス呼び出し --> SVC["サービスレイヤー"]
  SVC -- ORM --> DB["データベース<br/>(PostgreSQL, Prisma)"]
  CLI["バッチ処理/CLI<br/>(import-csv等)"] -- 直接呼び出し --> SVC
  DOC["ドキュメント生成<br/>(Sphinx, MkDocs)"]
```

[APIリファレンスはこちら](typedoc/)
