import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Buffer } from 'node:buffer';

import { ImportService } from '../src/application/import.service.js';
import { InfluencerPostRepository } from '../src/domain/repositories.js';
import { InfluencerPost } from '../src/domain/entities.js';

// InfluencerPostRepositoryのモック実装（テスト用）
class MockRepository implements InfluencerPostRepository {
  // bulkCreateは実際のレコード数を返す想定
  bulkCreate = vi.fn(
    async (
      posts: Omit<InfluencerPost, 'id' | 'createdAt'>[]
    ): Promise<{
      created: Omit<InfluencerPost, 'id' | 'createdAt'>[];
      skipped: Omit<InfluencerPost, 'id' | 'createdAt'>[];
    }> => {
      // In a real scenario, you might filter existing posts.
      // For this mock, we'll assume all posts are new.
      return { created: posts, skipped: [] };
    }
  );

  // インターフェースを満たすためのダミーメソッド
  create = vi.fn();
  findByInfluencerId = vi.fn();
  getInfluencerStats = vi.fn();
  getTopInfluencersByLikes = vi.fn();
  getTopInfluencersByComments = vi.fn();
  exists = vi.fn();
}

// ImportServiceの単体テスト
describe('ImportService', () => {
  let importService: ImportService;
  let mockRepository: MockRepository;

  beforeEach(() => {
    // 各テストごとに新しいインスタンスを生成し、状態をリセット
    mockRepository = new MockRepository();
    importService = new ImportService(mockRepository);
    mockRepository.bulkCreate.mockClear();
  });

  // 正常なCSVデータをインポートできること
  it('should correctly import valid CSV data', async () => {
    const csvData = `influencer_id,post_id,likes,comments,text\n1,101,1000,50,"Hello World"`;
    const fileBuffer = Buffer.from(csvData);

    const result = await importService.importCSV(fileBuffer, 'valid.csv');

    // Verify the import summary
    expect(result.totalProcessed).toBe(1);
    expect(result.totalImported).toBe(1);
    expect(result.totalErrors).toBe(0);

    // Verify that the repository's bulkCreate method was called with the correct data
    expect(mockRepository.bulkCreate).toHaveBeenCalledTimes(1);
    expect(mockRepository.bulkCreate).toHaveBeenCalledWith([
      expect.objectContaining({
        influencerId: 1,
        postId: '101',
        likes: 1000,
        comments: 50,
        text: 'Hello World',
      }),
    ]);
  });

  // 無効な行をスキップし、処理を継続できること
  it('should skip invalid rows and continue processing', async () => {
    // One valid row, one invalid row (missing influencer_id)
    const csvData = `influencer_id,post_id,likes,comments\n1,101,1000,50\n,102,2000,100`;
    const fileBuffer = Buffer.from(csvData);

    const result = await importService.importCSV(fileBuffer, 'mixed.csv');

    // Verify the import summary
    expect(result.totalProcessed).toBe(2);
    expect(result.totalImported).toBe(1);
    expect(result.totalErrors).toBe(1);

    // Verify that bulkCreate was only called with the single valid post
    expect(mockRepository.bulkCreate).toHaveBeenCalledTimes(1);
    expect(mockRepository.bulkCreate).toHaveBeenCalledWith([
      expect.objectContaining({
        influencerId: 1,
        postId: '101',
      }),
    ]);
  });

  // 空のCSVファイルでもエラーにならないこと
  it('should handle an empty CSV file gracefully', async () => {
    const csvData = ``; // Completely empty
    const fileBuffer = Buffer.from(csvData);

    const result = await importService.importCSV(fileBuffer, 'empty.csv');

    // Verify the import summary for an empty file
    expect(result.totalProcessed).toBe(0);
    expect(result.totalImported).toBe(0);
    expect(result.totalErrors).toBe(0);

    // Ensure no database calls were made
    expect(mockRepository.bulkCreate).not.toHaveBeenCalled();
  });

  // BATCH_SIZEで定義されたバッチ単位で処理されること
  it('should process records in batches as defined by BATCH_SIZE', async () => {
    const BATCH_SIZE = 1000; // As defined in the service
    const totalRecords = BATCH_SIZE + 5; // To ensure two batches

    // Create a large CSV string
    let csvRows = 'influencer_id,post_id,likes,comments\n';
    for (let i = 1; i <= totalRecords; i++) {
      csvRows += `1,${i},10,5\n`;
    }
    const fileBuffer = Buffer.from(csvRows);

    const result = await importService.importCSV(fileBuffer, 'batch.csv');

    // Verify the summary
    expect(result.totalProcessed).toBe(totalRecords);
    expect(result.totalImported).toBe(totalRecords);
    expect(result.totalErrors).toBe(0);

    // Verify that bulkCreate was called twice
    expect(mockRepository.bulkCreate).toHaveBeenCalledTimes(2);

    // Verify the size of each batch
    const firstCallArgs = mockRepository.bulkCreate.mock.calls[0][0];
    expect(firstCallArgs.length).toBe(BATCH_SIZE);

    const secondCallArgs = mockRepository.bulkCreate.mock.calls[1][0];
    expect(secondCallArgs.length).toBe(5);
  });

  it('should handle repository errors during batch processing', async () => {
    const csvData = `influencer_id,post_id,likes,comments\n1,101,1000,50`;
    const fileBuffer = Buffer.from(csvData);

    // Mock the repository to throw an error
    mockRepository.bulkCreate.mockRejectedValue(new Error('DB error'));

    // Spy on console.error
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {}); // Mock implementation to prevent actual console output

    const result = await importService.importCSV(fileBuffer, 'error.csv');

    expect(result.totalProcessed).toBe(1);
    expect(result.totalImported).toBe(0);
    expect(result.totalErrors).toBe(1);

    // Assert that console.error was called
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `Failed to import batch of ${1} posts.`, // posts.length will be 1 in this case
      expect.any(Error) // Expect any error object
    );

    // Restore original console.error
    consoleErrorSpy.mockRestore();
  });

  it('should handle fatal stream errors', async () => {
    const malformedCsvData = Buffer.from(
      'influencer_id,post_id,likes,comments\ninvalid-data-without-commas\n'
    );

    const result = await importService.importCSV(
      malformedCsvData,
      'malformed.csv'
    );

    // Verify the import summary for a malformed row
    expect(result.totalProcessed).toBe(1);
    expect(result.totalImported).toBe(0);
    expect(result.totalErrors).toBe(1);
  });

  describe('getImportStatus', () => {
    it('should return the current status and configuration', () => {
      const status = importService.getImportStatus();

      expect(status).toEqual({
        status: 'ready',
        capabilities: {
          maxFileSize: '50MB',
          supportedFormats: ['csv'],
          batchSize: 1000,
          requiredColumns: [
            'influencer_id',
            'post_id',
            'shortcode',
            'likes',
            'comments',
            'thumbnail',
            'text',
            'post_date',
          ],
        },
        database: {
          status: 'connected',
          type: 'PostgreSQL',
        },
        timestamp: expect.any(Date),
      });
    });
  });
});
