import { Router } from 'express';
import { InfluencerController } from '../influencer.controller.js';

/**
 * インフルエンサー関連APIのルーティングを生成します。
 * @param controller インフルエンサーコントローラー
 * @returns Express Routerインスタンス
 */
export function createInfluencerRoutes(
  controller: InfluencerController
): Router {
  const router = Router();

  // ヘルスチェック
  router.get('/health', controller.getHealth.bind(controller));

  // インフルエンサー統計情報
  router.get(
    '/influencer/:influencerId/stats',
    controller.getInfluencerStats.bind(controller)
  );

  // いいね数上位インフルエンサー
  router.get(
    '/influencers/top/likes',
    controller.getTopInfluencersByLikes.bind(controller)
  );

  // コメント数上位インフルエンサー
  router.get(
    '/influencers/top/comments',
    controller.getTopInfluencersByComments.bind(controller)
  );

  // 名詞分析
  router.get(
    '/influencer/:influencerId/nouns',
    controller.getTopNouns.bind(controller)
  );

  return router;
}
