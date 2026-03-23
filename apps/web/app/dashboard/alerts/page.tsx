interface Alert {
  id: string;
  batchId: string;
  alertType: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  aiAnalysis?: string;
  resolved: boolean;
  createdAt: string;
  batch: {
    drugName: string;
    batchNumber: string;
    manufacturer: { name: string };
  };
}

async function getAlerts(): Promise<Alert[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/alerts`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

const severityColors: Record<string, string> = {
  LOW: "bg-blue-100 text-blue-800 border-blue-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
};

const alertTypeIcons: Record<string, string> = {
  CHAIN_BREAK: "⛓️",
  TEMPERATURE_EXCURSION: "🌡️",
  EXPIRY_RISK: "⏳",
  COUNTERFEIT_SUSPECTED: "🚨",
  RECALL: "🔴",
};

export default async function AlertsPage() {
  const alerts = await getAlerts();
  const active = alerts.filter((a) => !a.resolved);
  const resolved = alerts.filter((a) => a.resolved);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">AI Security Alerts</h1>
          <p className="text-sm text-gray-500">
            {active.length} active · {resolved.length} resolved
          </p>
        </div>

        {active.length === 0 && resolved.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-gray-500">No alerts detected. All supply chains look healthy.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-xl border p-4 ${severityColors[alert.severity] ?? "bg-gray-50"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {alertTypeIcons[alert.alertType] ?? "⚠️"}
                    </span>
                    <div>
                      <div className="font-semibold text-sm">{alert.alertType.replace(/_/g, " ")}</div>
                      <div className="text-xs opacity-75">
                        {alert.batch.drugName} · {alert.batch.batchNumber} ·{" "}
                        {alert.batch.manufacturer.name}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-full border">
                    {alert.severity}
                  </span>
                </div>
                <p className="mt-2 text-sm">{alert.description}</p>
                {alert.aiAnalysis && (
                  <p className="mt-1 text-xs opacity-75 italic">
                    AI: {alert.aiAnalysis}
                  </p>
                )}
                <div className="mt-2 text-xs opacity-60">
                  {new Date(alert.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
