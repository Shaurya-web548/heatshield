import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HeatShield — Urban Heat Resilience",
  description:
    "Localized heat-risk index, hotspot dashboard, threshold alerts and municipal response tracking for Indian cities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
