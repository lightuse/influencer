-- インフルエンサーポスト情報を格納するテーブル
CREATE TABLE IF NOT EXISTS influencer_posts (
    id SERIAL PRIMARY KEY, -- 投稿ID（自動採番）
    influencer_id INTEGER NOT NULL, -- インフルエンサーID
    post_id BIGINT NOT NULL, -- 投稿の一意ID
    shortcode VARCHAR(255), -- 投稿のショートコード
    likes INTEGER NOT NULL DEFAULT 0, -- いいね数
    comments INTEGER NOT NULL DEFAULT 0, -- コメント数
    thumbnail TEXT, -- サムネイル画像URL
    text TEXT, -- 投稿本文
    post_date TIMESTAMP, -- 投稿日時
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- レコード作成日時
    UNIQUE(post_id) -- 投稿IDの一意制約
);

-- 検索効率化のためのインデックス
CREATE INDEX IF NOT EXISTS idx_influencer_posts_influencer_id ON influencer_posts(influencer_id); -- インフルエンサーID用
CREATE INDEX IF NOT EXISTS idx_influencer_posts_likes ON influencer_posts(likes); -- いいね数用
CREATE INDEX IF NOT EXISTS idx_influencer_posts_comments ON influencer_posts(comments); -- コメント数用
CREATE INDEX IF NOT EXISTS idx_influencer_posts_post_date ON influencer_posts(post_date); -- 投稿日時用
