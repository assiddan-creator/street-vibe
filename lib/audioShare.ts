/** Fetch generated audio only; browser speech synthesis has no exportable file. */
export async function prepareAudioFile(url: string, city: string): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Couldn't load the audio file. Please try again.");
  const blob = await response.blob();
  const mime = blob.type.split(";")[0].toLowerCase();
  const formats: Record<string, [string, string]> = {
    "audio/mp3": ["audio/mpeg", "mp3"], "audio/mpeg": ["audio/mpeg", "mp3"],
    "audio/wav": ["audio/wav", "wav"], "audio/x-wav": ["audio/wav", "wav"],
    "audio/ogg": ["audio/ogg", "ogg"], "audio/mp4": ["audio/mp4", "m4a"],
    "audio/webm": ["audio/webm", "webm"],
  };
  const format = formats[mime];
  if (!blob.size || !format) throw new Error("The audio file is empty or unsupported. Please try again.");
  const name = city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "translation";
  return new File([blob], `street-vibe-${name}.${format[1]}`, { type: format[0] });
}

export function canShareAudio(file: File, target: Pick<Navigator, "share" | "canShare"> = navigator): boolean {
  try { return typeof target.share === "function" && target.canShare?.({ files: [file] }) === true; }
  catch { return false; }
}

export function downloadAudio(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Keep the URL alive while the browser starts the download.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
