import { describe, it, expect, beforeAll } from 'vitest';
import { InfluencerService } from '../src/application/influencer.service.js';
import { TextAnalysisService } from '../src/application/text-analysis.service.js';
import { InfluencerPostRepository } from '../src/domain/repositories.js';
import {
  InfluencerPost,
  InfluencerStats,
  TopInfluencer,
} from '../src/domain/entities.js';

// テスト用のモックリポジトリ（各メソッドはリポジトリの挙動を模倣）
class MockRepository implements InfluencerPostRepository {
  // 投稿作成のモック
  create(
    data: Omit<InfluencerPost, 'id' | 'createdAt'>
  ): Promise<InfluencerPost> {
    return Promise.resolve({ ...data, id: 1, createdAt: new Date() });
  }
  // 複数投稿作成のモック
  bulkCreate(
    posts: Omit<InfluencerPost, 'id' | 'createdAt'>[]
  ): Promise<number> {
    return Promise.resolve(posts.length);
  }
  // 投稿存在確認のモック
  exists(_postId: bigint): Promise<boolean> {
    return Promise.resolve(true);
  }
  // インフルエンサー統計情報取得のモック
  getInfluencerStats(influencerId: number): Promise<InfluencerStats | null> {
    return Promise.resolve({
      influencerId,
      avgLikes: '100.0',
      avgComments: '10.0',
      postCount: 5,
    });
  }
  // いいね数でトップインフルエンサー取得のモック
  getTopInfluencersByLikes(limit: number): Promise<TopInfluencer[]> {
    return Promise.resolve(
      Array.from({ length: limit }, (_, i) => ({
        influencerId: i + 1,
        avgLikes: (100 - i).toString(),
        avgComments: '10',
        postCount: 5,
      }))
    );
  }
  // コメント数でトップインフルエンサー取得のモック
  getTopInfluencersByComments(limit: number): Promise<TopInfluencer[]> {
    return Promise.resolve(
      Array.from({ length: limit }, (_, i) => ({
        influencerId: i + 1,
        avgLikes: '100',
        avgComments: (10 - i).toString(),
        postCount: 5,
      }))
    );
  }
  // influencerIdで投稿一覧取得のモック
  findByInfluencerId(influencerId: number): Promise<InfluencerPost[]> {
    return Promise.resolve([
      {
        id: 1,
        influencerId,
        postId: BigInt(1),
        likes: 10,
        comments: 5,
        text: '猫が好きです。犬も好きです。',
        createdAt: new Date(),
      },
      {
        id: 2,
        influencerId,
        postId: BigInt(2),
        likes: 15,
        comments: 3,
        text: '猫と犬が遊んでいます。',
        createdAt: new Date(),
      },
    ]);
  }
}

// InfluencerServiceの単体テスト
describe('InfluencerService', () => {
  let service: InfluencerService;
  let mockRepository: MockRepository;
  let mockTextAnalysisService: TextAnalysisService;

  beforeAll(async () => {
    // 各テストで使うモックとサービスを初期化
    mockRepository = new MockRepository();
    mockTextAnalysisService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      analyzeTexts: vi.fn().mockImplementation((texts: string[]) => {
        if (texts.length === 0) {
          return Promise.resolve([]);
        }
        return Promise.resolve([
          { noun: '猫', count: 2 },
          { noun: '犬', count: 2 },
          { noun: '好き', count: 2 },
          { noun: '遊ぶ', count: 1 },
        ]);
      }),
    } as any;
    service = new InfluencerService(mockRepository, mockTextAnalysisService);
  });

  // インフルエンサーの統計情報が取得できること
  it('should get influencer stats', async () => {
    const stats = await service.getInfluencerStats(1);
    expect(stats).toBeTruthy();
    expect(stats?.influencerId).toBe(1);
  });

  // 統計情報が見つからない場合nullを返すこと
  it('should return null if influencer stats not found', async () => {
    // モックを一時的に上書き
    const original = service['repository'].getInfluencerStats;
    service['repository'].getInfluencerStats = async () => null;
    const stats = await service.getInfluencerStats(999);
    expect(stats).toBeNull();
    // 元に戻す
    service['repository'].getInfluencerStats = original;
  });

  // いいね数でトップインフルエンサーが取得できること
  it('should get top influencers by likes', async () => {
    const top = await service.getTopInfluencersByLikes(3);
    expect(top).toHaveLength(3);
    expect(Number(top[0].avgLikes)).toBeGreaterThan(Number(top[1].avgLikes));
  });

  // トップインフルエンサーがいない場合は空配列を返すこと（いいね数）
  it('should return empty array if no top influencers by likes', async () => {
    const original = service['repository'].getTopInfluencersByLikes;
    service['repository'].getTopInfluencersByLikes = async () => [];
    const top = await service.getTopInfluencersByLikes(1);
    expect(top).toEqual([]);
    service['repository'].getTopInfluencersByLikes = original;
  });

  // コメント数でトップインフルエンサーが取得できること
  it('should get top influencers by comments', async () => {
    const top = await service.getTopInfluencersByComments(2);
    expect(top).toHaveLength(2);
    expect(Number(top[0].avgComments)).toBeGreaterThanOrEqual(
      Number(top[1].avgComments)
    );
  });

  // トップインフルエンサーがいない場合は空配列を返すこと（コメント数）
  it('should return empty array if no top influencers by comments', async () => {
    const original = service['repository'].getTopInfluencersByComments;
    service['repository'].getTopInfluencersByComments = async () => [];
    const top = await service.getTopInfluencersByComments(1);
    expect(top).toEqual([]);
    service['repository'].getTopInfluencersByComments = original;
  });

  // 名詞の出現回数ランキングが取得できること
  it('should get top nouns', async () => {
    const result = await service.getTopNouns(1, 2);
    expect(result.nouns.length).toBeLessThanOrEqual(2);
    expect(result.nouns[0]).toHaveProperty('noun');
    expect(result.nouns[0]).toHaveProperty('count');
  });

  // 投稿が空の場合は名詞も空配列を返すこと
  it('should return empty nouns if posts are empty', async () => {
    const original = service['repository'].findByInfluencerId;
    service['repository'].findByInfluencerId = async () => [];
    const result = await service.getTopNouns(999, 2);
    expect(result.nouns).toEqual([]);
    expect(result.totalPosts).toBe(0);
    service['repository'].findByInfluencerId = original;
  });
});
