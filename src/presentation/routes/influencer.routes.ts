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

  // いいね数上位インフルエンサー
  router.get(
    '/top/likes',
    controller.getTopInfluencersByLikes.bind(controller)
  );

  // コメント数上位インフルエンサー
  router.get(
    '/top/comments',
    controller.getTopInfluencersByComments.bind(controller)
  );

  // インフルエンサー統計情報
  router.get(
    '/:influencerId/stats',
    controller.getInfluencerStats.bind(controller)
  );

  // 名詞分析
  router.get('/:influencerId/nouns', controller.getTopNouns.bind(controller));

  return router;
}
