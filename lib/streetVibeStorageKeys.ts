/**
 * Central localStorage key names — keep Learns You / cadence isolated from other features
 * (e.g. Smart History Vault) to avoid collisions and debugging pain.
 */

/** `"1"` / `"0"` — Learns You opt-in toggle */
export const STREETVIBE_LEARNS_YOU_ENABLED_KEY = "streetvibe_learns_you_enabled";

/**
 * JSON array of implicit interaction signals (user cadence for Learns You).
 * Only this feature should read/write this key.
 */
export const STREETVIBE_USER_CADENCE_KEY = "streetvibe_user_cadence";

/**
 * Reserved for the upcoming Smart History Vault — do not store Learns You data here.
 */
export const STREETVIBE_HISTORY_VAULT_KEY = "streetvibe_history_vault";
