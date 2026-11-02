"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Drops its children on the quiz page: a link there would replace the entry holding its progress. */
export function HideOnQuizPage({ children }: { children: ReactNode }) {
  return usePathname() === "/color-analysis-quiz" ? null : children;
}
