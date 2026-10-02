import type { ReactNode } from "react";

// The flow keeps its focus: one phone column, no site header or footer (canvas artboards 02–13).
export default function FlowLayout({ children }: { children: ReactNode }) {
  return <main className="sn-screen flex flex-col gap-(--space-6)">{children}</main>;
}
