export type DialectOption = {
  value: string;
  label: string;
  group: "street" | "standard";
};

/** Output language / dialect list (aligned with `voice-ext7` `voice.html`). */
export const DIALECTS: DialectOption[] = [
  { value: "Jamaican Patois", label: "Kingston", group: "street" },
  { value: "London Roadman", label: "London", group: "street" },
  { value: "New York Brooklyn", label: "Brooklyn", group: "street" },
  { value: "Tokyo Gyaru", label: "Tokyo", group: "street" },
  { value: "Paris Banlieue", label: "Paris", group: "street" },
  { value: "Russian Street", label: "Moscow", group: "street" },
  { value: "Mexico City Barrio", label: "CDMX", group: "street" },
  { value: "Rio Favela", label: "Rio", group: "street" },
  { value: "Israeli Street", label: "Tel Aviv", group: "street" },
  { value: "Arabic Egyptian", label: "Cairo", group: "street" },
  { value: "Spanish Madrid", label: "Madrid", group: "street" },
  { value: "English (Standard)", label: "English", group: "standard" },
  { value: "Hebrew (Standard)", label: "Hebrew", group: "standard" },
  { value: "Spanish", label: "Spanish", group: "standard" },
  { value: "French", label: "French", group: "standard" },
  { value: "German", label: "German", group: "standard" },
  { value: "Italian", label: "Italian", group: "standard" },
  { value: "Russian", label: "Russian", group: "standard" },
  { value: "Portuguese", label: "Portuguese", group: "standard" },
  { value: "Japanese", label: "Japanese", group: "standard" },
];

export const DEFAULT_DIALECT_VALUE = "English (Standard)";
