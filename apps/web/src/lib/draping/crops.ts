import { StorageApiError } from "@supabase/supabase-js";

import { withTimeout } from "@/lib/observability/with-timeout";
import { supabase } from "@/lib/supabase";

/**
 * Face crops in the private Storage bucket `crops`, one `<report id>.jpg` per photo report, for
 * the draping preview, and beside it `<report id>.mask.png`, its outline, when the phone made one.
 *
 * @see openspec/specs/draping-preview/spec.md
 */
export const REPORT_ID = /^[A-Za-z0-9_-]{22}$/;

export type CropUpload = (path: string, bytes: Uint8Array) => PromiseLike<{ error: unknown }>;
export type CropDownload = (path: string) => PromiseLike<{ data: Blob | null; error: unknown }>;

const BUCKET = "crops";

const supabaseUpload: CropUpload = (path, bytes) =>
  supabase()
    .storage.from(BUCKET)
    .upload(path, bytes, {
      contentType: path.endsWith(".png") ? "image/png" : "image/jpeg",
      upsert: false,
    });
const supabaseDownload: CropDownload = (path) => supabase().storage.from(BUCKET).download(path);

/**
 * Stores a crop as `<id>.jpg`. Never throws: a failed upload, or one still running after 3 s, is
 * reported to Sentry. `upload()` takes no abort signal, so a hung upload is abandoned, not
 * cancelled; the function's own time limit ends it.
 *
 * {@link openspec/specs/draping-preview/spec.md#requirement-a-failed-crop-upload-changes-nothing-the-person-sees}
 */
export const storeCrop = (id: string, bytes: Uint8Array, options?: { upload?: CropUpload }) =>
  store(`${id}.jpg`, "crop upload failed", bytes, options);

/**
 * Stores a crop's outline as `<id>.mask.png`, exactly as `storeCrop` stores the crop.
 *
 * {@link openspec/specs/draping-preview/spec.md#requirement-a-photo-results-outline-is-stored-next-to-its-crop}
 */
export const storeMask = (id: string, bytes: Uint8Array, options?: { upload?: CropUpload }) =>
  store(`${id}.mask.png`, "outline upload failed", bytes, options);

async function store(
  path: string,
  message: string,
  bytes: Uint8Array,
  { upload = supabaseUpload }: { upload?: CropUpload } = {},
): Promise<void> {
  await withTimeout(message, async () => {
    const { error } = await upload(path, bytes);
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
export const readCrop = (id: string, options?: { download?: CropDownload }) =>
  read(`${id}.jpg`, options);

/**
 * A stored outline's bytes, or null when there is none, exactly as `readCrop` reads a crop.
 *
 * {@link openspec/specs/draping-preview/spec.md#requirement-the-outline-route-serves-a-stored-outline-and-nothing-else}
 */
export const readMask = (id: string, options?: { download?: CropDownload }) =>
  read(`${id}.mask.png`, options);

async function read(
  path: string,
  { download = supabaseDownload }: { download?: CropDownload } = {},
): Promise<Uint8Array<ArrayBuffer> | null> {
  const { data, error } = await download(path);
  const notFound =
    error instanceof StorageApiError &&
    (error.status === 404 || error.statusCode === "404") &&
    !/bucket/i.test(error.message);
  if (notFound) return null;
  if (error || !data) throw error ?? new Error(`${path} download gave no data`);
  return new Uint8Array(await data.arrayBuffer());
}
