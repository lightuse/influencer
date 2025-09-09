import { Request, Response } from 'express';
import { InfluencerService } from '../application/influencer.service.js';
import { components } from '../../generated/api-types.js';
import { TopInfluencer as DomainTopInfluencer } from '../domain/entities.js';

type InfluencerStatsResponse = components['schemas']['InfluencerStats'];
type TopInfluencersResponse = components['schemas']['TopInfluencersResponse'];
type NounAnalysisResultResponse = components['schemas']['NounAnalysisResult'];
type TopInfluencerResponse = components['schemas']['TopInfluencer'];

/**
 * インフルエンサー関連APIコントローラー。
 * 統計・ランキング・名詞分析などのエンドポイントを提供します。
 */
export class InfluencerController {
  /**
   * ドメインモデルからレスポンスモデルへの変換ヘルパー。
   */
  private static toTopInfluencerResponse(
    influencer: DomainTopInfluencer
  ): TopInfluencerResponse {
    return {
      influencer_id: influencer.influencerId,
      avg_likes:
        influencer.avgLikes !== undefined
          ? String(influencer.avgLikes)
          : undefined,
      avg_comments:
        influencer.avgComments !== undefined
          ? String(influencer.avgComments)
          : undefined,
      post_count: influencer.postCount,
    };
  }
  /**
   * limitクエリパラメータをパースし、1～100の範囲でバリデーションする共通ヘルパー。
   * @param req Expressリクエスト
   * @returns 有効なlimit値（デフォルト10）、不正な場合はnull
   */
  private static parseAndValidateLimit(req: Request): number | null {
    const parsedLimit = parseInt(req.query.limit as string);
    const limit = isNaN(parsedLimit) ? 10 : parsedLimit;
    if (limit < 1 || limit > 100) {
      return null;
    }
    return limit;
  }
  /**
   * コントローラーのインスタンスを生成します。
   * @param influencerService インフルエンサーサービス
   */
  constructor(private influencerService: InfluencerService) {}

  /**
   * インフルエンサー統計情報取得API。
   * @param req Expressリクエスト
   * @param res Expressレスポンス
   */
  async getInfluencerStats(req: Request, res: Response): Promise<void> {
    try {
      const influencerId = parseInt(req.params.influencerId);

      if (isNaN(influencerId)) {
        res.status(400).json({
          error: 'Invalid influencer ID',
          details: 'influencer ID must be a valid number',
        });
        return;
      }

      const stats =
        await this.influencerService.getInfluencerStats(influencerId);

      if (!stats) {
        res.status(404).json({
          error: 'Influencer not found',
          details: `No data found for influencer ID: ${influencerId}`,
        });
        return;
      }

      const response: InfluencerStatsResponse = {
        influencer_id: stats.influencerId,
        avg_likes: String(stats.avgLikes),
        avg_comments: String(stats.avgComments),
        post_count: stats.postCount,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * いいね数ランキング取得API。
   * @param req Expressリクエスト
   * @param res Expressレスポンス
   */
  async getTopInfluencersByLikes(req: Request, res: Response): Promise<void> {
    try {
      const limit = InfluencerController.parseAndValidateLimit(req);
      if (limit === null) {
        res.status(400).json({
          error: 'Invalid limit parameter',
          details: 'Limit must be between 1 and 100',
        });
        return;
      }

      const results =
        await this.influencerService.getTopInfluencersByLikes(limit);

      const response: TopInfluencersResponse = {
        limit,
        results: results.map(InfluencerController.toTopInfluencerResponse),
      };
      res.json(response);
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * コメント数ランキング取得API。
   * @param req Expressリクエスト
   * @param res Expressレスポンス
   * @returns
   */
  async getTopInfluencersByComments(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const limit = InfluencerController.parseAndValidateLimit(req);
      if (limit === null) {
        res.status(400).json({
          error: 'Invalid limit parameter',
          details: 'Limit must be between 1 and 100',
        });
        return;
      }

      const results =
        await this.influencerService.getTopInfluencersByComments(limit);

      const response: TopInfluencersResponse = {
        limit,
        results: results.map(InfluencerController.toTopInfluencerResponse),
      };
      res.json(response);
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * インフルエンサーの投稿から名詞の出現回数ランキングを取得します。
   *
   * 指定したインフルエンサーIDの全投稿を解析し、最も多く使われている名詞を出現回数順に返します。
   * 返却する名詞数はクエリパラメータ`limit`で指定できます（デフォルト: 10、最大: 100）。
   *
   * @param req - Expressのリクエストオブジェクト。ルートパラメータとして`influencerId`、クエリパラメータとして`limit`を受け取ります。
   * @param res - Expressのレスポンスオブジェクト。名詞ランキングまたはエラーメッセージをJSONで返します。
   * @returns void
   */
  async getTopNouns(req: Request, res: Response): Promise<void> {
    try {
      const influencerId = parseInt(req.params.influencerId);
      const limit = InfluencerController.parseAndValidateLimit(req);

      if (isNaN(influencerId)) {
        res.status(400).json({
          error: 'Invalid influencer ID',
          details: 'influencer ID must be a valid number',
        });
        return;
      }

      if (limit === null) {
        res.status(400).json({
          error: 'Invalid limit parameter',
          details: 'Limit must be between 1 and 100',
        });
        return;
      }

      const result = await this.influencerService.getTopNouns(
        influencerId,
        limit
      );

      if (!result) {
        res.status(404).json({
          error: 'Influencer not found',
          details: `No data found for influencer ID: ${influencerId}`,
        });
        return;
      }

      const response: NounAnalysisResultResponse = {
        influencer_id: result.influencerId,
        total_posts: result.totalPosts,
        nouns: result.nouns,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
