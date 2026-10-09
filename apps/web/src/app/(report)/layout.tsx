import type { ReactNode } from "react";

// The report draws its own header (boards 10 · 375 and · 1280: Share on a phone, the report's
// address on a desktop) and its own wide page, so this group adds no chrome.
export default function ReportLayout({ children }: { children: ReactNode }) {
  return children;
}
