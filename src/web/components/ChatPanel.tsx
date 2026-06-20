import { useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useApi } from "../api/context";
import type { ChatMessage } from "../api/client";

type ChatStatus = "idle" | "streaming" | "error";

interface ChatState {
  messages: ChatMessage[];
  status: ChatStatus;
}

const INITIAL_STATE: ChatState = { messages: [], status: "idle" };

export function ChatPanel({ articleId }: { articleId: number }) {
  const api = useApi();
  const [state, setState] = useState<ChatState>(INITIAL_STATE);
  const [input, setInput] = useState("");

  const isStreaming = state.status === "streaming";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const history: ChatMessage[] = [
      ...state.messages,
      { role: "user", content: trimmed },
    ];
    // 送信開始時に user メッセージと空の assistant placeholder を一度だけ積む。
    // 以後のチャンク受信は最後の要素（assistant）を差し替えるだけで配列の再構築を避ける。
    setState({
      messages: [...history, { role: "assistant", content: "" }],
      status: "streaming",
    });
    setInput("");

    let assistant = "";
    try {
      for await (const chunk of api.chatWithArticle(articleId, history)) {
        assistant += chunk;
        const content = assistant;
        setState((prev) => {
          const next = prev.messages.slice();
          next[next.length - 1] = { role: "assistant", content };
          return { messages: next, status: "streaming" };
        });
      }
      setState((prev) => ({ ...prev, status: "idle" }));
    } catch {
      setState({ messages: history, status: "error" });
    }
  }

  return (
    <>
      <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        {state.messages.map((m, i) => (
          <li
            key={i}
            data-testid={`chat-message-${m.role}`}
            className={
              m.role === "user"
                ? "self-end max-w-[85%] whitespace-pre-wrap rounded-md bg-accent-soft px-3 py-2 text-sm text-accent"
                : "self-start max-w-[95%] rounded-md bg-paper px-3 py-2 text-sm"
            }
          >
            {m.role === "assistant" ? (
              m.content ? (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              ) : isStreaming ? (
                "…"
              ) : null
            ) : (
              m.content
            )}
          </li>
        ))}
        {state.status === "error" && (
          <li
            data-testid="chat-error"
            className="self-start rounded-md bg-warn-soft px-3 py-2 text-sm text-warn"
          >
            回答の取得に失敗しました。
          </li>
        )}
      </ul>
      <form
        onSubmit={handleSubmit}
        className="flex shrink-0 gap-2 border-t border-line p-3"
      >
        <textarea
          aria-label="質問を入力"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isStreaming}
          rows={1}
          className="w-full resize-none rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60"
          placeholder="記事の内容について質問してください"
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          className="shrink-0 whitespace-nowrap rounded-md bg-accent px-4 text-sm text-surface disabled:opacity-50"
        >
          送信
        </button>
      </form>
    </>
  );
}
