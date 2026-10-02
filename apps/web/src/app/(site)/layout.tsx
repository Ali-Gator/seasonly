import type { ReactNode } from "react";

import { SiteShell } from "@/components/site-chrome";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
