"use client";

import { RETAKE_TIPS, type RetakeReason } from "@seasonly/analysis";
import Link from "next/link";
import { type ChangeEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button, CameraFrame, Icon, Note, PhotoTipCard } from "@/components/ds";
import { TIP_PHOTOS } from "@/lib/site-content/images";

/**
 * Photo guide, capture, check and retake: the copy of canvas artboards 02 to 04, 04e and 04f.
 *
 * @see openspec/specs/capture-flow/spec.md
 */
type OnPhoto = (photo: Blob | HTMLVideoElement, source: "camera" | "upload") => void;

const noop = () => () => {};
/** False in the server HTML and during hydration: a pick made before React listens is lost. */
const useHydrated = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

/** A file picker dressed as a button: the label is the control, the input stays focusable. */
export function UploadButton({
  onPhoto,
  variant,
  className,
  children,
}: {
  onPhoto: OnPhoto;
  variant: "secondary" | "ghost";
  className?: string;
  children: string;
}) {
  const hydrated = useHydrated();
  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onPhoto(file, "upload");
  };
  return (
    <label className={`sn-btn sn-btn--${variant} sn-btn--block ${className ?? ""}`.trim()}>
      <input
        type="file"
        accept="image/*"
        className="sn-visually-hidden"
        disabled={!hydrated}
        onChange={pick}
      />
      <Icon name="upload" size={18} />
      {children}
    </label>
  );
}

/** {@link openspec/specs/capture-flow/spec.md#requirement-the-photo-guide-and-capture-follow-the-canvas} */
export function Guide({ onCamera, onPhoto }: { onCamera: () => void; onPhoto: OnPhoto }) {
  const hydrated = useHydrated();
  return (
    <>
      <div className="flex flex-col gap-(--space-3)">
        <h1 className="h1" tabIndex={-1}>
          Three things before your selfie
        </h1>
        <p className="lead text-(--ink-muted)">
          Face a window, skip the makeup and the filter. Daylight shows your real undertone.
        </p>
      </div>
      {/* One card, so both actions fit the first phone screen (t18-design-review decision 5). */}
      <PhotoTipCard
        title="Face a window, bare skin, no filter"
        good={{ caption: "Window light, bare skin", ...TIP_PHOTOS.light.good }}
        bad={[
          {
            caption: "Ceiling lamp",
            src: TIP_PHOTOS.light.bad.src,
            alt: `${TIP_PHOTOS.light.bad.alt}. Lamps and screens tint your skin.`,
          },
          {
            caption: "Foundation",
            src: TIP_PHOTOS.makeup.bad.src,
            alt: `${TIP_PHOTOS.makeup.bad.alt}. Foundation and bronzer hide your undertone.`,
          },
          {
            caption: "Beauty filter",
            src: TIP_PHOTOS.filter.bad.src,
            alt: `${TIP_PHOTOS.filter.bad.alt}. Filters shift skin tone.`,
          },
        ]}
      />
      {/* From 1024 px upload goes on top and takes the primary fill; the DOM keeps one set. */}
      <div className="sn-stack lg:flex-col-reverse">
        <Button block disabled={!hydrated} onClick={onCamera} className="sn-btn--lg-swap">
          <Icon name="camera" size={18} />
          Take a selfie
        </Button>
        <UploadButton variant="secondary" onPhoto={onPhoto} className="sn-btn--lg-swap">
          Upload a photo
        </UploadButton>
      </div>
      <p className="caption flex items-start gap-(--space-2) text-(--ink-muted)">
        <Icon name="lock" size={16} className="mt-0.5 flex-none" />
        <span>
          Only a crop of your face is sent, once you finish the quiz. An AI model from Google,
          through Vercel, reads its colors and doesn&apos;t train on it. We delete our copy within
          24 hours. Google may keep one up to 90 days for abuse checks.{" "}
          <Link href="/privacy" className="text-(--ink) underline">
            Privacy policy
          </Link>
        </span>
      </p>
    </>
  );
}

const CAMERA_CAPTION = "Fit your face in the oval, at eye level. Hold still.";

/** {@link openspec/specs/capture-flow/spec.md#requirement-the-photo-guide-and-capture-follow-the-canvas} */
export function Capture({ onPhoto }: { onPhoto: OnPhoto }) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let cancelled = false;
    // No mediaDevices outside a secure context.
    (
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: "user" }, audio: false }) ??
      Promise.reject(new Error("no camera API"))
    )
      .then((s) => {
        stream = s;
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => setBlocked(true));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <>
      <h1 className="sn-visually-hidden" tabIndex={-1}>
        Take your selfie
      </h1>
      <CameraFrame caption={CAMERA_CAPTION} label="Front camera">
        {blocked ? undefined : (
          // Mirrored on screen only; the photo is taken unmirrored.
          <video
            ref={video}
            autoPlay
            playsInline
            muted
            aria-label="Front camera"
            className="-scale-x-100"
            onPlaying={() => setReady(true)}
          />
        )}
      </CameraFrame>
      <div className="sn-stack">
        <Button
          block
          disabled={!ready}
          onClick={() => video.current && onPhoto(video.current, "camera")}
        >
          <Icon name="camera" size={18} />
          Take photo
        </Button>
        <UploadButton variant="ghost" onPhoto={onPhoto}>
          Upload a photo instead
        </UploadButton>
      </div>
      <p className="caption text-center text-(--ink-muted)">
        Camera blocked or not working? Upload a selfie you took in daylight.
      </p>
    </>
  );
}

export function Checking() {
  return (
    <>
      <h1 className="h1" tabIndex={-1}>
        Checking your photo
      </h1>
      <p className="lead text-(--ink-muted)" role="status">
        This happens on your phone. Nothing is uploaded yet.
      </p>
    </>
  );
}

/** {@link openspec/specs/capture-flow/spec.md#requirement-every-photo-is-checked-on-the-device-before-anything-is-uploaded} */
export function Retake({
  problem,
  previewUrl,
  offerQuizOnly,
  onRetake,
  onPhoto,
  onQuizOnly,
}: {
  problem: RetakeReason;
  previewUrl: string | null;
  offerQuizOnly: boolean;
  onRetake: () => void;
  onPhoto: OnPhoto;
  onQuizOnly: () => void;
}) {
  const tip = RETAKE_TIPS[problem];
  const photo = (className: string) => (
    <CameraFrame label="Your photo, as taken" guide={false} className={className}>
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- a local object URL
        <img src={previewUrl} alt="Your photo, as taken" />
      ) : undefined}
    </CameraFrame>
  );
  return (
    <>
      {offerQuizOnly ? (
        // The second failure in a row says so, with the photo as a thumbnail (canvas 04f).
        <div className="flex items-start gap-(--space-4)">
          {photo("w-24 flex-none")}
          <div className="flex flex-col gap-(--space-2)">
            <h1 className="h2" tabIndex={-1}>
              Let’s try once more
            </h1>
            <p className="text-(--ink-muted)">
              That’s two tries. Try once more, or go on with the quiz alone.
            </p>
          </div>
        </div>
      ) : (
        <>
          <h1 className="h1" tabIndex={-1}>
            Let’s retake this one
          </h1>
          {photo("w-[220px] self-center")}
        </>
      )}
      <Note tone="danger" title={tip.title}>
        {tip.message}
      </Note>
      <Note icon={tip.icon} title="Retake tip">
        {tip.tip}
      </Note>
      <div className="sn-stack">
        <Button block onClick={onRetake}>
          <Icon name="camera" size={18} />
          Retake photo
        </Button>
        {offerQuizOnly && (
          <Button variant="secondary" block onClick={onQuizOnly}>
            Continue with the quiz only
          </Button>
        )}
        <UploadButton variant="ghost" onPhoto={onPhoto}>
          Upload a different photo
        </UploadButton>
      </div>
      {offerQuizOnly && (
        <p className="caption text-center text-(--ink-muted)">
          Your result will then come from the quiz alone.
        </p>
      )}
    </>
  );
}
