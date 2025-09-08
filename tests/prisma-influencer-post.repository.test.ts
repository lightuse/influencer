import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaInfluencerPostRepository } from '../src/infrastructure/prisma-influencer-post.repository.js';
import { InfluencerPost } from '../src/domain/entities.js';

const LIMIT_INCLUDING_NULL_COMMENTS = 2;

type FindUniqueArgs = { where: { postId: string } };
type CreateArgs = { data: Omit<InfluencerPost, 'id' | 'createdAt'> };
type FindManyArgs = { where: { influencerId?: number } };
type AggregateArgs = { where: { influencerId?: number } };
type CreateManyArgs = { data: Omit<InfluencerPost, 'id' | 'createdAt'>[] };

class MockPrisma {
  influencerPost = {
    create: async ({ data }: CreateArgs): Promise<InfluencerPost> => ({
      ...data,
      id: 1,
      createdAt: new Date(),
    }),
    findMany: async ({ where }: FindManyArgs): Promise<InfluencerPost[]> =>
      where.influencerId
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
        : [],
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
    groupBy: async ({
      by,
      orderBy,
      take,
    }: {
      by: ['influencerId'];
      _avg?: { likes?: boolean; comments?: boolean };
      _count?: boolean;
      orderBy?: { _avg: { likes?: 'desc' | 'asc'; comments?: 'desc' | 'asc' } };
      take?: number;
    }) => {
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
    createMany: async ({ data }: CreateManyArgs) => ({ count: data.length }),
    findUnique: async ({ where }: FindUniqueArgs) =>
      where.postId === '1' ? { id: 1 } : null,
  };
}

describe('PrismaInfluencerPostRepository', () => {
  let repo: PrismaInfluencerPostRepository;

  beforeEach(() => {
    repo = new PrismaInfluencerPostRepository(new MockPrisma() as any);
  });

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

  it('should find posts by influencerId', async () => {
    const posts = await repo.findByInfluencerId(1);
    expect(posts.length).toBeGreaterThan(0);
    expect(posts[0].influencerId).toBe(1);
  });

  it('should get influencer stats', async () => {
    const stats = await repo.getInfluencerStats(1);
    expect(stats).toBeTruthy();
    expect(stats?.avgLikes).toBe(10);
  });

  it('should return null for stats if no posts', async () => {
    const stats = await repo.getInfluencerStats(999);
    expect(stats).toBeNull();
  });

  it('should get top influencers by likes', async () => {
    const top = await repo.getTopInfluencersByLikes(1);
    expect(top.length).toBe(1);
    expect(top[0].avgLikes).toBe(10);
  });

  it('should get top influencers by comments', async () => {
    const top = await repo.getTopInfluencersByComments(1);
    expect(top.length).toBe(1);
    expect(top[0].avgComments).toBe(2);
  });

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

  it('should check if post exists', async () => {
    const exists = await repo.exists('1');
    expect(exists).toBe(true);
    const notExists = await repo.exists('999');
    expect(notExists).toBe(false);
  });

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
