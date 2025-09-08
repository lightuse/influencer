import { InfluencerPostRepository } from '../domain/repositories.js';
import { ImportResult } from '../domain/entities.js';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import { Buffer } from 'buffer';

/**
 * CSVファイルの行データを表現するインターフェース。
 */
interface CSVRow {
  influencer_id: string;
  post_id: string;
  shortcode?: string;
  likes: string;
  comments: string;
  thumbnail?: string;
  text?: string;
  post_date?: string;
}

/**
 * データベースに永続化するために変換された投稿データを表現するインターフェース。
 */
interface PostData {
  influencerId: number;
  postId: string;
  shortcode?: string;
  likes: number;
  comments: number;
  thumbnail?: string;
  text?: string;
  postDate?: Date;
}

/**
 * CSVインポート機能を提供するサービスクラス。
 * ファイルをストリームとして読み込み、バッチ処理でデータベースに保存します。
 */
export class ImportService {
  // バッチサイズをクラス定数として定義
  static readonly BATCH_SIZE = 1000;
  /**
   * ImportServiceのインスタンスを生成します。
   * @param repository 投稿データを永続化するためのリポジトリ
   */
  constructor(private repository: InfluencerPostRepository) {}

  /**
   * CSVファイルを受け取り、内容をデータベースにインポートします。
   * @param fileBuffer インポートするCSVファイルのBuffer
   * @param fileName インポートするファイル名
   * @returns インポート処理の結果
   * @throws {Error} 致命的なエラーが発生した場合
   */
  async importCSV(fileBuffer: Buffer, fileName: string): Promise<ImportResult> {
    const results: ImportResult = {
      totalProcessed: 0,
      totalImported: 0,
      totalErrors: 0,
      fileName,
      fileSize: fileBuffer.length,
    };

    const stream = Readable.from(fileBuffer).pipe(csvParser());
    let posts: PostData[] = [];

    try {
      for await (const row of stream) {
        // Skip empty rows (all values empty or undefined)
        if (
          !row ||
          Object.values(row).every(v => v === '' || v === undefined)
        ) {
          continue;
        }
        // Optionally, skip header row if csv-parser emits it (shouldn't, but just in case)
        if (
          row.influencer_id === 'influencer_id' &&
          row.post_id === 'post_id'
        ) {
          continue;
        }
        results.totalProcessed++;
        try {
          const post = this.transformRowToPost(row as CSVRow);
          posts.push(post);

          if (posts.length >= ImportService.BATCH_SIZE) {
            await this.processBatch(posts, results);
            posts = [];
          }
        } catch (error) {
          results.totalErrors++;
          console.error(`Skipping invalid row: ${JSON.stringify(row)}`, error);
        }
      }

      // Process any remaining posts in the last batch
      if (posts.length > 0) {
        await this.processBatch(posts, results);
      }

      console.log(
        `Import finished. Imported ${results.totalImported} of ${results.totalProcessed} records.`
      );
      return results;
    } catch (streamError) {
      console.error('Fatal error during CSV stream processing:', streamError);
      throw streamError;
    }
  }

  /**
   * CSVの行オブジェクトを、データベース保存用のPostDataオブジェクトに変換します。
   * @private
   * @param row - 変換するCSVの行データ。
   * @returns 変換されたPostDataオブジェクト。
   * @throws {Error} influencer_idまたはpost_idが無効な場合にエラーをスローします。
   */
  private transformRowToPost(row: CSVRow): PostData {
    const post: PostData = {
      influencerId: parseInt(row.influencer_id, 10),
      postId: row.post_id ? row.post_id.toString() : '',
      shortcode: row.shortcode || undefined,
      likes: parseInt(row.likes, 10) || 0,
      comments: parseInt(row.comments, 10) || 0,
      thumbnail: row.thumbnail || undefined,
      text: row.text || undefined,
      postDate: row.post_date ? new Date(row.post_date) : undefined,
    };

    if (isNaN(post.influencerId) || !post.postId) {
      throw new Error('Invalid influencer_id or post_id');
    }

    return post;
  }

  /**
   * 投稿データのバッチをデータベースに一括で作成します。
   * @private
   * @param posts - データベースに保存するPostDataオブジェクトの配列。
   * @param results - インポート結果を更新するためのImportResultオブジェクト。
   * @returns void
   */
  private async processBatch(
    posts: PostData[],
    results: ImportResult
  ): Promise<void> {
    try {
      // The repository expects Omit<InfluencerPost, 'id' | 'createdAt'>[]
      const bulkResult = await this.repository.bulkCreate(posts as any);

      if (bulkResult && Array.isArray(bulkResult.created)) {
        const createdCount = bulkResult.created.length;
        results.totalImported += createdCount;
        if (createdCount > 0) {
          console.log(`Successfully imported a batch of ${createdCount} posts.`);
        }
      } else {
        // The repository returned an unexpected value
        throw new Error('bulkCreate did not return created posts array.');
      }
    } catch (error) {
      console.error(`Failed to import batch of ${posts.length} posts.`, error);
      results.totalErrors += posts.length;
    }
  }

  /**
   * インポートサービスの現在のステータスと設定情報を取得します。
   * @returns インポートサービスのステータス、能力、データベース情報を含むオブジェクト。
   */
  getImportStatus() {
    return {
      status: 'ready' as const,
      capabilities: {
        maxFileSize: '50MB',
        supportedFormats: ['csv'],
        batchSize: ImportService.BATCH_SIZE,
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
        status: 'connected' as const,
        type: 'PostgreSQL',
      },
      timestamp: new Date(),
    };
  }
}
