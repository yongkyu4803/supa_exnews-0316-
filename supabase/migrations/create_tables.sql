-- articles 테이블 생성
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  originallink TEXT,
  link TEXT NOT NULL,
  description TEXT,
  pubDate TIMESTAMP WITH TIME ZONE,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 중복 방지를 위한 인덱스 생성
CREATE UNIQUE INDEX IF NOT EXISTS articles_link_idx ON articles(link);

-- feedback 테이블 생성
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES articles(id),
  user_email TEXT NOT NULL,
  user_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- usage_stats 테이블 생성
CREATE TABLE IF NOT EXISTS usage_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT,
  action TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- users 테이블 생성
CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS feedback_article_id_idx ON feedback(article_id);
CREATE INDEX IF NOT EXISTS usage_stats_user_email_idx ON usage_stats(user_email);
CREATE INDEX IF NOT EXISTS articles_category_idx ON articles(category);
CREATE INDEX IF NOT EXISTS articles_pubdate_idx ON articles(pubDate);

-- admins 테이블 생성
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_super_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- api_settings 테이블 생성
CREATE TABLE IF NOT EXISTS api_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  run_interval INTEGER DEFAULT 300,
  last_run TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기본 관리자 계정 생성 (비밀번호: admin123)
INSERT INTO admins (email, password_hash, is_super_admin)
VALUES ('admin@example.com', '$2a$10$X7VYHy.Ry5QRnO3jT3iKB.Jtq9q7xd0p5WOHYvGUdA/8R/BwO.6Iq', TRUE)
ON CONFLICT (email) DO NOTHING;

-- 기본 API 설정 생성
INSERT INTO api_settings (api_name, is_active, run_interval)
VALUES ('naver_news_collector', TRUE, 300)
ON CONFLICT (api_name) DO NOTHING; 