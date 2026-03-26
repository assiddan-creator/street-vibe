"use client";

import { DIALECTS } from "@/lib/dialects";

type DialectSelectorProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
};

export function DialectSelector({
  value,
  onChange,
  id = "dialect-select",
  className = "",
}: DialectSelectorProps) {
  const street = DIALECTS.filter((d) => d.group === "street");
  const standard = DIALECTS.filter((d) => d.group === "standard");

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
        Output / dialect
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
      >
        <optgroup label="Street">
          {street.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Standard">
          {standard.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </optgroup>
      </select>
    </div>
  );
}
