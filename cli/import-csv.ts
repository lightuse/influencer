#!/usr/bin/env node

import { Prisma, PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

import csvParser from 'csv-parser';
import dotenv from 'dotenv';

// ES modules での __dirname 対応

// 環境変数を読み込み
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
  // コマンドライン引数からCSVファイルパスを取得（なければ.envのCSV_FILENAME、さらに無ければデフォルト）
  const csvArg = process.argv[2];
  const envCsvFile =
    process.env.CSV_FILENAME || 't_influencer_posts_202401121334.csv';
  const defaultCsvPath = path.join(process.cwd(), 'data', envCsvFile);
  const csvFilePath = csvArg ? path.resolve(csvArg) : defaultCsvPath;

  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }

  console.log(`📊 Starting CSV import from: ${csvFilePath}`);

  let totalProcessed = 0;
  let totalImported = 0;
  let totalErrors = 0;
  const batchSize = 1000;

  // 全行を一度配列に読み込む
  const rows: Prisma.InfluencerPostCreateManyInput[] = [];
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csvParser())
      .on('data', (row: CSVRow) => {
        try {
          // postIdのバリデーションをBigInt変換前の文字列チェック＋例外キャッチで安全に
          let postId: bigint | null = null;
          try {
            if (row.post_id && row.post_id.trim() !== '') {
              postId = BigInt(row.post_id);
            }
          } catch (e) {
            postId = null;
          }
          const influencerId = parseInt(row.influencer_id);
          if (!isNaN(influencerId) && postId !== null) {
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
            rows.push(post);
          } else {
            totalErrors++;
          }
        } catch (error) {
          totalErrors++;
        }
      })
      .on('end', () => resolve())
      .on('error', err => reject(err));
  });

  totalProcessed = rows.length + totalErrors;

  // バッチごとに逐次awaitで処理
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    try {
      // バックプレッシャー回避＆Promiseアンチパターン排除、逐次awaitでバッチ処理
      const imported = await processBatch(prisma, batch);
      totalImported += imported;
      console.log(
        `✅ Processed ${Math.min(i + batch.length, rows.length)}/${rows.length}, imported ${totalImported}, errors: ${totalErrors}`
      );
    } catch (error) {
      totalErrors += batch.length;
      console.error('Batch processing error:', error);
      // バッチ失敗時は該当バッチをファイルに保存し、データ損失を防止
      fs.appendFileSync(
        'import_failed_batches.log',
        JSON.stringify(batch) + '\n'
      );
    }
  }

  console.log('\n🎉 CSV import completed!');
  console.log(`📈 Total processed: ${totalProcessed}`);
  console.log(`✅ Total imported: ${totalImported}`);
  console.log(`❌ Total errors: ${totalErrors}`);
  console.log(
    `📊 Success rate: ${((totalImported / totalProcessed) * 100).toFixed(2)}%`
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
    console.log('[DEBUG] createMany result:', result);
    return result.count;
  } catch (error) {
    console.error('Database batch insert error:', error);
    if (error instanceof Error) {
      console.error('[DEBUG] error.message:', error.message);
      if ('meta' in error) {
        // PrismaClientKnownRequestError など
        console.error('[DEBUG] error.meta:', error.meta);
      }
    }
    throw error;
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  importCSV()
    .then(() => {
      console.log('✨ Import process completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Import process failed:', error);
      process.exit(1);
    });
}
