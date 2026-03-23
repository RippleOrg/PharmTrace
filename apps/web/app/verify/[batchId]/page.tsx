interface HCSMessage {
  sequenceNumber: number;
  timestamp: string;
  message: {
    batchId: string;
    event: string;
    fromParty: string;
    toParty: string;
    drugName?: string;
    kmsSignature?: string;
    temperature?: number;
    location?: string;
  };
}

interface VerificationData {
  verified: boolean;
  reason: string;
  batch: {
    id: string;
    batchNumber: string;
    drugName: string;
    manufacturer: string;
    manufactureDate: string;
    expiryDate: string;
    status: string;
    htsTokenId?: string;
    htsSerialNumber?: number;
  };
  chain: HCSMessage[];
  handoffCount?: number;
  activeAlerts?: number;
  mirrorNodeUrl?: string;
}

async function getVerification(batchId: string): Promise<VerificationData | null> {
  try {
    const r = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/batches/${batchId}/verify`,
      { cache: "no-store" }
    );
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const data = await getVerification(batchId);

  if (!data) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">❓</div>
          <p className="text-xl text-gray-600">Batch not found</p>
        </div>
      </main>
    );
  }

  const ok = data.verified && data.reason === "VERIFIED";

  return (
    <main className="min-h-screen bg-gray-50 p-6 max-w-2xl mx-auto">
      {/* Verification Result Banner */}
      <div
        className={`rounded-2xl border-2 p-8 text-center ${
          ok
            ? "border-green-500 bg-green-50"
            : "border-red-500 bg-red-50"
        }`}
      >
        <div className="text-6xl mb-4">{ok ? "✅" : "🚨"}</div>
        <h1
          className={`text-2xl font-bold mb-2 ${
            ok ? "text-green-700" : "text-red-700"
          }`}
        >
          {ok ? "AUTHENTIC MEDICINE" : "VERIFICATION FAILED"}
        </h1>
        <p className="text-sm text-gray-500">
          {ok
            ? `${data.handoffCount} verified handoffs · unbroken chain`
            : `Reason: ${data.reason}`}
        </p>
        {(data.activeAlerts ?? 0) > 0 && (
          <p className="mt-2 text-sm text-orange-600 font-medium">
            ⚠️ {data.activeAlerts} active alert(s)
          </p>
        )}
      </div>

      {/* Batch Details */}
      {data.batch && (
        <div className="mt-6 bg-white rounded-xl border p-6 space-y-2 text-sm">
          {(
            [
              ["Drug", data.batch.drugName],
              ["Manufacturer", data.batch.manufacturer],
              ["Batch #", data.batch.batchNumber],
              [
                "Manufactured",
                new Date(data.batch.manufactureDate).toLocaleDateString(),
              ],
              [
                "Expires",
                new Date(data.batch.expiryDate).toLocaleDateString(),
              ],
              ["Status", data.batch.status],
            ] as [string, string][]
          ).map(([label, val]) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium">{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Custody Chain */}
      <div className="mt-6 bg-white rounded-xl border p-6">
        <h2 className="font-semibold mb-4">
          Custody Chain ({data.chain?.length ?? 0} entries)
        </h2>
        {(data.chain?.length ?? 0) === 0 ? (
          <p className="text-gray-400 text-sm">No chain entries found on Hedera HCS.</p>
        ) : (
          <div className="space-y-3">
            {data.chain?.map((entry, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                <div>
                  <div className="font-medium">{entry.message?.event}</div>
                  <div className="text-gray-500">
                    {entry.message?.fromParty} → {entry.message?.toParty}
                  </div>
                  {entry.message?.location && (
                    <div className="text-xs text-gray-400">
                      📍 {entry.message.location}
                    </div>
                  )}
                  <div className="text-xs text-gray-400">
                    Seq #{entry.sequenceNumber}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HashScan Link */}
      {data.mirrorNodeUrl && (
        <div className="mt-4 text-center">
          <a
            href={data.mirrorNodeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 text-sm underline"
          >
            Verify on HashScan →
          </a>
        </div>
      )}
    </main>
  );
}
