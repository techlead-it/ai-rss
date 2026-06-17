import { useState } from "react";

export function SearchBox({
  initialValue = "",
  onSearch,
}: {
  initialValue?: string;
  onSearch: (query: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(value.trim());
      }}
      className="flex gap-2"
    >
      <input
        type="search"
        aria-label="記事を検索"
        placeholder="キーワードで検索"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <button
        type="submit"
        className="rounded-md bg-accent px-4 py-2 text-sm text-surface"
      >
        検索
      </button>
    </form>
  );
}
