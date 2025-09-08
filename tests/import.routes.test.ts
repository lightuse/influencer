import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { ImportController } from '@presentation/import.controller.js';
import { createImportRoutes } from '@presentation/routes/import.routes.js';

// ImportControllerのモック
const mockController: ImportController = {
  getImportStatus: vi.fn((req, res) =>
    res.status(200).json({ status: 'idle' })
  ),
  importCSV: vi.fn((req, res) => res.status(201).json({ success: true })),
} as any;

// Expressアプリとルーティングのセットアップ
const app = express();
app.use('/import', createImportRoutes(mockController));

// ルーティングのテスト
describe('Import Routes', () => {
  // /import/statusでgetImportStatusが呼ばれること
  it('GET /import/status should call getImportStatus', async () => {
    const response = await request(app).get('/import/status');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'idle' });
    expect(mockController.getImportStatus).toHaveBeenCalled();
  });

  // /import/csvでimportCSVが呼ばれること
  it('POST /import/csv should call importCSV with a file', async () => {
    const response = await request(app)
      .post('/import/csv')
      .attach('csvFile', Buffer.from('a,b,c\n1,2,3'), 'test.csv');

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ success: true });
    expect(mockController.importCSV).toHaveBeenCalled();
  });
});
