interface Handoff {
  id: string;
  batchId: string;
  fromParty: string;
  fromPartyType: string;
  toParty: string;
  toPartyType: string;
  hcsMessageId?: string;
  kmsSignature?: string;
  temperature?: number;
  location?: string;
  timestamp: string;
  batch: { drugName: string; batchNumber: string };
}

async function getHandoffs(): Promise<Handoff[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/handoffs`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

const partyTypeIcons: Record<string, string> = {
  MANUFACTURER: "🏭",
  DISTRIBUTOR: "🚚",
  PHARMACY: "💊",
  HOSPITAL: "🏥",
  REGULATOR: "🏛️",
};

export default async function HandoffsPage() {
  const handoffs = await getHandoffs();

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Custody Handoffs</h1>
          <p className="text-sm text-gray-500">
            {handoffs.length} handoffs recorded on Hedera HCS
          </p>
        </div>

        {handoffs.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <div className="text-4xl mb-4">🔄</div>
            <p className="text-gray-500">No handoffs yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {handoffs.map((h) => (
              <div key={h.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl">{partyTypeIcons[h.fromPartyType] ?? "📦"}</div>
                      <div className="text-xs text-gray-500">{h.fromParty}</div>
                    </div>
                    <div className="text-gray-400">→</div>
                    <div className="text-center">
                      <div className="text-2xl">{partyTypeIcons[h.toPartyType] ?? "📦"}</div>
                      <div className="text-xs text-gray-500">{h.toParty}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">{h.batch.drugName}</div>
                    <div className="text-xs text-gray-400 font-mono">{h.batch.batchNumber}</div>
                  </div>
                </div>
                <div className="mt-3 flex gap-4 text-xs text-gray-500">
                  <span>🕐 {new Date(h.timestamp).toLocaleString()}</span>
                  {h.location && <span>📍 {h.location}</span>}
                  {h.temperature !== undefined && <span>🌡️ {h.temperature}°C</span>}
                  {h.hcsMessageId && (
                    <span className="font-mono">HCS #{h.hcsMessageId}</span>
                  )}
                  {h.kmsSignature && <span className="text-green-600">✓ KMS Signed</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
