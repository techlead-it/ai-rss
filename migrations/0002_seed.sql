-- 初期シード: カテゴリ「セキュリティ」と初期ラベル
INSERT INTO categories (name, slug) VALUES ('セキュリティ', 'security');

INSERT INTO labels (category_id, name, slug)
SELECT c.id, v.name, v.slug
FROM categories c
JOIN (
  SELECT 'プロンプトインジェクション' AS name, 'prompt-injection' AS slug
  UNION ALL SELECT 'ジェイルブレイク', 'jailbreak'
  UNION ALL SELECT 'データポイズニング', 'data-poisoning'
  UNION ALL SELECT '敵対的攻撃', 'adversarial-attack'
  UNION ALL SELECT 'モデル窃取', 'model-theft'
  UNION ALL SELECT 'サプライチェーン', 'supply-chain'
  UNION ALL SELECT '脆弱性開示', 'vulnerability-disclosure'
  UNION ALL SELECT 'ガバナンス/規制', 'governance'
) v
WHERE c.slug = 'security';
