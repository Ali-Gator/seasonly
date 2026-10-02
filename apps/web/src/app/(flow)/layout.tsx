import type { ReactNode } from "react";

// The flow keeps its focus: no site header or footer (canvas artboards 02–13). Each page brings
// its own column, so the root 404, which renders inside this layout for /r/<id>, is not nested in one.
export default function FlowLayout({ children }: { children: ReactNode }) {
  return children;
}
