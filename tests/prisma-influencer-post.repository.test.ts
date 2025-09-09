import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaInfluencerPostRepository } from '../src/infrastructure/prisma-influencer-post.repository.js';
import { mockDeep, DeepMockProxy } from 'vitest-mock-extended';
import { PrismaClient, Prisma } from '@prisma/client';

// 統計情報取得や上位インフルエンサー取得のgroupBy結果の型
type GroupByResult = {
  influencerId: number;
  _avg: {
    likes?: number | null;
    comments?: number | null;
  };
  _count: number;
};

const LIMIT_INCLUDING_NULL_COMMENTS = 2;

// PrismaInfluencerPostRepositoryの単体テスト
describe('PrismaInfluencerPostRepository', () => {
  let repo: PrismaInfluencerPostRepository;
  let prismaMock: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>();

    // 投稿作成のモック
    prismaMock.influencerPost.create.mockImplementation(
      (args: Prisma.InfluencerPostCreateArgs) => {
        return {
          ...args.data,
          id: 1,
          createdAt: new Date(),
        } as unknown as ReturnType<typeof prismaMock.influencerPost.create>;
      }
    );

    // influencerIdで投稿を検索するモック
    prismaMock.influencerPost.findMany.mockImplementation(
      (args?: Prisma.InfluencerPostFindManyArgs) => {
        const where: Prisma.InfluencerPostWhereInput | undefined = args?.where;
        const result =
          where && typeof where.influencerId === 'number'
            ? [
                {
                  id: 1,
                  influencerId: where.influencerId,
                  postId: '1',
                  shortcode: null,
                  likes: 10,
                  comments: 2,
                  thumbnail: null,
                  text: null,
                  postDate: new Date(),
                  createdAt: new Date(),
                },
              ]
            : [];
        return result as unknown as ReturnType<
          typeof prismaMock.influencerPost.findMany
        >;
      }
    );

    // 統計情報取得のモック
    prismaMock.influencerPost.aggregate.mockImplementation(
      (args: Prisma.InfluencerPostAggregateArgs) => {
        const where: Prisma.InfluencerPostWhereInput | undefined = args.where;
        let result;
        if (where && where.influencerId === 1) {
          result = {
            _avg: {
              likes: { toNumber: () => 10 },
              comments: { toNumber: () => 2 },
            },
            _count: 1,
          };
        } else {
          result = { _avg: { likes: 0, comments: 0 }, _count: 0 };
        }
        return result as unknown as ReturnType<
          typeof prismaMock.influencerPost.aggregate
        >;
      }
    );

    // グループ化・集計のモック
    // @ts-expect-error: vitest-mock-extended can't mock overloaded functions like groupBy
    prismaMock.influencerPost.groupBy.mockImplementation(
      ({ by, orderBy, take }: Prisma.InfluencerPostGroupByArgs) => {
        let result;
        if (
          by &&
          by.includes('influencerId') &&
          orderBy &&
          (orderBy as Prisma.InfluencerPostOrderByWithAggregationInput)._avg
            ?.comments === 'desc' &&
          take === 2
        ) {
          result = [
            { influencerId: 1, _avg: { likes: 10, comments: 2 }, _count: 1 },
            {
              influencerId: 999,
              _avg: { likes: 5, comments: null },
              _count: 1,
            },
          ];
        } else {
          result = [
            { influencerId: 1, _avg: { likes: 10, comments: 2 }, _count: 1 },
          ];
        }
        return Promise.resolve(result);
      }
    );

    // 複数投稿作成のモック
    prismaMock.influencerPost.createMany.mockImplementation(
      (args?: Prisma.InfluencerPostCreateManyArgs) => {
        return {
          count: args && Array.isArray(args.data) ? args.data.length : 0,
        } as unknown as ReturnType<typeof prismaMock.influencerPost.createMany>;
      }
    );

    // 投稿IDでユニーク検索のモック
    prismaMock.influencerPost.findUnique.mockImplementation(
      (args: Prisma.InfluencerPostFindUniqueArgs) => {
        const where: Prisma.InfluencerPostWhereUniqueInput | undefined =
          args.where;
        const result =
          where && where.postId === '1'
            ? {
                id: 1,
                influencerId: 1,
                postId: '1',
                shortcode: null,
                likes: 10,
                comments: 2,
                thumbnail: null,
                text: null,
                postDate: new Date(),
                createdAt: new Date(),
              }
            : null;
        return result as unknown as ReturnType<
          typeof prismaMock.influencerPost.findUnique
        >;
      }
    );

    repo = new PrismaInfluencerPostRepository(prismaMock);
  });

  // PrismaInfluencerPostRepositoryの単体テスト
  it('should create a post', async () => {
    const post = await repo.create({
      influencerId: 1,
      postId: '1',
      shortcode: null,
      likes: 10,
      comments: 2,
      thumbnail: null,
      text: null,
      postDate: new Date(),
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
      {
        influencerId: 1,
        postId: '1',
        shortcode: null,
        likes: 10,
        comments: 2,
        thumbnail: null,
        text: null,
        postDate: new Date(),
      },
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
  // コメント数がnullの場合も含めてトップインフルエンサーを取得できること
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
