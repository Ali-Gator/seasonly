import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Bodoni_Moda, Instrument_Sans } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

// next/font self-hosts both families, so no visitor request goes to Google.
const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-bodoni",
});
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument" });

// Pages set their own metadata from the route map; this fallback reaches only the 404 page.
export const metadata: Metadata = { title: "Seasonly" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${bodoni.variable} ${instrument.variable}`}>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
