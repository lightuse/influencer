#!/usr/bin/env node
import { Prisma, PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

import csvParser from 'csv-parser';
import dotenv from 'dotenv';

// 失敗したバッチのログファイルパスを設定（環境変数で指定可能。デフォルトは logs/import_failed_batches.log）
const failedBatchLogPath =
  process.env.FAILED_BATCH_LOG_PATH ||
  path.join('logs', 'import_failed_batches.log');
const failedBatchLogDir = path.dirname(failedBatchLogPath);
if (!fs.existsSync(failedBatchLogDir)) {
  fs.mkdirSync(failedBatchLogDir, { recursive: true });
}
// DEBUG=1 でデバッグログを有効化
const DEBUG = process.env.DEBUG === '1';

// .envファイルから環境変数を読み込む
dotenv.config();

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
 * CSVファイルをインポートする
 * 1. ストリームのバックプレッシャー問題を回避するため、全行を一度配列に読み込んでから逐次バッチ処理
 * 2. Promiseコンストラクタのアンチパターンを排除し、async/awaitのみで完結
 * 3. バッチ失敗時は該当バッチをファイルに保存し、データ損失を防止
 * 4. postIdのバリデーションをBigInt変換前の文字列チェック＋例外キャッチで安全に
 *
 * @returns void
 */
async function importCSV() {
  const prisma = new PrismaClient();
  // コマンドライン引数からCSVファイルパスを取得（なければ.envのCSV_FILENAME、さらに無ければデフォルト値）
  const csvArg = process.argv[2];
  const envCsvFile =
    process.env.CSV_FILENAME || 't_influencer_posts_202401121334.csv';
  const defaultCsvPath = path.join(process.cwd(), 'data', envCsvFile);
  const csvFilePath = csvArg ? path.resolve(csvArg) : defaultCsvPath;

  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }

  if (DEBUG) {
    console.log(`📊 Starting CSV import from: ${csvFilePath}`);
  }

  let totalProcessed = 0;
  let totalImported = 0;
  let totalErrors = 0;
  const batchSize = 1000;

  // CSVストリームを非同期イテレータで処理
  async function* csvRowGenerator(filePath: string): AsyncGenerator<CSVRow> {
    const stream = fs.createReadStream(filePath).pipe(csvParser());
    const queue: CSVRow[] = [];
    let done = false;
    let error: Error | null = null;
    stream.on('data', (row: CSVRow) => queue.push(row));
    stream.on('end', () => {
      done = true;
    });
    stream.on('error', (err: Error) => {
      error = err;
      done = true;
    });

    while (!done || queue.length > 0) {
      if (error) throw error;
      if (queue.length > 0) {
        yield queue.shift()!;
      } else {
        await new Promise(res => setTimeout(res, 10));
      }
    }
  }

  // バッチ処理のループ
  let batch: Prisma.InfluencerPostCreateManyInput[] = [];
  for await (const row of csvRowGenerator(csvFilePath)) {
    try {
      let postId: bigint | null = null;
      try {
        if (row.post_id && row.post_id.trim() !== '') {
          postId = BigInt(row.post_id);
        }
      } catch {
        postId = null;
      }
      const influencerId = parseInt(row.influencer_id);
      if (
        Number.isInteger(influencerId) &&
        influencerId > 0 &&
        postId !== null
      ) {
        const post = {
          influencerId,
          postId,
          shortcode: row.shortcode || null,
          likes: parseInt(row.likes) || 0,
          comments: parseInt(row.comments) || 0,
          thumbnail: row.thumbnail || null,
          text: row.text || null,
          postDate: row.post_date ? new Date(row.post_date) : null,
        };
        batch.push(post);
        totalProcessed++;
      } else {
        totalErrors++;
        totalProcessed++;
      }
    } catch {
      totalErrors++;
      totalProcessed++;
    }
    if (batch.length >= batchSize) {
      try {
        const imported = await processBatch(prisma, batch);
        totalImported += imported;
        if (DEBUG) {
          console.log(
            `✅ Processed ${totalProcessed}, imported ${totalImported}, errors: ${totalErrors}`
          );
        }
      } catch (error) {
        totalErrors += batch.length;
        console.error('Batch processing error:', error);
        fs.appendFileSync(failedBatchLogPath, JSON.stringify(batch) + '\n');
      }
      batch = [];
    }
  }
  // 残りの行があればバッチ処理
  if (batch.length > 0) {
    try {
      const imported = await processBatch(prisma, batch);
      totalImported += imported;
      if (DEBUG) {
        console.log(
          `✅ Processed ${totalProcessed}, imported ${totalImported}, errors: ${totalErrors}`
        );
      }
    } catch (error) {
      totalErrors += batch.length;
      console.error('Batch processing error:', error);
      fs.appendFileSync(failedBatchLogPath, JSON.stringify(batch) + '\n');
    }
  }

  // 結果を出力
  console.log('\n🎉 CSVインポートが完了しました!');
  console.log(`📈 総処理件数: ${totalProcessed}`);
  console.log(`✅ インポート成功件数: ${totalImported}`);
  console.log(`❌ エラー件数: ${totalErrors}`);
  console.log(
    `📊 成功率: ${totalProcessed > 0 ? ((totalImported / totalProcessed) * 100).toFixed(2) : '0.00'}%`
  );

  await prisma.$disconnect();
}

async function processBatch(
  prisma: PrismaClient,
  posts: Prisma.InfluencerPostCreateManyInput[]
): Promise<number> {
  try {
    const result = await prisma.influencerPost.createMany({
      data: posts,
      skipDuplicates: true,
    });
    if (DEBUG) {
      console.log('[DEBUG] createMany result:', result);
    }
    return result.count;
  } catch (error) {
    console.error('Database batch insert error:', error);
    if (error instanceof Error) {
      if (DEBUG) {
        console.error('[DEBUG] error.message:', error.message);
      }
      if ('meta' in error) {
        // PrismaClientKnownRequestError など
        if (DEBUG) {
          console.error('[DEBUG] error.meta:', error.meta);
        }
      }
    }
    throw error;
  }
}

// メイン実行部
// Node.jsで直接実行された場合のみメイン処理を実行
const isMain =
  typeof require !== 'undefined'
    ? require.main === module
    : import.meta.url ===
      (process?.argv?.[1]?.startsWith('file://')
        ? process.argv[1]
        : `file://${process.argv[1]}`);

if (isMain) {
  importCSV()
    .then(() => {
      if (DEBUG) {
        console.log('✨ Import process completed successfully');
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Import process failed:', error);
      process.exit(1);
    });
}
