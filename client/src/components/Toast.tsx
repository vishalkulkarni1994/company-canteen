import { useEffect, useState } from "react";

export interface ToastMessage {
  id: string;
  text: string;
}

export default function ToastContainer({
  messages,
  onDismiss,
}: {
  messages: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div style={styles.container}>
      {messages.map((msg) => (
        <ToastItem key={msg.id} message={msg} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({
  message,
  onDismiss,
}: {
  message: ToastMessage;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => onDismiss(message.id), 8000);
    return () => clearTimeout(timer);
  }, [message.id, onDismiss]);

  return (
    <div style={{ ...styles.toast, opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(-12px)" }}>
      <div style={styles.icon}>&#9996;</div>
      <div style={styles.text}>{message.text}</div>
      <button onClick={() => onDismiss(message.id)} style={styles.close}>
        &times;
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: "fixed",
    top: 16,
    right: 16,
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    maxWidth: 380,
  },
  toast: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#065f46",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: 10,
    boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
    transition: "opacity 0.3s, transform 0.3s",
  },
  icon: { fontSize: 20, lineHeight: 1 },
  text: { flex: 1, fontSize: 14, fontWeight: 500 },
  close: {
    background: "none",
    border: "none",
    color: "#d1fae5",
    fontSize: 20,
    cursor: "pointer",
    padding: "0 4px",
    lineHeight: 1,
  },
};
