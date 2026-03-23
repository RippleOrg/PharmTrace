interface ChainEntry {
  sequenceNumber: number;
  timestamp: string;
  message: {
    event: string;
    fromParty: string;
    toParty: string;
    location?: string;
    temperature?: number;
    kmsSignature?: string;
  };
}

interface ChainTimelineProps {
  chain: ChainEntry[];
}

const eventIcons: Record<string, string> = {
  MANUFACTURED: "🏭",
  HANDOFF_MANUFACTURER_TO_DISTRIBUTOR: "🚚",
  HANDOFF_DISTRIBUTOR_TO_PHARMACY: "💊",
  HANDOFF_PHARMACY_TO_HOSPITAL: "🏥",
  ANOMALY_DETECTED: "⚠️",
  RECALLED: "🔴",
};

export default function ChainTimeline({ chain }: ChainTimelineProps) {
  if (!chain || chain.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No chain entries found</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-4">
        {chain.map((entry, i) => (
          <div key={i} className="flex gap-4 relative">
            {/* Dot */}
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 z-10 text-sm">
              {eventIcons[entry.message?.event] ?? "✓"}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="bg-white rounded-lg border p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-sm text-gray-900">
                      {entry.message?.event?.replace(/_/g, " ")}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {entry.message?.fromParty} → {entry.message?.toParty}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    #{entry.sequenceNumber}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                  {entry.message?.location && (
                    <span>📍 {entry.message.location}</span>
                  )}
                  {entry.message?.temperature !== undefined && (
                    <span>🌡️ {entry.message.temperature}°C</span>
                  )}
                  {entry.message?.kmsSignature && (
                    <span className="text-green-600">✓ KMS signed</span>
                  )}
                  <span>
                    {new Date(
                      parseFloat(entry.timestamp) * 1000
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
