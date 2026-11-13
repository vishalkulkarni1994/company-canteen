const API = "http://localhost:5230/api/chat";

export interface ChatMessage {
  role: string;
  content: string;
}

export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_start"; tool: string }
  | { type: "tool_done"; tool: string }
  | { type: "error"; text: string }
  | { type: "done" };

export async function* streamChat(
  message: string,
  history: ChatMessage[]
): AsyncGenerator<StreamEvent> {
  const auth = localStorage.getItem("auth");
  const token = auth ? JSON.parse(auth).token : "";

  const res = await fetch(`${API}/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message, history }),
  });

  if (!res.ok) {
    yield { type: "error", text: res.status === 401 ? "Please log in again." : "Chat failed." };
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") {
        yield { type: "done" };
        return;
      }
      try {
        yield JSON.parse(data) as StreamEvent;
      } catch { /* skip malformed */ }
    }
  }

  yield { type: "done" };
}
