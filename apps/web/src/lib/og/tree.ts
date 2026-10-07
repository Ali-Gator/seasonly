import { inflateSync } from "node:zlib";

import type { ReactNode } from "react";

/**
 * Reads an image's element tree without rendering it, for the tests: every text in order, with
 * `chip:<background>` where a filled element stands. The root's own ground is skipped. Only
 * intrinsic elements are walked, so the image builders use no components.
 */
export function flatten(node: ReactNode, root = true): string[] {
  if (node === null || node === undefined || typeof node === "boolean") return [];
  if (typeof node === "string" || typeof node === "number") return [String(node)];
  if (Array.isArray(node)) return node.flatMap((n: ReactNode) => flatten(n, false));
  if (typeof node !== "object" || !("props" in node)) return [];
  const props = node.props as { style?: { background?: string }; children?: ReactNode };
  const fill = !root && props.style?.background;
  return [...(fill ? [`chip:${fill}`] : []), ...flatten(props.children, false)];
}

/** How many chips each direct child of `node` holds. */
export const chipsPerChild = (node: ReactNode): number[] =>
  childrenOf(node).map((c) => flatten(c, false).filter((t) => t.startsWith("chip:")).length);

/** The child counts of every element whose children each hold exactly one chip: a chip layout's rows. */
export function chipRows(node: ReactNode): number[] {
  const kids = childrenOf(node);
  const counts = chipsPerChild(node);
  const own = kids.length > 1 && counts.every((n) => n === 1) ? [kids.length] : [];
  return [...own, ...kids.flatMap(chipRows)];
}

function childrenOf(node: ReactNode): ReactNode[] {
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const children = (node.props as { children?: ReactNode }).children;
  return (Array.isArray(children) ? children : [children]).flat(Infinity) as ReactNode[];
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** A PNG's width and height from its IHDR chunk, or null for bytes that are not a PNG. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24 || PNG_SIGNATURE.some((b, i) => bytes[i] !== b)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** The first element in `node` whose only child is `text`. */
export function findText(node: ReactNode, text: string): ReactNode {
  if (!node || typeof node !== "object" || !("props" in node)) return undefined;
  if ((node.props as { children?: ReactNode }).children === text) return node;
  for (const child of childrenOf(node)) {
    const hit = findText(child, text);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * The x just past the rightmost dark pixel of an 8-bit RGB or RGBA PNG: how far drawn text
 * reaches. Decodes with zlib and the five PNG row filters, so no image dependency is needed.
 */
export function inkRight(bytes: Uint8Array): number {
  const size = pngSize(bytes);
  if (!size) throw new Error("not a PNG");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const channels = { 2: 3, 6: 4 }[bytes[25] ?? 0];
  if (bytes[24] !== 8 || !channels || bytes[28] !== 0) throw new Error("unsupported PNG");
  const idat: Uint8Array[] = [];
  for (let at = 8; at < bytes.length;) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    if (type === "IDAT") idat.push(bytes.subarray(at + 8, at + 8 + length));
    at += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = size.width * channels;
  let prev = new Uint8Array(stride);
  let right = 0;
  for (let y = 0; y < size.height; y++) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? (out[i - channels] ?? 0) : 0;
      const b = prev[i] ?? 0;
      const c = i >= channels ? (prev[i - channels] ?? 0) : 0;
      const p = a + b - c;
      const paeth =
        Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c)
          ? a
          : Math.abs(p - b) <= Math.abs(p - c)
            ? b
            : c;
      const predictor = [0, a, b, (a + b) >> 1, paeth][filter ?? 0] ?? 0;
      out[i] = ((row[i] ?? 0) + predictor) & 0xff;
    }
    for (let x = size.width - 1; x >= right; x--) {
      if ((out[x * channels] ?? 255) < 128) {
        right = x + 1;
        break;
      }
    }
    prev = out;
  }
  return right;
}
