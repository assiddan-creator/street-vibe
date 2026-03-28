/**
 * Shared layout + typography for the top decision stack (Text/Speak pages).
 * Helper labels stay quiet and theme-neutral; accent comes from controls, not from label copy.
 */

export const TOP_STACK_CLASS =
  "mx-auto flex w-full max-w-[min(100%,340px)] flex-col items-stretch gap-4";

/** Secondary field captions — low contrast, no emoji (avoids stray green/purple from system emoji). */
export const TOP_HELPER_LABEL_CLASS =
  "mb-1 block w-full text-center text-[8px] font-normal uppercase tracking-[0.22em] text-white/26";
