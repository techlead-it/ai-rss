# demo-site-template

`demo-site-builder` スキルが新規プロジェクトの起点として使うテンプレートリポジトリ。
React 19 + Vite+ (`vp`) + TypeScript + Tailwind CSS v4 + React Router v7 (HashRouter) +
Vitest 互換テスト + Cloudflare Workers Static Assets デプロイ用の CI が既に組み込まれている。

## このテンプレートを使う

```bash
# 新規プロジェクトを GitHub に作成しつつローカルへ clone
gh repo create <project-name> \
  --template skanehira/demo-site-template \
  --private --clone
cd <project-name>

# プレースホルダ置換（プロジェクト名 + compatibility_date）
PROJECT_NAME="<project-name>"
COMPAT_DATE="$(date +%Y-%m-%d)"
sed -i.bak "s/__PROJECT_NAME__/${PROJECT_NAME}/g" package.json wrangler.jsonc index.html
sed -i.bak "s/__COMPATIBILITY_DATE__/${COMPAT_DATE}/g" wrangler.jsonc
rm -f package.json.bak wrangler.jsonc.bak index.html.bak

# 依存導入と動作確認
vp install
vp test
vp build
vp dev
```

## 同梱スクリプト

| コマンド | 内容 |
| --- | --- |
| `vp dev` | 開発サーバ |
| `vp test` | テスト実行 |
| `vp check --no-lint --no-fmt` | TypeScript 型チェックのみ（lint/fmt はテンプレ未調整のため除外） |
| `vp build` | 本番ビルド |
| `vp preview` | 本番ビルドのプレビュー |
| `pnpm deploy` | `vp build && wrangler deploy` |
| `pnpm deploy:dry-run` | `vp build && wrangler deploy --dry-run` |

## デプロイ

`.github/workflows/deploy.yml` に Cloudflare Workers Static Assets へのデプロイが組み込まれている。
GitHub Secrets に `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` が登録されていれば `main` push で自動デプロイ。
token 発行は `demo-site-builder` スキル同梱の `assets/cf-issue-deploy-token.sh` を参照。

## デザインテーマ

`src/index.css` の `@theme` ブロックは空で出荷している。プロジェクト個別のデザインコンセプトは
`frontend-design` スキルで確立し、ここに反映する。
