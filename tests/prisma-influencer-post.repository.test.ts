import { describe, it, expect, beforeEach } from 'vitest';

interface MinimalPrisma {
  influencerPost: MinimalInfluencerPostDelegate;
}
import {
  PrismaInfluencerPostRepository,
  MinimalInfluencerPostDelegate,
} from '../src/infrastructure/prisma-influencer-post.repository.js';
// 2件取得してnullコメントも含める意図を明示
const LIMIT_INCLUDING_NULL_COMMENTS = 2;
// 投稿IDでユニーク検索するための型
type FindUniqueArgs = { where: { postId: string } };
// テスト用のInfluencerPost型（必要なフィールドのみ）
type InfluencerPost = {
  id?: number;
  influencerId: number;
  postId: string;
  likes: number;
  comments: number;
  createdAt?: Date;
};
type CreateArgs = { data: InfluencerPost };
type FindManyArgs = { where: { influencerId?: number } };
type AggregateArgs = { where: { influencerId?: number } };
type GroupByArgs = {
  by: string[];
  _avg?: { [key: string]: true };
  _count?: boolean | { [key: string]: true };
  orderBy?: { _avg?: { [key: string]: 'asc' | 'desc' } };
  take?: number;
};
type CreateManyArgs = { data: InfluencerPost[] };
class MockPrisma implements MinimalPrisma {
  influencerPost = {
    // 投稿作成のモック
    create: async ({ data }: CreateArgs) => ({
      ...data,
      id: 1,
      createdAt: new Date(),
    }),
    // influencerIdで投稿を検索するモック
    findMany: async ({ where }: FindManyArgs) =>
      where.influencerId
        ? [
            {
              id: 1,
              influencerId: where.influencerId,
              postId: '1',
              likes: 10,
              comments: 2,
              createdAt: new Date(),
            },
          ]
        : [],
    // 統計情報取得のモック
    aggregate: async ({ where }: AggregateArgs) => {
      if (where.influencerId === 1) {
        return {
          _avg: {
            likes: { toNumber: () => 10 },
            comments: { toNumber: () => 2 },
          },
          _count: 1,
        };
      }
      return { _avg: { likes: 0, comments: 0 }, _count: 0 };
    },
    // グループ化・集計のモック
    groupBy: async ({ by, _avg, _count, orderBy, take }: GroupByArgs) => {
      if (
        by.includes('influencerId') &&
        orderBy &&
        orderBy._avg &&
        orderBy._avg.comments === 'desc' &&
        take === 2
      ) {
        return [
          { influencerId: 1, _avg: { likes: 10, comments: 2 }, _count: 1 },
          { influencerId: 999, _avg: { likes: 5, comments: null }, _count: 1 },
        ];
      }
      return [{ influencerId: 1, _avg: { likes: 10, comments: 2 }, _count: 1 }];
    },
    // 複数投稿作成のモック
    createMany: async ({ data }: CreateManyArgs) => ({ count: data.length }),
    // 投稿IDでユニーク検索のモック
    findUnique: async ({ where }: FindUniqueArgs) =>
      where.postId === '1' ? { id: 1 } : null,
  };
}

// PrismaInfluencerPostRepositoryの単体テスト
describe('PrismaInfluencerPostRepository', () => {
  let repo: PrismaInfluencerPostRepository;

  beforeEach(() => {
    // 各テストごとに新しいリポジトリを型安全に生成
    repo = new PrismaInfluencerPostRepository(new MockPrisma());
  });

  // 投稿を作成できること
  it('should create a post', async () => {
    const post = await repo.create({
      influencerId: 1,
      postId: '1',
      likes: 10,
      comments: 2,
    });
    expect(post.id).toBe(1);
    expect(post.influencerId).toBe(1);
  });

  // influencerIdで投稿を検索できること
  it('should find posts by influencerId', async () => {
    const posts = await repo.findByInfluencerId(1);
    expect(posts.length).toBeGreaterThan(0);
    expect(posts[0].influencerId).toBe(1);
  });

  // influencerの統計情報を取得できること
  it('should get influencer stats', async () => {
    const stats = await repo.getInfluencerStats(1);
    expect(stats).toBeTruthy();
    expect(stats?.avgLikes).toBe(10);
  });

  // 投稿がない場合はnullを返すこと
  it('should return null for stats if no posts', async () => {
    const stats = await repo.getInfluencerStats(999);
    expect(stats).toBeNull();
  });

  // いいね数でトップインフルエンサーを取得できること
  it('should get top influencers by likes', async () => {
    const top = await repo.getTopInfluencersByLikes(1);
    expect(top.length).toBe(1);
    expect(top[0].avgLikes).toBe(10);
  });

  // コメント数でトップインフルエンサーを取得できること
  it('should get top influencers by comments', async () => {
    const top = await repo.getTopInfluencersByComments(1);
    expect(top.length).toBe(1);
    expect(top[0].avgComments).toBe(2);
  });

  // 複数投稿を一括作成できること
  it('should bulk create posts', async () => {
    const result = await repo.bulkCreate([
      { influencerId: 1, postId: '1', likes: 10, comments: 2 },
    ]);
    expect(result.created.length).toBe(1);
    expect(result.skipped.length).toBe(0);
  });

  // 投稿の存在確認ができること
  it('should check if post exists', async () => {
    const exists = await repo.exists('1');
    expect(exists).toBe(true);
    const notExists = await repo.exists('999');
    expect(notExists).toBe(false);
  });

  // コメント数がnullの場合も0.00として扱うこと
  it('should handle null avgComments when getting top influencers by comments', async () => {
    const top = await repo.getTopInfluencersByComments(
      LIMIT_INCLUDING_NULL_COMMENTS
    );
    expect(top.length).toBe(LIMIT_INCLUDING_NULL_COMMENTS);
    const influencerWithNullComments = top.find(i => i.influencerId === 999);
    expect(influencerWithNullComments).toBeTruthy();
    expect(influencerWithNullComments?.avgComments).toBe(0);
  });
});
