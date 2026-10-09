"use client";

import type { SeasonSlug } from "@seasonly/analysis";
import { useEffect, useRef, useState } from "react";

import { Button, Icon } from "@/components/ds";
import { track } from "@/lib/analytics";

import { downloadFile, fileFor, savePalette, shareSeason } from "./share";

/**
 * "Share my season" and "Save my palette": the phone's share sheet where it takes files, the
 * share panel (boards 10e) or a download elsewhere. Their events carry how each tap ended, never
 * the report id.
 *
 * @see openspec/specs/report-page/spec.md
 * {@link openspec/specs/analytics/spec.md#requirement-share-and-save-events-carry-how-they-ended}
 */
const storyUrl = (slug: SeasonSlug) => `/images/share/${slug}/story`;
const postUrl = (slug: SeasonSlug) => `/images/share/${slug}/post`;
const paletteUrl = (slug: SeasonSlug) => `/images/palette/${slug}`;

/** {@link openspec/specs/report-page/spec.md#requirement-share-my-season-hands-over-the-share-cards} */
export function ShareButton({
  slug,
  season,
  alts,
  label = "Share my season",
  variant = "primary",
  block = true,
  className,
  place = "actions",
}: {
  slug: SeasonSlug;
  season: string;
  alts: { story: string; post: string };
  label?: string;
  variant?: "primary" | "ghost";
  block?: boolean;
  className?: string;
  /** Where the button sits, for its event. */
  place?: "header" | "actions";
}) {
  const panel = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    void fileFor(storyUrl(slug), `seasonly-${slug}-story.png`);
  }, [slug]);

  const onClick = async () => {
    const file = await fileFor(storyUrl(slug), `seasonly-${slug}-story.png`);
    const outcome = await shareSeason({ nav: navigator, file, season });
    track("share_tapped", { place, outcome: outcome === "idle" ? "cancelled" : outcome });
    if (outcome === "panel") panel.current?.showModal();
  };

  return (
    <>
      <Button variant={variant} block={block} className={className} onClick={onClick}>
        {label}
      </Button>
      <dialog
        ref={panel}
        aria-labelledby={`share-title-${variant}`}
        className="sn-screen m-0 mt-auto w-full max-w-none rounded-t-(--radius-lg) border-t border-(--line) bg-(--paper) shadow-(--shadow-md) backdrop:bg-(--scrim) lg:m-auto lg:w-[640px] lg:rounded-(--radius-lg) lg:border lg:p-(--space-6)"
      >
        <div className="flex flex-col gap-(--space-4)">
          <div className="flex items-center justify-between">
            <h2 className="h2" id={`share-title-${variant}`}>
              Share my season
            </h2>
            <Button
              variant="ghost"
              aria-label="Close"
              className="px-(--space-3)"
              onClick={() => panel.current?.close()}
            >
              <Icon name="cross" size={20} />
            </Button>
          </div>
          <p className="text-(--ink-muted)">Download a card, then post it from your photos.</p>
          <div className="grid grid-cols-2 gap-(--space-3) lg:gap-(--space-6)">
            {(
              [
                ["story", storyUrl(slug), alts.story, "Story · 9:16"],
                ["post", postUrl(slug), alts.post, "Post · 1:1"],
              ] as const
            ).map(([ratio, url, alt, caption]) => (
              <figure key={ratio} className="flex flex-col gap-(--space-2)">
                {/* eslint-disable-next-line @next/next/no-img-element -- a generated PNG route */}
                <img src={url} alt={alt} loading="lazy" className="w-full rounded-(--radius-md)" />
                <figcaption className="caption text-(--ink-muted)">{caption}</figcaption>
                <a
                  href={url}
                  download={`seasonly-${slug}-${ratio}.png`}
                  onClick={() => track("share_card_downloaded", { ratio })}
                  className="sn-btn sn-btn--secondary sn-btn--block mt-auto"
                >
                  Download
                </a>
              </figure>
            ))}
          </div>
        </div>
      </dialog>
    </>
  );
}

export function SaveButtonView({ saved, onClick }: { saved: boolean; onClick: () => void }) {
  return saved ? (
    <Button variant="secondary" block aria-disabled="true">
      <Icon name="check" size={18} />
      Saved
    </Button>
  ) : (
    <Button variant="secondary" block onClick={onClick}>
      Save my palette
    </Button>
  );
}

/** {@link openspec/specs/report-page/spec.md#requirement-save-my-palette-saves-the-palette-image} */
export function SaveButton({ slug }: { slug: SeasonSlug }) {
  const [saved, setSaved] = useState(false);
  const name = `seasonly-${slug}-palette.png`;
  useEffect(() => {
    void fileFor(paletteUrl(slug), name);
  }, [slug, name]);

  const onClick = async () => {
    const file = await fileFor(paletteUrl(slug), name);
    let downloaded = false;
    const outcome = await savePalette({
      nav: navigator,
      file,
      slug,
      download: (f, n) => {
        downloaded = true;
        downloadFile(f, n, paletteUrl(slug));
      },
    });
    if (outcome !== "saved") return;
    track("palette_saved", { method: downloaded ? "download" : "share-sheet" });
    setSaved(true);
  };

  return <SaveButtonView saved={saved} onClick={onClick} />;
}
