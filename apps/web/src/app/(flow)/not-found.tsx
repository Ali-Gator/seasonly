import { NotFoundMessage } from "@/components/site-chrome";

// notFound() from a flow page (an unknown /r/<id>) renders here, inside the flow layout,
// instead of nesting the site shell in the flow column.
export default function FlowNotFound() {
  return (
    <main>
      <NotFoundMessage />
    </main>
  );
}
