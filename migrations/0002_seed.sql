-- 初期シード: カテゴリ「セキュリティ」と初期ラベル
INSERT INTO categories (name, slug) VALUES ('セキュリティ', 'security');

INSERT INTO labels (category_id, name, slug) VALUES ((SELECT id FROM categories WHERE slug = 'security'), 'プロンプトインジェクション', 'prompt-injection');
INSERT INTO labels (category_id, name, slug) VALUES ((SELECT id FROM categories WHERE slug = 'security'), 'ジェイルブレイク', 'jailbreak');
INSERT INTO labels (category_id, name, slug) VALUES ((SELECT id FROM categories WHERE slug = 'security'), 'データポイズニング', 'data-poisoning');
INSERT INTO labels (category_id, name, slug) VALUES ((SELECT id FROM categories WHERE slug = 'security'), '敵対的攻撃', 'adversarial-attack');
INSERT INTO labels (category_id, name, slug) VALUES ((SELECT id FROM categories WHERE slug = 'security'), 'モデル窃取', 'model-theft');
INSERT INTO labels (category_id, name, slug) VALUES ((SELECT id FROM categories WHERE slug = 'security'), 'サプライチェーン', 'supply-chain');
INSERT INTO labels (category_id, name, slug) VALUES ((SELECT id FROM categories WHERE slug = 'security'), '脆弱性開示', 'vulnerability-disclosure');
INSERT INTO labels (category_id, name, slug) VALUES ((SELECT id FROM categories WHERE slug = 'security'), 'ガバナンス/規制', 'governance');
