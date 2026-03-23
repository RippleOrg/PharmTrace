import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="text-6xl">💊</div>
          <h1 className="text-5xl font-bold text-white">PharmTrace</h1>
          <p className="text-xl text-blue-200">
            Scan any pill — know in 3 seconds if it&apos;s real or fake.
          </p>
          <p className="text-sm text-blue-300">
            Powered by Hedera blockchain · DSCSA compliant · AWS KMS secured
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          {[
            { icon: "🔐", label: "HTS NFT per batch" },
            { icon: "⛓️", label: "HCS custody chain" },
            { icon: "🤖", label: "AI anomaly detection" },
          ].map(({ icon, label }) => (
            <div key={label} className="bg-white/10 rounded-xl p-4">
              <div className="text-3xl mb-2">{icon}</div>
              <div className="text-white text-sm">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/scan"
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-xl text-lg transition-colors"
          >
            📷 Scan QR Code
          </Link>
          <Link
            href="/dashboard/batches"
            className="bg-white/20 hover:bg-white/30 text-white font-bold py-3 px-8 rounded-xl text-lg transition-colors"
          >
            📊 Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
