import { NotFoundMessage, SiteShell } from "@/components/site-chrome";

// Next adds noindex to every 404 response. A page inside (site) that calls notFound() renders this
// inside the (site) layout too, doubling the chrome: let unknown params 404 at routing instead.
export default function NotFound() {
  return (
    <SiteShell>
      <NotFoundMessage />
    </SiteShell>
  );
}
