import { NotFoundMessage, Wordmark } from "@/components/site-chrome";

// An unknown /r/<id>: the same 404 the flow showed before the report moved here, under the
// wordmark-only header.
export default function ReportNotFound() {
  return (
    <div className="sn-screen flex flex-col gap-(--space-6)">
      <header className="flex min-h-(--size-tap) items-center">
        <Wordmark size="text-[1.4em]" />
      </header>
      <main>
        <NotFoundMessage />
      </main>
    </div>
  );
}
