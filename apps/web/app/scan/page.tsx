"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const QRScanner = dynamic(() => import("@/components/QRScanner"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-gray-100 rounded-xl">
      <p className="text-gray-500">Loading scanner…</p>
    </div>
  ),
});

export default function ScanPage() {
  const router = useRouter();

  function handleScan(result: string) {
    // Extract batchId from URL like https://example.com/verify/BATCH_ID
    // or direct batchId string
    try {
      const url = new URL(result);
      const parts = url.pathname.split("/");
      const batchId = parts[parts.length - 1];
      if (batchId) {
        router.push(`/verify/${batchId}`);
        return;
      }
    } catch {
      // Not a URL — treat as raw batchId
      if (result.trim()) {
        router.push(`/verify/${result.trim()}`);
      }
    }
  }

  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">📷</div>
          <h1 className="text-2xl font-bold text-white">Scan QR Code</h1>
          <p className="text-gray-400 text-sm mt-1">
            Point your camera at a PharmTrace QR code
          </p>
        </div>
        <div className="bg-white rounded-2xl overflow-hidden">
          <QRScanner onScan={handleScan} />
        </div>
        <p className="text-center text-gray-500 text-xs mt-4">
          The camera will read the QR code automatically
        </p>
      </div>
    </main>
  );
}
