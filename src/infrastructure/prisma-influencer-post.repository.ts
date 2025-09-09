import { PrismaClient } from '@prisma/client';
import { InfluencerPostRepository } from '../domain/repositories.js';
import {
  InfluencerPost,
  InfluencerStats,
  TopInfluencer,
} from '../domain/entities.js';

const BATCH_SIZE = 500;

// 統計情報取得や上位インフルエンサー取得のgroupBy結果の型
type GroupByResult = {
  influencerId: number;
  _avg: {
    likes?: number | null;
    comments?: number | null;
  };
  _count: number;
};

/**
 * Prismaを用いたインフルエンサーポストリポジトリの実装。
 * データベース操作を担当します。
 */
export class PrismaInfluencerPostRepository
  implements InfluencerPostRepository
{
  /**
   * PrismaのDecimal型・number型・null/undefinedを数値型（number）に変換します。
   * Prismaの集計クエリ結果から安全に数値を取得するために使用し、
   * 値がDecimalオブジェクト・number・null（例: レコードが存在しない場合）など様々なケースに対応します。
   * nullやundefinedの場合は0を返します。
   *
   * @param val 変換対象の値（number, PrismaのDecimal, null/undefined）
   * @returns 数値（null/undefinedの場合は0）
   */
  private static toNum(
    val: number | { toNumber(): number } | null | undefined
  ): number {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    if (typeof val.toNumber === 'function') return val.toNumber();
    return Number(val) || 0;
  }
  /**
   * リポジトリのインスタンスを生成します。
   * @param prisma PrismaClientインスタンス
   */
  constructor(private prisma: PrismaClient) {}

  /**
   * 新しい投稿データを作成します。
   * @param data 投稿データ（id, createdAt除く）
   * @returns 作成されたInfluencerPost
   */
  async create(
    data: Omit<InfluencerPost, 'id' | 'createdAt'>
  ): Promise<InfluencerPost> {
    return this.prisma.influencerPost.create({
      data: data,
    });
  }

  /**
   * 指定インフルエンサーIDの投稿一覧を取得します。
   * @param influencerId インフルエンサーID
   * @returns 投稿データ配列
   */
  async findByInfluencerId(influencerId: number): Promise<InfluencerPost[]> {
    return this.prisma.influencerPost.findMany({
      where: { influencerId },
    });
  }

  /**
   * 指定インフルエンサーの統計情報（平均いいね・コメント数等）を取得します。
   * @param influencerId インフルエンサーID
   * @returns 統計情報（なければnull）
   */
  async getInfluencerStats(
    influencerId: number
  ): Promise<InfluencerStats | null> {
    const result = await this.prisma.influencerPost.aggregate({
      where: { influencerId },
      _avg: {
        likes: true,
        comments: true,
      },
      _count: true,
    });

    if (result._count === 0) {
      return null;
    }

    return {
      influencerId,
      avgLikes: PrismaInfluencerPostRepository.toNum(result._avg.likes),
      avgComments: PrismaInfluencerPostRepository.toNum(result._avg.comments),
      postCount: result._count,
    };
  }

  /**
   * いいね数の平均値が高いインフルエンサー上位N件を取得します。
   * @param limit 取得件数
   * @returns TopInfluencer配列（平均いいね数・投稿件数含む）
   */
  async getTopInfluencersByLikes(limit: number): Promise<TopInfluencer[]> {
    const results = await this.prisma.influencerPost.groupBy({
      by: ['influencerId'],
      _avg: {
        likes: true,
      },
      _count: true,
      orderBy: {
        _avg: {
          likes: 'desc',
        },
      },
      take: limit,
    });

    return results.map((result: GroupByResult) => ({
      influencerId: result.influencerId,
      avgLikes: result._avg.likes ?? 0,
      postCount: result._count,
    }));
  }

  /**
   * コメント数の平均値が高いインフルエンサー上位N件を取得します。
   * @param limit 取得件数
   * @returns TopInfluencer配列（平均コメント数・投稿件数含む）
   */
  async getTopInfluencersByComments(limit: number): Promise<TopInfluencer[]> {
    const results = await this.prisma.influencerPost.groupBy({
      by: ['influencerId'],
      _avg: {
        comments: true,
      },
      _count: true,
      orderBy: {
        _avg: {
          comments: 'desc',
        },
      },
      take: limit,
    });

    return results.map((result: GroupByResult) => ({
      influencerId: result.influencerId,
      avgComments: result._avg.comments ?? 0,
      postCount: result._count,
    }));
  }

  /**
   * 投稿データを一括で作成し、作成・スキップされた投稿を返します。
   * @param posts 作成する投稿データ配列（id, createdAt除く）
   * @returns { created, skipped } 作成・スキップされた投稿データ配列
   */
  async bulkCreate(posts: Omit<InfluencerPost, 'id' | 'createdAt'>[]): Promise<{
    created: Omit<InfluencerPost, 'id' | 'createdAt'>[];
    skipped: Omit<InfluencerPost, 'id' | 'createdAt'>[];
  }> {
    // 既存のpostIdを取得（バッチ処理で大きなin句を回避）
    const postIds = posts.map(p => p.postId);
    const existing: { postId: string }[] = [];
    for (let i = 0; i < postIds.length; i += BATCH_SIZE) {
      const batch = postIds.slice(i, i + BATCH_SIZE);
      const batchExisting = await this.prisma.influencerPost.findMany({
        where: { postId: { in: batch } },
        select: { postId: true },
      });
      existing.push(...batchExisting);
    }
    const existingIds = new Set(existing.map(e => e.postId));

    const toCreate = posts.filter(p => !existingIds.has(p.postId));
    const skipped = posts.filter(p => existingIds.has(p.postId));

    if (toCreate.length > 0) {
      await this.prisma.influencerPost.createMany({
        data: toCreate,
        skipDuplicates: true, // 保険として残す
      });
    }

    return { created: toCreate, skipped };
  }

  /**
   * 指定した投稿IDのデータが存在するか判定します。
   * @param postId 投稿ID（SNS側のID）
   * @returns 存在すればtrue、なければfalse
   */
  async exists(postId: string): Promise<boolean> {
    const result = await this.prisma.influencerPost.findUnique({
      where: { postId },
    });

    return result !== null;
  }
}
