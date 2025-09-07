## **内容**

1. data ディレクトリにある CSV データを取得し、RDB へ格納する
2. 格納したデータから、influencer_id を API のリクエストデータとして、平均いいね数、平均コメント数を JSON 形式で返す API を作成する
3. 平均いいね数が多い influencer 上位 N 件を JSON 形式で返す API を作成する
4. 平均コメント数が多い influencer 上位 N 件を JSON 形式で返す API を作成する
5. influencer_id 毎に、格納したデータの text カラムに格納されたデータから名詞を抽出し、その使用回数を集計し、上位 N 件（N は API のリクエストデータ）を JSON 形式で返す API を作成する

## **制約**

- RDB は PostgreSQL か MySQL を利用すること
- RESTful API で設計すること
- CSV データを RDB へ格納する CLI を作成すること
- バックエンド API は Node.js で構築すること
- 各 API には単体テストコードを用意すること
- docker compose up で起動するよう、Dockerfile 等を用意すること

## アーキテクチャ

- オニオンアーキテクチャ
- TypeSpec で API スキーマ管理
- TypeSpec からの API コードを自動生成
