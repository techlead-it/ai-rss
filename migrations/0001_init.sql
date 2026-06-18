-- ai-security-news 初期スキーマ
-- categories: 最上位分類（MVP は「セキュリティ」のみ。将来テーマ拡張用に分離）
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

-- labels: カテゴリ配下のラベル
CREATE TABLE labels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  UNIQUE (category_id, name),
  UNIQUE (category_id, slug)
);

-- articles: 収集記事（著作権配慮で全文は保持しない。要約・要点・メタのみ）
CREATE TABLE articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  guid TEXT,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  summary TEXT NOT NULL,
  detail TEXT NOT NULL,
  original_lang TEXT,
  published_at TEXT,
  fetched_at TEXT NOT NULL,
  fetch_failed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_articles_published_at ON articles (published_at DESC);
CREATE INDEX idx_articles_category ON articles (category_id, published_at DESC);

-- article_labels: 記事とラベルの多対多
CREATE TABLE article_labels (
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, label_id)
);
CREATE INDEX idx_article_labels_label ON article_labels (label_id);

-- articles_fts: 日本語全文検索（trigram で CJK の部分一致に対応）
CREATE VIRTUAL TABLE articles_fts USING fts5 (
  title,
  summary,
  detail,
  content = 'articles',
  content_rowid = 'id',
  tokenize = 'trigram'
);

CREATE TRIGGER articles_ai AFTER INSERT ON articles BEGIN
  INSERT INTO articles_fts (rowid, title, summary, detail)
  VALUES (new.id, new.title, new.summary, new.detail);
END;

CREATE TRIGGER articles_ad AFTER DELETE ON articles BEGIN
  INSERT INTO articles_fts (articles_fts, rowid, title, summary, detail)
  VALUES ('delete', old.id, old.title, old.summary, old.detail);
END;

CREATE TRIGGER articles_au AFTER UPDATE ON articles BEGIN
  INSERT INTO articles_fts (articles_fts, rowid, title, summary, detail)
  VALUES ('delete', old.id, old.title, old.summary, old.detail);
  INSERT INTO articles_fts (rowid, title, summary, detail)
  VALUES (new.id, new.title, new.summary, new.detail);
END;
