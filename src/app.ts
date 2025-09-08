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

// グレースフルシャットダウン処理
let isShuttingDown = false;
async function gracefulShutdown(signalOrReason?: string | Error) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  if (signalOrReason) {
    console.error(`Shutdown reason:`, signalOrReason);
  }
  try {
    await prisma.$disconnect();
    console.log('Database disconnected.');
  } catch (e) {
    console.error('Error during disconnect:', e);
  } finally {
    process.exit(typeof signalOrReason === 'number' ? signalOrReason : 1);
  }
}

// SIGTERM/SIGINT でのグレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  gracefulShutdown('SIGTERM');
});
process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  gracefulShutdown('SIGINT');
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

// グローバルエラーハンドラーもグレースフルシャットダウン
process.on('uncaughtException', error => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown(error);
});

// Promiseの未処理拒否もグレースフルシャットダウン
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown(
    reason instanceof Error ? reason : new Error(String(reason))
  );
});

export { app };
startServer();
