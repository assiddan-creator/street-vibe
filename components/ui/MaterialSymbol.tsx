/**
 * Google Material Symbols (Outlined). Uses ligatures; icon name is the text node.
 * Color inherits via `currentColor` from the parent (e.g. segmented control buttons).
 */
export function MaterialSymbol({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <span className={`material-symbols-outlined shrink-0 leading-none ${className}`} aria-hidden>
      {name}
    </span>
  );
}
