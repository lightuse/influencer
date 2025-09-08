import { Router } from 'express';
import multer from 'multer';
import { ImportController } from '../import.controller.js';

/**
 * Multerの設定。メモリストレージを使用し、ファイルサイズ上限を50MBに設定。
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

/**
 * インポート関連APIのルーティングを生成します。
 * @param controller インポートコントローラー
 * @returns Express Routerインスタンス
 */
export function createImportRoutes(controller: ImportController): Router {
  const router = Router();

  // インポートステータス
  router.get('/status', controller.getImportStatus.bind(controller));

  // CSVインポート
  router.post(
    '/csv',
    upload.single('csvFile'),
    controller.importCSV.bind(controller)
  );

  return router;
}
