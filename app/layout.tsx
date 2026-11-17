import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Club-8910 · Exchange & Terminal",
  description: "Club-8910 Sportsbook & Exchange Terminal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
