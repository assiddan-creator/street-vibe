export type DialectOption = {
  value: string;
  label: string;
  group: "street" | "standard";
};

/** Output language / dialect list (aligned with `voice-ext7` `voice.html`). */
export const DIALECTS: DialectOption[] = [
  { value: "Jamaican Patois", label: "Jamaican Patois", group: "street" },
  { value: "London Roadman", label: "London Roadman", group: "street" },
  { value: "New York Brooklyn", label: "New York Brooklyn", group: "street" },
  { value: "Tokyo Gyaru", label: "Tokyo Gyaru", group: "street" },
  { value: "Paris Banlieue", label: "Paris Banlieue", group: "street" },
  { value: "Russian Street", label: "Russian Street", group: "street" },
  { value: "Lisbon Street", label: "Lisbon Street", group: "street" },
  { value: "Mexico City Barrio", label: "Mexico City Barrio", group: "street" },
  { value: "Rio Favela", label: "Rio Favela", group: "street" },
  { value: "Israeli Street", label: "Israeli Street", group: "street" },
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
