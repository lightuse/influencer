import { InfluencerPost, InfluencerStats, TopInfluencer } from './entities.js';

/**
 * インフルエンサーポストのリポジトリインターフェース。
 * データ取得・集計・保存などの操作を定義します。
 */
export interface InfluencerPostRepository {
  /**
   * 新しい投稿データを作成します。
   * @param data 投稿データ（id, createdAt除く）
   * @returns 作成されたInfluencerPost
   */
  create(
    data: Omit<InfluencerPost, 'id' | 'createdAt'>
  ): Promise<InfluencerPost>;

  /**
   * 指定インフルエンサーIDの投稿一覧を取得します。
   * @param influencerId インフルエンサーID
   * @returns 投稿データ配列
   */
  findByInfluencerId(influencerId: number): Promise<InfluencerPost[]>;

  /**
   * 指定インフルエンサーの統計情報を取得します。
   * @param influencerId インフルエンサーID
   * @returns 統計情報（なければnull）
   */
  getInfluencerStats(influencerId: number): Promise<InfluencerStats | null>;

  /**
   * いいね数で上位のインフルエンサー一覧を取得します。
   * @param limit 取得件数
   * @returns TopInfluencer配列
   */
  getTopInfluencersByLikes(limit: number): Promise<TopInfluencer[]>;

  /**
   * コメント数で上位のインフルエンサー一覧を取得します。
   * @param limit 取得件数
   * @returns TopInfluencer配列
   */
  getTopInfluencersByComments(limit: number): Promise<TopInfluencer[]>;

  /**
   * 投稿データを一括で作成します。
   * @param posts 投稿データ配列（id, createdAt除く）
   * @returns 作成件数
   */
  bulkCreate(
    posts: Omit<InfluencerPost, 'id' | 'createdAt'>[]
  ): Promise<number>;

  /**
   * 指定postIdの投稿が存在するか判定します。
   * @param postId 投稿ID
   * @returns 存在すればtrue
   */
  exists(postId: bigint): Promise<boolean>;
}
