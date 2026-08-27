import type { Metadata } from "next";
import { Playfair_Display, Crimson_Text } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "600", "700", "800"],
});

const crimson = Crimson_Text({
  subsets: ["latin"],
  variable: "--font-crimson",
  display: "swap",
  weight: ["400", "600", "700"],
});

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
    <html lang="en" className={`dark ${playfair.variable} ${crimson.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
