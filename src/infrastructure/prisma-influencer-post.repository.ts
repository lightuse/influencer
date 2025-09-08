import { InfluencerPostRepository } from '../domain/repositories.js';
import {
  InfluencerPost,
  InfluencerStats,
  TopInfluencer,
} from '../domain/entities.js';

type GroupByResult = {
  influencerId: number;
  _avg: {
    likes?: number;
    comments?: number | null;
  };
  _count: number;
};

// Minimal interface for influencerPost delegate for type-safe mocking
export interface MinimalInfluencerPostDelegate {
  create: (args: {
    data: Omit<InfluencerPost, 'id' | 'createdAt'>;
  }) => Promise<InfluencerPost>;
  findMany: (args: {
    where: { influencerId?: number; postId?: { in: string[] } };
    select?: { postId?: boolean };
  }) => Promise<InfluencerPost[]> | Promise<{ postId: string }[]>;
  aggregate: (args: {
    where: { influencerId: number };
    _avg: { likes: boolean; comments: boolean };
    _count: boolean;
  }) => Promise<{
    _avg: {
      likes: number | { toNumber: () => number };
      comments: number | { toNumber: () => number };
    };
    _count: number;
  }>;
  groupBy: (args: {
    by: ['influencerId'];
    _avg?: { likes?: boolean; comments?: boolean };
    _count?: boolean;
    orderBy?: { _avg: { likes?: 'desc' | 'asc'; comments?: 'desc' | 'asc' } };
    take?: number;
  }) => Promise<
    {
      influencerId: number;
      _avg: { likes?: number; comments?: number | null };
      _count: number;
    }[]
  >;
  createMany: (args: {
    data: Omit<InfluencerPost, 'id' | 'createdAt'>[];
    skipDuplicates?: boolean;
  }) => Promise<{ count: number }>;
  findUnique: (args: {
    where: { postId: string };
  }) => Promise<{ id: number } | null>;
}

/**
 * Prismaを用いたインフルエンサーポストリポジトリの実装。
 * データベース操作を担当します。
 */
export class PrismaInfluencerPostRepository
  implements InfluencerPostRepository
{
  /**
   * PrismaのDecimalやnumberをnumber型に変換するユーティリティ。
   */
  private static toNum(
    val: number | { toNumber(): number } | null | undefined
  ): number {
    if (val == null) return 0;
    if (typeof val === 'number') return val;
    if (typeof val.toNumber === 'function') return val.toNumber();
    return Number(val) || 0;
  }
  /**
   * リポジトリのインスタンスを生成します。
   * @param prisma PrismaClientインスタンス
   */
  constructor(
    private prisma: { influencerPost: MinimalInfluencerPostDelegate }
  ) {}

  /**
   * 新しい投稿データを作成します。
   * @param data 投稿データ（id, createdAt除く）
   * @returns 作成されたInfluencerPost
   */
  async create(
    data: Omit<InfluencerPost, 'id' | 'createdAt'>
  ): Promise<InfluencerPost> {
    const result = await this.prisma.influencerPost.create({
      data: { ...data },
    });

    return {
      id: result.id,
      influencerId: result.influencerId,
      postId: result.postId,
      shortcode: result.shortcode ?? undefined,
      likes: result.likes,
      comments: result.comments,
      thumbnail: result.thumbnail ?? undefined,
      text: result.text ?? undefined,
      postDate: result.postDate ?? undefined,
      createdAt: result.createdAt,
    };
  }

  /**
   * 指定インフルエンサーIDの投稿一覧を取得します。
   * @param influencerId インフルエンサーID
   * @returns 投稿データ配列
   */
  async findByInfluencerId(influencerId: number): Promise<InfluencerPost[]> {
    const results = (await this.prisma.influencerPost.findMany({
      where: { influencerId },
    })) as InfluencerPost[];

    return results.map((result: InfluencerPost) => ({
      id: result.id,
      influencerId: result.influencerId,
      postId: result.postId,
      shortcode: result.shortcode ?? undefined,
      likes: result.likes,
      comments: result.comments,
      thumbnail: result.thumbnail ?? undefined,
      text: result.text ?? undefined,
      postDate: result.postDate ?? undefined,
      createdAt: result.createdAt,
    }));
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
    // 既存のpostIdを取得
    const postIds = posts.map(p => p.postId);
    const existing = await this.prisma.influencerPost.findMany({
      where: { postId: { in: postIds } },
      select: { postId: true },
    });
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
