"use client";

import { useEffect, useRef } from "react";

interface QRScannerProps {
  onScan: (result: string) => void;
}

export default function QRScanner({ onScan }: QRScannerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<{ clear: () => void } | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    let mounted = true;

    import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
      if (!mounted || !ref.current) return;

      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
        },
        false
      );

      scanner.render(
        (decodedText: string) => {
          scanner.clear().catch(console.error);
          onScan(decodedText);
        },
        (error: unknown) => {
          // Ignore scan errors (no QR in frame)
          void error;
        }
      );

      scannerRef.current = scanner;
    });

    return () => {
      mounted = false;
      void scannerRef.current?.clear();
    };
  }, [onScan]);

  return (
    <div className="p-4">
      <div id="qr-reader" ref={ref} />
    </div>
  );
}
