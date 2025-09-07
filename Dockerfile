# ---- Base Stage ----
# 全てのステージで共通の軽量なNode.jsイメージを使用
FROM node:20-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# pnpmの管理にcorepackを有効化
RUN corepack enable

WORKDIR /app

# ---- Builder Stage ----
# 依存関係のインストールとアプリケーションのビルドを行うステージ
FROM base AS builder

# 依存関係の定義ファイルを先にコピーして、Dockerのレイヤーキャッシュを有効活用
COPY package.json pnpm-lock.yaml ./
# Prismaスキーマも先にコピー (prisma generateで必要)
COPY prisma ./prisma/

# devDependenciesを含む全ての依存関係をインストール
RUN pnpm install --frozen-lockfile

# アプリケーションのソースコードをコピー
COPY . .

# コード生成と本番用ビルドを実行 (distフォルダが作成される)
RUN pnpm run prebuild && pnpm run build

# 開発用の依存関係を削除
RUN pnpm prune --prod

# ---- Runner Stage ----
# ビルドされたアプリケーションを実行する最終的な本番イメージ
FROM base AS runner

# builderステージから必要なファイルのみをコピー
COPY --from=builder /app/package.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/data ./data

# アプリケーションが使用するポートを公開
EXPOSE 3000

# セキュリティ向上のため、非rootユーザーで実行
USER node

# アプリケーションの起動コマンド
CMD ["node", "dist/app.js"]