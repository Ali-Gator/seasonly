import { pageMetadata } from "@/lib/site/routes";

import { Flow } from "./flow";

export const metadata = pageMetadata("/analyze");

/** Every step renders here without changing the URL. */
export default function Analyze() {
  return <Flow />;
}
