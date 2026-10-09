import type { SeasonSlug } from "@seasonly/analysis";

/**
 * Share and save, pure so they are unit-tested. iOS Safari refuses `navigator.share` once the
 * tap's activation was spent awaiting a fetch, so the files are fetched when the page mounts and
 * handed over at once.
 *
 * @see openspec/specs/report-page/spec.md
 */
export type ShareNav = Partial<Pick<Navigator, "canShare" | "share">>;

const files = new Map<string, Promise<File | null>>();

/** The image at `url` as a File, fetched once per page; null when it cannot be fetched. */
export function fileFor(url: string, name: string): Promise<File | null> {
  let file = files.get(url);
  if (!file) {
    file = fetch(url)
      .then(async (res) =>
        res.ok ? new File([await res.blob()], name, { type: "image/png" }) : null,
      )
      .catch(() => null)
      .then((f) => {
        // A failed fetch is tried again at the next tap, not cached for the page's life.
        if (!f) files.delete(url);
        return f;
      });
    files.set(url, file);
  }
  return file;
}

const canShareFile = (nav: ShareNav, file: File | null): file is File =>
  !!file && !!nav.share && !!nav.canShare?.({ files: [file] });
const aborted = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

/**
 * {@link openspec/specs/report-page/spec.md#requirement-share-my-season-hands-over-the-share-cards}
 */
export async function shareSeason({
  nav,
  file,
  season,
}: {
  nav: ShareNav;
  file: File | null;
  season: string;
}): Promise<"shared" | "panel" | "idle"> {
  if (!canShareFile(nav, file)) return "panel";
  try {
    await nav.share?.({
      files: [file],
      text: `My color season: ${season}. Find yours at seasonly.me`,
    });
    return "shared";
  } catch (error) {
    return aborted(error) ? "idle" : "panel";
  }
}

/** {@link openspec/specs/report-page/spec.md#requirement-save-my-palette-saves-the-palette-image} */
export async function savePalette({
  nav,
  file,
  slug,
  download,
}: {
  nav: ShareNav;
  file: File | null;
  slug: SeasonSlug;
  download: (file: File | null, name: string) => void;
}): Promise<"saved" | "idle"> {
  if (canShareFile(nav, file)) {
    try {
      await nav.share?.({ files: [file] });
      return "saved";
    } catch (error) {
      if (aborted(error)) return "idle";
    }
  }
  try {
    download(file, `seasonly-${slug}-palette.png`);
    return "saved";
  } catch {
    return "idle";
  }
}

/** Clicks a hidden download link: the file's object URL, or the image's own URL without one. */
export function downloadFile(file: File | null, name: string, fallbackUrl: string) {
  const url = file ? URL.createObjectURL(file) : fallbackUrl;
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.hidden = true;
  document.body.append(a);
  a.click();
  a.remove();
  if (file) setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
