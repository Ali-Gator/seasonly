import type { ReactNode } from "react";

import { Wordmark } from "@/components/site-chrome";

// The flow keeps its focus: one phone column, a header bar with only the wordmark, no nav or footer
// (design.md decision 6, canvas artboards 02–13). Steps add their progress bar below it.
export default function FlowLayout({ children }: { children: ReactNode }) {
  return (
    <div className="sn-screen flex flex-col gap-(--space-6)">
      <header className="flex min-h-(--size-tap) items-center">
        <Wordmark size="text-[1.4em]" />
      </header>
      {children}
    </div>
  );
}
