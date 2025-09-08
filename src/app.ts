/**
 * アプリケーションのエントリーポイント。
 * Expressサーバーの初期化、DI、ルーティング、エラーハンドリングを行う。
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import process from 'process';

import { PrismaInfluencerPostRepository } from './infrastructure/prisma-influencer-post.repository.js';
import { InfluencerService } from './application/influencer.service.js';
import { TextAnalysisService } from './application/text-analysis.service.js';
import { ImportService } from './application/import.service.js';
import { InfluencerController } from './presentation/influencer.controller.js';
import { ImportController } from './presentation/import.controller.js';
import { createInfluencerRoutes } from './presentation/routes/influencer.routes.js';
import { createImportRoutes } from './presentation/routes/import.routes.js';

/**
 * .envファイルから環境変数を読み込む。
 */
dotenv.config();

/**
 * アプリケーション起動ログ。
 */
console.log('Starting application...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not Set');

/**
 * Expressアプリケーションインスタンス。
 */
const app = express();
/**
 * サーバーのポート番号。
 */
const port = process.env.PORT || 3000;

/**
 * セキュリティ・CORS・JSONパースのミドルウェアを設定。
 */
app.use(helmet());
app.use(cors());
app.use(express.json());

/**
 * DIコンテナの初期化。
 */
const prisma = new PrismaClient();
const influencerPostRepository = new PrismaInfluencerPostRepository(prisma);
const textAnalysisService = new TextAnalysisService();
const influencerService = new InfluencerService(
  influencerPostRepository,
  textAnalysisService
);
const importService = new ImportService(influencerPostRepository);

/**
 * コントローラーの初期化。
 */
const influencerController = new InfluencerController(influencerService);
const importController = new ImportController(importService);

/**
 * ルーティングの設定。
 */
app.use('/api', createInfluencerRoutes(influencerController));
app.use('/api/import', createImportRoutes(importController));

/**
 * グローバルエラーハンドリングミドルウェア。
 */
app.use(
  (
    err: unknown,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (err instanceof Error) {
      console.error(err.stack);
      res.status(500).json({
        error: process.env.NODE_ENV === 'production' ? err.message : err,
      });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Unknown error' });
    }
  }
);

/**
 * 404 Not Foundハンドラー。
 */
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: 'Not found',
    details: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// グレースフルシャットダウン
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Ctrl+Cイベントのハンドリング
process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// テキスト分析サービスを初期化し、サーバーを起動
async function startServer() {
  try {
    console.log('Initializing text analysis service...');
    await textAnalysisService.initialize();
    console.log('Text analysis service initialized');

    app.listen(port, () => {
      console.log(`🚀 Influencer API server is running on port ${port}`);
      console.log(`📚 Health check: http://localhost:${port}/api/health`);
      console.log(`🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  }
}

// グローバルエラーハンドラーを追加
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// 未処理のPromise拒否をハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export { app };
startServer();
