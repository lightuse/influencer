/**
 * インフルエンサーの投稿データ
 */
export interface InfluencerPost {
  /** 投稿ID（主キー） */
  id: number;
  /** インフルエンサーID */
  influencerId: number;
  /** 投稿ID（SNS側のID） */
  postId: string;
  /** 投稿のショートコード */
  shortcode: string | null;
  /** いいね数 */
  likes: number;
  /** コメント数 */
  comments: number;
  /** サムネイルURL */
  thumbnail: string | null;
  /** 投稿本文 */
  text: string | null;
  /** 投稿日時 */
  postDate: Date | null;
  /** 作成日時 */
  createdAt: Date;
}

/**
 * インフルエンサーの統計情報
 */
export interface InfluencerStats {
  /** インフルエンサーID */
  influencerId: number;
  /** 平均いいね数 */
  avgLikes: number;
  /** 平均コメント数 */
  avgComments: number;
  /** 投稿件数 */
  postCount: number;
}

/**
 * 上位インフルエンサー情報
 */
export interface TopInfluencer {
  /** インフルエンサーID */
  influencerId: number;
  /** 平均いいね数 */
  avgLikes?: number;
  /** 平均コメント数 */
  avgComments?: number;
  /** 投稿件数 */
  postCount: number;
}

/**
 * 名詞とその出現回数
 */
export interface NounCount {
  /** 名詞 */
  noun: string;
  /** 出現回数 */
  count: number;
}

/**
 * 名詞分析の結果
 */
export interface NounAnalysisResult {
  /** インフルエンサーID */
  influencerId: number;
  /** 投稿件数 */
  totalPosts: number;
  /** 名詞と出現回数の配列 */
  nouns: NounCount[];
}

/**
 * インポート処理の結果情報
 */
export interface ImportResult {
  /** 処理した総行数 */
  totalProcessed: number;
  /** インポート成功件数 */
  totalImported: number;
  /** エラー件数 */
  totalErrors: number;
  /** ファイル名 */
  fileName: string;
  /** ファイルサイズ（バイト） */
  fileSize: number;
}
