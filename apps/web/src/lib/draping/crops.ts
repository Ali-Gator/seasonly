import { StorageApiError } from "@supabase/supabase-js";

import { withTimeout } from "@/lib/observability/with-timeout";
import { supabase } from "@/lib/supabase";

/**
 * Face crops in the private Storage bucket `crops`, one `<report id>.jpg` per photo report, for
 * the draping preview.
 *
 * @see openspec/specs/draping-preview/spec.md
 */
export const REPORT_ID = /^[A-Za-z0-9_-]{22}$/;

export type CropUpload = (path: string, bytes: Uint8Array) => PromiseLike<{ error: unknown }>;
export type CropDownload = (path: string) => PromiseLike<{ data: Blob | null; error: unknown }>;

const BUCKET = "crops";

const supabaseUpload: CropUpload = (path, bytes) =>
  supabase().storage.from(BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: false });
const supabaseDownload: CropDownload = (path) => supabase().storage.from(BUCKET).download(path);

/**
 * Stores a crop as `<id>.jpg`. Never throws: a failed upload, or one still running after 3 s, is
 * reported to Sentry. `upload()` takes no abort signal, so a hung upload is abandoned, not
 * cancelled; the function's own time limit ends it.
 *
 * {@link openspec/specs/draping-preview/spec.md#requirement-a-failed-crop-upload-changes-nothing-the-person-sees}
 */
export async function storeCrop(
  id: string,
  bytes: Uint8Array,
  { upload = supabaseUpload }: { upload?: CropUpload } = {},
): Promise<void> {
  await withTimeout("crop upload failed", async () => {
    const { error } = await upload(`${id}.jpg`, bytes);
    if (error) throw error;
  });
}

/**
 * A stored crop's bytes, or null when there is none. Storage can answer a missing object with
 * HTTP 400 and `statusCode: "404"` in the body, so both shapes count as not found. A missing
 * bucket answers the same way and is thrown with every other error, so a misconfigured project
 * reaches Sentry instead of looking like a deleted crop.
 *
 * {@link openspec/specs/draping-preview/spec.md#requirement-the-face-route-serves-a-stored-crop-and-nothing-else}
 */
export async function readCrop(
  id: string,
  { download = supabaseDownload }: { download?: CropDownload } = {},
): Promise<Uint8Array<ArrayBuffer> | null> {
  const { data, error } = await download(`${id}.jpg`);
  const notFound =
    error instanceof StorageApiError &&
    (error.status === 404 || error.statusCode === "404") &&
    !/bucket/i.test(error.message);
  if (notFound) return null;
  if (error || !data) throw error ?? new Error("crop download gave no data");
  return new Uint8Array(await data.arrayBuffer());
}
