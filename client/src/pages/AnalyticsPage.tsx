import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { queryAnalytics, type AnalyticsResult } from "../api/analytics";

const SAMPLE_QUESTIONS = [
  "How many orders were placed this week?",
  "Show me the most popular menu items by quantity ordered",
  "What is the total revenue by category?",
  "How many of each item were sold today?",
  "Show daily order count for the last 7 days",
];

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyticsResult | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(q?: string) {
    const query = q ?? question;
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await queryAnalytics(query);
      if (data.error) {
        setError(data.error);
        if (data.sql) setResult(data);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Analytics</h1>
          <p style={styles.subtitle}>
            Ask questions about your canteen data in plain English
          </p>
        </div>
        <button onClick={() => navigate("/")} style={styles.backBtn}>
          Back
        </button>
      </div>

      <div style={styles.inputArea}>
        <div style={styles.inputRow}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="e.g. What's the most ordered item this week?"
            style={styles.input}
            disabled={loading}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={loading || !question.trim()}
            style={{
              ...styles.queryBtn,
              opacity: loading || !question.trim() ? 0.6 : 1,
            }}
          >
            {loading ? "Thinking..." : "Ask"}
          </button>
        </div>

        <div style={styles.suggestions}>
          <span style={styles.sugLabel}>Try:</span>
          {SAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuestion(q);
                handleSubmit(q);
              }}
              style={styles.chip}
              disabled={loading}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {result && !result.error && (
        <div style={styles.resultCard}>
          <h2 style={styles.resultTitle}>{result.title}</h2>

          {result.rows.length === 0 ? (
            <p style={styles.noData}>No data found for this query.</p>
          ) : result.chartType === "table" || result.columns.length > 2 ? (
            <ResultTable result={result} />
          ) : (
            <>
              <Chart result={result} />
              <details style={styles.details}>
                <summary style={styles.summary}>View data table</summary>
                <ResultTable result={result} />
              </details>
            </>
          )}

          {result.sql && (
            <details style={styles.details}>
              <summary style={styles.summary}>View generated SQL</summary>
              <pre style={styles.sql}>{result.sql}</pre>
            </details>
          )}

          <p style={styles.patternNote}>
            Pattern: <strong>Text-to-SQL</strong> — no tool calling. Claude
            generates one SQL query from your question, we execute it read-only.
          </p>
        </div>
      )}
    </div>
  );
}

function ResultTable({ result }: { result: AnalyticsResult }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            {result.columns.map((col) => (
              <th key={col} style={styles.th}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr key={i}>
              {result.columns.map((col) => (
                <td key={col} style={styles.td}>
                  {formatValue(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Chart({ result }: { result: AnalyticsResult }) {
  const { chartType, columns, rows, xLabel, yLabel } = result;
  if (rows.length === 0 || columns.length < 2) return null;

  const labels = rows.map((r) => String(r[columns[0]] ?? ""));
  const values = rows.map((r) => Number(r[columns[1]]) || 0);
  const maxVal = Math.max(...values, 1);

  if (chartType === "pie") return <PieChart labels={labels} values={values} />;
  if (chartType === "line")
    return (
      <LineChart
        labels={labels}
        values={values}
        maxVal={maxVal}
        xLabel={xLabel}
        yLabel={yLabel}
      />
    );
  return (
    <BarChart
      labels={labels}
      values={values}
      maxVal={maxVal}
      xLabel={xLabel}
      yLabel={yLabel}
    />
  );
}

const COLORS = [
  "#0f766e",
  "#0369a1",
  "#7c3aed",
  "#c2410c",
  "#b91c1c",
  "#4338ca",
  "#0e7490",
  "#15803d",
  "#a16207",
  "#be185d",
];

function BarChart({
  labels,
  values,
  maxVal,
  xLabel,
  yLabel,
}: {
  labels: string[];
  values: number[];
  maxVal: number;
  xLabel?: string;
  yLabel?: string;
}) {
  const w = Math.max(labels.length * 60, 300);
  const h = 260;
  const pad = { top: 20, right: 20, bottom: 60, left: 50 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const barW = Math.min(plotW / labels.length - 8, 40);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={styles.svg}>
      {/* y-axis ticks */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = pad.top + plotH * (1 - frac);
        return (
          <g key={frac}>
            <line
              x1={pad.left}
              y1={y}
              x2={w - pad.right}
              y2={y}
              stroke="#e5e7eb"
            />
            <text x={pad.left - 6} y={y + 4} style={styles.axisTick}>
              {Math.round(maxVal * frac)}
            </text>
          </g>
        );
      })}
      {/* bars */}
      {values.map((v, i) => {
        const barH = (v / maxVal) * plotH;
        const x =
          pad.left + (plotW / labels.length) * i + (plotW / labels.length - barW) / 2;
        return (
          <g key={i}>
            <rect
              x={x}
              y={pad.top + plotH - barH}
              width={barW}
              height={barH}
              fill={COLORS[i % COLORS.length]}
              rx={3}
            />
            <text
              x={x + barW / 2}
              y={pad.top + plotH - barH - 4}
              style={styles.barLabel}
            >
              {formatValue(v)}
            </text>
            <text
              x={pad.left + (plotW / labels.length) * (i + 0.5)}
              y={h - pad.bottom + 16}
              style={styles.xTick}
              transform={`rotate(-30, ${pad.left + (plotW / labels.length) * (i + 0.5)}, ${h - pad.bottom + 16})`}
            >
              {labels[i].length > 12
                ? labels[i].slice(0, 11) + "…"
                : labels[i]}
            </text>
          </g>
        );
      })}
      {yLabel && (
        <text
          x={14}
          y={pad.top + plotH / 2}
          style={styles.axisLabel}
          transform={`rotate(-90, 14, ${pad.top + plotH / 2})`}
        >
          {yLabel}
        </text>
      )}
      {xLabel && (
        <text x={pad.left + plotW / 2} y={h - 4} style={styles.axisLabel}>
          {xLabel}
        </text>
      )}
    </svg>
  );
}

function LineChart({
  labels,
  values,
  maxVal,
  xLabel,
  yLabel,
}: {
  labels: string[];
  values: number[];
  maxVal: number;
  xLabel?: string;
  yLabel?: string;
}) {
  const w = Math.max(labels.length * 60, 300);
  const h = 260;
  const pad = { top: 20, right: 20, bottom: 60, left: 50 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const points = values.map((v, i) => ({
    x: pad.left + (plotW / (labels.length - 1 || 1)) * i,
    y: pad.top + plotH * (1 - v / maxVal),
  }));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={styles.svg}>
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = pad.top + plotH * (1 - frac);
        return (
          <g key={frac}>
            <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="#e5e7eb" />
            <text x={pad.left - 6} y={y + 4} style={styles.axisTick}>{Math.round(maxVal * frac)}</text>
          </g>
        );
      })}
      <path d={pathD} fill="none" stroke="#0f766e" strokeWidth={2.5} />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill="#0f766e" />
          <text x={p.x} y={p.y - 8} style={styles.barLabel}>{formatValue(values[i])}</text>
          <text
            x={p.x}
            y={h - pad.bottom + 16}
            style={styles.xTick}
            transform={`rotate(-30, ${p.x}, ${h - pad.bottom + 16})`}
          >
            {labels[i].length > 10 ? labels[i].slice(0, 9) + "…" : labels[i]}
          </text>
        </g>
      ))}
      {yLabel && <text x={14} y={pad.top + plotH / 2} style={styles.axisLabel} transform={`rotate(-90, 14, ${pad.top + plotH / 2})`}>{yLabel}</text>}
      {xLabel && <text x={pad.left + plotW / 2} y={h - 4} style={styles.axisLabel}>{xLabel}</text>}
    </svg>
  );
}

function PieChart({ labels, values }: { labels: string[]; values: number[] }) {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const cx = 150, cy = 130, r = 100;
  let cumAngle = -Math.PI / 2;

  const slices = values.map((v, i) => {
    const angle = (v / total) * 2 * Math.PI;
    const startX = cx + r * Math.cos(cumAngle);
    const startY = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const endX = cx + r * Math.cos(cumAngle);
    const endY = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M${cx},${cy} L${startX},${startY} A${r},${r} 0 ${large},1 ${endX},${endY} Z`;
    return { path, color: COLORS[i % COLORS.length], label: labels[i], pct: ((v / total) * 100).toFixed(1) };
  });

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
      <svg viewBox="0 0 300 260" style={{ ...styles.svg, maxWidth: 300 }}>
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth={2} />)}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span>{s.label} ({s.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return Number.isInteger(v) ? v.toString() : v.toFixed(2);
  return String(v);
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 900, margin: "0 auto", padding: "24px 16px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  title: { margin: 0, fontSize: 28, fontWeight: 700 },
  subtitle: { margin: "4px 0 0", color: "#666", fontSize: 14 },
  backBtn: { padding: "8px 16px", background: "#f1f5f9", color: "#334155", border: "1px solid #d1d5db", borderRadius: 6, cursor: "pointer", fontWeight: 500, fontSize: 14 },
  inputArea: { marginBottom: 24 },
  inputRow: { display: "flex", gap: 8 },
  input: { flex: 1, padding: "12px 16px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 15, outline: "none" },
  queryBtn: { padding: "12px 24px", background: "#0f766e", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 15, whiteSpace: "nowrap" },
  suggestions: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, alignItems: "center" },
  sugLabel: { fontSize: 12, color: "#888", fontWeight: 500 },
  chip: { padding: "4px 10px", background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 999, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" },
  error: { color: "#dc2626", background: "#fef2f2", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 14 },
  resultCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 },
  resultTitle: { margin: "0 0 16px", fontSize: 20, fontWeight: 700 },
  noData: { color: "#888", fontSize: 14, padding: "20px 0" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #e2e8f0", fontWeight: 600, color: "#334155", whiteSpace: "nowrap" },
  td: { padding: "8px 12px", borderBottom: "1px solid #f1f5f9", color: "#555" },
  details: { marginTop: 16 },
  summary: { cursor: "pointer", fontSize: 13, color: "#0f766e", fontWeight: 500 },
  sql: { background: "#f8fafb", padding: 12, borderRadius: 6, fontSize: 12, fontFamily: "monospace", overflowX: "auto", marginTop: 8, whiteSpace: "pre-wrap" },
  patternNote: { marginTop: 20, padding: "10px 14px", background: "#fefce8", border: "1px solid #fef08a", borderRadius: 8, fontSize: 13, color: "#854d0e" },
  svg: { width: "100%", maxHeight: 280 },
  axisTick: { fontSize: 10, fill: "#888", textAnchor: "end" as const },
  axisLabel: { fontSize: 11, fill: "#666", textAnchor: "middle" as const, fontWeight: 500 },
  barLabel: { fontSize: 10, fill: "#333", textAnchor: "middle" as const, fontWeight: 600 },
  xTick: { fontSize: 10, fill: "#666", textAnchor: "end" as const },
};
