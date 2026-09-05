/**
 * Render a shareable PNG of a translation result on a canvas — no server round-trip,
 * so user text never travels through a URL. Returns a Blob (image/png).
 */

export type ShareCardInput = {
  original: string;
  translated: string;
  dialectLabel: string;
  city: string;
  flag: string;
  accent: string;
};

const SIZE = 1080;
const PAD = 72;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Greedy word-wrap; returns at most `maxLines`, ellipsising the last if it overflows. */
function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    if (ctx.measureText(last).width > maxWidth || words.join(" ") !== lines.join(" ")) {
      while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
      lines[maxLines - 1] = `${last.trimEnd()}…`;
    }
  }
  return lines;
}

function hexA(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export async function renderShareCard(input: ShareCardInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  try {
    await Promise.race([
      Promise.all([
        document.fonts.load("700 68px 'Space Grotesk'"),
        document.fonts.load("400 34px 'Manrope'"),
        document.fonts.load("44px 'Permanent Marker'"),
      ]),
      new Promise((r) => setTimeout(r, 600)),
    ]);
  } catch {
    /* fall back to system fonts */
  }

  const accent = /^#[0-9a-fA-F]{3,6}$/.test(input.accent) ? input.accent : "#4ade80";

  // Ground + accent glow
  ctx.fillStyle = "#0b0d10";
  ctx.fillRect(0, 0, SIZE, SIZE);
  const glow = ctx.createRadialGradient(SIZE / 2, PAD, 60, SIZE / 2, PAD, SIZE * 0.9);
  glow.addColorStop(0, hexA(accent, 0.22));
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Card
  const cx = PAD;
  const cy = PAD;
  const cw = SIZE - PAD * 2;
  const chh = SIZE - PAD * 2;
  roundRect(ctx, cx, cy, cw, chh, 44);
  ctx.fillStyle = "rgba(255,255,255,0.035)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = hexA(accent, 0.4);
  ctx.stroke();

  const innerX = cx + 64;
  const innerW = cw - 128;

  // Wordmark
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = accent;
  ctx.font = "44px 'Permanent Marker', 'Space Grotesk', sans-serif";
  ctx.fillText("STREETVIBE", innerX, cy + 108);

  // Translated line
  ctx.font = "700 68px 'Space Grotesk', system-ui, sans-serif";
  ctx.fillStyle = accent;
  const tLines = wrapLines(ctx, input.translated || "—", innerW, 5);
  let y = cy + 240;
  for (const line of tLines) {
    ctx.fillText(line, innerX, y);
    y += 88;
  }

  // Divider
  y += 24;
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(innerX, y);
  ctx.lineTo(innerX + innerW, y);
  ctx.stroke();
  y += 56;

  // Original
  ctx.font = "600 24px 'Manrope', system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText("ORIGINAL", innerX, y);
  y += 46;
  ctx.font = "400 34px 'Manrope', system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.68)";
  for (const line of wrapLines(ctx, input.original || "—", innerW, 3)) {
    ctx.fillText(line, innerX, y);
    y += 46;
  }

  // Footer
  const fy = cy + chh - 56;
  ctx.font = "500 26px 'Manrope', system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText(`${input.flag} ${input.city} · ${input.dialectLabel}`, innerX, fy);
  ctx.textAlign = "right";
  ctx.fillText("street-vibe.vercel.app", innerX + innerW, fy);
  ctx.textAlign = "left";

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}

/** Share the card via the Web Share API when possible, else trigger a download. */
export async function shareOrDownloadCard(
  input: ShareCardInput
): Promise<"shared" | "downloaded"> {
  const blob = await renderShareCard(input);
  const file = new File([blob], "street-vibe.png", { type: "image/png" });

  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && typeof navigator.share === "function") {
    try {
      await navigator.share({ files: [file], text: input.translated });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "shared";
      /* fall through to download */
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "street-vibe.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
