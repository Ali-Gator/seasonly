import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { REPORT_ID } from "@/lib/draping/crops";
import { readReport } from "@/lib/report/read";
import { ReportView } from "@/lib/report/view";
import { pageMetadata } from "@/lib/site/routes";

type Props = { params: Promise<{ id: string }> };

/**
 * Rendered from the stored record on every request. Dynamic pages are sent `private, no-cache,
 * no-store`, so no shared cache keeps one.
 *
 * {@link openspec/specs/report-page/spec.md#requirement-a-report-is-never-kept-by-a-shared-cache}
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // params arrive decoded; re-encode so an id holding `/` or a space still maps to this route.
  return pageMetadata(`/r/${encodeURIComponent((await params).id)}`);
}

/**
 * A malformed id is a 404 without a database request; a failed read throws to error.tsx.
 *
 * {@link openspec/specs/report-page/spec.md#requirement-an-unknown-report-answers-404}
 */
export default async function ReportPage({ params }: Props) {
  const { id } = await params;
  if (!REPORT_ID.test(id)) notFound();
  const report = await readReport(id);
  if (!report) notFound();
  return <ReportView id={id} report={report} />;
}
