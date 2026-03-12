export type GsmSystemKey = "supabase_service_role" | "linkbrain_system_api";

export interface GsmProvider {
  id: string;
  getSystemKey(key: GsmSystemKey): string | null;
}
