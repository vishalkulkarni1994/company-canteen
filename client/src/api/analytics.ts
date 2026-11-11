const API = "http://localhost:5230/api/analytics";

export interface AnalyticsResult {
  error?: string;
  sql?: string;
  chartType: string;
  title: string;
  xLabel?: string;
  yLabel?: string;
  columns: string[];
  rows: Record<string, unknown>[];
}

export async function queryAnalytics(question: string): Promise<AnalyticsResult> {
  const auth = localStorage.getItem("auth");
  const token = auth ? JSON.parse(auth).token : "";
  const res = await fetch(`${API}/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question }),
  });
  if (res.status === 403) throw new Error("Admin access required");
  if (!res.ok) throw new Error("Analytics query failed");
  return res.json();
}
