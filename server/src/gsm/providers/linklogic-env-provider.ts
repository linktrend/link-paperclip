import type { GsmProvider, GsmSystemKey } from "../types.js";

function readNonEmpty(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readFirst(keys: string[]): string | null {
  for (const key of keys) {
    const value = readNonEmpty(process.env[key]);
    if (value) return value;
  }
  return null;
}

const keyAliases: Record<GsmSystemKey, string[]> = {
  supabase_service_role: [
    "LINKLOGIC_GSM_SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "PAPERCLIP_SUPABASE_SERVICE_ROLE_KEY",
  ],
  linkbrain_system_api: [
    "LINKLOGIC_GSM_SYSTEM_API_KEY",
    "LINKBRAIN_SYSTEM_API_KEY",
    "PAPERCLIP_LINKBRAIN_SYSTEM_API_KEY",
    "PAPERCLIP_LINKBRAIN_API_KEY",
  ],
};

export const linklogicEnvGsmProvider: GsmProvider = {
  id: "linklogic_env",
  getSystemKey(key: GsmSystemKey): string | null {
    return readFirst(keyAliases[key]);
  },
};
