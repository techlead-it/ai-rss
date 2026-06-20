-- articles.body: 抽出済み記事本文のプレーンテキスト全文を保持する。
-- 0001_init.sql の方針「全文を保持しない」を変更し、AIへの再要約や
-- 検証用に内部保管する（API/UI には露出しない）。
-- 取得失敗時は NULL（fetch_failed=1 とあわせて「本文未取得」を表現）。
-- 注: FTS5 は title/summary/detail のみ対象のため triggers の改修は不要。
ALTER TABLE articles ADD COLUMN body TEXT;
