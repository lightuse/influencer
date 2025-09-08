import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

// ImportControllerのテスト
import { ImportController } from '@presentation/import.controller.js';
import { ImportService } from '@application/import.service.js';
import { Request, Response } from 'express';

// ImportServiceをモック化
vi.mock('@application/import.service');

describe('ImportController', () => {
  // 各テストで使用する変数を宣言
  let importService: Partial<ImportService>;
  let importController: ImportController;
  let req: Partial<Request>;
  let res: Partial<Response>;

  // 各テストケースの前に初期化処理を実行
  beforeEach(() => {
    importService = {
      getImportStatus: vi.fn() as Mock,
      importCSV: vi.fn() as Mock,
    };
    importController = new ImportController(importService as ImportService);

    req = {};
    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
  });

  // getImportStatusメソッドのテスト
  describe('getImportStatus', () => {
    // インポートステータスが正常に返る場合のテスト
    it('should return the import status', async () => {
      const status = { status: 'idle', progress: 0 };
      (importService.getImportStatus as Mock).mockReturnValue(status);

      await importController.getImportStatus(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith(status);
    });

    // サービスでエラーが発生した場合、500を返すテスト
    it('should return 500 on service error', async () => {
      const error = new Error('Something went wrong');
      (importService.getImportStatus as Mock).mockImplementation(() => {
        throw error;
      });

      await importController.getImportStatus(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Internal server error' })
      );
    });

    // Errorオブジェクト以外のエラー時に"Unknown error"を返すテスト
    it('should return 500 with "Unknown error" on non-Error service error', async () => {
      const nonError = 'Just a string error';
      (importService.getImportStatus as Mock).mockImplementation(() => {
        throw nonError;
      });

      await importController.getImportStatus(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal server error',
          details: 'Unknown error',
        })
      );
    });
  });

  // importCSVメソッドのテスト
  describe('importCSV', () => {
    // ファイルがアップロードされていない場合400を返すテスト
    it('should return 400 if no file is uploaded', async () => {
      req.file = undefined;

      await importController.importCSV(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'No file uploaded' })
      );
    });

    // 無効なファイル形式の場合400を返すテスト
    it('should return 400 for invalid file format', async () => {
      req.file = {
        mimetype: 'application/json',
        originalname: 'test.json',
      } as any;

      await importController.importCSV(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Invalid file format' })
      );
    });

    // ファイルサイズが大きすぎる場合413を返すテスト
    it('should return 413 if file is too large', async () => {
      req.file = {
        size: 60 * 1024 * 1024,
        mimetype: 'text/csv',
        originalname: 'large.csv',
      } as any;

      await importController.importCSV(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'File too large' })
      );
    });

    // 正常にインポートできた場合201を返すテスト
    it('should call importService and return 201 on successful import', async () => {
      req.file = {
        buffer: Buffer.from('csv,data'),
        originalname: 'test.csv',
        mimetype: 'text/csv',
        size: 1024,
      } as any;
      const importResult = {
        totalProcessed: 10,
        totalImported: 8,
        totalErrors: 2,
      };
      (importService.importCSV as Mock).mockResolvedValue(importResult);

      await importController.importCSV(req as Request, res as Response);

      expect(importService.importCSV).toHaveBeenCalledWith(
        req.file?.buffer,
        req.file?.originalname
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    // importServiceでエラーが発生した場合500を返すテスト
    it('should return 500 on import service error', async () => {
      req.file = {
        buffer: Buffer.from('csv,data'),
        originalname: 'test.csv',
        mimetype: 'text/csv',
        size: 1024,
      } as any;
      const error = new Error('Import failed');
      (importService.importCSV as Mock).mockRejectedValue(error);

      await importController.importCSV(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Import failed' })
      );
    });

    // Errorオブジェクト以外のエラー時に"Unknown error"を返すテスト
    it('should return 500 with "Unknown error" on non-Error import service error', async () => {
      req.file = {
        buffer: Buffer.from('csv,data'),
        originalname: 'test.csv',
        mimetype: 'text/csv',
        size: 1024,
      } as any;
      const nonError = 'Just a string error from importCSV';
      (importService.importCSV as Mock).mockRejectedValue(nonError);

      await importController.importCSV(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Import failed',
          details: 'Unknown error',
        })
      );
    });
  });
});
