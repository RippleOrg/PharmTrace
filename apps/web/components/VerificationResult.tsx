// eslint-disable-next-line @typescript-eslint/no-explicit-any
const QRCode = require("react-qr-code").default as any;

interface VerificationResultProps {
  batchId: string;
  verified: boolean;
  reason: string;
  batch?: {
    drugName: string;
    batchNumber: string;
    manufacturer: string;
    status: string;
    expiryDate: string;
    htsTokenId?: string;
    htsSerialNumber?: number;
  };
  handoffCount?: number;
  activeAlerts?: number;
  mirrorNodeUrl?: string;
  showQR?: boolean;
}

export default function VerificationResult({
  batchId,
  verified,
  reason,
  batch,
  handoffCount,
  activeAlerts,
  mirrorNodeUrl,
  showQR = false,
}: VerificationResultProps) {
  const ok = verified && reason === "VERIFIED";
  const verifyUrl = `${
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_URL
  }/verify/${batchId}`;

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div
        className={`rounded-2xl border-2 p-6 text-center ${
          ok
            ? "border-green-500 bg-green-50"
            : "border-red-500 bg-red-50"
        }`}
      >
        <div className="text-5xl mb-3">{ok ? "✅" : "🚨"}</div>
        <h2
          className={`text-xl font-bold ${
            ok ? "text-green-700" : "text-red-700"
          }`}
        >
          {ok ? "AUTHENTIC MEDICINE" : "VERIFICATION FAILED"}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {ok
            ? `${handoffCount ?? 0} verified handoffs · unbroken custody chain`
            : `Reason: ${reason}`}
        </p>
        {(activeAlerts ?? 0) > 0 && (
          <p className="mt-2 text-sm text-orange-600 font-medium">
            ⚠️ {activeAlerts} active alert(s)
          </p>
        )}
      </div>

      {/* Batch info */}
      {batch && ok && (
        <div className="bg-white rounded-xl border p-4 space-y-1 text-sm">
          {(
            [
              ["Drug", batch.drugName],
              ["Manufacturer", batch.manufacturer],
              ["Batch #", batch.batchNumber],
              ["Status", batch.status],
              ["Expires", new Date(batch.expiryDate).toLocaleDateString()],
            ] as [string, string][]
          ).map(([label, val]) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium">{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* QR Code */}
      {showQR && ok && (
        <div className="bg-white rounded-xl border p-6 text-center">
          <p className="text-sm text-gray-500 mb-3">Scan to verify</p>
          <div className="inline-block">
            <QRCode value={verifyUrl} size={160} />
          </div>
          <p className="text-xs text-gray-400 mt-2 break-all">{verifyUrl}</p>
        </div>
      )}

      {/* Mirror Node link */}
      {mirrorNodeUrl && (
        <div className="text-center">
          <a
            href={mirrorNodeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 text-sm underline"
          >
            Verify on HashScan →
          </a>
        </div>
      )}
    </div>
  );
}
