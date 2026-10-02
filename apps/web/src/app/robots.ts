import type { MetadataRoute } from "next";

import { ORIGIN } from "@/lib/site/routes";

// Flow and report pages stay crawlable so crawlers can read their noindex.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${ORIGIN}/sitemap.xml`,
  };
}
