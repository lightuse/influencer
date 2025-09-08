import { InfluencerPostRepository } from '../domain/repositories.js';
import {
  InfluencerStats,
  TopInfluencer,
  NounAnalysisResult,
  InfluencerPost,
} from '../domain/entities.js';
import { TextAnalysisService } from './text-analysis.service.js';

/**
 * インフルエンサー関連の集計・分析サービス。
 * 投稿データの統計や名詞分析などを提供します。
 */
export class InfluencerService {
  /**
   * サービスのインスタンスを生成します。
   * @param repository 投稿データリポジトリ
   * @param textAnalysisService テキスト分析サービス
   */
  constructor(
    private repository: InfluencerPostRepository,
    private textAnalysisService: TextAnalysisService
  ) {}

  /**
   * 指定したインフルエンサーの統計情報を取得します。
   * @param influencerId インフルエンサーID
   * @returns 統計情報（なければnull）
   */
  async getInfluencerStats(
    influencerId: number
  ): Promise<InfluencerStats | null> {
    return this.repository.getInfluencerStats(influencerId);
  }

  /**
   * いいね数で上位のインフルエンサー一覧を取得します。
   * @param limit 取得件数（デフォルト10）
   * @returns TopInfluencer配列
   */
  async getTopInfluencersByLikes(limit: number = 10): Promise<TopInfluencer[]> {
    return this.repository.getTopInfluencersByLikes(limit);
  }

  /**
   * コメント数で上位のインフルエンサー一覧を取得します。
   * @param limit 取得件数（デフォルト10）
   * @returns TopInfluencer配列
   */
  async getTopInfluencersByComments(
    limit: number = 10
  ): Promise<TopInfluencer[]> {
    return this.repository.getTopInfluencersByComments(limit);
  }

  /**
   * 指定インフルエンサーの投稿から名詞分析を行い、出現頻度順で返します。
   * @param influencerId インフルエンサーID
   * @param limit 取得件数（デフォルト10）
   * @returns 名詞分析結果
   */
  async getTopNouns(
    influencerId: number,
    limit: number = 10
  ): Promise<NounAnalysisResult> {
    const posts = await this.repository.findByInfluencerId(influencerId);
    const texts = posts
      .map((post: InfluencerPost) => post.text)
      .filter(Boolean) as string[];
    const nounCounts = await this.textAnalysisService.analyzeTexts(texts);

    return {
      influencerId,
      totalPosts: posts.length,
      nouns: nounCounts.slice(0, limit),
    };
  }
}
