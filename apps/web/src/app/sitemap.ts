import type { MetadataRoute } from "next";

import { indexedUrls } from "@/lib/site/routes";

export default function sitemap(): MetadataRoute.Sitemap {
  return indexedUrls().map((url) => ({ url }));
}
