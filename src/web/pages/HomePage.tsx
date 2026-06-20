import { useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import useSWR from "swr";
import { useApi } from "../api/context";
import { useInfiniteArticles } from "../hooks/useInfiniteArticles";
import { ArticleCard } from "../components/ArticleCard";
import { SearchBox } from "../components/SearchBox";

const PER_PAGE = 10;
const VISIBLE_LABEL_COUNT = 8;

export function HomePage() {
  const api = useApi();
  const [params, setParams] = useSearchParams();
  const label = params.get("label") ?? undefined;
  const q = params.get("q") ?? undefined;
  const tagsOpen = params.get("tags") === "open";

  function setFilter(next: {
    label?: string | null;
    q?: string | null;
    tags?: string | null;
  }) {
    const sp = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value == null || value === "") sp.delete(key);
      else sp.set(key, value);
    }
    setParams(sp);
  }

  const { data: labelsData } = useSWR(["labels", "security"] as const, ([, c]) =>
    api.listLabels(c),
  );
  const articles = useInfiniteArticles(api, { label, q, perPage: PER_PAGE });

  const sortedLabels = useMemo(() => {
    if (!labelsData) return [];
    return [...labelsData].sort((a, b) => b.count - a.count);
  }, [labelsData]);
  const visibleLabels = tagsOpen
    ? sortedLabels
    : sortedLabels.slice(0, VISIBLE_LABEL_COUNT);
  const hasHiddenLabels = sortedLabels.length > VISIBLE_LABEL_COUNT;
  const selectedLabel = label
    ? sortedLabels.find((l) => l.slug === label)
    : undefined;
  const selectedIsHidden =
    !!selectedLabel && !visibleLabels.some((l) => l.slug === selectedLabel.slug);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const hasMore = articles.status === "ready" && articles.hasMore;
  const loadMore =
    articles.status === "ready" ? articles.loadMore : undefined;

  useEffect(() => {
    if (!hasMore || !loadMore) return;
    const target = sentinelRef.current;
    if (!target) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          loadMore();
          break;
        }
      }
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 pb-16">
      <header className="py-8">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">
            AIセキュリティ・ダイジェスト
          </h1>
          <Link
            to="/sources"
            className="shrink-0 whitespace-nowrap font-mono text-xs text-accent"
          >
            ソース一覧 →
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted">
          各種ソースから AI セキュリティ関連記事を収集し、日本語で要約しています。
        </p>
        <div className="mt-4">
          <SearchBox
            initialValue={q ?? ""}
            onSearch={(value) => setFilter({ q: value })}
          />
        </div>
      </header>

      {labelsData && sortedLabels.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter({ label: null })}
            className={`rounded-full px-2.5 py-0.5 text-xs ${
              label ? "bg-accent-soft text-accent" : "bg-accent text-surface"
            }`}
          >
            すべて
          </button>
          {selectedIsHidden && selectedLabel && (
            <button
              type="button"
              onClick={() => setFilter({ label: null })}
              aria-label={`選択中のフィルタ ${selectedLabel.name} を解除`}
              className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-surface"
            >
              選択中: {selectedLabel.name} ({selectedLabel.count}) ×
            </button>
          )}
          {visibleLabels.map((l) => (
            <button
              key={l.slug}
              type="button"
              onClick={() => setFilter({ label: l.slug })}
              className={`rounded-full px-2.5 py-0.5 text-xs ${
                label === l.slug
                  ? "bg-accent text-surface"
                  : "bg-accent-soft text-accent"
              }`}
            >
              {l.name} ({l.count})
            </button>
          ))}
          {hasHiddenLabels && (
            <button
              type="button"
              onClick={() =>
                setFilter({ tags: tagsOpen ? null : "open" })
              }
              className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-accent"
            >
              {tagsOpen
                ? "閉じる"
                : `+ もっと見る (残り ${sortedLabels.length - VISIBLE_LABEL_COUNT} 件)`}
            </button>
          )}
        </div>
      )}

      {articles.status === "loading" && (
        <p className="text-sm text-muted">読み込み中…</p>
      )}
      {articles.status === "error" && (
        <p className="text-sm text-warn">
          記事の読み込みに失敗しました。時間をおいて再度お試しください。
        </p>
      )}
      {articles.status === "ready" && articles.items.length === 0 && (
        <p className="text-sm text-muted">該当する記事がありません。</p>
      )}
      {articles.status === "ready" && articles.items.length > 0 && (
        <>
          <p className="mb-4 text-sm text-muted">
            {articles.total} 件の記事
          </p>
          <ul className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.items.map((article) => (
              <li key={article.id} className="h-full">
                <ArticleCard
                  article={article}
                  onLabelClick={(slug) => setFilter({ label: slug })}
                />
              </li>
            ))}
          </ul>
          {articles.hasMore && (
            <div
              ref={sentinelRef}
              data-testid="infinite-scroll-sentinel"
              aria-hidden="true"
              className="mt-6 h-8"
            />
          )}
          {articles.isLoadingMore && (
            <p className="mt-4 text-center text-sm text-muted">
              次のページを読み込み中…
            </p>
          )}
          {articles.loadMoreError && !articles.isLoadingMore && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="text-sm text-warn">
                次のページの読み込みに失敗しました。
              </p>
              <button
                type="button"
                onClick={() => articles.loadMore()}
                className="rounded-full bg-accent-soft px-3 py-1 text-xs text-accent"
              >
                もう一度試す
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
