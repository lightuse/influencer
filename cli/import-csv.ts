#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
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

async function importCSV() {
  const prisma = new PrismaClient();
  const csvFilePath = path.join(
    process.cwd(),
    'data',
    't_influencer_posts_202401121334.csv'
  );

  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }

  console.log(`📊 Starting CSV import from: ${csvFilePath}`);

  let totalProcessed = 0;
  let totalImported = 0;
  let totalErrors = 0;
  const batchSize = 1000;
  // eslint-disable-next-line prefer-const
  let batch: any[] = [];

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csvParser())
      .on('data', async (row: CSVRow) => {
        totalProcessed++;

        try {
          // データ変換とバリデーション
          const post = {
            influencerId: parseInt(row.influencer_id),
            postId: BigInt(row.post_id),
            shortcode: row.shortcode || null,
            likes: parseInt(row.likes) || 0,
            comments: parseInt(row.comments) || 0,
            thumbnail: row.thumbnail || null,
            text: row.text || null,
            postDate: row.post_date ? new Date(row.post_date) : null,
          };

          if (isNaN(post.influencerId) || !post.postId) {
            totalErrors++;
            return;
          }

          batch.push(post);

          // バッチ処理
          if (batch.length >= batchSize) {
            await processBatch(prisma, batch.splice(0, batchSize))
              .then(imported => {
                totalImported += imported;
                console.log(
                  `✅ Processed ${totalProcessed} rows, imported ${totalImported}, errors: ${totalErrors}`
                );
              })
              .catch(error => {
                console.error('Batch processing error:', error);
                totalErrors += batchSize;
              });
          }
        } catch (error) {
          totalErrors++;
          console.error('Row processing error:', error);
        }
      })
      .on('end', async () => {
        try {
          // 残りのバッチを処理
          if (batch.length > 0) {
            const imported = await processBatch(prisma, batch);
            totalImported += imported;
          }

          console.log('\n🎉 CSV import completed!');
          console.log(`📈 Total processed: ${totalProcessed}`);
          console.log(`✅ Total imported: ${totalImported}`);
          console.log(`❌ Total errors: ${totalErrors}`);
          console.log(
            `📊 Success rate: ${((totalImported / totalProcessed) * 100).toFixed(2)}%`
          );

          await prisma.$disconnect();
          resolve();
        } catch (error) {
          console.error('Final processing error:', error);
          await prisma.$disconnect();
          reject(error);
        }
      })
      .on('error', async error => {
        console.error('CSV parsing error:', error);
        await prisma.$disconnect();
        reject(error);
      });
  });
}

async function processBatch(
  prisma: PrismaClient,
  posts: any[]
): Promise<number> {
  try {
    const result = await prisma.influencerPost.createMany({
      data: posts,
      skipDuplicates: true,
    });
    return result.count;
  } catch (error) {
    console.error('Database batch insert error:', error);
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
