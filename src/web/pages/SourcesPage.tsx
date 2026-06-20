import { Link } from "react-router";
import useSWR from "swr";
import { useApi } from "../api/context";

export function SourcesPage() {
  const api = useApi();
  const { data, error, isLoading } = useSWR(["sources"] as const, () =>
    api.listSources(),
  );

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 pb-16">
      <header className="py-6">
        <Link to="/home" className="font-mono text-xs text-accent">
          ← 一覧へ戻る
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          データソース一覧
        </h1>
        <p className="mt-1 text-sm text-muted">
          記事は以下の RSS / Atom フィードから収集しています。
        </p>
      </header>

      {isLoading && !data && <p className="text-sm text-muted">読み込み中…</p>}
      {error && (
        <p className="text-sm text-warn">ソースの読み込みに失敗しました。</p>
      )}
      {data && (
        <ul className="flex flex-col gap-3">
          {data.map((s) => (
            <li
              key={s.source}
              className="rounded-[--radius-card] border border-line bg-surface p-4 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
                  {s.kind}
                </span>
                <h2 className="font-semibold">{s.source}</h2>
                <span className="ml-auto shrink-0 font-mono text-xs text-muted">
                  {s.count} 件
                </span>
              </div>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block truncate font-mono text-xs text-accent"
              >
                {s.url}
              </a>
              {s.filtered && (
                <p className="mt-1 text-xs text-muted">
                  AI 関連キーワードで絞り込み
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
