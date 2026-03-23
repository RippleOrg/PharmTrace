interface MonitorAlert {
  sequenceNumber: number;
  timestamp: string;
  message: {
    batchId: string;
    batchNumber: string;
    drugName: string;
    event: string;
    fromParty: string;
    toParty: string;
  };
}

async function getAlertsFromHCS(): Promise<MonitorAlert[]> {
  const topicId = process.env.HEDERA_ALERTS_TOPIC_ID;
  if (!topicId) return [];
  try {
    const network =
      process.env.HEDERA_NETWORK === "mainnet" ? "mainnet" : "testnet";
    const res = await fetch(
      `https://${network}.mirrornode.hedera.com/api/v1/topics/${topicId}/messages?limit=50`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.messages ?? []).map(
      (m: { sequence_number: number; consensus_timestamp: string; message: string }) => ({
        sequenceNumber: m.sequence_number,
        timestamp: m.consensus_timestamp,
        message: JSON.parse(Buffer.from(m.message, "base64").toString()),
      })
    );
  } catch {
    return [];
  }
}

export default async function MonitorPage() {
  const alerts = await getAlertsFromHCS();

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            🤖 AI Chain Monitor
          </h1>
          <p className="text-sm text-gray-500">
            Real-time anomaly alerts from Hedera HCS alerts topic ·{" "}
            {alerts.length} messages
          </p>
        </div>

        {alerts.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <div className="text-4xl mb-4">🟢</div>
            <p className="text-gray-500">
              No anomalies detected. All supply chains are healthy.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.sequenceNumber}
                className="bg-white rounded-xl border border-orange-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-500 text-xl">⚠️</span>
                    <div>
                      <div className="font-semibold text-sm text-gray-900">
                        {alert.message?.event}
                      </div>
                      <div className="text-xs text-gray-500">
                        {alert.message?.drugName} · {alert.message?.batchNumber}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    HCS #{alert.sequenceNumber}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {alert.message?.fromParty} → {alert.message?.toParty}
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  {new Date(
                    parseFloat(alert.timestamp) * 1000
                  ).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
