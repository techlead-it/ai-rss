import { Link, useParams } from "react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import useSWR from "swr";
import { useApi } from "../api/context";
import { formatDate } from "../lib/format";

export function ArticlePage() {
  const api = useApi();
  const { id } = useParams();
  const articleId = Number(id);
  const { data, error, isLoading } = useSWR(
    ["article", articleId] as const,
    ([, aid]) => api.getArticle(aid),
  );

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-16">
      <header className="py-6">
        <Link to="/home" className="font-mono text-xs text-accent">
          ← 一覧へ戻る
        </Link>
      </header>

      {isLoading && !data && <p className="text-sm text-muted">読み込み中…</p>}
      {error && (
        <p className="text-sm text-warn">記事の読み込みに失敗しました。</p>
      )}
      {!isLoading && !error && data === null && (
        <p className="text-sm text-muted">記事が見つかりませんでした。</p>
      )}
      {data != null && (
        <article>
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted">
            <span>{data.source}</span>
            {data.publishedAt && (
              <>
                <span aria-hidden>·</span>
                <time dateTime={data.publishedAt}>
                  {formatDate(data.publishedAt)}
                </time>
              </>
            )}
            {data.fetchFailed && (
              <span className="rounded bg-warn-soft px-1.5 py-0.5 text-warn">
                抜粋ベース
              </span>
            )}
          </div>

          <h1 className="mt-2 text-2xl font-bold leading-snug">{data.title}</h1>

          {data.labels.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {data.labels.map((label) => (
                <Link
                  key={label.slug}
                  to={`/home?label=${encodeURIComponent(label.slug)}`}
                  className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent"
                >
                  {label.name}
                </Link>
              ))}
            </div>
          )}

          <section className="mt-6">
            <div className="prose prose-sm mt-1 max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {data.detail}
              </ReactMarkdown>
            </div>
          </section>

          <div className="mt-8">
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-md bg-accent px-4 py-2 text-sm text-surface"
            >
              元記事を読む ↗
            </a>
          </div>
        </article>
      )}
    </div>
  );
}
