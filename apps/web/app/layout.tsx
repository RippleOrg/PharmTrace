import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PharmTrace — Scan any pill, know in 3 seconds if it's real or fake",
  description:
    "DSCSA-compliant pharmaceutical supply chain verification powered by Hedera blockchain",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
