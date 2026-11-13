import { useState, useRef, useEffect } from "react";
import { streamChat, type ChatMessage, type StreamEvent } from "../api/chat";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  toolEvents?: { tool: string; status: "running" | "done" }[];
}

const SUGGESTIONS = [
  "What's on the menu today?",
  "Order 2 chai for me",
  "What's the cheapest item available?",
];

export default function ChatPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function buildHistory(): ChatMessage[] {
    return messages.map((m) => ({ role: m.role, content: m.content }));
  }

  async function send(text: string) {
    if (!text.trim() || streaming) return;

    const userMsg: DisplayMessage = { role: "user", content: text.trim() };
    const assistantMsg: DisplayMessage = { role: "assistant", content: "", toolEvents: [] };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setStreaming(true);

    const history = buildHistory();

    try {
      for await (const evt of streamChat(text.trim(), history)) {
        switch (evt.type) {
          case "text":
            setMessages((prev) => {
              const next = [...prev];
              const last = { ...next[next.length - 1] };
              last.content += evt.text;
              next[next.length - 1] = last;
              return next;
            });
            break;

          case "tool_start":
            setMessages((prev) => {
              const next = [...prev];
              const last = { ...next[next.length - 1] };
              last.toolEvents = [
                ...(last.toolEvents ?? []),
                { tool: evt.tool, status: "running" },
              ];
              next[next.length - 1] = last;
              return next;
            });
            break;

          case "tool_done":
            setMessages((prev) => {
              const next = [...prev];
              const last = { ...next[next.length - 1] };
              last.toolEvents = (last.toolEvents ?? []).map((t) =>
                t.tool === evt.tool ? { ...t, status: "done" as const } : t
              );
              next[next.length - 1] = last;
              return next;
            });
            break;

          case "error":
            setMessages((prev) => {
              const next = [...prev];
              const last = { ...next[next.length - 1] };
              last.content = evt.text;
              next[next.length - 1] = last;
              return next;
            });
            break;
        }
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        const last = { ...next[next.length - 1] };
        last.content = last.content || "Connection lost. Please try again.";
        next[next.length - 1] = last;
        return next;
      });
    }

    setStreaming(false);
  }

  const toolLabel = (name: string) => {
    const labels: Record<string, string> = {
      get_today_menu: "Checking today's menu",
      place_order: "Placing your order",
    };
    return labels[name] ?? name;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>AI Chat</h1>
          <p style={styles.subtitle}>Order with natural language</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => navigate("/")} style={styles.navBtn}>Menu</button>
          <button onClick={() => navigate("/orders")} style={styles.navBtn}>My Orders</button>
          <button onClick={() => { setMessages([]); }} style={styles.navBtn}>Clear</button>
          <button onClick={logout} style={styles.logoutBtn}>Sign Out</button>
        </div>
      </div>

      <div style={styles.chatArea}>
        {messages.length === 0 && (
          <div style={styles.empty}>
            <p style={styles.emptyTitle}>Ask me anything about the canteen</p>
            <p style={styles.emptyDesc}>I can show you today's menu, help you order, or answer questions.</p>
            <div style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} style={styles.suggestionBtn}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={msg.role === "user" ? styles.userRow : styles.assistantRow}>
            <div style={msg.role === "user" ? styles.userBubble : styles.assistantBubble}>
              {msg.toolEvents && msg.toolEvents.length > 0 && (
                <div style={styles.toolEvents}>
                  {msg.toolEvents.map((t, j) => (
                    <div key={j} style={styles.toolEvent}>
                      <span style={styles.toolIcon}>
                        {t.status === "running" ? "⟳" : "✓"}
                      </span>
                      <span style={t.status === "done" ? styles.toolDone : styles.toolRunning}>
                        {toolLabel(t.tool)}{t.status === "running" ? "..." : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {msg.content && (
                <div style={styles.messageText}>
                  {msg.content.split("\n").map((line, j) => (
                    <p key={j} style={{ margin: "0 0 4px" }}>{line}</p>
                  ))}
                </div>
              )}
              {msg.role === "assistant" && !msg.content && streaming && i === messages.length - 1 && (
                <span style={styles.cursor}>●</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputArea}>
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          style={styles.inputForm}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={streaming ? "Waiting for response..." : "Type a message..."}
            disabled={streaming}
            style={styles.input}
            autoFocus
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            style={styles.sendBtn}
          >
            Send
          </button>
        </form>
        <p style={styles.pattern}>Pattern: SSE streaming + agentic tool calling</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "24px 16px",
    display: "flex",
    flexDirection: "column",
    height: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 12,
    flexShrink: 0,
  },
  headerActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  title: { margin: 0, fontSize: 24, fontWeight: 700 },
  subtitle: { margin: "2px 0 0", color: "#666", fontSize: 13 },
  chatArea: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    paddingBottom: 8,
  },
  empty: {
    textAlign: "center",
    padding: "60px 20px",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: 600, color: "#333", margin: "0 0 6px" },
  emptyDesc: { fontSize: 14, color: "#888", margin: "0 0 20px" },
  suggestions: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  suggestionBtn: {
    padding: "8px 16px",
    background: "#f1f5f9",
    color: "#334155",
    border: "1px solid #d1d5db",
    borderRadius: 999,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
  },
  userRow: { display: "flex", justifyContent: "flex-end" },
  assistantRow: { display: "flex", justifyContent: "flex-start" },
  userBubble: {
    background: "#0f766e",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "16px 16px 4px 16px",
    maxWidth: "80%",
    fontSize: 14,
    lineHeight: 1.5,
  },
  assistantBubble: {
    background: "#f1f5f9",
    color: "#1a1a1a",
    padding: "10px 16px",
    borderRadius: "16px 16px 16px 4px",
    maxWidth: "80%",
    fontSize: 14,
    lineHeight: 1.5,
  },
  toolEvents: {
    marginBottom: 8,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  toolEvent: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
  },
  toolIcon: { fontSize: 14 },
  toolRunning: { color: "#0f766e", fontWeight: 500, fontStyle: "italic" },
  toolDone: { color: "#888", fontWeight: 400 },
  messageText: {},
  cursor: { color: "#0f766e", animation: "blink 1s infinite" },
  inputArea: {
    flexShrink: 0,
    paddingTop: 12,
    borderTop: "1px solid #e2e8f0",
  },
  inputForm: { display: "flex", gap: 8 },
  input: {
    flex: 1,
    padding: "12px 16px",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    fontSize: 15,
    outline: "none",
  },
  sendBtn: {
    padding: "12px 24px",
    background: "#0f766e",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 15,
  },
  pattern: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 0,
  },
  navBtn: {
    padding: "8px 14px",
    background: "#f1f5f9",
    color: "#334155",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 13,
  },
  logoutBtn: {
    padding: "8px 14px",
    background: "#fff",
    color: "#dc2626",
    border: "1px solid #fca5a5",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 13,
  },
};
