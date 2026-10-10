"use client";

import { RETAKE_TIPS, type RetakeReason } from "@seasonly/analysis";
import Link from "next/link";
import { type ChangeEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button, CameraFrame, Icon, Note, PhotoTipCard } from "@/components/ds";
import { TIP_PHOTOS } from "@/lib/site-content/images";

/**
 * Photo guide, capture, check, retake and consent: the copy of canvas artboards 02 to 05, 04e
 * and 04f.
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
  children,
}: {
  onPhoto: OnPhoto;
  variant: "secondary" | "ghost";
  children: string;
}) {
  const hydrated = useHydrated();
  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onPhoto(file, "upload");
  };
  return (
    <label className={`sn-btn sn-btn--${variant} sn-btn--block`}>
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
      <PhotoTipCard
        title="Face a window"
        body="Natural daylight from the front. Lamps and screens tint your skin."
        good={{ caption: "Facing a window", ...TIP_PHOTOS.light.good }}
        bad={{ caption: "Under a ceiling lamp", ...TIP_PHOTOS.light.bad }}
      />
      <PhotoTipCard
        title="Skip the makeup"
        body="Foundation and bronzer hide your undertone. Pull your hair back too."
        good={{ caption: "Bare skin, hair back", ...TIP_PHOTOS.makeup.good }}
        bad={{ caption: "Foundation, bronzer", ...TIP_PHOTOS.makeup.bad }}
      />
      <PhotoTipCard
        title="No filter"
        body="Filters and beauty mode shift skin tone. Use the plain camera."
        good={{ caption: "Straight from the camera", ...TIP_PHOTOS.filter.good }}
        bad={{ caption: "Beauty filter on", ...TIP_PHOTOS.filter.bad }}
      />
      <div className="sn-stack">
        <Button block disabled={!hydrated} onClick={onCamera}>
          <Icon name="camera" size={18} />
          Take a selfie
        </Button>
        <UploadButton variant="secondary" onPhoto={onPhoto}>
          Upload a photo
        </UploadButton>
      </div>
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
  return (
    <>
      <h1 className="h1" tabIndex={-1}>
        Let&apos;s retake this one
      </h1>
      <CameraFrame label="Your photo, as taken" guide={false} className="w-[220px] self-center">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local object URL
          <img src={previewUrl} alt="Your photo, as taken" />
        ) : undefined}
      </CameraFrame>
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
        <UploadButton variant="ghost" onPhoto={onPhoto}>
          Upload a different photo
        </UploadButton>
        {offerQuizOnly && (
          <Button variant="ghost" block onClick={onQuizOnly}>
            Continue without a photo
          </Button>
        )}
      </div>
      {offerQuizOnly && (
        <p className="caption text-center text-(--ink-muted)">
          Your result will then come from the quiz alone.
        </p>
      )}
    </>
  );
}

/** {@link openspec/specs/capture-flow/spec.md#requirement-nothing-leaves-the-device-before-consent} */
export function Consent({
  cropUrl,
  onAgree,
  onDecline,
}: {
  cropUrl: string;
  onAgree: () => void;
  onDecline: () => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-(--space-3)">
        <h1 className="h1" tabIndex={-1}>
          Before we upload
        </h1>
        <p className="lead text-(--ink-muted)">
          Here is exactly what leaves your phone, and for how long.
        </p>
      </div>
      <div className="flex items-center gap-(--space-4)">
        <div className="sn-slot h-24 w-18 flex-none rounded-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL */}
          <img src={cropUrl} alt="The face crop we would upload" />
        </div>
        <p className="text-(--ink-muted)">
          This crop is all we send. The background and the rest of the photo stay on your phone.
        </p>
      </div>
      <ul className="flex flex-col gap-(--space-3)">
        {[
          ["What we upload", "A crop of your face, not the whole photo."],
          [
            "Why",
            "We read the colors of your skin, eyes and hair from it to find your season.",
            "An AI model from Google, through Vercel, reads the colors. It does not train on your photo.",
          ],
          [
            "How long we keep it",
            "We delete it within 24 hours. We keep only your result: your season and your colors.",
          ],
        ].map(([title, ...body]) => (
          <li key={title} className="sn-card flex flex-col gap-(--space-1)">
            <h2 className="h3">{title}</h2>
            {body.map((line) => (
              <p key={line} className="text-(--ink-muted)">
                {line}
              </p>
            ))}
          </li>
        ))}
      </ul>
      <div className="sn-stack">
        <Button block onClick={onAgree}>
          Agree and upload
        </Button>
        <Button variant="ghost" block onClick={onDecline}>
          Not now, go back
        </Button>
      </div>
      <p className="caption text-center text-(--ink-muted)">
        Want the details?{" "}
        <Link href="/privacy" className="text-(--ink) underline">
          Read our privacy policy
        </Link>
        .
      </p>
    </>
  );
}
