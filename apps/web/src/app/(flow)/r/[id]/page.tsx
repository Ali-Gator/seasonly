import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { pageMetadata } from "@/lib/site/routes";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return pageMetadata(`/r/${(await params).id}`);
}

// No report exists until t5-report-delivery, so every id is unknown.
export default function Report() {
  notFound();
}
