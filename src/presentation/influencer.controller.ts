import { Request, Response } from 'express';
import { InfluencerService } from '../application/influencer.service.js';
import { TopInfluencer } from '../domain/entities.js';

/**
 * インフルエンサー関連APIコントローラー。
 * 統計・ランキング・名詞分析などのエンドポイントを提供します。
 */
export class InfluencerController {
  /**
   * コントローラーのインスタンスを生成します。
   * @param influencerService インフルエンサーサービス
   */
  constructor(private influencerService: InfluencerService) {}

  /**
   * ヘルスチェックAPI。
   * @param req Expressリクエスト
   * @param res Expressレスポンス
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
    });
  }

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

      res.json({
        influencer_id: stats.influencerId,
        avg_likes: stats.avgLikes,
        avg_comments: stats.avgComments,
        post_count: stats.postCount,
      });
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
      const parsedLimit = parseInt(req.query.limit as string);
      const limit = isNaN(parsedLimit) ? 10 : parsedLimit;

      if (limit < 1 || limit > 100) {
        res.status(400).json({
          error: 'Invalid limit parameter',
          details: 'Limit must be between 1 and 100',
        });
        return;
      }

      const results =
        await this.influencerService.getTopInfluencersByLikes(limit);

      res.json({
        limit,
        results: results.map((r: TopInfluencer) => ({
          influencer_id: r.influencerId,
          avg_likes: r.avgLikes,
          post_count: r.postCount,
        })),
      });
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
      const parsedLimit = parseInt(req.query.limit as string);
      const limit = isNaN(parsedLimit) ? 10 : parsedLimit;

      if (limit < 1 || limit > 100) {
        res.status(400).json({
          error: 'Invalid limit parameter',
          details: 'Limit must be between 1 and 100',
        });
        return;
      }

      const results =
        await this.influencerService.getTopInfluencersByComments(limit);

      res.json({
        limit,
        results: results.map((r: TopInfluencer) => ({
          influencer_id: r.influencerId,
          avg_comments: r.avgComments,
          post_count: r.postCount,
        })),
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getTopNouns(req: Request, res: Response): Promise<void> {
    try {
      const influencerId = parseInt(req.params.influencerId);
      const parsedLimit = parseInt(req.query.limit as string);
      const limit = isNaN(parsedLimit) ? 10 : parsedLimit;

      if (isNaN(influencerId)) {
        res.status(400).json({
          error: 'Invalid influencer ID',
          details: 'influencer ID must be a valid number',
        });
        return;
      }

      if (limit < 1 || limit > 100) {
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

      res.json({
        influencer_id: result.influencerId,
        total_posts: result.totalPosts,
        nouns: result.nouns,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
