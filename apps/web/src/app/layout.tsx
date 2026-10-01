import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Seasonly — find your colors from one selfie",
  description: "Seasonal color analysis from one selfie.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900 antialiased">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
