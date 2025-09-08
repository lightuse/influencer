import { Request, Response } from 'express';
import { ImportService } from '../application/import.service.js';

/**
 * インポート関連のAPIコントローラー。
 * CSVファイルのインポートやステータス取得を担当します。
 */
export class ImportController {
  /**
   * コントローラーのインスタンスを生成します。
   * @param importService インポートサービス
   */
  constructor(private importService: ImportService) {}

  /**
   * インポートステータスを取得して返します。
   * @param req Expressリクエスト
   * @param res Expressレスポンス
   */
  async getImportStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = this.importService.getImportStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * CSVファイルを受け取り、インポート処理を実行します。
   * @param req Expressリクエスト
   * @param res Expressレスポンス
   */
  async importCSV(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          error: 'No file uploaded',
          details: 'CSV file is required',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (
        req.file.mimetype !== 'text/csv' &&
        !req.file.originalname.endsWith('.csv')
      ) {
        res.status(400).json({
          error: 'Invalid file format',
          details: 'Only CSV files are allowed',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // ファイルサイズ上限チェックはmulterミドルウェアで実施済み
      const result = await this.importService.importCSV(
        req.file.buffer,
        req.file.originalname
      );

      res.status(201).json({
        success: true,
        message: 'CSV import completed successfully',
        data: {
          totalProcessed: result.totalProcessed,
          totalImported: result.totalImported,
          totalErrors: result.totalErrors,
          fileName: result.fileName,
          fileSize: result.fileSize,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Import failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
