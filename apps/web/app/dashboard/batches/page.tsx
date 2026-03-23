interface Batch {
  id: string;
  batchNumber: string;
  drugName: string;
  genericName: string;
  ndcCode: string;
  lotNumber: string;
  manufactureDate: string;
  expiryDate: string;
  quantity: number;
  strengthMg: number;
  status: string;
  htsTokenId?: string;
  htsSerialNumber?: number;
  ipfsHash?: string;
  createdAt: string;
  manufacturer: { name: string; licenseNumber: string };
  _count?: { handoffs: number; alerts: number };
}

async function getBatches(): Promise<Batch[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/batches`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

const statusColors: Record<string, string> = {
  MANUFACTURED: "bg-blue-100 text-blue-800",
  DISTRIBUTED: "bg-purple-100 text-purple-800",
  IN_TRANSIT: "bg-yellow-100 text-yellow-800",
  AT_PHARMACY: "bg-green-100 text-green-800",
  DISPENSED: "bg-gray-100 text-gray-800",
  RECALLED: "bg-red-100 text-red-800",
  FLAGGED: "bg-orange-100 text-orange-800",
};

export default async function BatchesPage() {
  const batches = await getBatches();

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Drug Batches</h1>
            <p className="text-sm text-gray-500">{batches.length} total batches</p>
          </div>
          <a
            href="/dashboard/batches/new"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Batch
          </a>
        </div>

        {batches.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center">
            <div className="text-4xl mb-4">📦</div>
            <p className="text-gray-500">No batches yet. Mint your first batch to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {["Batch #", "Drug", "Manufacturer", "Status", "Expires", "HTS Token", "QR / Actions"].map(
                    (h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{batch.batchNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{batch.drugName}</div>
                      <div className="text-gray-400 text-xs">{batch.genericName}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{batch.manufacturer.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[batch.status] ?? "bg-gray-100 text-gray-800"}`}>
                        {batch.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(batch.expiryDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {batch.htsTokenId ? (
                        <a
                          href={`https://hashscan.io/testnet/token/${batch.htsTokenId}/${batch.htsSerialNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-mono text-xs"
                        >
                          {batch.htsTokenId}
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`/verify/${batch.id}`}
                        className="text-blue-600 hover:underline text-xs mr-3"
                      >
                        Verify
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
