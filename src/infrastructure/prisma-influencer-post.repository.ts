import { PrismaClient } from '@prisma/client';
import { InfluencerPostRepository } from '../domain/repositories.js';
import {
  InfluencerPost,
  InfluencerStats,
  TopInfluencer,
} from '../domain/entities.js';

/**
 * Prismaを用いたインフルエンサーポストリポジトリの実装。
 * データベース操作を担当します。
 */
export class PrismaInfluencerPostRepository
  implements InfluencerPostRepository
{
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
    const result = await this.prisma.influencerPost.create({
      data: {
        influencerId: data.influencerId,
        postId: data.postId,
        shortcode: data.shortcode,
        likes: data.likes,
        comments: data.comments,
        thumbnail: data.thumbnail,
        text: data.text,
        postDate: data.postDate,
      },
    });

    return {
      id: result.id,
      influencerId: result.influencerId,
      postId: result.postId,
      shortcode: result.shortcode || undefined,
      likes: result.likes,
      comments: result.comments,
      thumbnail: result.thumbnail || undefined,
      text: result.text || undefined,
      postDate: result.postDate || undefined,
      createdAt: result.createdAt,
    };
  }

  /**
   * 指定インフルエンサーIDの投稿一覧を取得します。
   * @param influencerId インフルエンサーID
   * @returns 投稿データ配列
   */
  async findByInfluencerId(influencerId: number): Promise<InfluencerPost[]> {
    const results = await this.prisma.influencerPost.findMany({
      where: { influencerId },
    });

    return results.map(result => ({
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
      avgLikes: result._avg.likes || 0,
      avgComments: result._avg.comments || 0,
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

    return results.map(result => ({
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

    return results.map(result => ({
      influencerId: result.influencerId,
      avgComments: result._avg.comments ?? 0,
      postCount: result._count,
    }));
  }

  /**
   * 投稿データを一括で作成します。
   * @param posts 作成する投稿データ配列（id, createdAt除く）
   * @returns 作成された件数
   */
  async bulkCreate(
    posts: Omit<InfluencerPost, 'id' | 'createdAt'>[]
  ): Promise<number> {
    const result = await this.prisma.influencerPost.createMany({
      data: posts,
      skipDuplicates: true,
    });

    return result.count;
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
